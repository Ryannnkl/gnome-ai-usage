import test from 'node:test';
import assert from 'node:assert/strict';
import {ProviderSummary} from '../src/presentation/ProviderSummary.js';
import {UsageFormatter} from '../src/presentation/UsageFormatter.js';
import {usageSnapshot} from './fixtures.js';

const summary = new ProviderSummary(new UsageFormatter());
const record = () => ({name: 'Codex', status: 'ok', fetchedAt: 1000,
    snapshot: usageSnapshot()});

test('visão geral mostra apenas a janela principal e sua renovação', () => {
    const reading = record();
    reading.snapshot.windows.push({id: 'secondary', label: 'Semanal', usedPercent: 17, resetsAt: 3000});
    const display = summary.describe(reading, 1000);
    assert.equal(display.title, 'Codex · 42% usado');
    assert.match(display.subtitle, /^5 horas · Renova em/);
    assert.equal(display.notice, null);
    assert.equal(display.usedPercent, 42);
    assert.doesNotMatch(JSON.stringify(display), /Semanal|plus/);
});

test('janela principal ausente não é substituída silenciosamente pela semanal', () => {
    const reading = record();
    reading.snapshot.windows = [{id: 'secondary', label: 'Semanal', usedPercent: 17, resetsAt: 3000}];
    const display = summary.describe(reading, 1000);
    assert.equal(display.title, 'Codex · —');
    assert.equal(display.usedPercent, null);
    assert.equal(display.subtitle, 'Janela principal não informada');
});

test('limite semanal aparece no resumo somente quando exige atenção', () => {
    const reading = record();
    reading.snapshot.windows.push({id: 'secondary', label: 'Semanal', usedPercent: 100, resetsAt: 3000});
    assert.equal(summary.describe(reading, 1000).notice, 'Semanal · 100% usado');
    assert.equal(summary.describe(reading, 3000).notice, 'Leitura precisa de confirmação');
});

test('percentual anterior e ausência de login não são apresentados como dados atuais', () => {
    const reading = record();
    reading.status = 'network';
    assert.match(summary.describe(reading, 1000).title, /anterior/);
    const missing = {name: 'Codex', status: 'needsAuth', snapshot: null, fetchedAt: null, retryAt: 0};
    assert.equal(summary.describe(missing, 1000).title, 'Codex · —');
    assert.match(summary.describe(missing, 1000).subtitle, /Login local indisponível/);
    assert.equal(summary.describe(missing, 1000).usedPercent, null);
});

test('resumo preserva percentuais conhecidos durante uma atualização normal', () => {
    assert.equal(summary.describe({...record(), refreshing: true}, 1000).title, 'Codex · 42% usado');
});
