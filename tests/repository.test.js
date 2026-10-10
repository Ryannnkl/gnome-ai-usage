import test from 'node:test';
import assert from 'node:assert/strict';
import {SettingsRepository} from '../src/infrastructure/SettingsRepository.js';
import {usageSnapshot} from './fixtures.js';

function repository(initial) {
    let contents = initial;
    return new SettingsRepository({get_string: () => contents,
        set_string: (_key, value) => { contents = value; }});
}

test('cache corrompido não impede uma primeira leitura', () => {
    for (const contents of ['broken', 'null', '[]'])
        assert.deepEqual(repository(contents).load('codex'), {});
});

test('persiste leituras separadamente por provider e mantém prazos', () => {
    const store = repository('{}');
    const cached = {accountKey: 'synthetic-account', fetchedAt: 1000,
        snapshot: usageSnapshot(), retryAt: 1120};
    store.save('codex', cached);
    store.save('other', {...cached, retryAt: 2000});
    assert.deepEqual(store.load('codex'), cached);
    assert.equal(store.load('other').retryAt, 2000);
});

test('janela malformada é descartada, mas o backoff continua válido', () => {
    const cached = {codex: {retryAt: 1120, snapshot: {windows: [{usedPercent: '42'}]}}};
    assert.deepEqual(repository(JSON.stringify(cached)).load('codex'), {retryAt: 1120});
});

test('snapshot sem janelas não pode quebrar a interface ao restaurar', () => {
    const cached = {codex: {retryAt: 1120, snapshot: {plan: 'plus'}}};
    assert.deepEqual(repository(JSON.stringify(cached)).load('codex'), {retryAt: 1120});
});
