import test from 'node:test';
import assert from 'node:assert/strict';

import { JsonLines } from '../src/infrastructure/tokens/JsonLines.js';

test('JSONL handles UTF-8 split across chunks and the last unterminated line', () => {
    const ledger = { partial: false };
    const parser = new JsonLines(ledger);
    const data = new TextEncoder().encode('{"id":"ação"}\n{"tokens":12}');
    const results = [];

    for (const byte of data)
        results.push(...parser.push(Uint8Array.of(byte)));

    results.push(...parser.push(new Uint8Array(), true));

    assert.deepEqual(results, [{ id: 'ação' }, { tokens: 12 }]);
    assert.equal(ledger.partial, false);
});

test('malformed and oversized lines are skipped without losing later metadata', () => {
    const ledger = { partial: false };
    const parser = new JsonLines(ledger);

    assert.deepEqual([...parser.push(new TextEncoder().encode('{broken\n'))], []);
    assert.deepEqual([...parser.push(new Uint8Array(4 * 1024 * 1024 + 1).fill(65))], []);

    const results = [...parser.push(new TextEncoder().encode('\n{"tokens":42}\n'))];

    assert.deepEqual(results, [{ tokens: 42 }]);
    assert.equal(ledger.partial, true);
});
