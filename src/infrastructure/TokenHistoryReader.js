import {TokenLedger} from './tokens/TokenLedger.js';

export class TokenHistoryReader {
    constructor(collectors, roots, calendar) {
        this.collectors = collectors;
        this.roots = roots;
        this.calendar = calendar;
    }

    async read(id, cancellable, now) {
        if (!this.collectors[id] || !this.roots[id])
            return null;
        try {
            const dates = this.calendar.days(now);
            cancellable.set_error_if_cancelled();
            const ledger = new TokenLedger(dates);
            await this.collectors[id].collect(this.roots[id], ledger, cancellable);
            cancellable.set_error_if_cancelled();
            const value = ledger.report();
            if (value?.scope !== 'local-client' || !Array.isArray(value.days) || value.days.length > 7)
                return null;
            if (value.days.some(day => !dates.includes(day.date) ||
                !Number.isSafeInteger(day.tokens) || day.tokens < 0))
                return null;
            if (new Set(value.days.map(day => day.date)).size !== value.days.length)
                return null;
            return {days: value.days, partial: value.partial === true, scope: 'local-client'};
        } catch {
            return null;
        }
    }
}
