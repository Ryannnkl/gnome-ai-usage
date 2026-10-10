import test from 'node:test';
import assert from 'node:assert/strict';
import {ProviderDiscovery} from '../src/composition/ProviderDiscovery.js';

test('discovers every subset of the optional Codex, Claude and Antigravity providers', () => {
    for (let mask = 0; mask < 8; mask++) {
        const expected = {
            codex: Boolean(mask & 1),
            claude: Boolean(mask & 2),
            antigravity: Boolean(mask & 4),
        };
        const locator = {find: command => expected[command === 'agy' ? 'antigravity' : command] ?
            `/synthetic/bin/${command}` : null};
        const discovery = new ProviderDiscovery(locator,
            path => path === '/synthetic/codex' && expected.codex);
        const found = discovery.discover('/synthetic/codex');
        assert.deepEqual({codex: found.codex, claude: Boolean(found.claude),
            antigravity: Boolean(found.antigravity)}, expected);
    }
});

test('an explicitly configured but absent Codex directory remains recoverable', () => {
    const discovery = new ProviderDiscovery({find: () => null}, () => false);
    assert.equal(discovery.discover('/synthetic/missing', true).codex, true);
});

test('a present Codex executable keeps the provider discoverable before first login', () => {
    const discovery = new ProviderDiscovery({
        find: command => command === 'codex' ? '/synthetic/bin/codex' : null,
    }, () => false);
    assert.equal(discovery.discover('/synthetic/missing').codex, true);
});

test('disabled providers never inspect directories or locate commands', () => {
    for (let mask = 0; mask < 8; mask++) {
        const commands = [];
        const directories = [];
        const enabled = {codex: Boolean(mask & 1), claude: Boolean(mask & 2),
            antigravity: Boolean(mask & 4)};
        const discovery = new ProviderDiscovery({find(command) {
            commands.push(command);
            return `/synthetic/${command}`;
        }}, path => { directories.push(path); return false; });
        const found = discovery.discover('/synthetic/config', false, enabled);
        assert.deepEqual({codex: found.codex, claude: Boolean(found.claude),
            antigravity: Boolean(found.antigravity)}, enabled);
        assert.deepEqual(commands, ['codex', 'claude', 'agy'].filter((_, index) =>
            mask & (1 << index)));
        assert.equal(directories.length, enabled.codex ? 1 : 0);
    }
});
