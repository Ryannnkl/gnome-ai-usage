import Gio from 'gi://Gio';

export class DirectoryWatcher {
    constructor(path, accepts, onChange) {
        this.path = path;
        this.accepts = accepts;
        this.onChange = onChange;
        this.monitor = null;
    }

    start() {
        if (this.monitor)
            return;
        try {
            const directory = Gio.File.new_for_path(this.path);
            if (!directory.query_exists(null))
                return;
            this.monitor = directory.monitor_directory(Gio.FileMonitorFlags.WATCH_MOVES, null);
            this.monitor.set_rate_limit(100);
            this.signal = this.monitor.connect('changed', (_monitor, file, otherFile) => {
                if (this.accepts(file.get_basename()) ||
                    (otherFile && this.accepts(otherFile.get_basename())))
                    this.onChange();
            });
        } catch {
            this.monitor = null;
        }
    }

    destroy() {
        if (this.monitor) {
            this.monitor.disconnect(this.signal);
            this.monitor.cancel();
        }
        this.monitor = null;
    }
}
