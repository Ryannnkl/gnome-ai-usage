import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

import { assert } from './shellAssert.js';

export async function checkPanelFocus(instance, record) {
    const { monitor, indicator, settings } = instance;
    const focused = indicator.focusedIndicator;
    const other = {
        ...record,
        id: 'claude',
        name: 'Claude',
        snapshot: {
            ...record.snapshot,
            windows: record.snapshot.windows.map(window => ({
                ...window,
                usedPercent: window.duration === 18000 ? 60 : 5,
            })),
        },
    };

    monitor.records.push(other);
    monitor.emit();

    assert(focused.providerId === 'claude', 'Automatic focus did not follow five-hour use');
    assert(focused.weekly.usedPercent === 5, 'Automatic focus used another provider weekly quota');
    const lastAttempt = record.lastAttempt;

    settings.set_uint('focused-provider', 1);

    assert(instance.monitor === monitor, 'Changing focus restarted provider collection');
    assert(instance.indicator === indicator, 'Changing focus recreated the menu');
    assert(focused.name.text === 'Codex', 'Fixed focus did not update immediately');
    assert(
        focused.session.usedPercent === 42 && focused.weekly.usedPercent === 17,
        'Fixed focus mixed providers'
    );
    assert(record.lastAttempt === lastAttempt, 'Changing focus triggered a provider query');
    settings.set_uint('focused-provider', 3);

    assert(focused.name.text === 'Antigravity', 'Unavailable fixed provider lost its name');
    assert(
        focused.session.progress === null && focused.weekly.progress === null,
        'Unavailable focus showed zero use'
    );
    assert(
        focused.session.uncertain && focused.weekly.uncertain,
        'Unavailable quotas were not marked uncertain'
    );
    settings.set_uint('focused-provider', 0);

    assert(focused.providerId === 'claude', 'Automatic focus was not restored');
    other.snapshot.windows[0].usedPercent = 42;
    monitor.emit();

    assert(focused.providerId === 'claude', 'A tie unnecessarily changed the focused provider');
    monitor.records.pop();
    monitor.emit();

    assert(focused.providerId === 'codex', 'Removed provider remained in automatic focus');
    indicator.button.set_hover(true);
    await Scripting.sleep(350);

    assert(focused.tooltip.label.visible, 'Panel tooltip did not open');
    assert(
        focused.tooltip.label.text.includes('42%') && focused.tooltip.label.text.includes('17%'),
        'Panel tooltip omitted quotas'
    );
    indicator.button.set_hover(false);
    focused.tooltip.hide();
}
