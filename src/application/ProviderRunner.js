export class ProviderRunner {
    constructor(
        repository,
        backoff,
        createRequest,
        now,
        onChange,
        onSettled = () => {},
        history = null,
        tokenHistory = null
    ) {
        this.repository = repository;
        this.backoff = backoff;
        this.createRequest = createRequest;
        this.now = now;
        this.onChange = onChange;
        this.onSettled = onSettled;
        this.history = history;
        this.tokenHistory = tokenHistory;
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
        const tokens =
            this.tokenHistory
                ?.read(provider.id, request.cancellable, this.now())
                .catch(() => null) ?? Promise.resolve(null);

        try {
            const account = await provider.readAccount(request.cancellable);

            if (!accepts())
                return;

            record.bind(account.key);
            record.history =
                this.history?.bind(provider.id, account.historyKey, this.now()) ?? null;

            this.onChange();

            const snapshot = await provider.fetch(account, request.cancellable, this.now);

            if (accepts()) {
                record.history =
                    this.history?.observe(provider.id, account.historyKey, snapshot, this.now()) ??
                    null;

                record.succeed(snapshot, this.now());
            }
        } catch (error) {
            if (accepts()) {
                this.history?.interrupt(provider.id);
                record.fail(
                    error,
                    this.now(),
                    this.backoff,
                    provider.retainPreviousOnFailure !== false
                );
            }
        } finally {
            const tokenHistory = await tokens;

            if (accepts())
                record.tokenHistory = tokenHistory;

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
        this.history?.interrupt(providerId);
        this.requests.get(providerId)?.cancel();
        this.requests.delete(providerId);
    }
}
