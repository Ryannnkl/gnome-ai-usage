import St from 'gi://St';
import Clutter from 'gi://Clutter';

import { StatusIcon } from './StatusIcon.js';
import { IndicatorAppearance } from './IndicatorAppearance.js';
import { PanelFocusFormatter } from './PanelFocusFormatter.js';
import { HoverTooltip } from './HoverTooltip.js';

export class FocusedIndicator {
    constructor(button, formatter) {
        this.button = button;
        this.formatter = new PanelFocusFormatter(formatter);
        this.appearance = new IndicatorAppearance(formatter.translator);
        this.actor = new St.BoxLayout({ style_class: 'ai-usage-panel' });
        this.name = new St.Label({ y_align: Clutter.ActorAlign.CENTER });

        this.actor.add_child(this.name);
        this.session = this.addRing(formatter.gettext('5h'));
        this.weekly = this.addRing(formatter.gettext('7d'));
        button.add_child(this.actor);

        this.tooltip = new HoverTooltip();
        this.tooltip.bind(button, '');
    }

    addRing(label) {
        const actor = new St.BoxLayout({ style_class: 'ai-usage-panel-window' });
        const ring = new StatusIcon(actor, this.appearance);

        actor.add_child(
            new St.Label({
                text: label,
                style_class: 'ai-usage-panel-caption',
                y_align: Clutter.ActorAlign.CENTER,
            })
        );
        this.actor.add_child(actor);

        return ring;
    }

    render(focus) {
        if (focus.providerId !== this.providerId) {
            this.session.reset();
            this.weekly.reset();
        }

        this.providerId = focus.providerId;
        this.name.text = this.formatter.name(focus);
        this.session.render(focus.session);
        this.weekly.render(focus.weekly);
        this.description = this.formatter.describe(focus);

        this.syncTooltip();
    }

    syncTooltip() {
        const open = this.button.menu.isOpen;

        if (open)
            this.tooltip.hide();

        this.tooltip.update(this.button, open ? '' : this.description);
        this.button.accessible_name = this.description;
    }

    destroy() {
        this.tooltip.destroy();
        this.session.destroy();
        this.weekly.destroy();
    }
}
