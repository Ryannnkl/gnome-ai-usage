import test from 'node:test';
import assert from 'node:assert/strict';

import { historyHarness } from './historyFixtures.js';

const state = () => ({
    accountKey: 'synthetic-hash',
    timeZone: 'UTC',
    plan: 'plus',
    series: { weekly: [{ date: '2026-10-10', points: 2 }] },
});

test('normalizes history to an explicit schema and isolates providers', () => {
    const { repository } = historyHarness();

    repository.save('first', state());
    repository.save('second', { ...state(), accountKey: 'different-hash' });

    assert.deepEqual(repository.load('first'), state());
    assert.equal(repository.load('second').accountKey, 'different-hash');
});

test('malformed, oversized and unknown-version history never blocks startup', () => {
    for (const initial of [
        'invalid',
        'null',
        '[]',
        'x'.repeat(65537),
        JSON.stringify({ version: 2, providers: { provider: state() } }),
    ])
        assert.equal(historyHarness(initial).repository.load('provider'), null);
});

test('rejects invalid daily amounts, dates, duplicate days and unbounded series', () => {
    for (const series of [
        { weekly: [{ date: '2026-02-30', points: 2 }] },
        { weekly: [{ date: '2026-10-10', points: -1 }] },
        { weekly: [{ date: '2026-10-10', points: '2' }] },
        { weekly: Array(8).fill({ date: '2026-10-10', points: 2 }) },
        { weekly: Array(2).fill({ date: '2026-10-10', points: 2 }) },
        Object.fromEntries(Array.from({ length: 17 }, (_, index) => [index, []])),
    ]) {
        const raw = JSON.stringify({ version: 1, providers: { provider: { ...state(), series } } });

        assert.equal(historyHarness(raw).repository.load('provider'), null);
    }
});

test('rejects missing account identities and drops extraneous persisted fields', () => {
    const initial = JSON.stringify({
        version: 1,
        providers: {
            provider: {
                ...state(),
                token: 'synthetic-secret',
                series: { weekly: [{ date: '2026-10-10', points: 2, raw: 'must not survive' }] },
            },
        },
    });

    assert.deepEqual(historyHarness(initial).repository.load('provider'), state());

    const invalid = JSON.stringify({
        version: 1,
        providers: { provider: { ...state(), accountKey: '' } },
    });

    assert.equal(historyHarness(invalid).repository.load('provider'), null);
});
