import GLib from 'gi://GLib';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {assert} from './shellAssert.js';
import {captureMenu} from './shellCapture.js';
import {checkUsageBars} from './shellBarChecks.js';
import {checkHistory} from './shellHistoryChecks.js';
import {checkHistoryHover} from './shellHistoryHoverChecks.js';

export async function checkProviderMenus(instance, record) {
    const section = instance.indicator.section;
    const row = section.rows.get('codex');
    assert(section.rows.size === 1, 'Expected one compact row per provider');
    assert(['Codex · 42% usado', 'Codex · 42% used'].includes(row.item.label.text),
        'Summary omitted the session reading');
    if (GLib.getenv('AI_USAGE_EXPECT_ENGLISH') === '1')
        assert(row.item.label.text === 'Codex · 42% used', 'English summary was not loaded');
    assert(!row.item.menu.isOpen, 'Details should start collapsed');
    assert(!row.notice.visible, 'Healthy weekly data leaked into the summary');
    await captureMenu();
    row.item.setSubmenuShown(true);
    await Scripting.sleep(300);
    assert(row.item.menu.isOpen, 'Details did not expand');
    assert(row.details.windows.size === 1 && row.details.plan.item.visible &&
        !row.details.status.item.visible, 'Details should contain plan, secondary quota and history');
    const now = Date.now() / 1000;
    const displayed = [];
    const addWindow = row.details.addWindow;
    row.details.addWindow = window => displayed.push(window.id);
    row.details.render(record, now);
    assert(displayed.join(',') === 'secondary', 'Primary quota was duplicated in details');
    displayed.length = 0;
    row.details.render({...record, snapshot: {...record.snapshot, headlineId: 'secondary'}}, now);
    assert(displayed.join(',') === 'primary', 'Details filtered by label rather than headline ID');
    displayed.length = 0;
    row.details.render({...record, snapshot: {...record.snapshot, headlineId: 'missing'}}, now);
    assert(displayed.join(',') === 'primary,secondary', 'Missing headline hid available quotas');
    row.details.addWindow = addWindow;
    row.details.render(record, now);
    await Scripting.sleep(300);
    checkUsageBars(row);
    await checkHistory(row);
    await checkHistoryHover(instance, row);
    await captureMenu('-details');
    record.snapshot.windows[0].usedPercent = 43;
    const oldTooltip = row.details.histories.get('tokens').tooltip;
    instance.monitor.emit();
    assert(row.details.histories.get('tokens').tooltip === oldTooltip && oldTooltip.label,
        'Refresh rebuilt the history tooltip instead of updating it');
    assert(section.rows.get('codex') === row, 'Refresh replaced the provider row');
    assert(row.item.menu.isOpen, 'Refresh closed the details');
    assert(['Codex · 43% usado', 'Codex · 43% used'].includes(row.item.label.text),
        'Refresh did not update the summary');
    assert(Math.abs(row.usageBar.fill.width - 280 * 0.43) < 0.1, 'Refresh did not update the bar');
    const other = {...record, id: 'other', name: 'Outro provider'};
    instance.monitor.records.push(other);
    instance.monitor.emit();
    assert(section.rows.size === 2, 'Second provider summary was not added');
    assert(instance.indicator.button.get_children().length === 1, 'Second provider expanded the panel');
    section.rows.get('other').item.setSubmenuShown(true);
    await Scripting.sleep(300);
    assert(!row.item.menu.isOpen, 'Multiple providers expanded at the same time');
    const removedHistory = section.rows.get('other').details.histories.get('tokens');
    removedHistory.bars[0].slot.set_hover(true);
    instance.monitor.records.pop();
    instance.monitor.emit();
    assert(section.rows.size === 1, 'Removed provider summary leaked');
    assert(!removedHistory.tooltip.label && !removedHistory.tooltip.source &&
        !removedHistory.tooltip.bindings.size, 'Removed provider leaked tooltip actors or signals');
}
