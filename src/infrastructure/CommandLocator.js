import GLib from 'gi://GLib';

export class CommandLocator {
    constructor(home = GLib.get_home_dir(), path = GLib.getenv('PATH') ?? '') {
        this.directories = [
            ...new Set(
                [
                    `${home}/.local/bin`,
                    `${home}/.local/share/mise/shims`,
                    ...path.split(':'),
                    '/usr/local/bin',
                    '/usr/bin',
                    '/bin',
                ].filter(Boolean)
            ),
        ];
    }

    find(command) {
        for (const directory of this.directories) {
            const path = GLib.build_filenamev([directory, command]);

            if (GLib.file_test(path, GLib.FileTest.IS_EXECUTABLE))
                return path;
        }

        return null;
    }
}
