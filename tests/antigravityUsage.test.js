import test from 'node:test';
import assert from 'node:assert/strict';
import {AntigravityUsageParser} from '../src/providers/antigravity/AntigravityUsageParser.js';

const parser = new AntigravityUsageParser();
const report = [
    'Gemini Models\tWeekly Limit Remaining\t73%\t2026-10-16T13:37:22Z',
    'Gemini Models\tFive Hour Limit Remaining\t91.5%\t2026-10-10T05:35:06Z',
    'Claude and GPT models\tWeekly Limit Remaining\t64%\t2026-10-17T00:35:06Z',
    'Claude and GPT models\tFive Hour Limit Remaining\t82%\t2026-10-10T05:35:06Z',
].join('\n');

test('converts Antigravity remaining quotas into used percentages', () => {
    const snapshot = parser.parse(report);
    assert.equal(snapshot.windows.length, 4);
    assert.deepEqual(snapshot.windows.map(window => window.usedPercent), [27, 8.5, 36, 18]);
    assert.equal(snapshot.windows[0].label, 'Gemini Models · Semanal');
    assert.equal(snapshot.windows[1].duration, 18000);
    assert.equal(snapshot.windows[1].resetsAt, Date.parse('2026-10-10T05:35:06Z') / 1000);
    assert.equal(snapshot.headlineId, 'claude-and-gpt-models-session');
});

test('headlines the most consumed five-hour quota across model groups', () => {
    const snapshot = parser.parse(report.replace('Five Hour Limit Remaining\t91.5%',
        'Five Hour Limit Remaining\t30%'));
    assert.equal(snapshot.headlineId, 'gemini-models-session');
});

test('rejects malformed, unlicensed or unsupported quota output', () => {
    assert.throws(() => parser.parse(''), {code: 'invalidResponse'});
    for (const output of ['Authentication required', 'Model Quotas'])
        assert.throws(() => parser.parse(output), {code: 'unsupported'});
    assert.throws(() => parser.parse(null), {code: 'invalidResponse'});
});

test('invalid percentage rows are discarded rather than treated as available quota', () => {
    assert.throws(() => parser.parse('Gemini Models\tWeekly Limit Remaining\t150%\t2026-10-16T13:37:22Z'),
        {code: 'unsupported'});
    assert.throws(() => parser.parse('Gemini Models\tWeekly Limit Remaining\tNaN%\tinvalid'),
        {code: 'unsupported'});
});
