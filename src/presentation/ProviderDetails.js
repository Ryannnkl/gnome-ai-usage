import St from 'gi://St';
import Pango from 'gi://Pango';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {UsageWindowRow} from './UsageWindowRow.js';
import {HistoryRow} from './HistoryRow.js';

export class ProviderDetails {
    constructor(formatter) {
        this.formatter = formatter;
        this.menu = new PopupMenu.PopupMenuSection();
        this.menu.actor.add_style_class_name('ai-usage-details');
        this.plan = this.addText('', 'ai-usage-title');
        this.windowSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this.windowSection);
        this.windows = new Map();
        const history = new HistoryRow(null, false, Date.now() / 1000,
            null, formatter.translator);
        this.histories = new Map([['tokens', history]]);
        this.menu.addMenuItem(history.item);
        this.status = this.addText('', 'ai-usage-detail');
    }

    render(record, now) {
        const plan = record.snapshot?.plan;
        this.plan.item.visible = Boolean(plan);
        this.plan.label.text = plan ? `${this.formatter.gettext('Plano')} · ${plan}` : '';
        const snapshot = record.snapshot;
        const windows = snapshot?.windows.filter(window => window.id !== snapshot.headlineId) ?? [];
        for (const [id, row] of this.windows) {
            if (!windows.some(window => window.id === id)) {
                row.item.destroy();
                this.windows.delete(id);
            }
        }
        windows.forEach(window => this.addWindow(window, now));
        this.histories.get('tokens').render(record.tokenHistory, Boolean(record.tokenHistory), now);
        this.status.item.visible = record.status !== 'ok';
        this.status.label.text = record.status === 'ok' ? '' : this.formatter.status(record, now);
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
        return {item, label};
    }

    addWindow(window, now) {
        if (!this.windows.has(window.id)) {
            const row = new UsageWindowRow(this.formatter);
            this.windows.set(window.id, row);
            this.windowSection.addMenuItem(row.item);
        }
        this.windows.get(window.id).render(window, now);
    }
}
