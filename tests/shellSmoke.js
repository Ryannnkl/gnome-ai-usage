import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {assert} from './shellAssert.js';
import {checkStatusIcon} from './shellIconChecks.js';
import {checkProviderMenus} from './shellMenuChecks.js';
import {syntheticHistory} from './shellHistoryChecks.js';

export const METRICS = {};

export async function run() {
    const uuid = 'ai-usage@ryannnkl.dev';
    await Scripting.sleep(1500);
    const extension = Main.extensionManager.lookup(uuid);
    assert(extension?.stateObj?.indicator, `Extension failed: ${extension?.error}`);
    const instance = extension.stateObj;
    const monitor = instance.monitor;
    instance.indicator.section.render([], Date.now() / 1000);
    assert(instance.indicator.section.emptyItem.visible, 'Empty provider state was not shown');
    const record = monitor.records[0];
    instance.indicator.section.render([record], Date.now() / 1000);
    assert(!instance.indicator.section.emptyItem.visible, 'Empty provider state remained visible');
    assert(record.status === 'needsAuth', `Expected isolated credentials, received ${record.status}`);
    monitor.emit();
    assert(instance.indicator.statusIcon.state === 'unknown', 'Missing usage was not marked unknown');
    assert(instance.indicator.statusIcon.progress === null,
        'Unknown usage was represented as zero consumption');
    record.succeed({headlineId: 'primary', plan: 'plus', windows: [
        {id: 'primary', label: '5 horas', usedPercent: 42, resetsAt: Date.now() / 1000 + 3600,
            duration: 18000},
        {id: 'secondary', label: 'Semanal', usedPercent: 17, resetsAt: null, duration: 604800},
    ]}, Date.now() / 1000);
    record.tokenHistory = syntheticHistory(Date.now() / 1000);
    checkStatusIcon(instance, record);
    Main.overview.hide();
    await Scripting.sleep(300);
    instance.indicator.button.menu.open({animate: false});
    await Scripting.sleep(300);
    assert(instance.indicator.button.menu.isOpen, 'Menu did not open');
    await checkProviderMenus(instance, record);
    instance.indicator.button.menu.close({animate: false});
    instance.settings.set_boolean('codex-enabled', false);
    assert(!monitor.running && !monitor.timer.source, 'Disabled monitor was not stopped');
    assert(!monitor.runner.running, 'Disabled provider requests were not canceled');
    assert(!instance.monitor.providers.length, 'Disabled provider remained in composition');
    instance.monitor.refresh('manual');
    instance.indicator.button.menu.open({animate: false});
    await Scripting.sleep(300);
    assert(!instance.monitor.runner.requests.size, 'Disabled provider was queried');
    assert(instance.indicator.section.emptyItem.visible, 'Disabled provider remained in menu');
    instance.settings.set_boolean('codex-enabled', true);
    assert(instance.monitor.providers.length === 1, 'Provider did not return after enabling');
    instance.disable();
    assert(!Main.panel.statusArea[uuid], 'Indicator leaked after disable');
    assert(!monitor.timer.source, 'Polling timer leaked');
    assert(!monitor.runner.running, 'Requests were not stopped');
    instance.enable();
    await Scripting.sleep(300);
    assert(instance.indicator, 'Re-enable failed');
    instance.disable();
    console.log('AI Usage Shell 51: ícone, resumo, detalhes, atualização e ciclo de vida validados.');
}
