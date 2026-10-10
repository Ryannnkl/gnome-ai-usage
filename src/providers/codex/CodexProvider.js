import {DirectoryWatcher} from '../../infrastructure/DirectoryWatcher.js';

export class CodexProvider {
    constructor(credentials, httpClient, parser, activity) {
        this.id = 'codex';
        this.name = 'Codex';
        this.credentials = credentials;
        this.httpClient = httpClient;
        this.parser = parser;
        this.activity = activity;
    }

    readAccount(cancellable) {
        return this.credentials.read(cancellable);
    }

    async fetch(account, cancellable, now) {
        const payload = await this.httpClient.getJson(
            'https://chatgpt.com/backend-api/wham/usage', {
                Authorization: `Bearer ${account.accessToken}`,
                'ChatGPT-Account-Id': account.accountId,
                Accept: 'application/json',
                'Cache-Control': 'no-cache, no-store',
            }, cancellable);
        return this.parser.parse(payload, now());
    }

    start(onAccountChanged) {
        this.activity.start();
        const directory = this.credentials.path.slice(0, this.credentials.path.lastIndexOf('/'));
        this.credentialWatcher = new DirectoryWatcher(directory,
            name => name === 'auth.json', onAccountChanged);
        this.credentialWatcher.start();
    }

    isActive(now) {
        this.credentialWatcher?.start();
        return this.activity.isActive(now);
    }

    destroy() {
        this.credentialWatcher?.destroy();
        this.activity.destroy();
        this.httpClient.destroy();
    }
}
