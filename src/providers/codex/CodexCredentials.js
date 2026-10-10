import Gio from 'gi://Gio';

import { UsageError } from '../../domain/UsageError.js';

export class CodexCredentials {
    constructor(home, fileReader, parser) {
        this.path = `${home}/auth.json`;
        this.fileReader = fileReader;
        this.parser = parser;
    }

    async read(cancellable) {
        try {
            const contents = await this.fileReader.read(this.path, cancellable);
            const account = this.parser.parse(contents);

            account.key = this.fileReader.fingerprint(`${this.path}:${account.accountId}`);

            return account;
        } catch (error) {
            if (error instanceof UsageError)
                throw error;

            if (error.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.PERMISSION_DENIED))
                throw new UsageError('accessDenied');

            throw new UsageError('needsAuth');
        }
    }
}
