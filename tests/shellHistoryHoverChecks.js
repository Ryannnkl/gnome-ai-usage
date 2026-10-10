import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {assert} from './shellAssert.js';

export async function checkHistoryHover(instance, row) {
    const history = row.details.histories.get('tokens');
    const enter = slot => slot.set_hover(true);
    const menuSize = row.item.menu.actor.get_size();
    enter(history.bars[0].slot);
    await Scripting.sleep(350);
    assert(history.bars[0].slot.hover && history.tooltip.label.visible,
        'Entering the first bar did not open the daily tooltip');
    let hidden = 0;
    const signal = history.tooltip.label.connect('notify::visible', label => {
        if (!label.visible)
            hidden++;
    });
    try {
        for (let index = 1; index < 7; index++) {
            const previous = history.bars[index - 1].slot;
            previous.set_hover(false);
            await Scripting.sleep(25);
            enter(history.bars[index].slot);
            await Scripting.sleep(40);
            assert(history.tooltip.label.visible && history.bars[index].slot.hover,
                'Tooltip blinked while crossing the gap between days');
        }
        assert(hidden === 0, 'Tooltip was hidden while moving between bars');
        const label = history.tooltip.label;
        const slots = history.bars.map(bar => bar.slot);
        instance.monitor.emit();
        await Scripting.sleep(50);
        assert(row.details.histories.get('tokens') === history && history.tooltip.label === label,
            'Monitor update replaced the graph or tooltip');
        assert(slots.every((slot, index) => history.bars[index].slot === slot),
            'Monitor update recreated the daily actors');
        assert(hidden === 0 && history.tooltip.label.visible, 'Refresh interrupted hovering');
        assert(row.item.menu.actor.get_size().every((size, index) => size === menuSize[index]),
            'Hovering or refreshing changed menu dimensions');
    } finally {
        history.tooltip.label.disconnect(signal);
        history.bars.forEach(bar => bar.slot.set_hover(false));
        await Scripting.sleep(150);
    }
    enter(history.bars[3].slot);
    row.item.setSubmenuShown(false);
    await Scripting.sleep(350);
    assert(!history.tooltip.label.visible && !history.tooltip.source,
        'Closing details left a tooltip or delayed hover timer');
    row.item.setSubmenuShown(true);
    history.bars.forEach(bar => bar.slot.set_hover(false));
    await Scripting.sleep(300);
}
