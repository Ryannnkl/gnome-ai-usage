import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AiUsagePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage({title: 'AI Usage', icon_name: 'utilities-system-monitor-symbolic'});
        const group = new Adw.PreferencesGroup({title: 'Providers'});
        for (const [id, title] of [['codex', 'Codex'], ['claude', 'Claude Code'],
            ['antigravity', 'Antigravity']]) {
            const row = new Adw.SwitchRow({title});
            settings.bind(`${id}-enabled`, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            group.add(row);
        }
        page.add(group);
        window.add(page);
    }
}
