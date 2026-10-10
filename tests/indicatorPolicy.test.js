import test from 'node:test';
import assert from 'node:assert/strict';
import {IndicatorPolicy} from '../src/domain/IndicatorPolicy.js';
import {IndicatorAppearance} from '../src/presentation/IndicatorAppearance.js';

const policy = new IndicatorPolicy();
const record = (percent, overrides = {}) => ({status: 'ok', fetchedAt: 1000,
    activityRecent: false, snapshot: {windows: [
        {id: 'primary', usedPercent: percent, resetsAt: 2000},
    ]}, ...overrides});

test('repouso e atividade recente usam um único ícone neutro sem nomes', () => {
    const idle = policy.evaluate([record(10), record(42)], 1000);
    const recent = policy.evaluate([record(10), record(42, {activityRecent: true})], 1000);
    assert.equal(idle.status, 'idle');
    assert.equal(recent.status, 'recent');
    const appearance = new IndicatorAppearance();
    assert.equal(appearance.describe(idle).iconName, appearance.describe(recent).iconName);
    assert.equal(appearance.describe(idle).colorRole, null);
    assert.ok(appearance.describe(idle).opacity < appearance.describe(recent).opacity);
});

test('75% é o limiar inclusivo para aviso em qualquer provider', () => {
    assert.equal(policy.evaluate([record(74.99)], 1000).status, 'idle');
    assert.equal(policy.evaluate([record(10), record(75)], 1000).status, 'warning');
    assert.equal(policy.evaluate([record(99.9)], 1000).status, 'warning');
});

test('limite semanal também torna o ícone vermelho e prevalece sobre aviso', () => {
    const weekly = record(10);
    weekly.snapshot.windows.push({id: 'secondary', usedPercent: 100, resetsAt: 3000});
    const state = policy.evaluate([record(80), weekly], 1000);
    assert.equal(state.status, 'exhausted');
    assert.equal(new IndicatorAppearance().describe(state).colorRole, 'error');
    assert.equal(policy.evaluate([record(105)], 1000).status, 'exhausted');
});

test('consulta em andamento não apaga o aviso da última leitura válida', () => {
    assert.equal(policy.evaluate([record(80, {refreshing: true})], 1000).status, 'warning');
});

test('ausência de dados, falha ou leitura antiga não são confundidas com repouso', () => {
    for (const records of [[], [record(10, {snapshot: null})],
        [record(10, {status: 'network'})], [record(10, {fetchedAt: null})]])
        assert.equal(policy.evaluate(records, 1000).status, 'unknown');
    assert.equal(policy.evaluate([record(10)], 1901).status, 'unknown');
    assert.equal(new IndicatorAppearance().describe(policy.evaluate([], 1000)).iconName, null);
});

test('janela vencida não mantém um alerta de limite antigo', () => {
    assert.equal(policy.evaluate([record(100)], 2000).status, 'unknown');
    const weekly = record(100);
    weekly.snapshot.windows.push({id: 'secondary', usedPercent: 100, resetsAt: 3000});
    assert.equal(policy.evaluate([weekly], 2000).status, 'exhausted');
});

test('limite conhecido prevalece sobre provider indisponível sem ocultar a incerteza', () => {
    const state = policy.evaluate([record(100), record(10, {status: 'network'})], 1000);
    assert.equal(state.status, 'exhausted');
    assert.equal(state.uncertain, true);
    assert.match(new IndicatorAppearance().describe(state).description, /confirmação/);
});

test('aviso usa a cor semântica de warning do tema, não uma cor fixa', () => {
    const appearance = new IndicatorAppearance().describe(policy.evaluate([record(75)], 1000));
    assert.equal(appearance.colorRole, 'warning');
    assert.equal(appearance.iconName, 'dialog-warning-symbolic');
});
