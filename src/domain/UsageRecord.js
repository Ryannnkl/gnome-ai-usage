export class UsageRecord {
    constructor(provider, cached = {}) {
        this.id = provider.id;
        this.name = provider.name;
        this.snapshot = null;
        this.history = null;
        this.tokenHistory = null;
        this.fetchedAt = null;
        this.status = 'loading';
        this.refreshing = false;
        this.lastAttempt = null;
        this.nextRefreshAt = null;
        this.retryAt = Number.isFinite(cached.retryAt) ? cached.retryAt : 0;
        this.failures = 0;
        this.wasActive = false;
        this.activityRecent = false;
        this.accountKey = null;
        this.cached = cached;
    }

    bind(accountKey) {
        if (this.accountKey === accountKey)
            return;

        this.accountKey = accountKey;
        this.history = null;

        const matching = this.cached.accountKey === accountKey;

        this.snapshot = matching ? (this.cached.snapshot ?? null) : null;
        this.fetchedAt = matching ? (this.cached.fetchedAt ?? null) : null;
        this.status = this.snapshot ? 'stale' : 'loading';
        this.cached = {};
    }

    succeed(snapshot, now) {
        this.snapshot = snapshot;
        this.fetchedAt = now;
        this.status = 'ok';
        this.retryAt = 0;
        this.failures = 0;
    }

    invalidate(preserveCached = true) {
        this.tokenHistory = null;
        this.cached = preserveCached ? this.serialize() : {};
        this.accountKey = null;
        this.history = null;
        this.snapshot = null;
        this.fetchedAt = null;
        this.refreshing = false;
        this.status = 'loading';
    }

    fail(error, now, backoff, retainPrevious = true) {
        this.status = error.code || 'error';
        this.retryAt = now + backoff.delay(error, this.failures);
        this.failures++;

        if (!retainPrevious || ['needsAuth', 'unsupported'].includes(this.status)) {
            this.snapshot = null;
            this.history = null;
            this.fetchedAt = null;
        }
    }

    serialize() {
        return {
            accountKey: this.accountKey,
            snapshot: this.snapshot,
            fetchedAt: this.fetchedAt,
            retryAt: this.retryAt,
        };
    }
}
