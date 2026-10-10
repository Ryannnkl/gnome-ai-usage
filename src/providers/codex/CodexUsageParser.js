import {UsageError} from '../../domain/UsageError.js';
import {CodexWindowParser} from './CodexWindowParser.js';

export class CodexUsageParser {
    constructor(windowParser = new CodexWindowParser()) {
        this.windowParser = windowParser;
    }

    parse(payload, now) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload))
            throw new UsageError('invalidResponse');
        const rateLimit = payload.rate_limit;
        if (!rateLimit || typeof rateLimit !== 'object')
            throw new UsageError('unsupported');
        const windows = ['primary', 'secondary'].map(id =>
            this.windowParser.parse(id, rateLimit[`${id}_window`], now))
            .filter(Boolean);
        if (!windows.length)
            throw new UsageError('unsupported');
        return {
            plan: typeof payload.plan_type === 'string' ? payload.plan_type : null,
            source: 'provider',
            headlineId: 'primary',
            windows,
        };
    }
}
