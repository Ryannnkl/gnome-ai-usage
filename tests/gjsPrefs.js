import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Adw from 'gi://Adw';
import {assert} from './gjsAssert.js';

if (GLib.getenv('GSETTINGS_BACKEND') !== 'memory')
    throw new Error('Execute com GSETTINGS_BACKEND=memory.');
Gio.resources_register(Gio.Resource.load(
    '/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource'));
Adw.init();
const {default: Preferences} = await import('../prefs.js');
const directory = Gio.File.new_for_path(GLib.get_current_dir());
const [, contents] = directory.get_child('metadata.json').load_contents(null);
const metadata = JSON.parse(new TextDecoder().decode(contents));
const preferences = new Preferences({...metadata, dir: directory, path: directory.get_path()},
    message => message);
const window = new Adw.PreferencesWindow();
preferences.fillPreferencesWindow(window);
assert(window.get_visible_page() !== null, 'Preferences page was not added');
const rows = [];
function collectRows(widget) {
    if (widget instanceof Adw.PreferencesRow)
        rows.push(widget);
    for (let child = widget.get_first_child(); child; child = child.get_next_sibling())
        collectRows(child);
}
collectRows(window.get_visible_page());
assert(rows.length === 3, 'Preferences must contain only three provider switches');
const settings = preferences.getSettings();
for (const [index, id] of ['codex', 'claude', 'antigravity'].entries()) {
    const row = rows[index];
    assert(row instanceof Adw.SwitchRow, `${id} is not a native Adwaita switch`);
    assert(row.active === settings.get_boolean(`${id}-enabled`), 'Initial state differs');
    row.active = false;
    assert(!settings.get_boolean(`${id}-enabled`), 'Switch did not disable provider');
    settings.set_boolean(`${id}-enabled`, true);
    assert(row.active, 'Settings change did not update switch');
}
window.destroy();
console.log('GTK/Adwaita: preferências criadas e destruídas com configurações isoladas.');
