export class RetryAfterParser {
    parse(header, now = Date.now() / 1000) {
        if (!header)
            return 0;

        const seconds = Number(header);

        if (Number.isFinite(seconds))
            return Math.max(0, seconds);

        const timestamp = Date.parse(header) / 1000;

        return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : 0;
    }
}
