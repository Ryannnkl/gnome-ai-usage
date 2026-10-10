import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ClaudeIdentityParser} from '../src/providers/claude/ClaudeIdentityParser.js';

const parser = new ClaudeIdentityParser(value => createHash('sha256').update(value).digest('hex'));
const status = overrides => JSON.stringify({loggedIn: true, authMethod: 'claude.ai',
    configDirectory: '/synthetic/claude', email: 'synthetic@example.invalid',
    orgId: 'synthetic-org', subscriptionType: 'team', ...overrides});

test('CLI identity persists only a hash and plan, never email or raw auth metadata', () => {
    const account = parser.parse(status());
    assert.deepEqual(Object.keys(account), ['historyKey', 'plan']);
    assert.match(account.historyKey, /^[a-f0-9]{64}$/);
    assert.equal(account.plan, 'team');
    assert.equal(JSON.stringify(account).includes('synthetic@'), false);
});

test('different accounts, organizations and directories have independent history scopes', () => {
    const original = parser.parse(status()).historyKey;
    for (const overrides of [{email: 'other@example.invalid'}, {orgId: 'other-org'},
        {configDirectory: '/other/claude'}])
        assert.notEqual(parser.parse(status(overrides)).historyKey, original);
});

test('older CLI output, absent identity and API authentication disable history safely', () => {
    for (const overrides of [{loggedIn: false}, {authMethod: 'api_key'}, {email: null},
        {configDirectory: undefined}, {email: ''}, {orgId: {}}])
        assert.equal(parser.parse(status(overrides)), null);
    assert.throws(() => parser.parse('not JSON'));
});
