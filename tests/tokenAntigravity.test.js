import test from 'node:test';
import assert from 'node:assert/strict';

import { AntigravityTokens } from '../src/infrastructure/tokens/AntigravityTokens.js';
import { ProtoFields } from '../src/infrastructure/tokens/ProtoFields.js';
import { TokenLedger } from '../src/infrastructure/tokens/TokenLedger.js';
import { SqliteMetadata } from '../src/infrastructure/tokens/SqliteMetadata.js';
import { protoField, protoHex } from './tokenFixtures.js';

test('Antigravity joins timestamps and deduplicates responses without conversation text', async () => {
    const response = new TextEncoder().encode('response');
    const usage = Uint8Array.from(
        [1, 2, 5, 9, 10]
            .flatMap((key, index) => [...protoField(key, (index + 1) * 10)])
            .concat([...protoField(11, response)])
    );
    const metadata = Uint8Array.from([
        ...protoField(1, protoField(1, 1791633600)),
        ...protoField(9, protoField(11, response)),
    ]);
    const blob = protoField(1, protoField(4, usage));
    let hasTimestamp = true;
    const files = {
        async *paths() {
            yield '/fixture/synthetic.db';
        },
    };
    const database = {
        async *rows(path, table) {
            if (table === 'steps') {
                if (hasTimestamp)
                    yield { cursor: 1, blob: protoHex(metadata) };
            } else {
                yield { cursor: 0, blob: protoHex(blob) };
                yield { cursor: 1, blob: protoHex(blob) };
            }
        },
    };
    const collector = new AntigravityTokens(files, database, new ProtoFields());
    const ledger = new TokenLedger(['2026-10-10']);

    await collector.collect('/fixture', ledger, { set_error_if_cancelled() {} });

    assert.deepEqual(ledger.report().days, [{ date: '2026-10-10', tokens: 150 }]);
    assert.equal(ledger.partial, false);
    hasTimestamp = false;

    const partial = new TokenLedger(['2026-10-10']);

    await collector.collect('/fixture', partial, { set_error_if_cancelled() {} });

    assert.deepEqual(partial.report().days, []);
    assert.equal(partial.partial, true);
});

test('truncated, oversized and invalid protobuf fields are rejected', () => {
    const proto = new ProtoFields();

    for (const bytes of [[10, 255], [10, 5, 0], [3], [8, ...Array(11).fill(255)]])
        assert.throws(() => proto.decode(Uint8Array.from(bytes)));

    assert.equal(proto.timestamp(), null);
    assert.throws(() => proto.hex('broken'));
});

test('SQLite is invoked read-only without a shell or interpolated paths', async () => {
    const calls = [];
    const database = new SqliteMetadata(
        {
            async run(executable, args) {
                calls.push([executable, args]);

                return '[{"cursor":0,"blob":"0A00"}]';
            },
        },
        '/usr/bin/sqlite3'
    );
    const rows = [];
    const path = '/fixture/name with spaces;$.db';

    for await (const row of database.rows(path, 'gen_metadata', {}))
        rows.push(row);

    assert.equal(rows.length, 1);
    assert.deepEqual(calls[0][1].slice(0, 5), [
        '-readonly',
        '-json',
        '-cmd',
        '.timeout 1000',
        path,
    ]);
    assert.match(calls[0][1][5], /^SELECT idx AS cursor, hex\(data\)/);
});

test('missing SQLite affects only token history and returns partial data', async () => {
    const collector = new AntigravityTokens(
        {
            async *paths() {
                yield '/fixture/synthetic.db';
            },
        },
        new SqliteMetadata({}, null),
        new ProtoFields()
    );
    const ledger = new TokenLedger(['2026-10-10']);

    await collector.collect('/fixture', ledger, { set_error_if_cancelled() {} });

    assert.equal(ledger.partial, true);
    assert.deepEqual(ledger.report().days, []);
});
