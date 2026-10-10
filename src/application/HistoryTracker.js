import {DailyUsageSeries} from '../domain/DailyUsageSeries.js';

export class HistoryTracker {
    constructor(repository, calendar) {
        this.repository = repository;
        this.calendar = calendar;
        this.accounts = new Map();
    }

    bind(id, accountKey, now) {
        if (!accountKey) {
            this.accounts.delete(id);
            return null;
        }
        let account = this.accounts.get(id);
        if (account?.key !== accountKey || account.timeZone !== this.calendar.timeZone) {
            let stored;
            try {
                stored = this.repository.load(id);
            } catch {}
            const matching = stored?.accountKey === accountKey &&
                stored.timeZone === this.calendar.timeZone;
            account = {key: accountKey, timeZone: this.calendar.timeZone,
                plan: matching ? stored.plan : null,
                series: new Map(Object.entries(matching ? stored.series : {})
                    .map(([key, days]) => [key, new DailyUsageSeries(this.calendar, days)]))};
            this.accounts.set(id, account);
        }
        return this.view(account, now);
    }

    observe(id, accountKey, snapshot, now) {
        this.bind(id, accountKey, now);
        const account = this.accounts.get(id);
        if (!account)
            return null;
        const plan = snapshot.plan ?? null;
        if (account.plan !== plan)
            account.series.clear();
        account.plan = plan;
        const windows = snapshot.windows.filter(window => window.duration === 604800).slice(0, 16);
        const ids = new Set(windows.map(window => window.id));
        for (const [key, series] of account.series) {
            if (!ids.has(key))
                series.interrupt();
        }
        for (const window of windows) {
            if (!account.series.has(window.id))
                account.series.set(window.id, new DailyUsageSeries(this.calendar));
            account.series.get(window.id).observe(window, now);
        }
        while (account.series.size > 16)
            account.series.delete(account.series.keys().next().value);
        const series = Object.fromEntries([...account.series].slice(-16)
            .map(([key, value]) => [key, value.serialize(now)]));
        try {
            this.repository.save(id, {accountKey, timeZone: this.calendar.timeZone, plan, series});
        } catch {}
        return this.view(account, now);
    }

    view(account, now) {
        return Object.fromEntries([...account.series].map(([id, series]) => [id, series.view(now)]));
    }

    interrupt(id) {
        for (const series of this.accounts.get(id)?.series.values() ?? [])
            series.interrupt();
    }
}
