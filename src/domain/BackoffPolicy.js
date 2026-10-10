export class BackoffPolicy {
    delay(error, failures) {
        if (error.code === 'rateLimited') {
            const localDelay = Math.min(900, 60 * 2 ** Math.min(failures, 4));
            return Math.max(localDelay, error.retryAfter || 0);
        }
        if (['needsAuth', 'expired', 'unsupported'].includes(error.code))
            return 300;
        return Math.min(300, 30 * 2 ** Math.min(failures, 4));
    }
}
