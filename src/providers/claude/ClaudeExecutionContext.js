import GLib from 'gi://GLib';

export class ClaudeExecutionContext {
    constructor(home, fileReader, configuredDirectory = GLib.getenv('CLAUDE_CONFIG_DIR')) {
        this.home = home;
        this.fileReader = fileReader;

        const configured = configuredDirectory?.trim() ?? '';

        this.hasConfiguredDirectory = Boolean(configured);
        this.directory = configured ? this.expand(configured) : `${home}/.claude`;
    }

    expand(path) {
        const expanded =
            path === '~'
                ? this.home
                : path.startsWith('~/')
                  ? GLib.build_filenamev([this.home, path.slice(2)])
                  : path;

        return GLib.path_is_absolute(expanded)
            ? expanded
            : GLib.build_filenamev([this.home, expanded]);
    }

    read() {
        return {
            key: this.fileReader.fingerprint(this.directory),
            directory: this.directory,
            environment: { CLAUDE_CONFIG_DIR: this.hasConfiguredDirectory ? this.directory : null },
        };
    }
}
