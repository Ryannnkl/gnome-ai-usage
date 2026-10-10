import {UsageError} from '../../domain/UsageError.js';

export class AntigravityUsageParser {
    parse(output) {
        if (typeof output !== 'string' || !output.trim())
            throw new UsageError('invalidResponse');
        const windows = output.split(/\r?\n/).map(line => this.parseLine(line)).filter(Boolean);
        if (!windows.length)
            throw new UsageError('unsupported');
        const sessions = windows.filter(window => window.duration === 18000)
            .sort((first, second) => second.usedPercent - first.usedPercent);
        return {source: 'provider', plan: null,
            headlineId: sessions[0]?.id ?? windows[0].id, windows};
    }

    parseLine(line) {
        const fields = line.trim().split(/\t+|\s{2,}/);
        if (fields.length < 4)
            return null;
        const [group, period, remainingText, resetText] = fields;
        if (!/^(Weekly|Five Hour) Limit Remaining$/i.test(period))
            return null;
        const remainingPercent = Number(remainingText.replace('%', ''));
        const resetMilliseconds = Date.parse(resetText);
        if (!Number.isFinite(remainingPercent) || remainingPercent < 0 || remainingPercent > 100)
            return null;
        const weekly = period.toLowerCase().startsWith('weekly');
        const cadence = weekly ? 'weekly' : 'session';
        const groupId = group.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return {id: `${groupId}-${cadence}`, label: `${group} · ${weekly ? 'Semanal' : '5 horas'}`,
            usedPercent: 100 - remainingPercent,
            resetsAt: Number.isFinite(resetMilliseconds) ? resetMilliseconds / 1000 : null,
            duration: weekly ? 604800 : 18000};
    }
}
