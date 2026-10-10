export class TokenHistoryReader {
    constructor(command, executable, script, roots, calendar) {
        this.command = command;
        this.executable = executable;
        this.script = script;
        this.roots = roots;
        this.calendar = calendar;
    }

    async read(id, cancellable, now) {
        if (!this.executable || !this.roots[id])
            return null;
        try {
            const dates = this.calendar.days(now);
            const output = await this.command.run(this.executable,
                ['-B', this.script, id, this.roots[id], JSON.stringify(dates)], cancellable);
            const value = JSON.parse(output);
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
