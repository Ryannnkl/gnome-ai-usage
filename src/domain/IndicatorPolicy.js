export class IndicatorPolicy {
    evaluate(records, now) {
        const windows = records.flatMap(record => record.snapshot?.windows ?? []);
        const currentWindows = windows.filter(window =>
            Number.isFinite(window.usedPercent) && window.usedPercent >= 0 &&
            (window.resetsAt === null || window.resetsAt > now));
        const uncertain = records.length === 0 || records.some(record =>
            record.status !== 'ok' || !record.snapshot?.windows.length ||
            record.fetchedAt === null || now - record.fetchedAt > 900) ||
            currentWindows.length !== windows.length;
        if (currentWindows.some(window => window.usedPercent >= 100))
            return {status: 'exhausted', uncertain};
        if (currentWindows.some(window => window.usedPercent >= 75))
            return {status: 'warning', uncertain};
        if (uncertain)
            return {status: 'unknown', uncertain};
        return {status: records.some(record => record.activityRecent) ? 'recent' : 'idle', uncertain};
    }
}
