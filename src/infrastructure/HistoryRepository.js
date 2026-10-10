export class HistoryRepository {
    constructor(settings) {
        this.settings = settings;
    }

    read() {
        try {
            const raw = this.settings.get_string('usage-history');
            if (raw.length > 65536)
                return {};
            const parsed = JSON.parse(raw);
            return parsed?.version === 1 && parsed.providers &&
                typeof parsed.providers === 'object' && !Array.isArray(parsed.providers) ?
                parsed.providers : {};
        } catch {
            return {};
        }
    }

    load(id) {
        const state = this.read()[id];
        if (!state || typeof state.accountKey !== 'string' || state.accountKey.length > 128 ||
            !state.accountKey || typeof state.timeZone !== 'string' || state.timeZone.length > 128 ||
            (state.plan !== null && (typeof state.plan !== 'string' || state.plan.length > 128)) ||
            !state.series || typeof state.series !== 'object' || Array.isArray(state.series))
            return null;
        const series = Object.entries(state.series);
        if (series.length > 16 || series.some(([key, days]) => !this.validSeries(key, days)))
            return null;
        return {accountKey: state.accountKey, timeZone: state.timeZone, plan: state.plan,
            series: Object.fromEntries(series.map(([key, days]) => [key,
                days.map(day => ({date: day.date, points: day.points}))]))};
    }

    validSeries(key, days) {
        return key.length <= 128 && Array.isArray(days) && days.length <= 7 &&
            new Set(days.map(day => day?.date)).size === days.length && days.every(day =>
                typeof day?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
                Number.isFinite(Date.parse(`${day.date}T12:00:00Z`)) &&
                new Date(`${day.date}T12:00:00Z`).toISOString().startsWith(day.date) &&
                Number.isFinite(day.points) && day.points >= 0 && day.points <= 10000);
    }

    save(id, state) {
        const providers = Object.fromEntries(Object.keys(this.read()).slice(-15)
            .map(key => [key, this.load(key)]).filter(([, value]) => value !== null));
        providers[id] = state;
        const serialized = JSON.stringify({version: 1,
            providers: Object.fromEntries(Object.keys(providers).slice(-16)
                .map(key => [key, providers[key]]))});
        if (serialized !== this.settings.get_string('usage-history'))
            this.settings.set_string('usage-history', serialized);
    }
}
