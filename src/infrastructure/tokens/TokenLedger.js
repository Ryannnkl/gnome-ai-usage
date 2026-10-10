export class TokenLedger {
    constructor(dates) {
        this.dates = new Set(dates);
        this.days = new Map();
        this.seen = new Set();
        this.partial = false;
    }

    add(timestamp, tokens, identity) {
        if (this.seen.has(identity))
            return;

        const moment =
            typeof timestamp === 'number'
                ? new Date(timestamp * 1000)
                : typeof timestamp === 'string'
                  ? new Date(timestamp)
                  : new Date(NaN);

        if (!Number.isSafeInteger(tokens) || tokens < 0 || !Number.isFinite(moment.getTime())) {
            this.partial = true;

            return;
        }

        const date = [
            moment.getFullYear(),
            String(moment.getMonth() + 1).padStart(2, '0'),
            String(moment.getDate()).padStart(2, '0'),
        ].join('-');

        this.seen.add(identity);

        if (!this.dates.has(date))
            return;

        const total = (this.days.get(date) ?? 0) + tokens;

        if (!Number.isSafeInteger(total)) {
            this.partial = true;

            return;
        }

        this.days.set(date, total);
    }

    report() {
        return {
            scope: 'local-client',
            partial: this.partial,
            days: [...this.days]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, tokens]) => ({ date, tokens })),
        };
    }
}
