import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {UsageBar} from './UsageBar.js';

export class ProviderDetails {
    constructor(formatter) {
        this.formatter = formatter;
        this.menu = new PopupMenu.PopupMenuSection();
        this.menu.actor.add_style_class_name('ai-usage-details');
    }

    render(record, now) {
        this.menu.removeAll();
        const plan = record.snapshot?.plan;
        if (plan)
            this.addText(`Plano · ${plan}`, 'ai-usage-title');
        const snapshot = record.snapshot;
        snapshot?.windows.forEach(window => this.addWindow(window, now));
        if (record.status !== 'ok')
            this.addText(this.formatter.status(record, now), 'ai-usage-detail');
    }

    addText(text, styleClass) {
        const item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        const label = new St.Label({text, style_class: styleClass});
        if (styleClass === 'ai-usage-detail') {
            label.width = 280;
            label.clutter_text.line_wrap = true;
            label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
            label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        }
        item.add_child(label);
        this.menu.addMenuItem(item);
    }

    addWindow(window, now) {
        const item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        const column = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL,
            style_class: 'ai-usage-window'});
        column.add_child(new St.Label({
            text: `${window.label} · ${this.formatter.percent(window.usedPercent)} usado`,
        }));
        const usageBar = new UsageBar();
        usageBar.render(window.usedPercent);
        column.add_child(usageBar.actor);
        column.add_child(new St.Label({text: this.formatter.reset(window.resetsAt, now),
            style_class: 'ai-usage-detail'}));
        item.add_child(column);
        this.menu.addMenuItem(item);
    }
}
