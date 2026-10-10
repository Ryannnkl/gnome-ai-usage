import test from 'node:test';
import assert from 'node:assert/strict';

import { monitorHarness } from './monitorHarness.js';
import { UsageMonitor } from '../src/application/UsageMonitor.js';
import { PollingPolicy } from '../src/domain/PollingPolicy.js';

test('inicialização consulta uma vez e agenda somente quando necessário', () => {
    const harness = monitorHarness();

    harness.monitor.start();
    harness.advance(15);
    harness.timer.callback();

    assert.equal(harness.refreshes.length, 1);
    harness.setActive(true);
    harness.advance(15);
    harness.timer.callback();

    assert.equal(harness.refreshes.length, 2);
    assert.equal(harness.monitor.records[0].activityRecent, true);
    harness.setActive(false);
    harness.advance(30);
    harness.timer.callback();

    assert.equal(harness.refreshes.length, 3);
    assert.equal(harness.monitor.records[0].activityRecent, false);
});

test('providers sem identidade estável não restauram cache de outra conta', () => {
    let loads = 0;
    const provider = {
        id: 'antigravity',
        name: 'Antigravity',
        cacheable: false,
        start() {},
        destroy() {},
    };
    const monitor = new UsageMonitor(
        [provider],
        {
            load: () => {
                loads++;

                return { accountKey: 'previous-account' };
            },
        },
        new PollingPolicy(),
        () => ({ destroy() {} }),
        { start() {}, stop() {} },
        () => 1000
    );

    assert.equal(loads, 0);
    assert.equal(monitor.records[0].snapshot, null);
    monitor.destroy();
});

test('observer recebe mudanças e pode cancelar sua assinatura', () => {
    const harness = monitorHarness();
    let emissions = 0;
    const unsubscribe = harness.monitor.subscribe(() => {
        emissions++;
    });

    harness.monitor.start();

    assert.equal(emissions, 2);
    unsubscribe();
    harness.monitor.emit();

    assert.equal(emissions, 2);
});

test('troca de login cancela requisições antes de ocultar a leitura antiga', () => {
    const harness = monitorHarness();

    harness.monitor.start();
    harness.changeAccount();

    assert.equal(harness.runner.canceled, 'codex');
    assert.equal(harness.monitor.records[0].snapshot, null);
});

test('desativação remove timer e providers e impede novas consultas', () => {
    const harness = monitorHarness();

    harness.monitor.start();
    harness.monitor.destroy();
    harness.advance(300);
    harness.monitor.refresh('manual');

    assert.equal(harness.refreshes.length, 1);
    assert.equal(harness.timer.callback, null);
    assert.equal(harness.runner.destroyed, true);
    assert.equal(harness.provider.destroyed, true);
});
