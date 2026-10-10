import { UsageError } from '../../domain/UsageError.js';

export class CodexCredentialsParser {
    parse(contents) {
        let payload;

        try {
            payload = JSON.parse(contents);
        } catch {
            throw new UsageError('needsAuth');
        }

        const accessToken = payload?.tokens?.access_token;
        const accountId = payload?.tokens?.account_id;

        if (
            typeof accessToken !== 'string' ||
            !accessToken.trim() ||
            typeof accountId !== 'string' ||
            !accountId.trim()
        )
            throw new UsageError('needsAuth');

        return { accessToken, accountId };
    }
}
