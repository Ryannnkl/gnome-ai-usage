import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { HistorySummary } from './HistorySummary.js';
import { HoverTooltip } from './HoverTooltip.js';

export class HistoryRow {
    constructor(history, available, now, summary = null, translator = null) {
        this.summary = summary ?? new HistorySummary(undefined, translator);
        translator ??= this.summary.translator;
        this.accessibleName =
            translator?.gettext?.('Últimos 7 dias. {total}') ?? 'Últimos 7 dias. {total}';

        this.item = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
        this.tooltip = new HoverTooltip();

        this.item.connect('destroy', () => this.tooltip.destroy());

        this.blocks = new St.BoxLayout({ style_class: 'ai-usage-history', width: 280, height: 96 });
        this.bars = [];

        for (let index = 0; index < 7; index++)
            this.addDay(index === 6);

        const column = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'ai-usage-history-column',
            width: 280,
        });

        this.title = new St.Label({ style_class: 'ai-usage-detail' });

        column.add_child(this.title);
        column.add_child(this.blocks);

        const weekdays = new St.BoxLayout({ style_class: 'ai-usage-history' });

        this.bars.forEach(bar =>
            weekdays.add_child(new St.Bin({ x_expand: true, width: 32, child: bar.caption }))
        );
        column.add_child(weekdays);

        this.total = new St.Label({ style_class: 'ai-usage-detail' });

        column.add_child(this.total);
        this.item.add_child(column);

        this.render(history, available, now);
    }

    render(history, available, now) {
        const view = this.summary.describe(history, available, now);

        this.title.text = view.title;
        this.total.text = view.total;
        this.blocks.accessible_name = this.accessibleName.replace('{total}', view.total);

        view.days.forEach((day, index) => {
            const bar = this.bars[index];

            bar.tokens = day.tokens;
            bar.fill.height = day.tokens === null ? 0 : Math.max(2, Math.round(day.fraction * 88));
            bar.spacer.height = 96 - bar.fill.height;
            bar.fill.visible = day.tokens !== null;
            bar.caption.text = day.initial;

            this.tooltip.update(bar.slot, day.tooltip);
        });
    }

    addDay(today) {
        const block = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'ai-usage-history-slot',
            width: 32,
            height: 96,
            reactive: true,
            track_hover: true,
            x_expand: true,
            y_expand: true,
        });
        const fill = new St.Widget({
            style_class: 'ai-usage-history-bar',
            width: 32,
            height: 0,
            y_align: Clutter.ActorAlign.END,
            x_align: Clutter.ActorAlign.CENTER,
            visible: false,
            opacity: today ? 255 : 140,
        });
        const spacer = new St.Widget({ height: 96 });

        block.add_child(spacer);
        block.add_child(fill);
        block.connect('notify::hover', () => {
            fill.opacity = block.hover || today ? 255 : 140;
        });
        this.tooltip.bind(block, '');

        const caption = new St.Label({
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'ai-usage-history-caption',
        });

        this.bars.push({ slot: block, fill, spacer, caption, tokens: null });
        this.blocks.add_child(block);
    }
}
