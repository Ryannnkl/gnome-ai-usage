export class ClaudeIdentityParser {
    constructor(fingerprint) {
        this.fingerprint = fingerprint;
    }

    parse(output) {
        const status = JSON.parse(output);

        if (
            status?.loggedIn !== true ||
            status.authMethod !== 'claude.ai' ||
            typeof status.email !== 'string' ||
            !status.email.trim() ||
            typeof status.configDirectory !== 'string' ||
            !status.configDirectory ||
            (status.orgId !== undefined &&
                status.orgId !== null &&
                typeof status.orgId !== 'string')
        )
            return null;

        const historyKey = this.fingerprint(
            JSON.stringify([
                status.configDirectory,
                status.orgId ?? '',
                status.email.trim().toLowerCase(),
            ])
        );

        return {
            historyKey,
            plan: typeof status.subscriptionType === 'string' ? status.subscriptionType : null,
        };
    }
}
