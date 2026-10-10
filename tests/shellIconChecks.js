import {assert} from './shellAssert.js';

export function checkStatusIcon(instance, record) {
    const monitor = instance.monitor;
    monitor.emit();
    assert(instance.indicator.statusIcon.state === 'idle', 'Idle status was not rendered');
    const icon = instance.indicator.statusIcon.icon;
    assert(icon.gicon.equal(instance.indicator.statusIcon.neutralIcon), 'Expected a symbolic chip icon');
    assert(instance.indicator.button.get_children().length === 1, 'Panel contains extra items');
    record.snapshot.windows[1].usedPercent = 75;
    monitor.emit();
    assert(instance.indicator.statusIcon.state === 'warning', 'Weekly warning was not rendered');
    const colors = instance.indicator.button.get_theme_node().get_icon_colors();
    assert(icon.get_style() === `color: ${colors.warning.to_string()};`, 'Warning ignores theme');
    record.snapshot.windows[1].usedPercent = 100;
    monitor.emit();
    assert(instance.indicator.statusIcon.state === 'exhausted', 'Weekly exhaustion was not rendered');
    assert(icon.get_style() === `color: ${colors.error.to_string()};`, 'Exhaustion ignores theme');
    record.snapshot.windows[1].usedPercent = 17;
    record.activityRecent = true;
    monitor.emit();
    assert(instance.indicator.statusIcon.state === 'recent', 'Recent activity was not rendered');
    assert(icon.get_style() === null, 'Alert color was not cleared');
    record.activityRecent = false;
    monitor.emit();
}
