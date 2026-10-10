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
        const state = {uncertain, refreshing: records.some(record => record.refreshing),
            usedPercent: currentWindows.length ?
                Math.max(...currentWindows.map(window => window.usedPercent)) : null};
        if (currentWindows.some(window => window.usedPercent >= 100))
            return {...state, status: 'exhausted'};
        if (currentWindows.some(window => window.usedPercent >= 75))
            return {...state, status: 'warning'};
        if (uncertain)
            return {...state, status: 'unknown'};
        return {...state, status: records.some(record => record.activityRecent) ? 'recent' : 'idle'};
    }
}
