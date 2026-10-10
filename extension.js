import GLib from 'gi://GLib';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { createMonitor } from './src/composition/createMonitor.js';
import { PanelIndicator } from './src/presentation/PanelIndicator.js';
import { CodexHomeResolver } from './src/infrastructure/CodexHomeResolver.js';

export default class AiUsageExtension extends Extension {
    enable() {
        this.settings = this.getSettings();

        this.settingsSignals = [
            'codex-home',
            'codex-enabled',
            'claude-enabled',
            'antigravity-enabled',
        ].map(key =>
            this.settings.connect(`changed::${key}`, () => {
                this.stopMonitor();
                this.startMonitor();
            })
        );

        this.startMonitor();
    }

    startMonitor() {
        const home = new CodexHomeResolver().resolve(this.settings.get_string('codex-home'));
        const translator = {
            gettext: this.gettext.bind(this),
            ngettext: this.ngettext.bind(this),
        };

        this.monitor = createMonitor(this.settings, home, {
            extensionPath: this.path,
            includeCliProviders: GLib.getenv('AI_USAGE_TEST_MODE') !== '1',
        });

        this.indicator = new PanelIndicator(
            this.uuid,
            this.monitor,
            () => this.openPreferences(),
            undefined,
            translator
        );

        this.monitor.start();
    }

    stopMonitor() {
        this.indicator?.destroy();
        this.monitor?.destroy();

        this.indicator = null;
        this.monitor = null;
    }

    disable() {
        for (const signal of this.settingsSignals ?? [])
            this.settings.disconnect(signal);

        this.settingsSignals = [];

        this.stopMonitor();

        this.settings = null;
    }
}
