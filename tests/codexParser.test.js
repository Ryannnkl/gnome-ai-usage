import test from 'node:test';
import assert from 'node:assert/strict';

import { CodexUsageParser } from '../src/providers/codex/CodexUsageParser.js';
import { CodexCredentialsParser } from '../src/providers/codex/CodexCredentialsParser.js';
import { usagePayload } from './fixtures.js';

const parser = new CodexUsageParser();

test('normaliza cotas e usa a duração publicada pelo provider', () => {
    const reading = parser.parse(usagePayload(), 1000);

    assert.equal(reading.plan, 'plus');
    assert.equal(reading.headlineId, 'primary');
    assert.deepEqual(
        reading.windows.map(window => window.label),
        ['5 horas', 'Semanal']
    );
    assert.equal(reading.windows[0].usedPercent, 42);
    assert.equal(reading.windows[1].resetsAt, 5000);
});

test('preserva a janela válida quando a outra está ausente ou malformada', () => {
    const payload = usagePayload();

    payload.rate_limit.primary_window.used_percent = null;

    const reading = parser.parse(payload, 1000);

    assert.equal(reading.windows.length, 1);
    assert.equal(reading.windows[0].id, 'secondary');
    assert.equal(reading.headlineId, 'primary');
});

test('aceita consumo zero e ausência de reset sem inventar timestamps', () => {
    const payload = usagePayload(0);

    delete payload.rate_limit.primary_window.reset_at;

    const reading = parser.parse(payload, 1000);

    assert.equal(reading.windows[0].usedPercent, 0);
    assert.equal(reading.windows[0].resetsAt, null);
});

test('não assume que todo plano tem uma janela de cinco horas', () => {
    const payload = usagePayload();

    payload.rate_limit.primary_window.limit_window_seconds = 2592000;

    assert.equal(parser.parse(payload, 1000).windows[0].label, '30 dias');
});

test('resposta incompatível nunca vira consumo zero', () => {
    for (const payload of [null, [], 'html'])
        assert.throws(() => parser.parse(payload, 1000), { code: 'invalidResponse' });

    for (const payload of [
        {},
        { rate_limit: {} },
        { rate_limit: { primary_window: { used_percent: -1 } } },
    ])
        assert.throws(() => parser.parse(payload, 1000), { code: 'unsupported' });
});

test('credenciais de assinatura são lidas; login por API key é recusado', () => {
    const credentials = new CodexCredentialsParser();

    assert.deepEqual(
        credentials.parse(
            JSON.stringify({
                tokens: {
                    access_token: 'synthetic-token',
                    account_id: 'synthetic-account',
                },
            })
        ),
        { accessToken: 'synthetic-token', accountId: 'synthetic-account' }
    );

    for (const contents of ['invalid', 'null', '{}', '{"OPENAI_API_KEY":"synthetic"}'])
        assert.throws(() => credentials.parse(contents), { code: 'needsAuth' });
});
