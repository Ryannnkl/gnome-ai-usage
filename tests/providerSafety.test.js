import test from 'node:test';
import assert from 'node:assert/strict';

import { AntigravityProvider } from '../src/providers/antigravity/AntigravityProvider.js';

test('Antigravity does not persist or retain readings without a report account ID', async () => {
    const provider = new AntigravityProvider(
        { run: async () => '' },
        { parse: () => ({}) },
        '/synthetic/agy',
        'synthetic-local-scope'
    );
    const account = await provider.readAccount();

    assert.equal(account.key, 'synthetic-local-scope');
    assert.equal(provider.cacheable, false);
    assert.equal(provider.retainPreviousOnFailure, false);
});
