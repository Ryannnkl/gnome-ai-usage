import GLib from 'gi://GLib';

export class Timer {
    start(seconds, callback) {
        this.stop();
        this.source = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, seconds, () => {
            this.source = 0;

            callback();

            return GLib.SOURCE_REMOVE;
        });
    }

    stop() {
        if (this.source)
            GLib.Source.remove(this.source);

        this.source = 0;
    }
}
