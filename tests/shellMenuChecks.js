import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {assert} from './shellAssert.js';
import {captureMenu} from './shellCapture.js';
import {checkUsageBars} from './shellBarChecks.js';

export async function checkProviderMenus(instance, record) {
    const section = instance.indicator.section;
    const row = section.rows.get('codex');
    assert(section.rows.size === 1, 'Expected one compact row per provider');
    assert(row.item.label.text === 'Codex · 42% usado', 'Summary omitted the session reading');
    assert(!row.item.menu.isOpen, 'Details should start collapsed');
    assert(!row.notice.visible, 'Healthy weekly data leaked into the summary');
    await captureMenu();
    row.item.setSubmenuShown(true);
    await Scripting.sleep(300);
    assert(row.item.menu.isOpen, 'Details did not expand');
    assert(row.details.menu.numMenuItems === 3, 'Details should contain only plan and usage windows');
    checkUsageBars(row);
    await captureMenu('-details');
    record.snapshot.windows[0].usedPercent = 43;
    instance.monitor.emit();
    assert(section.rows.get('codex') === row, 'Refresh replaced the provider row');
    assert(row.item.menu.isOpen, 'Refresh closed the details');
    assert(row.item.label.text === 'Codex · 43% usado', 'Refresh did not update the summary');
    assert(Math.abs(row.usageBar.fill.width - 280 * 0.43) < 0.1, 'Refresh did not update the bar');
    const other = {...record, id: 'other', name: 'Outro provider'};
    instance.monitor.records.push(other);
    instance.monitor.emit();
    assert(section.rows.size === 2, 'Second provider summary was not added');
    assert(instance.indicator.button.get_children().length === 1, 'Second provider expanded the panel');
    section.rows.get('other').item.setSubmenuShown(true);
    await Scripting.sleep(300);
    assert(!row.item.menu.isOpen, 'Multiple providers expanded at the same time');
    instance.monitor.records.pop();
    instance.monitor.emit();
    assert(section.rows.size === 1, 'Removed provider summary leaked');
}
