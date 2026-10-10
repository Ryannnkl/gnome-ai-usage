import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { UsageCommand } from '../src/infrastructure/UsageCommand.js';
import { SqliteMetadata } from '../src/infrastructure/tokens/SqliteMetadata.js';
import { AntigravityTokens } from '../src/infrastructure/tokens/AntigravityTokens.js';
import { TokenFiles } from '../src/infrastructure/tokens/TokenFiles.js';
import { TokenLedger } from '../src/infrastructure/tokens/TokenLedger.js';
import { ProtoFields } from '../src/infrastructure/tokens/ProtoFields.js';
import { protoField, protoHex } from './tokenFixtures.js';
import { assert } from './shellAssert.js';

export async function testSqliteTokens() {
    const executable = GLib.find_program_in_path('sqlite3');

    assert(executable, 'SQLite integration tests require sqlite3');

    const root = GLib.dir_make_tmp('ai-usage-sqlite-XXXXXX');
    const folder = `${root}/antigravity-cli/conversations`;

    GLib.mkdir_with_parents(folder, 0o700);

    const path = `${folder}/synthetic with spaces.db`;
    const command = new UsageCommand();
    const response = new TextEncoder().encode('synthetic-response');
    const usage = Uint8Array.from([
        ...protoField(1, 12),
        ...protoField(2, 34),
        ...protoField(11, response),
    ]);
    const metadata = Uint8Array.from([
        ...protoField(1, protoField(1, 1791633600)),
        ...protoField(9, protoField(11, response)),
    ]);
    const blob = protoField(1, protoField(4, usage));

    try {
        const setup = [
            'CREATE TABLE steps (step_type INTEGER, metadata BLOB)',
            'CREATE TABLE gen_metadata (idx INTEGER, data BLOB)',
            `INSERT INTO steps VALUES (15, X'${protoHex(metadata)}')`,
            ...Array.from(
                { length: 35 },
                (_, index) => `INSERT INTO gen_metadata VALUES (${index}, X'${protoHex(blob)}')`
            ),
        ].join(';');

        await command.run(executable, [path, setup], new Gio.Cancellable());

        const [, before] = GLib.file_get_contents(path);
        const collector = new AntigravityTokens(
            new TokenFiles(),
            new SqliteMetadata(command, executable),
            new ProtoFields()
        );
        const ledger = new TokenLedger(['2026-10-10']);

        await collector.collect(root, ledger, new Gio.Cancellable());

        assert(
            ledger.report().days[0]?.tokens === 46,
            'SQLite tokens or response deduplication failed'
        );
        assert(!ledger.partial, 'Valid SQLite history unexpectedly partial');

        const [, after] = GLib.file_get_contents(path);

        assert(
            before.length === after.length && before.every((byte, index) => byte === after[index]),
            'Token collection modified the database'
        );
        await command.run(executable, [path, 'DELETE FROM steps'], new Gio.Cancellable());

        const partial = new TokenLedger(['2026-10-10']);

        await collector.collect(root, partial, new Gio.Cancellable());

        assert(
            partial.partial && !partial.days.size,
            'Missing timestamps were assigned consumption'
        );
    } finally {
        GLib.unlink(path);
        GLib.rmdir(folder);
        GLib.rmdir(`${root}/antigravity-cli`);
        GLib.rmdir(root);
    }
}
