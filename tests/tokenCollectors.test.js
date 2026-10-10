import test from 'node:test';
import assert from 'node:assert/strict';

import { CodexTokens } from '../src/infrastructure/tokens/CodexTokens.js';
import { ClaudeTokens } from '../src/infrastructure/tokens/ClaudeTokens.js';
import { TokenLedger } from '../src/infrastructure/tokens/TokenLedger.js';
import { TokenFixtureFiles, codexEvent } from './tokenFixtures.js';

const dates = ['2026-10-09', '2026-10-10'];

test('Codex cumulative counts deduplicate sessions across files and daily boundaries', async () => {
    const files = new TokenFixtureFiles();
    const events = [
        { type: 'session_meta', payload: { id: 'session-one' } },
        codexEvent(100, 100, '2026-10-09'),
        codexEvent(100, 100),
        codexEvent(140, 40),
        codexEvent(150, 10),
    ];

    files.write('sessions/one', events);
    files.write('sessions/duplicate', events);

    const ledger = new TokenLedger(dates);

    await new CodexTokens(files).collect('/fixture', ledger);

    assert.deepEqual(ledger.report().days, [
        { date: '2026-10-09', tokens: 100 },
        { date: '2026-10-10', tokens: 50 },
    ]);
    assert.equal(ledger.partial, false);
});

test('Codex resets and missing baselines do not invent consumption', async () => {
    const files = new TokenFixtureFiles();

    files.write('sessions', [codexEvent(100, null), codexEvent(10, 10), codexEvent(20, 10)]);

    const ledger = new TokenLedger(dates);

    await new CodexTokens(files).collect('/fixture', ledger);

    assert.deepEqual(ledger.report().days, [{ date: '2026-10-10', tokens: 10 }]);
    assert.equal(ledger.partial, true);
});

test('Claude includes cache tokens and deduplicates streaming messages', async () => {
    const files = new TokenFixtureFiles();
    const event = output => ({
        type: 'assistant',
        timestamp: '2026-10-10T12:00:00Z',
        message: {
            id: 'message-one',
            usage: {
                input_tokens: 10,
                output_tokens: output,
                cache_read_input_tokens: 30,
                cache_creation_input_tokens: 40,
            },
        },
    });

    files.write('projects', [event(0), event(20), event(20)]);
    files.write('transcripts', [event(20)]);

    const ledger = new TokenLedger(dates);

    await new ClaudeTokens(files).collect('/fixture', ledger);

    assert.deepEqual(ledger.report().days, [{ date: '2026-10-10', tokens: 100 }]);
});

test('missing logs never become zero', async () => {
    const ledger = new TokenLedger(dates);

    await new ClaudeTokens(new TokenFixtureFiles()).collect('/fixture', ledger);

    assert.deepEqual(ledger.report().days, []);
});

test('invalid counts, dates and unsafe sums are marked partial', () => {
    const ledger = new TokenLedger(dates);

    for (const [timestamp, tokens] of [
        [null, 10],
        ['broken', 10],
        ['2026-10-10T12:00:00Z', true],
        ['2026-10-10T12:00:00Z', -1],
    ])
        ledger.add(timestamp, tokens, JSON.stringify([timestamp, tokens]));

    assert.equal(ledger.partial, true);
    assert.deepEqual(ledger.report().days, []);
    ledger.add('2026-10-10T12:00:00Z', Number.MAX_SAFE_INTEGER, 'first');
    ledger.add('2026-10-10T12:00:00Z', 1, 'overflow');

    assert.equal(ledger.report().days[0].tokens, Number.MAX_SAFE_INTEGER);
});
