import St from 'gi://St';

import { assert } from './shellAssert.js';

export function checkStatusIcon(instance, record) {
    const monitor = instance.monitor;
    const focused = instance.indicator.focusedIndicator;
    const { session, weekly } = focused;

    monitor.emit();

    assert(focused.name.text === 'Codex', 'Panel omitted the focused provider name');
    assert(focused.actor.get_children().length === 3, 'Provider name is repeated for each ring');
    assert(session.state === 'idle' && weekly.state === 'idle', 'Idle states were not rendered');
    assert(session.usedPercent === 42 && weekly.usedPercent === 17, 'Quota durations were mixed');

    for (const ring of [session, weekly]) {
        assert(ring.icon instanceof St.DrawingArea, 'Expected a drawn quota ring');
        assert(ring.motionSignals.length === (St.ReducedMotion ? 2 : 1), 'Invalid motion observers');
        assert(!ring.animation.source, 'Disabled animations left a repeating timer');
    }

    record.snapshot.windows[1].usedPercent = 75;
    monitor.emit();

    const colors = instance.indicator.button.get_theme_node().get_icon_colors();

    assert(weekly.state === 'warning', 'Weekly warning was not rendered');
    assert(weekly.icon.get_style() === `color: ${colors.warning.to_string()};`, 'Warning ignores theme');
    assert(session.state === 'idle', 'Weekly warning leaked into the five-hour ring');
    record.snapshot.windows[1].usedPercent = 100;
    monitor.emit();

    assert(weekly.state === 'exhausted', 'Weekly exhaustion was not rendered');
    assert(weekly.icon.get_style() === `color: ${colors.error.to_string()};`, 'Exhaustion ignores theme');
    assert(session.icon.get_style() === 'color: -st-accent-color;', 'Session lost its own accent color');
    record.snapshot.windows[1].usedPercent = 17;
    record.activityRecent = true;
    monitor.emit();

    assert(session.state === 'recent' && weekly.state === 'recent', 'Recent activity was not rendered');
    record.activityRecent = false;
    monitor.emit();
}
