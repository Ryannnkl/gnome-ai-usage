export class ClaudeTokens {
    constructor(files) {
        this.files = files;
    }

    async collect(root, ledger, cancellable) {
        const messages = new Map();

        for (const folder of ['projects', 'transcripts']) {
            for await (const path of this.files.paths(
                `${root}/${folder}`,
                '.jsonl',
                cancellable,
                ledger
            )) {
                for await (const event of this.files.events(path, cancellable, ledger)) {
                    const message = event.message ?? {};

                    if (event.type !== 'assistant' || !message.usage)
                        continue;

                    const values = [
                        'input_tokens',
                        'output_tokens',
                        'cache_read_input_tokens',
                        'cache_creation_input_tokens',
                    ].map(field => message.usage[field] ?? 0);

                    if (
                        typeof message.id !== 'string' ||
                        !message.id ||
                        values.some(value => !Number.isSafeInteger(value) || value < 0)
                    ) {
                        ledger.partial = true;
                        continue;
                    }

                    const tokens = values.reduce((sum, value) => sum + value, 0);

                    if (!messages.has(message.id) || messages.get(message.id).tokens < tokens)
                        messages.set(message.id, { timestamp: event.timestamp, tokens });
                }
            }
        }

        for (const [id, { timestamp, tokens }] of messages)
            ledger.add(timestamp, tokens, id);
    }
}
