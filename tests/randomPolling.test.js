import test from 'node:test';
import assert from 'node:assert/strict';
import {UsageMonitor} from '../src/application/UsageMonitor.js';
import {ProviderRunner} from '../src/application/ProviderRunner.js';
import {PollingPolicy} from '../src/domain/PollingPolicy.js';
import {BackoffPolicy} from '../src/domain/BackoffPolicy.js';
import {deferred, usageSnapshot} from './fixtures.js';

test('cada provider espera seu intervalo após terminar sem consultas sobrepostas', async () => {
    let timestamp = 1000;
    const response = deferred();
    const draws = [0, 0.999999];
    const writes = [];
    const repository = {load: () => ({}), save: id => writes.push(id)};
    const timer = {delay: null, start(delay) { this.delay = delay; },
        stop() { this.delay = null; }};
    const providers = ['slow', 'fast'].map(id => ({id, name: id,
        start() {}, destroy() {}, isActive: () => false,
        readAccount: async () => ({key: id}),
        fetch: () => id === 'slow' ? response.promise : Promise.resolve(usageSnapshot())}));
    const monitor = new UsageMonitor(providers, repository,
        new PollingPolicy(() => draws.shift()), (onChange, onSettled) =>
            new ProviderRunner(repository, new BackoffPolicy(), () =>
                ({cancellable: {}, cancel() {}, close() {}}),
            () => timestamp, onChange, onSettled), timer, () => timestamp);
    monitor.start();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(monitor.records[0].nextRefreshAt, null);
    assert.equal(monitor.records[1].nextRefreshAt, 1020);
    assert.equal(timer.delay, 20);
    timestamp = 1010;
    monitor.refresh();
    assert.deepEqual(writes, ['fast']);
    response.resolve(usageSnapshot());
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(monitor.records[0].nextRefreshAt, 1070);
    assert.equal(timer.delay, 10);
    monitor.destroy();
    assert.equal(timer.delay, null);
});
