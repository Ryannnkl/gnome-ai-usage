import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import { PopupAnimation } from 'resource:///org/gnome/shell/ui/boxpointer.js';

import { UsageFormatter } from './UsageFormatter.js';
import { ProviderSection } from './ProviderSection.js';
import { PanelFocusPolicy } from '../domain/PanelFocusPolicy.js';
import { FocusedIndicator } from './FocusedIndicator.js';
import { menuOptions } from './ShellCompatibility.js';

export class PanelIndicator {
    constructor(
        uuid,
        monitor,
        openPreferences,
        translator = {},
        focus = 'automatic',
        policy = new PanelFocusPolicy()
    ) {
        this.monitor = monitor;
        this.policy = policy;
        this.focus = focus;
        this.formatter = new UsageFormatter(translator);
        this.button = new PanelMenu.Button(0.0, this.formatter.gettext('AI Usage'));
        this.focusedIndicator = new FocusedIndicator(this.button, this.formatter);
        this.section = new ProviderSection(this.formatter);

        this.button.menu.addMenuItem(this.section.menu);
        this.button.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.button.menu.addAction(this.formatter.gettext('Atualizar agora'), () =>
            monitor.refresh('manual')
        );
        this.button.menu.addAction(this.formatter.gettext('Preferências'), openPreferences);
        this.menuSignal = this.button.menu.connect('open-state-changed', (_menu, open) => {
            this.focusedIndicator.syncTooltip();

            if (open)
                monitor.refresh('look');
        });

        Main.panel.addToStatusArea(uuid, this.button);
        this.unsubscribe = monitor.subscribe(records => this.render(records));
    }

    render(records) {
        const now = Date.now() / 1000;

        this.focusedIndicator.render(
            this.policy.evaluate(records, now, this.focus, this.focusedIndicator.providerId)
        );
        this.section.render(records, now);
    }

    setFocus(focus) {
        this.focus = focus;

        this.render(this.monitor.records);
    }

    destroy() {
        this.unsubscribe();
        this.button.menu.disconnect(this.menuSignal);
        this.button.menu.close(menuOptions(Config.PACKAGE_VERSION, PopupAnimation.NONE));
        this.focusedIndicator.destroy();
        this.button.destroy();
    }
}
