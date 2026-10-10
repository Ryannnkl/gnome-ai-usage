import { UsageError } from '../../domain/UsageError.js';

export class ClaudeProvider {
    constructor(context, command, parser, binary, identityParser = null) {
        this.id = 'claude';
        this.name = 'Claude';
        this.context = context;
        this.command = command;
        this.parser = parser;
        this.binary = binary;
        this.identityParser = identityParser;
        this.cacheable = false;
        this.retainPreviousOnFailure = false;
    }

    async readAccount(cancellable) {
        const account = this.context.read();

        if (!this.identityParser)
            return account;

        try {
            const output = await this.command.run(
                this.binary,
                ['auth', 'status'],
                cancellable,
                account.environment
            );
            const identity = this.identityParser.parse(output);

            return identity ? { ...account, ...identity, key: identity.historyKey } : account;
        } catch {
            return account;
        }
    }

    async fetch(account, cancellable, now) {
        const output = await this.command.run(
            this.binary,
            ['--print', '--no-session-persistence', '--strict-mcp-config', '/usage'],
            cancellable,
            account.environment
        );
        const snapshot = this.parser.parse(output, now());

        if (account.historyKey) {
            const confirmed = await this.readAccount(cancellable);

            if (confirmed.historyKey !== account.historyKey || confirmed.plan !== account.plan)
                throw new UsageError('accountChanged');
        }

        return { ...snapshot, plan: account.plan };
    }

    start() {}

    isActive() {
        return false;
    }

    destroy() {}
}
