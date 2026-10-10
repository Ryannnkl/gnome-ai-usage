import test from 'node:test';
import assert from 'node:assert/strict';
import {DailyUsageSeries} from '../src/domain/DailyUsageSeries.js';
import {HistoryCalendar} from '../src/domain/HistoryCalendar.js';
import {historyNow as now, weeklyWindow} from './historyFixtures.js';

const create = () => new DailyUsageSeries(new HistoryCalendar('UTC'));

test('initial reading is a baseline, never fabricated historical consumption', () => {
    const series = create();
    series.observe(weeklyWindow(38), now);
    assert.equal(series.view(now).days.length, 7);
    assert.equal(series.view(now).total, null);
    assert.ok(series.view(now).days.every(day => day.points === null));
});

test('collects quota differences only within comparable same-day intervals', () => {
    const series = create();
    series.observe(weeklyWindow(38), now);
    series.observe(weeklyWindow(40.25), now + 60);
    series.observe(weeklyWindow(41), now + 120);
    assert.equal(series.view(now).total, 3);
    assert.equal(series.view(now).days[6].points, 3);
});

test('confirmed unchanged quota is zero, while unobserved days remain unknown', () => {
    const series = create();
    series.observe(weeklyWindow(38), now);
    series.observe(weeklyWindow(38), now + 60);
    assert.equal(series.view(now).total, 0);
    assert.equal(series.view(now).days[0].points, null);
});

test('offline gaps, midnight, renewal and quota decreases are not assigned to a day', () => {
    for (const [offset, overrides] of [
        [180, {}], [86400, {}], [60, {resetsAt: now + 1209600}], [60, {usedPercent: 1}],
        [60, {resetsAt: null}], [60, {resetsAt: now + 30}], [60, {usedPercent: NaN}],
    ]) {
        const series = create();
        series.observe(weeklyWindow(38), now);
        series.observe(weeklyWindow(40, overrides), now + offset);
        assert.equal(series.view(now + offset).total, null);
    }
    const series = create();
    const midnight = Date.parse('2026-10-11T00:00:00Z') / 1000;
    series.observe(weeklyWindow(38), midnight - 20);
    series.observe(weeklyWindow(40), midnight + 20);
    assert.equal(series.view(midnight + 20).total, null);
});

test('restart, failures and backward clock changes break observation continuity', () => {
    const series = create();
    series.observe(weeklyWindow(38), now);
    series.interrupt();
    series.observe(weeklyWindow(40), now + 60);
    assert.equal(series.view(now).total, null);
    series.observe(weeklyWindow(45), now + 30);
    assert.equal(series.view(now).total, null);
    const restored = new DailyUsageSeries(new HistoryCalendar('UTC'), series.serialize(now));
    restored.observe(weeklyWindow(80), now + 90);
    assert.equal(restored.view(now).total, null);
});

test('retains exactly seven local calendar dates, with no future values', () => {
    const series = create();
    for (let day = 0; day < 9; day++) {
        const timestamp = now - (8 - day) * 86400;
        series.observe(weeklyWindow(10 + day), timestamp);
        series.observe(weeklyWindow(11 + day), timestamp + 60);
    }
    assert.equal(series.serialize(now).length, 7);
    assert.equal(series.view(now).total, 7);
    assert.equal(series.serialize(now)[0].date, '2026-10-04');
});

test('calendar honors timezone and daylight-saving boundaries without losing a date', () => {
    const timestamp = Date.parse('2026-10-10T01:00:00Z') / 1000;
    assert.equal(new HistoryCalendar('America/Recife').key(timestamp), '2026-10-09');
    const days = new HistoryCalendar('America/New_York').days(Date.parse('2026-11-03T12:00Z') / 1000);
    assert.equal(new Set(days).size, 7);
    assert.deepEqual(days.slice(-3), ['2026-11-01', '2026-11-02', '2026-11-03']);
});
