import test from 'node:test';
import assert from 'node:assert/strict';
import {runnerHarness} from './runnerHarness.js';
import {deferred, usageSnapshot} from './fixtures.js';
import {UsageError} from '../src/domain/UsageError.js';

test('consultas concorrentes do mesmo provider são agrupadas', async () => {
    const response = deferred();
    const harness = runnerHarness(() => response.promise);
    const first = harness.runner.refresh(harness.provider, harness.record);
    await harness.runner.refresh(harness.provider, harness.record);
    assert.equal(harness.requests.length, 1);
    response.resolve(usageSnapshot());
    await first;
    assert.equal(harness.writes.length, 1);
    assert.equal(harness.record.refreshing, false);
    assert.equal(harness.requests[0].closed, true);
});

test('providers sem identidade legível não persistem leituras entre sessões', async () => {
    const harness = runnerHarness();
    harness.provider.cacheable = false;
    await harness.runner.refresh(harness.provider, harness.record);
    assert.equal(harness.record.snapshot.windows[0].usedPercent, 42);
    assert.equal(harness.writes.length, 0);
});

test('falha sem identidade estável não conserva leitura possivelmente de outra conta', async () => {
    const harness = runnerHarness(async () => { throw new UsageError('network'); });
    harness.provider.retainPreviousOnFailure = false;
    harness.record.bind('account-a');
    harness.record.succeed(usageSnapshot(), 900);
    await harness.runner.refresh(harness.provider, harness.record);
    assert.equal(harness.record.snapshot, null);
    assert.equal(harness.record.fetchedAt, null);
    assert.equal(harness.record.status, 'network');
});

test('disable cancela requisição e rejeita resposta tardia sem persistir', async () => {
    const response = deferred();
    const harness = runnerHarness(() => response.promise);
    const pending = harness.runner.refresh(harness.provider, harness.record);
    await Promise.resolve();
    harness.runner.destroy();
    const updates = harness.updates();
    response.resolve(usageSnapshot());
    await pending;
    assert.equal(harness.requests[0].canceled, true);
    assert.equal(harness.writes.length, 0);
    assert.equal(harness.updates(), updates);
    assert.equal(harness.record.snapshot, null);
});

test('troca de contexto rejeita resultado antigo mesmo com nova consulta em andamento', async () => {
    const response = deferred();
    const harness = runnerHarness(() => response.promise);
    const pending = harness.runner.refresh(harness.provider, harness.record);
    await Promise.resolve();
    harness.runner.cancel('codex');
    harness.record.invalidate();
    harness.provider.fetch = async () => usageSnapshot(7);
    await harness.runner.refresh(harness.provider, harness.record);
    response.resolve(usageSnapshot(99));
    await pending;
    assert.equal(harness.record.snapshot.windows[0].usedPercent, 7);
    assert.equal(harness.writes.length, 1);
});

test('erro preserva backoff e libera a consulta em andamento', async () => {
    const harness = runnerHarness(async () => { throw new UsageError('rateLimited', 120); });
    await harness.runner.refresh(harness.provider, harness.record);
    assert.equal(harness.record.retryAt, 1120);
    assert.equal(harness.record.status, 'rateLimited');
    assert.equal(harness.record.refreshing, false);
    assert.equal(harness.writes[0].reading.retryAt, 1120);
});

test('provider lento não atrasa publicação do outro provider', async () => {
    const response = deferred();
    const harness = runnerHarness(() => response.promise);
    const slow = harness.runner.refresh(harness.provider, harness.record);
    const other = {...harness.provider, id: 'other', fetch: async () => usageSnapshot(5)};
    const otherRecord = new harness.record.constructor(other);
    await harness.runner.refresh(other, otherRecord);
    assert.equal(harness.writes[0].id, 'other');
    response.resolve(usageSnapshot());
    await slow;
});
