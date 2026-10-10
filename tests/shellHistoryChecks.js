import St from 'gi://St';
import GLib from 'gi://GLib';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {HistoryCalendar} from '../src/domain/HistoryCalendar.js';
import {assert} from './shellAssert.js';
import {captureMenu} from './shellCapture.js';

export function syntheticHistory(now) {
    const tokens = [20000, 0, null, 10000, 40000, 30000, 20000];
    return {days: new HistoryCalendar().days(now)
        .flatMap((date, index) => tokens[index] === null ? [] : [{date, tokens: tokens[index]}])};
}

export async function checkHistory(row) {
    const history = row.details.histories.get('tokens');
    assert(history, 'Weekly history was not placed below the weekly quota');
    assert(['Últimos 7 dias.', 'Last 7 days.'].some(prefix =>
        history.blocks.accessible_name.startsWith(prefix)),
        'History accessibility name omitted its translated label');
    if (GLib.getenv('AI_USAGE_EXPECT_ENGLISH') === '1')
        assert(history.blocks.accessible_name.startsWith('Last 7 days. Recorded total:'),
            'English history accessibility text was not loaded');
    const blocks = history.blocks.get_children();
    assert(blocks.length === 7, 'History must show exactly seven daily blocks');
    assert(blocks.every(block => block.get_children().every(child => !(child instanceof St.Label))),
        'History contains visible day or number labels');
    assert(!history.bars[2].fill.visible, 'Missing data became a positive bar');
    assert(history.bars[1].fill.visible && history.bars[1].fill.height === 2,
        'Confirmed zero consumption was confused with missing data');
    assert(history.bars[0].fill.height === 44 && history.bars[4].fill.height === 88,
        `Bar heights are not proportional: ${history.bars.map(bar => bar.fill.height).join(',')}`);
    const baselines = history.bars.filter(bar => bar.tokens !== null)
        .map(bar => bar.fill.get_allocation_box().y2);
    assert(Math.max(...baselines) - Math.min(...baselines) < 1,
        'History bars do not share a bottom baseline');
    assert(history.blocks.width <= 280, 'History widened the provider menu');
    const reference = new St.Widget({style: 'background-color: -st-accent-color;'});
    history.blocks.add_child(reference);
    const accent = reference.get_theme_node().get_background_color();
    const fill = history.bars[6].fill.get_theme_node().get_background_color();
    assert(fill.to_string() === accent.to_string(), 'History bar ignores the GNOME accent');
    reference.destroy();
    history.bars[4].slot.set_hover(true);
    await Scripting.sleep(350);
    assert(history.tooltip.label.visible, 'Hover did not show the history tooltip');
    assert(['40.000 tokens', '40,000 tokens'].some(text =>
        history.tooltip.label.text.includes(text)), 'Tooltip omitted daily usage');
    assert(['Total registrado: 120.000 tokens', 'Recorded total: 120,000 tokens'].some(text =>
        history.tooltip.label.text.includes(text)), 'Tooltip omitted total');
    assert(Number.isFinite(history.tooltip.label.x) && Number.isFinite(history.tooltip.label.y),
        'Tooltip position is invalid');
    await captureMenu('-history-tooltip');
    history.bars[4].slot.set_hover(false);
    assert(!history.tooltip.label.visible && !history.tooltip.source, 'Hover tooltip did not hide');
}
