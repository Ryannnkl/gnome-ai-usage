export class HistoryCalendar {
    constructor(timeZone = null) {
        this.configuredTimeZone = timeZone;
        this.dateFormatter = null;
        this.formatterZone = null;
    }

    get timeZone() {
        return this.configuredTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    key(timestamp) {
        if (this.formatterZone !== this.timeZone) {
            this.formatterZone = this.timeZone;
            this.dateFormatter = new Intl.DateTimeFormat('en', {
                timeZone: this.formatterZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        }

        const parts = Object.fromEntries(
            this.dateFormatter
                .formatToParts(new Date(timestamp * 1000))
                .map(part => [part.type, part.value])
        );

        return `${parts.year}-${parts.month}-${parts.day}`;
    }

    days(timestamp) {
        const today = Date.parse(`${this.key(timestamp)}T12:00:00Z`);

        return Array.from({ length: 7 }, (_, index) =>
            new Date(today - (6 - index) * 86400000).toISOString().slice(0, 10)
        );
    }
}
