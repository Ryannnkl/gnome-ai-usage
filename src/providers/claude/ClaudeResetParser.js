const months = new Map(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug',
    'sep', 'oct', 'nov', 'dec'].map((month, index) => [month, index + 1]));

export class ClaudeResetParser {
    parse(value, now) {
        const match = value.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)(?:\s+\(([^)]+)\))?$/i);
        if (!match)
            return null;
        const month = months.get(match[1].slice(0, 3).toLowerCase());
        if (!month)
            return null;
        const hour = Number(match[3]) % 12 + (match[5].toLowerCase() === 'pm' ? 12 : 0);
        const minute = Number(match[4] ?? 0);
        const zone = match[6] || undefined;
        try {
            const year = this.parts(now * 1000, zone).year;
            const resets = [year - 1, year, year + 1].map(candidate =>
                this.timestamp(candidate, month, Number(match[2]), hour, minute, zone));
            return resets.filter(timestamp => timestamp > now).sort((a, b) => a - b)[0] ?? null;
        } catch {
            return null;
        }
    }

    timestamp(year, month, day, hour, minute, zone) {
        const wallTime = Date.UTC(year, month - 1, day, hour, minute);
        let timestamp = wallTime;
        for (let attempt = 0; attempt < 3; attempt++) {
            const parts = this.parts(timestamp, zone);
            const interpreted = Date.UTC(parts.year, parts.month - 1, parts.day,
                parts.hour, parts.minute, parts.second);
            timestamp = wallTime - (interpreted - timestamp);
        }
        return timestamp / 1000;
    }

    parts(timestamp, zone) {
        const options = {year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'};
        if (zone)
            options.timeZone = zone;
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(timestamp);
        return Object.fromEntries(parts.filter(part => part.type !== 'literal')
            .map(part => [part.type, Number(part.value)]));
    }
}
