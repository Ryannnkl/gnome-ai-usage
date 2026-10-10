import test from 'node:test';
import assert from 'node:assert/strict';

import { ClaudeProvider } from '../src/providers/claude/ClaudeProvider.js';
import { ClaudeIdentityParser } from '../src/providers/claude/ClaudeIdentityParser.js';

function harness() {
    const calls = [];
    const identities = ['first', 'first'];
    const command = {
        async run(_binary, args, _cancellable, environment) {
            calls.push({ args, environment });

            if (args[0] !== 'auth')
                return 'synthetic usage';

            const email = identities.shift();

            if (email === 'failure')
                throw new Error('unavailable');

            return JSON.stringify({
                loggedIn: true,
                authMethod: 'claude.ai',
                email,
                configDirectory: '/synthetic/claude',
                subscriptionType: 'team',
            });
        },
    };
    const context = {
        read: () => ({
            key: 'directory-only',
            environment: { CLAUDE_CONFIG_DIR: '/synthetic/claude' },
        }),
    };
    const parser = { parse: () => ({ windows: [] }) };
    const identity = new ClaudeIdentityParser(value => `hash-${value}`);
    const provider = new ClaudeProvider(context, command, parser, '/synthetic/claude', identity);

    return { provider, calls, identities };
}

test('confirms the same CLI account before and after usage without reading credentials', async () => {
    const { provider, calls } = harness();
    const account = await provider.readAccount({});

    assert.equal(account.key, account.historyKey);

    const snapshot = await provider.fetch(account, {}, () => 1000);

    assert.equal(snapshot.plan, 'team');
    assert.deepEqual(
        calls.map(call => call.args[0]),
        ['auth', '--print', 'auth']
    );
    assert.ok(calls.every(call => call.environment.CLAUDE_CONFIG_DIR === '/synthetic/claude'));
    assert.equal(provider.cacheable, false);
});

test('switching accounts during a query rejects both usage and historical attribution', async () => {
    const { provider, identities } = harness();

    identities[1] = 'second';

    const account = await provider.readAccount({});

    await assert.rejects(
        provider.fetch(account, {}, () => 1000),
        { code: 'accountChanged' }
    );
});

test('missing auth status support still allows quota reads but disables history', async () => {
    const { provider, identities, calls } = harness();

    identities[0] = 'failure';

    const account = await provider.readAccount({});

    assert.equal(account.historyKey, undefined);
    assert.deepEqual((await provider.fetch(account, {}, () => 1000)).windows, []);
    assert.equal(calls.length, 2);
});

test('failure to re-confirm identity rejects a potentially mismatched result', async () => {
    const { provider, identities } = harness();

    identities[1] = 'failure';

    const account = await provider.readAccount({});

    await assert.rejects(
        provider.fetch(account, {}, () => 1000),
        { code: 'accountChanged' }
    );
});

test('changing plan during usage prevents comparing different quota capacities', async () => {
    const { provider } = harness();
    const account = await provider.readAccount({});

    provider.readAccount = async () => ({ ...account, plan: 'max' });

    await assert.rejects(
        provider.fetch(account, {}, () => 1000),
        { code: 'accountChanged' }
    );
});
