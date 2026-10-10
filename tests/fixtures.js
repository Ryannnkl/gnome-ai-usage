export function usagePayload(percent = 42) {
    return {
        plan_type: 'plus',
        rate_limit: {
            primary_window: {
                used_percent: percent,
                limit_window_seconds: 18000,
                reset_at: 2000,
            },
            secondary_window: {
                used_percent: 17,
                limit_window_seconds: 604800,
                reset_after_seconds: 4000,
            },
        },
    };
}

export function usageSnapshot(percent = 42) {
    return {headlineId: 'primary', plan: 'plus', source: 'provider', windows: [
        {id: 'primary', label: '5 horas', usedPercent: percent, resetsAt: 2000, duration: 18000},
    ]};
}

export function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return {promise, resolve, reject};
}
