export class DailyUsageSeries {
    constructor(calendar, days = []) {
        this.calendar = calendar;
        this.days = new Map(days.map(day => [day.date, {...day}]));
        this.previous = null;
    }

    observe(window, now) {
        const previous = this.previous;
        if (previous && now <= previous.timestamp) {
            this.interrupt();
            return;
        }
        this.previous = null;
        if (!Number.isFinite(window.usedPercent) || window.usedPercent < 0 ||
            window.usedPercent > 1000 || !Number.isFinite(window.resetsAt) || window.resetsAt <= now)
            return;
        const current = {timestamp: now, date: this.calendar.key(now),
            usedPercent: window.usedPercent, resetsAt: window.resetsAt};
        this.previous = current;
        if (!previous || current.timestamp - previous.timestamp > 120 ||
            current.date !== previous.date || previous.resetsAt <= now ||
            Math.abs(current.resetsAt - previous.resetsAt) > 60 ||
            current.usedPercent < previous.usedPercent)
            return;
        const day = this.days.get(current.date) ?? {date: current.date, points: 0};
        day.points = Math.round((day.points + current.usedPercent - previous.usedPercent) * 1000) / 1000;
        this.days.set(current.date, day);
        this.prune(now);
    }

    interrupt() {
        this.previous = null;
    }

    prune(now) {
        const dates = new Set(this.calendar.days(now));
        for (const date of this.days.keys()) {
            if (!dates.has(date))
                this.days.delete(date);
        }
    }

    view(now) {
        this.prune(now);
        const days = this.calendar.days(now).map(date => ({date,
            points: this.days.get(date)?.points ?? null}));
        const observed = days.filter(day => day.points !== null);
        return {days, total: observed.length ?
            Math.round(observed.reduce((sum, day) => sum + day.points, 0) * 1000) / 1000 : null};
    }

    serialize(now) {
        this.prune(now);
        return [...this.days.values()].map(day => ({...day}));
    }
}
