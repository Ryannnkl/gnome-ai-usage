import GLib from 'gi://GLib';

export class AnimationClock {
    now() {
        return GLib.get_monotonic_time() / 1000;
    }

    start(callback) {
        return GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () =>
            callback() ? GLib.SOURCE_CONTINUE : GLib.SOURCE_REMOVE
        );
    }

    stop(source) {
        GLib.Source.remove(source);
    }
}
