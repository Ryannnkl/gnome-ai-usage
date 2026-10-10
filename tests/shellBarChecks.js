import St from 'gi://St';
import {assert} from './shellAssert.js';

function labelsWithin(actor) {
    return actor.get_children().flatMap(child =>
        child instanceof St.Label ? [child] : labelsWithin(child));
}

export function checkUsageBars(row) {
    const bar = row.usageBar;
    assert(bar.actor.visible, 'Session usage bar was hidden');
    assert(Math.abs(bar.fill.width - 280 * 0.42) < 0.1, 'Bar does not represent session use');
    const accentReference = new St.Widget({style: 'background-color: -st-accent-color;'});
    bar.actor.add_child(accentReference);
    const accent = accentReference.get_theme_node().get_background_color();
    const fill = bar.fill.get_theme_node().get_background_color();
    const track = bar.actor.get_theme_node().get_background_color();
    assert(fill.to_string() === accent.to_string(), 'Fill ignores the GNOME accent color');
    assert(track.alpha < fill.alpha, 'Track is not visually distinct from used quota');
    accentReference.destroy();
    for (const percent of [0, 24, 75, 100, 120]) {
        bar.render(percent);
        assert(bar.actor.visible, 'Valid quota should show its track');
        assert(Math.abs(bar.fill.width - 280 * Math.min(100, percent) / 100) < 0.1,
            'Usage bar width is incorrect');
        assert(bar.fill.visible === (percent > 0), 'Zero use has a visible fill');
    }
    for (const percent of [null, undefined, NaN, -1]) {
        bar.render(percent);
        assert(!bar.actor.visible, 'Missing or invalid quota was shown as zero');
    }
    bar.render(42);
    const textColor = row.details.menu.actor.get_theme_node().get_foreground_color();
    for (const label of labelsWithin(row.details.menu.actor)) {
        const actual = label.get_theme_node().get_foreground_color();
        assert(actual.to_string() === textColor.to_string(), 'Detail text overrides theme text color');
    }
}
