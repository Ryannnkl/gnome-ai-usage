import test from 'node:test';
import assert from 'node:assert/strict';

import { PanelFocusPolicy } from '../src/domain/PanelFocusPolicy.js';
import { PanelFocusFormatter } from '../src/presentation/PanelFocusFormatter.js';
import { UsageFormatter } from '../src/presentation/UsageFormatter.js';

const policy = new PanelFocusPolicy();
const quota = (duration, usedPercent, overrides = {}) => ({
    id: String(duration),
    label: duration === 18000 ? '5 horas' : 'Semanal',
    duration,
    usedPercent,
    resetsAt: 2000,
    ...overrides,
});
const record = (id, session, weekly, overrides = {}) => ({
    id,
    name: id,
    status: 'ok',
    fetchedAt: 1000,
    activityRecent: false,
    refreshing: false,
    snapshot: { windows: [quota(18000, session), quota(604800, weekly)] },
    ...overrides,
});

test('automatic focus pairs both rings from the highest five-hour provider, not the highest week', () => {
    const state = policy.evaluate([record('codex', 42, 17), record('claude', 10, 90)], 1000);

    assert.equal(state.providerId, 'codex');
    assert.equal(state.session.usedPercent, 42);
    assert.equal(state.weekly.usedPercent, 17);
    assert.equal(state.weekly.status, 'idle');
});

test('automatic focus changes when another provider has higher five-hour use', () => {
    const state = policy.evaluate([record('codex', 10, 80), record('claude', 42, 17)], 1000);

    assert.equal(state.providerId, 'claude');
    assert.equal(state.weekly.usedPercent, 17);
});

test('manual focus remains on the selected provider regardless of other quotas', () => {
    const state = policy.evaluate([record('codex', 99, 100), record('claude', 0, 17)], 1000, 'claude');

    assert.equal(state.providerId, 'claude');
    assert.equal(state.session.usedPercent, 0);
    assert.equal(state.weekly.usedPercent, 17);
});

test('an absent or disabled manual provider never falls back to another provider', () => {
    const state = policy.evaluate([record('codex', 99, 100)], 1000, 'claude');

    assert.equal(state.providerId, 'claude');
    assert.equal(state.providerName, null);

    for (const window of [state.session, state.weekly]) {
        assert.equal(window.status, 'unknown');
        assert.equal(window.usedPercent, null);
        assert.equal(window.window, null);
    }
});

test('automatic ties retain the current provider and are deterministic without a previous focus', () => {
    const records = [record('codex', 0, 10), record('claude', 0, 90)];

    assert.equal(policy.evaluate(records, 1000, 'automatic', 'codex').providerId, 'codex');
    assert.equal(policy.evaluate(records, 1000, 'automatic', 'claude').providerId, 'claude');
    assert.equal(policy.evaluate(records, 1000).providerId, 'claude');
    assert.equal(policy.evaluate(records.reverse(), 1000).providerId, 'claude');
});

test('automatic focus excludes failed, stale, missing and expired five-hour readings', () => {
    const valid = record('valid', 10, 20);
    const invalid = [
        record('failed', 100, 100, { status: 'network' }),
        record('old', 100, 100, { fetchedAt: 99 }),
        record('undated', 100, 100, { fetchedAt: null }),
        record('missing', 100, 100, { snapshot: null }),
        record('expired', 100, 100, {
            snapshot: { windows: [quota(18000, 100, { resetsAt: 1000 })] },
        }),
        record('weekly-only', 100, 100, { snapshot: { windows: [quota(604800, 100)] } }),
    ];

    assert.equal(policy.evaluate([...invalid, valid], 1000).providerId, 'valid');
    assert.equal(policy.evaluate(invalid, 1000).providerId, null);
});

test('unknown duration and arbitrary session labels are not inferred to mean five hours', () => {
    const windows = [quota(null, 100, { label: 'Sessão' }), quota(604800, 100)];
    const state = policy.evaluate([record('codex', 0, 0, { snapshot: { windows } })], 1000, 'codex');

    assert.equal(state.session.usedPercent, null);
    assert.equal(state.weekly.usedPercent, 100);
});

test('each duration takes its highest valid quota without mutating source order', () => {
    const windows = [
        quota(604800, 50, { id: 'week-low' }),
        quota(18000, 20, { id: 'session-low' }),
        quota(604800, 80, { id: 'week-high' }),
        quota(18000, 60, { id: 'session-high' }),
    ];
    const state = policy.evaluate([record('antigravity', 0, 0, { snapshot: { windows } })], 1000);

    assert.equal(state.session.window.id, 'session-high');
    assert.equal(state.weekly.window.id, 'week-high');
    assert.deepEqual(
        windows.map(window => window.id),
        ['week-low', 'session-low', 'week-high', 'session-high']
    );
});

test('missing, invalid and expired quotas are unavailable rather than zero', () => {
    for (const window of [
        quota(18000, NaN),
        quota(18000, Infinity),
        quota(18000, -1),
        quota(18000, 100, { resetsAt: 1000 }),
        quota(18000, 100, { resetsAt: NaN }),
    ]) {
        const state = policy.evaluate(
            [record('codex', 0, 0, { snapshot: { windows: [window] } })],
            1000,
            'codex'
        );

        assert.equal(state.session.usedPercent, null);
        assert.equal(state.session.uncertain, true);
    }
});

test('independent warning colors distinguish five-hour use from the weekly limit', () => {
    const state = policy.evaluate([record('codex', 42, 100)], 1000);

    assert.equal(state.session.status, 'idle');
    assert.equal(state.weekly.status, 'exhausted');
    assert.equal(state.session.uncertain, false);
});

test('a missing week does not mark a known zero session as uncertain', () => {
    const state = policy.evaluate([record('codex', 0, null)], 1000);

    assert.equal(state.providerId, 'codex');
    assert.equal(state.session.usedPercent, 0);
    assert.equal(state.session.uncertain, false);
    assert.equal(state.weekly.usedPercent, null);
    assert.equal(state.weekly.uncertain, true);
});

test('fixed focus can retain a failed previous reading but marks it uncertain', () => {
    const state = policy.evaluate([record('codex', 42, 75, { status: 'network' })], 1000, 'codex');

    assert.equal(state.session.usedPercent, 42);
    assert.equal(state.session.uncertain, true);
    assert.equal(state.weekly.status, 'warning');
    assert.equal(state.weekly.uncertain, true);
});

test('refreshing preserves focus and both known quotas', () => {
    const state = policy.evaluate([record('codex', 42, 75, { refreshing: true })], 1000);

    assert.equal(state.providerId, 'codex');
    assert.equal(state.session.refreshing, true);
    assert.equal(state.weekly.refreshing, true);
});

test('empty automatic focus exposes no invented provider or usage', () => {
    const state = policy.evaluate([], 1000);

    assert.equal(state.providerId, null);
    assert.equal(state.session.usedPercent, null);
    assert.equal(state.weekly.usedPercent, null);
});

test('focus tooltip names the provider once and reports both quotas', () => {
    const formatter = new PanelFocusFormatter(new UsageFormatter());
    const description = formatter.describe(policy.evaluate([record('Codex', 0, 33)], 1000));

    assert.equal(description, 'Codex\n5 horas · 0% usado\nSemanal · 33% usado');
    assert.equal(description.match(/Codex/g).length, 1);
});

test('focus formatter preserves a fixed provider name without readings and translates labels', () => {
    const translations = {
        'Cota indisponível': 'Quota unavailable',
        'Semanal': 'Weekly',
        '5 horas': '5 hours',
    };
    const formatter = new PanelFocusFormatter(
        new UsageFormatter({ gettext: text => translations[text] ?? text })
    );
    const description = formatter.describe(policy.evaluate([], 1000, 'claude'));

    assert.equal(description, 'Claude\n5 hours · Quota unavailable\nWeekly · Quota unavailable');
});
