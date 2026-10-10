import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class RequestScope {
    constructor() {
        this.cancellable = new Gio.Cancellable();
        this.timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 20, () => {
            this.timeout = 0;

            this.cancellable.cancel();

            return GLib.SOURCE_REMOVE;
        });
    }

    cancel() {
        this.cancellable.cancel();
        this.close();
    }

    close() {
        if (this.timeout)
            GLib.Source.remove(this.timeout);

        this.timeout = 0;
    }
}
