import test from 'node:test';
import assert from 'node:assert/strict';
import {UsageFormatter} from '../src/presentation/UsageFormatter.js';
import {UsageRecord} from '../src/domain/UsageRecord.js';
import {usageSnapshot} from './fixtures.js';

const formatter = new UsageFormatter();

test('percentuais são exibidos somente nos detalhes de uso', () => {
    assert.equal(formatter.percent(42), '42%');
    assert.equal(formatter.percent(0), '0%');
});

test('renovação vencida pede confirmação em vez de inventar cota zero', () => {
    assert.equal(formatter.reset(1000, 1001), 'Renovação aguardando confirmação');
    assert.equal(formatter.reset(null, 1001), 'Renovação não informada');
    assert.equal(formatter.reset(1120, 1000), 'Renova em 2 min');
});

test('rótulos de janela preservam português e selecionam plural por contagem', () => {
    assert.equal(formatter.windowLabel({label: 'Janela principal'}), 'Janela principal');
    assert.equal(formatter.windowLabel({label: '1 horas'}), '1 hora');
    assert.equal(formatter.windowLabel({label: 'Grupo · Semanal · 5 horas'}),
        'Grupo · Semanal · 5 horas');
});

test('indica idade e falha de atualização sem apagar o consumo anterior', () => {
    const record = new UsageRecord({id: 'codex', name: 'Codex'});
    record.succeed(usageSnapshot(), 1000);
    record.status = 'network';
    assert.equal(record.snapshot.windows[0].usedPercent, 42);
    assert.match(formatter.age(record, 1120), /Desatualizado/);
    assert.match(formatter.status(record, 1120), /Não foi possível/);
});

test('usa gettext e ngettext injetados para mensagens e rótulos', () => {
    const messages = {
        'Renova em %s': 'Renews in %s',
        'Desatualizado · ': 'Stale · ',
        'Lido há %s': 'Read %s ago',
        'Não foi possível consultar o provedor.': 'Provider unavailable.',
        'Janela principal': 'Primary window',
        Semanal: 'Weekly',
    };
    const forms = {min: ['min', 'mins'], hora: ['hour', 'hours'], dia: ['day', 'days']};
    const translated = new UsageFormatter({
        gettext: message => messages[message] ?? message,
        ngettext: (singular, plural, count) =>
            forms[singular]?.[count === 1 ? 0 : 1] ?? (count === 1 ? singular : plural),
    });
    const record = new UsageRecord({id: 'codex', name: 'Codex'});
    record.succeed(usageSnapshot(), 1000);
    record.status = 'network';

    assert.equal(translated.reset(1120, 1000), 'Renews in 2 mins');
    assert.equal(translated.age(record, 1120), 'Stale · Read 2 mins ago');
    assert.equal(translated.status(record, 1120), 'Provider unavailable.');
    assert.equal(translated.windowLabel({label: 'Janela principal · Semanal · 5 horas'}),
        'Primary window · Weekly · 5 hours');
    assert.equal(translated.windowLabel({label: '1 dias'}), '1 day');
});
