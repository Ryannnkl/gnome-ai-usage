import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import {UsageError} from '../domain/UsageError.js';
import {RetryAfterParser} from './RetryAfterParser.js';

export class SoupHttpClient {
    constructor(retryAfterParser = new RetryAfterParser()) {
        this.session = new Soup.Session({timeout: 15});
        this.retryAfterParser = retryAfterParser;
    }

    getJson(url, headers, cancellable) {
        const message = Soup.Message.new('GET', url);
        message.set_flags(Soup.MessageFlags.NO_REDIRECT);
        for (const [name, value] of Object.entries(headers))
            message.get_request_headers().replace(name, value);
        return new Promise((resolve, reject) => {
            this.session.send_and_read_async(message, GLib.PRIORITY_DEFAULT,
                cancellable, (session, result) => {
                    try {
                        const bytes = session.send_and_read_finish(result);
                        this.validateStatus(message);
                        if (bytes.get_size() > 1024 * 1024)
                            throw new UsageError('invalidResponse');
                        const text = new TextDecoder().decode(bytes.get_data());
                        resolve(JSON.parse(text));
                    } catch (error) {
                        reject(error instanceof UsageError ? error :
                            new UsageError(error instanceof SyntaxError ?
                                'invalidResponse' : 'network'));
                    }
                });
        });
    }

    validateStatus(message) {
        const status = message.status_code;
        if (status === 401 || status === 403)
            throw new UsageError('needsAuth');
        if (status === 429) {
            const header = message.get_response_headers().get_one('Retry-After');
            throw new UsageError('rateLimited', this.retryAfterParser.parse(header));
        }
        if (status < 200 || status >= 300)
            throw new UsageError('network');
    }

    destroy() {
        this.session.abort();
    }
}
