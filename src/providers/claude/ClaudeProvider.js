export class ClaudeProvider {
    constructor(context, command, parser, binary) {
        this.id = 'claude';
        this.name = 'Claude';
        this.context = context;
        this.command = command;
        this.parser = parser;
        this.binary = binary;
        this.cacheable = false;
        this.retainPreviousOnFailure = false;
    }

    readAccount() {
        return this.context.read();
    }

    async fetch(account, cancellable, now) {
        const output = await this.command.run(this.binary,
            ['--print', '--no-session-persistence', '--strict-mcp-config', '/usage'],
            cancellable, account.environment);
        const snapshot = this.parser.parse(output, now());
        return {...snapshot, plan: account.plan};
    }

    start() {}

    isActive() {
        return false;
    }

    destroy() {}
}
