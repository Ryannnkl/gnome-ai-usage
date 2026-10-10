import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { UsageFormatter } from './UsageFormatter.js';
import { ProviderSection } from './ProviderSection.js';
import { IndicatorPolicy } from '../domain/IndicatorPolicy.js';
import { IndicatorAppearance } from './IndicatorAppearance.js';
import { StatusIcon } from './StatusIcon.js';

export class PanelIndicator {
    constructor(uuid, monitor, openPreferences, policy = new IndicatorPolicy(), translator = {}) {
        this.monitor = monitor;
        this.policy = policy;
        this.formatter = new UsageFormatter(translator);
        this.button = new PanelMenu.Button(0.0, this.formatter.gettext('AI Usage'));
        this.statusIcon = new StatusIcon(this.button, new IndicatorAppearance(translator));
        this.section = new ProviderSection(this.formatter);

        this.button.menu.addMenuItem(this.section.menu);
        this.button.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.button.menu.addAction(this.formatter.gettext('Atualizar agora'), () =>
            monitor.refresh('manual')
        );
        this.button.menu.addAction(this.formatter.gettext('Preferências'), openPreferences);
        this.menuSignal = this.button.menu.connect('open-state-changed', (_menu, open) => {
            if (open)
                monitor.refresh('look');
        });

        Main.panel.addToStatusArea(uuid, this.button);
        this.unsubscribe = monitor.subscribe(records => this.render(records));
    }

    render(records) {
        const now = Date.now() / 1000;

        this.statusIcon.render(this.policy.evaluate(records, now));
        this.section.render(records, now);
    }

    destroy() {
        this.unsubscribe();
        this.button.menu.disconnect(this.menuSignal);
        this.button.menu.close({ animate: false });
        this.statusIcon.destroy();
        this.button.destroy();
    }
}
