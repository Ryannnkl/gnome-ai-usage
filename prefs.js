import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { PANEL_FOCUS_OPTIONS } from './src/domain/PanelFocusOptions.js';

export default class AiUsagePreferences extends ExtensionPreferences {
    constructor(metadata, translate = null) {
        super(metadata);
        this.translate = translate ?? this.gettext.bind(this);
    }

    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage({
            title: 'AI Usage',
            icon_name: 'utilities-system-monitor-symbolic',
        });
        const group = new Adw.PreferencesGroup({ title: this.translate('Provedores') });

        for (const [id, title] of [
            ['codex', 'Codex'],
            ['claude', 'Claude Code'],
            ['antigravity', 'Antigravity'],
        ]) {
            const row = new Adw.SwitchRow({ title });

            settings.bind(`${id}-enabled`, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            group.add(row);
        }

        page.add(group);

        const panel = new Adw.PreferencesGroup({ title: this.translate('Painel') });
        const focus = new Adw.ComboRow({
            title: this.translate('Provider em foco'),
            subtitle: this.translate('Automático seleciona o maior uso nas cinco horas.'),
            model: Gtk.StringList.new(PANEL_FOCUS_OPTIONS.map(option => this.translate(option.name))),
        });

        settings.bind('focused-provider', focus, 'selected', Gio.SettingsBindFlags.DEFAULT);
        panel.add(focus);
        page.add(panel);
        window.add(page);
    }
}
