import test from 'node:test';
import assert from 'node:assert/strict';
import {HistoryTracker} from '../src/application/HistoryTracker.js';
import {historyHarness, historySnapshot, historyNow as now, weeklyWindow} from './historyFixtures.js';

test('persists only seven-day aggregates and account hash, never tokens or baselines', () => {
    const {tracker, raw} = historyHarness();
    tracker.observe('provider', 'synthetic-hash', historySnapshot(10), now);
    tracker.observe('provider', 'synthetic-hash', historySnapshot(12), now + 60);
    const state = JSON.parse(raw()).providers.provider;
    assert.deepEqual(Object.keys(state), ['accountKey', 'timeZone', 'plan', 'series']);
    assert.deepEqual(state.series.weekly, [{date: '2026-10-10', points: 2}]);
    assert.equal(raw().includes('usedPercent'), false);
});

test('reloads matching account history, without assigning downtime consumption', () => {
    const {tracker, repository, calendar} = historyHarness();
    tracker.observe('provider', 'account-a', historySnapshot(10), now);
    tracker.observe('provider', 'account-a', historySnapshot(12), now + 60);
    const restored = new HistoryTracker(repository, calendar);
    assert.equal(restored.bind('provider', 'account-a', now).weekly.total, 2);
    assert.equal(restored.observe('provider', 'account-a', historySnapshot(50), now + 90).weekly.total, 2);
    assert.deepEqual(restored.bind('provider', 'account-b', now), {});
});

test('unknown account identities never load or persist historical readings', () => {
    const tracker = new HistoryTracker({load() { throw new Error('must not read'); },
        save() { throw new Error('must not write'); }}, historyHarness().calendar);
    assert.equal(tracker.bind('provider', null, now), null);
    assert.equal(tracker.observe('provider', undefined, historySnapshot(10), now), null);
});

test('different weekly quotas remain separate and session windows are ignored', () => {
    const {tracker} = historyHarness();
    const snapshot = value => historySnapshot(value, {windows: [weeklyWindow(value),
        weeklyWindow(value * 2, {id: 'other-weekly'}), weeklyWindow(90, {duration: 18000})]});
    tracker.observe('provider', 'hash', snapshot(10), now);
    const history = tracker.observe('provider', 'hash', snapshot(12), now + 60);
    assert.equal(history.weekly.total, 2);
    assert.equal(history['other-weekly'].total, 4);
    assert.equal(Object.keys(history).length, 2);
});

test('plan changes, query failures and timezone changes do not mix incompatible observations', () => {
    const {tracker, repository, calendar} = historyHarness();
    tracker.observe('provider', 'hash', historySnapshot(10), now);
    tracker.interrupt('provider');
    assert.equal(tracker.observe('provider', 'hash', historySnapshot(50), now + 60).weekly.total, null);
    tracker.observe('provider', 'hash', historySnapshot(52), now + 120);
    const changed = tracker.observe('provider', 'hash', historySnapshot(60, {plan: 'max'}), now + 180);
    assert.equal(changed.weekly.total, null);
    calendar.configuredTimeZone = 'America/Recife';
    const restored = new HistoryTracker(repository, calendar);
    assert.deepEqual(restored.bind('provider', 'hash', now), {});
    assert.deepEqual(tracker.bind('provider', 'hash', now), {});
});

test('storage failures do not stop live usage collection', () => {
    const {calendar} = historyHarness();
    const tracker = new HistoryTracker({load() { throw new Error('storage'); },
        save() { throw new Error('storage'); }}, calendar);
    tracker.observe('provider', 'hash', historySnapshot(10), now);
    assert.equal(tracker.observe('provider', 'hash', historySnapshot(12), now + 60).weekly.total, 2);
});
