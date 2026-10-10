import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {HistorySummary} from './HistorySummary.js';
import {HoverTooltip} from './HoverTooltip.js';

export class HistoryRow {
    constructor(history, available, now, summary = null, translator = null) {
        const historySummary = summary ?? new HistorySummary(undefined, translator);
        translator ??= historySummary.translator;
        const view = historySummary.describe(history, available, now);
        const accessibleName = translator?.gettext?.('Últimos 7 dias. {total}') ??
            'Últimos 7 dias. {total}';
        this.item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        this.tooltip = new HoverTooltip();
        this.item.connect('destroy', () => this.tooltip.destroy());
        this.blocks = new St.BoxLayout({style_class: 'ai-usage-history', width: 280,
            height: 96, accessible_name: accessibleName.replace('{total}', view.total)});
        this.bars = [];
        view.days.forEach((day, index) => this.addDay(day, index === 6));
        const column = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL,
            style_class: 'ai-usage-history-column', width: 280});
        column.add_child(new St.Label({text: view.title, style_class: 'ai-usage-detail'}));
        column.add_child(this.blocks);
        const weekdays = new St.BoxLayout({style_class: 'ai-usage-history'});
        view.days.forEach(day => weekdays.add_child(new St.Bin({x_expand: true, width: 32,
            child: new St.Label({text: day.initial, x_align: Clutter.ActorAlign.CENTER,
                style_class: 'ai-usage-history-caption'})})));
        column.add_child(weekdays);
        this.item.add_child(column);
    }

    addDay(day, today) {
        const block = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL,
            style_class: 'ai-usage-history-slot', width: 32, height: 96,
            reactive: true, track_hover: true, x_expand: true, y_expand: true});
        const fill = new St.Widget({style_class: 'ai-usage-history-bar', width: 32,
            height: day.tokens === null ? 0 : Math.max(2, Math.round(day.fraction * 88)),
            y_align: Clutter.ActorAlign.END, x_align: Clutter.ActorAlign.CENTER,
            visible: day.tokens !== null, opacity: today ? 255 : 140});
        block.add_child(new St.Widget({height: 96 - fill.height}));
        block.add_child(fill);
        block.connect('notify::hover', () => { fill.opacity = block.hover || today ? 255 : 140; });
        this.tooltip.bind(block, day.tooltip);
        this.bars.push({slot: block, fill, tokens: day.tokens});
        this.blocks.add_child(block);
    }
}
