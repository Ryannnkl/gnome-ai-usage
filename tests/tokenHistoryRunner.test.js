import test from 'node:test';
import assert from 'node:assert/strict';
import {runnerHarness} from './runnerHarness.js';
import {deferred} from './fixtures.js';

test('token collection failures do not break quota readings', async () => {
    const harness = runnerHarness();
    harness.runner.tokenHistory = {read: async () => { throw new Error('collector unavailable'); }};
    await harness.runner.refresh(harness.provider, harness.record);
    assert.equal(harness.record.status, 'ok');
    assert.equal(harness.record.tokenHistory, null);
});

test('local tokens remain available when a quota query fails', async () => {
    const harness = runnerHarness(async () => { throw new Error('quota unavailable'); });
    const tokens = {days: [{date: '2026-10-10', tokens: 123}]};
    harness.runner.tokenHistory = {read: async () => tokens};
    await harness.runner.refresh(harness.provider, harness.record);
    assert.equal(harness.record.tokenHistory, tokens);
});

test('late token collection after disabling does not publish or persist', async () => {
    const harness = runnerHarness();
    const response = deferred();
    harness.runner.tokenHistory = {read: () => response.promise};
    const pending = harness.runner.refresh(harness.provider, harness.record);
    harness.runner.destroy();
    response.resolve({days: [{date: '2026-10-10', tokens: 123}]});
    await pending;
    assert.equal(harness.record.tokenHistory, null);
    assert.ok(!('tokenHistory' in harness.record.serialize()));
});
