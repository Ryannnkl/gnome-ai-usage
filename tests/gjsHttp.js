import Gio from 'gi://Gio';
import Soup from 'gi://Soup?version=3.0';
import {SoupHttpClient} from '../src/infrastructure/SoupHttpClient.js';
import {assert, rejects} from './gjsAssert.js';

export async function testHttp() {
    const server = new Soup.Server();
    let redirected = false;
    server.add_handler(null, (_server, message, path) => {
        if (path === '/limited') {
            message.set_status(429, null);
            message.get_response_headers().replace('Retry-After', '120');
        } else if (path === '/auth') {
            message.set_status(401, null);
        } else if (path === '/redirect') {
            message.set_redirect(302, '/target');
        } else {
            if (path === '/target')
                redirected = true;
            message.set_status(200, null);
            message.set_response('application/json', Soup.MemoryUse.COPY,
                path === '/invalid' ? 'not-json' : '{"value":42}');
        }
    });
    server.listen_local(0, Soup.ServerListenOptions.IPV4_ONLY);
    const base = server.get_uris()[0].to_string().replace(/\/$/, '');
    const client = new SoupHttpClient();
    const get = path => client.getJson(`${base}${path}`, {}, new Gio.Cancellable());
    try {
        assert((await get('/usage')).value === 42, 'JSON response failed');
        await rejects(() => get('/auth'), 'needsAuth');
        await rejects(() => get('/invalid'), 'invalidResponse');
        const limited = await rejects(() => get('/limited'), 'rateLimited');
        assert(limited.retryAfter === 120, 'Retry-After was not preserved');
        await rejects(() => get('/redirect'), 'network');
        assert(!redirected, 'Authorization could be forwarded by redirect');
        const canceled = new Gio.Cancellable();
        canceled.cancel();
        await rejects(() => client.getJson(`${base}/usage`, {}, canceled), 'network');
    } finally {
        client.destroy();
        server.disconnect();
    }
}
