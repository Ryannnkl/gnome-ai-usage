export class PollingPolicy {
    constructor(random = Math.random) {
        this.random = random;
    }

    schedule(record, now) {
        record.nextRefreshAt = now + 20 + Math.floor(this.random() * 41);
    }

    shouldRefresh(record, now, active, reason = 'schedule') {
        if (record.refreshing || now < record.retryAt)
            return false;

        if (record.lastAttempt === null)
            return true;

        const elapsed = now - record.lastAttempt;

        if (reason !== 'schedule')
            return elapsed >= 15;

        return record.nextRefreshAt !== null && now >= record.nextRefreshAt;
    }
}
