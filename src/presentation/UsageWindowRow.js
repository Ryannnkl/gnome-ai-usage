import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { UsageBar } from './UsageBar.js';

export class UsageWindowRow {
    constructor(formatter) {
        this.formatter = formatter;
        this.item = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });

        const column = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'ai-usage-window',
        });

        this.title = new St.Label();
        this.usageBar = new UsageBar();
        this.reset = new St.Label({ style_class: 'ai-usage-detail' });

        column.add_child(this.title);
        column.add_child(this.usageBar.actor);
        column.add_child(this.reset);
        this.item.add_child(column);
    }

    render(window, now) {
        this.title.text = this.formatter
            .gettext('{label} · {percent} usado')
            .replace('{label}', this.formatter.windowLabel(window))
            .replace('{percent}', this.formatter.percent(window.usedPercent));

        this.usageBar.render(window.usedPercent);
        this.reset.text = this.formatter.reset(window.resetsAt, now);
    }
}
