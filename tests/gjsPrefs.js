import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Adw from 'gi://Adw';

import { assert } from './gjsAssert.js';

if (GLib.getenv('GSETTINGS_BACKEND') !== 'memory')
    throw new Error('Execute com GSETTINGS_BACKEND=memory.');
Gio.resources_register(
    Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource')
);
Adw.init();
const { default: Preferences } = await import('../prefs.js');
const directory = Gio.File.new_for_path(GLib.get_current_dir());
const [, contents] = directory.get_child('metadata.json').load_contents(null);
const metadata = JSON.parse(new TextDecoder().decode(contents));
const preferences = new Preferences(
    { ...metadata, dir: directory, path: directory.get_path() },
    message => message
);
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
const switches = rows.filter(row => row instanceof Adw.SwitchRow);
const focus = rows.find(row => row instanceof Adw.ComboRow);

assert(switches.length === 3 && rows.length === 4, 'Preferences must contain provider switches and focus');
assert(focus?.model.get_n_items() === 4, 'Focus choices are missing');
const settings = preferences.getSettings();
for (const [index, id] of ['codex', 'claude', 'antigravity'].entries()) {
    const row = switches[index];

    assert(row instanceof Adw.SwitchRow, `${id} is not a native Adwaita switch`);
    assert(row.active === settings.get_boolean(`${id}-enabled`), 'Initial state differs');
    row.active = false;

    assert(!settings.get_boolean(`${id}-enabled`), 'Switch did not disable provider');
    settings.set_boolean(`${id}-enabled`, true);

    assert(row.active, 'Settings change did not update switch');
}
assert(focus.selected === 0, 'Automatic focus must be the default');
for (const selected of [1, 2, 3, 0]) {
    focus.selected = selected;

    assert(settings.get_uint('focused-provider') === selected, 'Focus choice was not saved');
    assert(preferences.getSettings().get_uint('focused-provider') === selected, 'Focus did not persist');
}
settings.set_uint('focused-provider', 2);
assert(focus.selected === 2, 'External focus change did not update the selector');
assert(settings.get_boolean('claude-enabled'), 'Focus selection changed provider availability');
window.destroy();
console.log('GTK/Adwaita: preferências criadas e destruídas com configurações isoladas.');
