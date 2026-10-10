import { UsageError } from '../../domain/UsageError.js';
import { ClaudeResetParser } from './ClaudeResetParser.js';

export class ClaudeUsageParser {
    constructor(resetParser = new ClaudeResetParser()) {
        this.resetParser = resetParser;
    }

    parse(output, now) {
        if (typeof output !== 'string' || !output.trim())
            throw new UsageError('invalidResponse');

        const windows = output
            .split(/\r?\n/)
            .map(line => this.parseLine(line, now))
            .filter(Boolean);

        if (!windows.length)
            throw new UsageError('unsupported');

        const session = windows.find(window => window.id === 'session');

        return {
            source: 'provider',
            plan: null,
            headlineId: session?.id ?? windows[0].id,
            windows,
        };
    }

    parseLine(line, now) {
        const match = line.match(
            /^\s*Current (session|week(?:\s*\([^)]+\))?):\s*(\d+(?:\.\d+)?)%\s+used(?:\s*[·•]\s*resets\s+(.+?))?\s*$/i
        );

        if (!match)
            return null;

        const usedPercent = Number(match[2]);

        if (!Number.isFinite(usedPercent) || usedPercent < 0 || usedPercent > 1000)
            return null;

        const period = match[1].toLowerCase().startsWith('session') ? 'session' : 'weekly';
        const detail = match[1].match(/\(([^)]+)\)/)?.[1];
        const label = period === 'session' ? 'Sessão' : detail ? `Semanal · ${detail}` : 'Semanal';
        const resetsAt = match[3] ? this.resetParser.parse(match[3], now) : null;
        const id =
            period === 'session'
                ? 'session'
                : `weekly-${detail?.toLowerCase().replace(/\W+/g, '-') ?? 'all'}`;

        return {
            id,
            label,
            usedPercent,
            resetsAt,
            duration: period === 'session' ? 18000 : 604800,
        };
    }
}
