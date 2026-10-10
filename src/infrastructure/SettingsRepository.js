export class SettingsRepository {
    constructor(settings) {
        this.settings = settings;
    }

    load(id) {
        try {
            const cached = JSON.parse(this.settings.get_string('usage-cache'))[id];
            if (!cached || typeof cached !== 'object')
                return {};
            const retryAt = Number.isFinite(cached.retryAt) ? cached.retryAt : 0;
            const windows = cached.snapshot?.windows;
            if (cached.snapshot && (!Array.isArray(windows) || windows.length > 16 ||
                typeof cached.snapshot.headlineId !== 'string' ||
                !Number.isFinite(cached.fetchedAt) || windows.some(window =>
                typeof window?.id !== 'string' || typeof window.label !== 'string' ||
                !Number.isFinite(window.usedPercent) || window.usedPercent < 0 ||
                (window.resetsAt !== null && !Number.isFinite(window.resetsAt)))))
                return {retryAt};
            return {...cached, retryAt};
        } catch {
            return {};
        }
    }

    save(id, reading) {
        let cache;
        try {
            cache = JSON.parse(this.settings.get_string('usage-cache'));
            if (!cache || typeof cache !== 'object' || Array.isArray(cache))
                cache = {};
        } catch {
            cache = {};
        }
        cache[id] = reading;
        this.settings.set_string('usage-cache', JSON.stringify(cache));
    }
}
