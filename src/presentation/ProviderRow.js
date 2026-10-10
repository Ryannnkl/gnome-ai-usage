import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {ProviderDetails} from './ProviderDetails.js';
import {ProviderSummary} from './ProviderSummary.js';
import {UsageBar} from './UsageBar.js';

export class ProviderRow {
    constructor(formatter) {
        this.summary = new ProviderSummary(formatter);
        this.item = new PopupMenu.PopupSubMenuMenuItem('', false);
        const column = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL,
            style_class: 'ai-usage-summary'});
        this.item.remove_child(this.item.label);
        column.add_child(this.item.label);
        this.usageBar = new UsageBar();
        column.add_child(this.usageBar.actor);
        this.subtitle = this.addCaption(column);
        this.notice = this.addCaption(column);
        this.item.insert_child_at_index(column, 1);
        this.details = new ProviderDetails(formatter);
        this.item.menu.addMenuItem(this.details.menu);
    }

    addCaption(column) {
        const label = new St.Label({style_class: 'ai-usage-summary-caption', width: 280});
        label.clutter_text.line_wrap = true;
        label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        column.add_child(label);
        return label;
    }

    render(record, now) {
        const summary = this.summary.describe(record, now);
        this.item.label.text = summary.title;
        this.usageBar.render(summary.usedPercent);
        this.subtitle.text = summary.subtitle;
        this.notice.text = summary.notice ?? '';
        this.notice.visible = Boolean(summary.notice);
        this.item.accessible_name = [summary.title, summary.subtitle, summary.notice]
            .filter(Boolean).join('. ');
        this.details.render(record, now);
    }

    destroy() {
        this.item.destroy();
    }
}
