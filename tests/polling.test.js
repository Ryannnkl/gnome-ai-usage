import test from 'node:test';
import assert from 'node:assert/strict';

import { PollingPolicy } from '../src/domain/PollingPolicy.js';
import { BackoffPolicy } from '../src/domain/BackoffPolicy.js';
import { UsageError } from '../src/domain/UsageError.js';
import { RetryAfterParser } from '../src/infrastructure/RetryAfterParser.js';

const policy = new PollingPolicy();
const record = () => ({
    lastAttempt: 1000,
    nextRefreshAt: 1030,
    retryAt: 0,
    refreshing: false,
    wasActive: false,
});

test('consulta no prazo sorteado tanto com atividade quanto em repouso', () => {
    assert.equal(policy.shouldRefresh(record(), 1029, true), false);
    assert.equal(policy.shouldRefresh(record(), 1030, true), true);
    assert.equal(policy.shouldRefresh(record(), 1029, false), false);
    assert.equal(policy.shouldRefresh(record(), 1030, false), true);
});

test('menu e botão respeitam espaçamento, backoff e requisições em andamento', () => {
    assert.equal(policy.shouldRefresh(record(), 1014, false, 'look'), false);
    assert.equal(policy.shouldRefresh(record(), 1015, false, 'look'), true);
    assert.equal(policy.shouldRefresh({ ...record(), retryAt: 2000 }, 1100, true, 'manual'), false);
    assert.equal(policy.shouldRefresh({ ...record(), refreshing: true }, 2000, true), false);
});

test('sorteia uma vez por conclusão, incluindo os limites de 20 e 60 segundos', () => {
    let draws = 0;
    const values = [0, 0.999999, 0.5];
    const randomized = new PollingPolicy(() => values[draws++]);
    const reading = record();

    for (const delay of [20, 60, 40]) {
        randomized.schedule(reading, 2000);

        assert.equal(reading.nextRefreshAt, 2000 + delay);
        assert.equal(randomized.shouldRefresh(reading, 2000 + delay - 1, true), false);
        assert.equal(randomized.shouldRefresh(reading, 2000 + delay, false), true);
    }

    assert.equal(draws, 3);
});

test('backoff prevalece sobre o prazo sorteado em atualizações automáticas', () => {
    assert.equal(policy.shouldRefresh({ ...record(), retryAt: 1100 }, 1099, true), false);
    assert.equal(policy.shouldRefresh({ ...record(), retryAt: 1100 }, 1100, true), true);
});

test('429 aplica recuo exponencial sem diminuir Retry-After do servidor', () => {
    const backoff = new BackoffPolicy();

    assert.deepEqual(
        [0, 1, 2, 3, 4, 5].map(failures => backoff.delay(new UsageError('rateLimited'), failures)),
        [60, 120, 240, 480, 900, 900]
    );
    assert.equal(backoff.delay(new UsageError('rateLimited', 3600), 0), 3600);
});

test('Retry-After aceita segundos e data HTTP e ignora valores inválidos', () => {
    const retry = new RetryAfterParser();

    assert.equal(retry.parse('120', 0), 120);
    assert.equal(retry.parse('Thu, 01 Jan 1970 00:02:00 GMT', 60), 60);
    assert.equal(retry.parse('invalid'), 0);
    assert.equal(retry.parse('0'), 0);
});
