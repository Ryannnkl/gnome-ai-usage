import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {syntheticHistory} from './shellHistoryChecks.js';
import {TokenHistoryReader} from '../src/infrastructure/TokenHistoryReader.js';
import {UsageCommand} from '../src/infrastructure/UsageCommand.js';
import {HistoryCalendar} from '../src/domain/HistoryCalendar.js';

export const METRICS = {};

export async function run() {
    await Scripting.sleep(1500);
    const instance = Main.extensionManager.lookup('ai-usage@ryannnkl.com')?.stateObj;
    if (!instance?.indicator)
        throw new Error('Extension preview failed');
    const record = instance.monitor.records[0];
    const now = Date.now() / 1000;
    instance.monitor.destroy();
    record.succeed({plan: 'plus', headlineId: 'primary', windows: [
        {id: 'primary', label: '5 horas', usedPercent: 42, resetsAt: now + 3600, duration: 18000},
        {id: 'secondary', label: 'Semanal', usedPercent: 17, resetsAt: now + 604800, duration: 604800},
    ]}, now);
    record.tokenHistory = syntheticHistory(now);
    const points = [1, 4, 3, 3.5, 3.1, 3.3, 0.5];
    record.tokenHistory.days = record.tokenHistory.days.map((day, index) =>
        ({...day, tokens: Math.round(points[index] * 1000000)}));
    const localHome = GLib.getenv('AI_USAGE_PREVIEW_CODEX_HOME');
    if (localHome) {
        const reader = new TokenHistoryReader(new UsageCommand(), GLib.find_program_in_path('python3'),
            `${GLib.get_current_dir()}/src/infrastructure/tokens/collect.py`,
            {codex: localHome}, new HistoryCalendar());
        record.tokenHistory = await reader.read('codex', new Gio.Cancellable(), now);
    }
    instance.indicator.render([record]);
    Main.overview.hide();
    await Scripting.sleep(300);
    instance.indicator.button.menu.open({animate: false});
    instance.indicator.section.rows.get('codex').item.setSubmenuShown(true);
    console.log(`Prévia aberta: cotas de exemplo; tokens ${localHome ? 'locais reais' : 'sintéticos'}.`);
    while (true)
        await Scripting.sleep(60000);
}
