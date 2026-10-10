import test from 'node:test';
import assert from 'node:assert/strict';
import {UsageRecord} from '../src/domain/UsageRecord.js';
import {BackoffPolicy} from '../src/domain/BackoffPolicy.js';
import {UsageError} from '../src/domain/UsageError.js';
import {usageSnapshot} from './fixtures.js';

const provider = {id: 'codex', name: 'Codex'};

test('cache só fica visível após confirmar a identidade da conta', () => {
    const record = new UsageRecord(provider, {accountKey: 'account-a',
        snapshot: usageSnapshot(), fetchedAt: 1000, retryAt: 3000});
    assert.equal(record.snapshot, null);
    assert.equal(record.retryAt, 3000);
    record.bind('account-a');
    assert.equal(record.snapshot.windows[0].usedPercent, 42);
    assert.equal(record.status, 'stale');
    record.bind('account-b');
    assert.equal(record.snapshot, null);
});

test('falha de rede mantém última leitura e não altera sua idade', () => {
    const record = new UsageRecord(provider);
    record.bind('account-a');
    record.succeed(usageSnapshot(), 1000);
    record.fail(new UsageError('network'), 1100, new BackoffPolicy());
    assert.equal(record.snapshot.windows[0].usedPercent, 42);
    assert.equal(record.fetchedAt, 1000);
    assert.equal(record.status, 'network');
    assert.equal(record.retryAt, 1130);
});

test('ausência de login descarta dados da conta anterior', () => {
    const record = new UsageRecord(provider);
    record.succeed(usageSnapshot(), 1000);
    record.fail(new UsageError('needsAuth'), 1100, new BackoffPolicy());
    assert.equal(record.snapshot, null);
    assert.equal(record.fetchedAt, null);
});

test('troca de credencial oculta dados até verificar a identidade novamente', () => {
    const record = new UsageRecord(provider);
    record.bind('account-a');
    record.succeed(usageSnapshot(), 1000);
    record.invalidate();
    assert.equal(record.snapshot, null);
    record.bind('account-a');
    assert.equal(record.snapshot.windows[0].usedPercent, 42);
});

test('provider sem cache não restaura leitura após troca de contexto no mesmo diretório', () => {
    const record = new UsageRecord(provider);
    record.bind('directory-scope');
    record.succeed(usageSnapshot(), 1000);
    record.invalidate(false);
    record.bind('directory-scope');
    assert.equal(record.snapshot, null);
    assert.equal(record.fetchedAt, null);
});

test('serialização não inclui credenciais nem objetos de erro', () => {
    const record = new UsageRecord(provider);
    record.bind('account-a');
    record.succeed(usageSnapshot(), 1000);
    assert.deepEqual(Object.keys(record.serialize()), ['accountKey', 'snapshot', 'fetchedAt', 'retryAt']);
});
