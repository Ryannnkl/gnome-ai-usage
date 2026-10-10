import test from 'node:test';
import assert from 'node:assert/strict';
import {HistorySummary} from '../src/presentation/HistorySummary.js';
import {historyHarness, historyNow as now} from './historyFixtures.js';

const summary = new HistorySummary(historyHarness().calendar, null, 'pt-BR');

test('shows seven chronological dated blocks and only totals observed values', () => {
    const view = summary.describe({days: [
        {date: '2026-10-04', tokens: 2000}, {date: '2026-10-10', tokens: 3500},
        {date: '2026-10-03', tokens: 99000},
    ]}, true, now);
    assert.equal(view.days.length, 7);
    assert.equal(view.days[0].label, '04/10');
    assert.equal(view.days[6].weekday, 'sábado');
    assert.equal(view.days[6].initial, 'S');
    assert.equal(view.days[6].value, '3.500');
    assert.equal(view.total, 'Total registrado: 5.500 tokens');
});

test('missing data and unsupported account identity never become zero consumption', () => {
    const empty = summary.describe(null, true, now);
    assert.ok(empty.days.every(day => day.value === '—'));
    assert.equal(empty.total, 'Total registrado: —');
    const unavailable = summary.describe({days: [{date: '2026-10-10', tokens: 20}]}, false, now);
    assert.ok(unavailable.days.every(day => day.value === '—'));
    assert.equal(unavailable.total, 'Histórico indisponível');
    const zero = summary.describe({days: [{date: '2026-10-10', tokens: 0}]}, true, now);
    assert.equal(zero.days[6].value, '0');
    assert.equal(zero.total, 'Total registrado: 0 tokens');
});

test('fractional tokens are rejected rather than displayed as real usage', () => {
    const view = summary.describe({days: [{date: '2026-10-10', tokens: 0.004}]}, true, now);
    assert.equal(view.days[6].value, '—');
    assert.equal(view.total, 'Total registrado: —');
});

test('bar heights share one scale and hover details contain dates, values and total', () => {
    const view = summary.describe({days: [
        {date: '2026-10-04', tokens: 2}, {date: '2026-10-10', tokens: 4},
    ]}, true, now);
    assert.equal(view.days[0].fraction, 0.5);
    assert.equal(view.days[6].fraction, 1);
    assert.equal(view.days[1].fraction, 0);
    assert.match(view.days[6].tooltip, /10\/10\n4 tokens/);
    assert.ok(!view.days[6].tooltip.includes('Total registrado'));
    assert.equal(view.total, 'Total registrado: 6 tokens');
    assert.match(view.days[1].tooltip, /Sem dados/);
});

test('uses injected gettext and plural translations for visible history text', () => {
    const messages = [];
    const translator = {
        gettext: message => {
            messages.push(message);
            return ({
                'Histórico indisponível': 'History unavailable',
                'Total registrado: {value} tokens': 'Recorded total: {value} tokens',
                'Sem dados': 'No data',
            })[message] ?? message;
        },
        ngettext: (singular, plural, count) => count === 1 ?
            '{value} token' : '{value} tokens',
    };
    const translated = new HistorySummary(historyHarness().calendar, translator, 'en-US');
    const view = translated.describe({days: [
        {date: '2026-10-04', tokens: 1}, {date: '2026-10-10', tokens: 4},
    ]}, true, now);
    assert.equal(view.total, 'Recorded total: 5 tokens');
    assert.match(view.days[0].tooltip, /10\/04\n1 token/);
    assert.match(view.days[6].tooltip, /10\/10\n4 tokens/);
    assert.match(view.days[1].tooltip, /No data/);
    assert.ok(!messages.includes('{value} tokens'));
});
