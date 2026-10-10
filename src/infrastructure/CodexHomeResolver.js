import GLib from 'gi://GLib';

export class CodexHomeResolver {
    resolve(configuredHome, environmentHome = GLib.getenv('CODEX_HOME')) {
        const configured = configuredHome?.trim() ?? '';
        const home = configured || environmentHome?.trim() ||
            GLib.build_filenamev([GLib.get_home_dir(), '.codex']);
        const expanded = home === '~' ? GLib.get_home_dir() : home.startsWith('~/') ?
            GLib.build_filenamev([GLib.get_home_dir(), home.slice(2)]) : home;
        return GLib.path_is_absolute(expanded) ? expanded :
            GLib.build_filenamev([GLib.get_home_dir(), expanded]);
    }
}
