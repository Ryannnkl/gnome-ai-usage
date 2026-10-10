import test from 'node:test';
import assert from 'node:assert/strict';
import {ClaudeUsageParser} from '../src/providers/claude/ClaudeUsageParser.js';
import {ClaudeResetParser} from '../src/providers/claude/ClaudeResetParser.js';

const parser = new ClaudeUsageParser();
const output = `Subscription usage
Current session: 24% used
Current week (all models): 37% used · resets Oct 12, 9am (America/Recife)`;

test('normalizes Claude session and weekly limits from the official usage report', () => {
    const now = Date.parse('2026-10-09T21:00:00Z') / 1000;
    const snapshot = parser.parse(output, now);
    assert.equal(snapshot.headlineId, 'session');
    assert.deepEqual(snapshot.windows.map(window => window.usedPercent), [24, 37]);
    assert.equal(snapshot.windows[0].label, 'Sessão');
    assert.equal(snapshot.windows[0].duration, 18000);
    assert.equal(snapshot.windows[1].label, 'Semanal · all models');
    assert.equal(snapshot.windows[1].resetsAt, Date.parse('2026-10-12T12:00:00Z') / 1000);
});

test('accepts zero, absent session data and windows above full usage', () => {
    assert.equal(parser.parse('Current session: 0% used', 1000).windows[0].usedPercent, 0);
    assert.equal(parser.parse('Current week: 105% used', 1000).windows[0].usedPercent, 105);
    assert.equal(parser.parse('Current session: 100% used', 1000).windows[0].resetsAt, null);
});

test('missing or invalid usage never becomes a zero reading', () => {
    assert.throws(() => parser.parse('', 1000), {code: 'invalidResponse'});
    for (const output of ['Sign in to continue', 'Current session: NaN% used',
        'Current week: -1% used'])
        assert.throws(() => parser.parse(output, 1000), {code: 'unsupported'});
    assert.throws(() => parser.parse(null, 1000), {code: 'invalidResponse'});
});

test('usage report does not claim an account identity absent from CLI output', () => {
    const snapshot = parser.parse(output, Date.parse('2026-10-09T21:00:00Z') / 1000);
    assert.equal(Object.hasOwn(snapshot, 'accountId'), false);
    assert.equal(Object.hasOwn(snapshot, 'identity'), false);
});

test('invalid reset text or timezones leave reset unknown', () => {
    const reset = new ClaudeResetParser();
    assert.equal(reset.parse('not a reset date', 1000), null);
    assert.equal(reset.parse('Oct 12, 9am (Not/A-Timezone)', 1000), null);
});
