export class UsageError extends Error {
    constructor(code, retryAfter = 0) {
        super(code);
        this.name = 'UsageError';
        this.code = code;
        this.retryAfter = retryAfter;
    }
}
