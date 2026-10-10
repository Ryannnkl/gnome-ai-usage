export class CodexTokens {
    constructor(files) {
        this.files = files;
    }

    async collect(root, ledger, cancellable) {
        for await (const path of this.files.paths(
            `${root}/sessions`,
            '.jsonl',
            cancellable,
            ledger
        )) {
            let previous = null;
            let sessionId = path;

            for await (const event of this.files.events(path, cancellable, ledger)) {
                const payload = event.payload ?? {};

                if (event.type === 'session_meta' && typeof payload.id === 'string')
                    sessionId = payload.id;

                if (event.type !== 'event_msg' || payload.type !== 'token_count')
                    continue;

                const info = payload.info ?? {};
                const total = info.total_token_usage?.total_tokens;

                if (!Number.isSafeInteger(total) || total < 0 || total === previous)
                    continue;

                if (previous !== null && total < previous) {
                    previous = total;
                    ledger.partial = true;
                    continue;
                }

                const last = info.last_token_usage?.total_tokens;
                const delta =
                    previous === null
                        ? Number.isSafeInteger(last) && last >= 0 && last <= total
                            ? last
                            : null
                        : total - previous;

                previous = total;

                if (delta === null)
                    ledger.partial = true;
                else
                    ledger.add(event.timestamp, delta, JSON.stringify([sessionId, total]));
            }
        }
    }
}
