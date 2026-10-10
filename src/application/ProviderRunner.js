export class ProviderRunner {
    constructor(repository, backoff, createRequest, now, onChange, onSettled = () => {}) {
        this.repository = repository;
        this.backoff = backoff;
        this.createRequest = createRequest;
        this.now = now;
        this.onChange = onChange;
        this.onSettled = onSettled;
        this.requests = new Map();
        this.running = true;
    }

    async refresh(provider, record) {
        if (!this.running || this.requests.has(provider.id))
            return;
        const request = this.createRequest();
        this.requests.set(provider.id, request);
        record.refreshing = true;
        record.lastAttempt = this.now();
        this.onChange();
        const accepts = () => this.running && this.requests.get(provider.id) === request;
        try {
            const account = await provider.readAccount(request.cancellable);
            if (!accepts())
                return;
            record.bind(account.key);
            this.onChange();
            const snapshot = await provider.fetch(account, request.cancellable, this.now);
            if (accepts())
                record.succeed(snapshot, this.now());
        } catch (error) {
            if (accepts())
                record.fail(error, this.now(), this.backoff,
                    provider.retainPreviousOnFailure !== false);
        } finally {
            request.close();
            if (accepts()) {
                record.refreshing = false;
                this.requests.delete(provider.id);
                try {
                    if (provider.cacheable !== false)
                        this.repository.save(provider.id, record.serialize());
                } catch {
                    record.status = 'unavailable';
                }
                this.onSettled(record);
                this.onChange();
            }
        }
    }

    destroy() {
        this.running = false;
        for (const request of this.requests.values())
            request.cancel();
        this.requests.clear();
    }

    cancel(providerId) {
        this.requests.get(providerId)?.cancel();
        this.requests.delete(providerId);
    }
}
