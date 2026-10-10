export class AntigravityProvider {
    constructor(command, parser, binary, identity) {
        this.id = 'antigravity';
        this.name = 'Antigravity';
        this.cacheable = false;
        this.retainPreviousOnFailure = false;
        this.command = command;
        this.parser = parser;
        this.binary = binary;
        this.identity = identity;
    }

    async readAccount() {
        return { key: this.identity };
    }

    async fetch(_account, cancellable) {
        const output = await this.command.run(
            this.binary,
            ['--print', '/usage', '--print-timeout', '15s'],
            cancellable
        );

        return this.parser.parse(output);
    }

    start() {}

    isActive() {
        return false;
    }

    destroy() {}
}
