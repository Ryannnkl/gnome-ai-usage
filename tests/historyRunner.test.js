import test from 'node:test';
import assert from 'node:assert/strict';

import { runnerHarness } from './runnerHarness.js';
import { deferred } from './fixtures.js';
import { historyHarness, historySnapshot, historyNow as now } from './historyFixtures.js';

test('a successful verified account publishes and persists weekly observations', async () => {
    let timestamp = now;
    let percent = 10;
    const harness = runnerHarness(async () => historySnapshot(percent));
    const history = historyHarness();

    harness.provider.readAccount = async () => ({ key: 'hash', historyKey: 'hash' });
    harness.runner.history = history.tracker;
    harness.runner.now = () => timestamp;

    await harness.runner.refresh(harness.provider, harness.record);

    assert.equal(harness.record.history.weekly.total, null);
    timestamp += 60;
    percent = 12;

    await harness.runner.refresh(harness.provider, harness.record);

    assert.equal(harness.record.history.weekly.total, 2);
    assert.equal(history.repository.load('codex').series.weekly[0].points, 2);
});

test('late responses after disable never update or persist history', async () => {
    const response = deferred();
    const harness = runnerHarness(() => response.promise);
    const history = historyHarness();

    harness.runner.history = history.tracker;
    harness.provider.readAccount = async () => ({ key: 'hash', historyKey: 'hash' });

    const pending = harness.runner.refresh(harness.provider, harness.record);

    await Promise.resolve();
    harness.runner.destroy();
    response.resolve(historySnapshot(20));
    await pending;

    assert.equal(history.raw(), '{}');
    assert.equal(harness.record.snapshot, null);
});

test('switching accounts cancels old history writes and clears the visible history', async () => {
    const response = deferred();
    const harness = runnerHarness(() => response.promise);
    const history = historyHarness();

    harness.runner.history = history.tracker;
    harness.provider.readAccount = async () => ({ key: 'first', historyKey: 'first' });

    const pending = harness.runner.refresh(harness.provider, harness.record);

    await Promise.resolve();
    harness.runner.cancel('codex');
    harness.record.invalidate(false);
    harness.provider.readAccount = async () => ({ key: 'second', historyKey: 'second' });
    harness.provider.fetch = async () => historySnapshot(20);

    await harness.runner.refresh(harness.provider, harness.record);
    response.resolve(historySnapshot(80));
    await pending;

    assert.equal(history.repository.load('codex').accountKey, 'second');
    assert.equal(harness.record.snapshot.windows[0].usedPercent, 20);
    assert.equal(harness.record.history.weekly.total, null);
});
