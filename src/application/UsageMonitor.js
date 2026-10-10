import { UsageRecord } from '../domain/UsageRecord.js';

export class UsageMonitor {
    constructor(providers, repository, policy, runnerFactory, timer, now) {
        this.providers = providers;
        this.policy = policy;
        this.timer = timer;
        this.now = now;

        this.listeners = new Set();
        this.records = providers.map(
            provider =>
                new UsageRecord(
                    provider,
                    provider.cacheable === false ? {} : repository.load(provider.id)
                )
        );

        this.runner = runnerFactory(
            () => this.emit(),
            record => {
                this.policy.schedule(record, this.now());
                this.scheduleNext();
            }
        );

        this.running = false;
    }

    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.records);

        return () => this.listeners.delete(listener);
    }

    emit() {
        for (const listener of this.listeners)
            listener(this.records);
    }

    start() {
        if (this.running)
            return;

        this.running = true;

        this.providers.forEach((provider, index) => this.startProvider(provider, index));
        this.refresh();
    }

    startProvider(provider, index) {
        try {
            provider.start(() => {
                this.runner.cancel(provider.id);
                this.records[index].invalidate(provider.cacheable !== false);
                this.emit();
                this.refresh('account');
            });
        } catch {
            this.records[index].status = 'unavailable';
        }
    }

    refresh(reason = 'schedule') {
        if (!this.running)
            return;

        this.providers.forEach((provider, index) => {
            const record = this.records[index];
            const active = this.isActive(provider);

            record.activityRecent = active;

            if (this.policy.shouldRefresh(record, this.now(), active, reason)) {
                record.wasActive = active;
                void this.runner.refresh(provider, record);
            }
        });

        this.emit();
        this.scheduleNext();
    }

    scheduleNext() {
        if (!this.running || !this.records.length)
            return;

        this.timer.stop();

        const deadlines = this.records
            .filter(record => !record.refreshing)
            .map(record => Math.max(record.retryAt, record.nextRefreshAt ?? this.now()));

        if (deadlines.length)
            this.timer.start(Math.max(1, Math.ceil(Math.min(...deadlines) - this.now())), () =>
                this.refresh()
            );
    }

    isActive(provider) {
        try {
            return Boolean(provider.isActive(this.now()));
        } catch {
            return false;
        }
    }

    destroy() {
        this.running = false;

        this.timer.stop();
        this.runner.destroy();
        this.providers.forEach(provider => {
            try {
                provider.destroy();
            } catch {}
        });

        this.listeners.clear();
    }
}
