import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { JsonFileReader } from '../src/infrastructure/JsonFileReader.js';
import { CodexCredentials } from '../src/providers/codex/CodexCredentials.js';
import { CodexCredentialsParser } from '../src/providers/codex/CodexCredentialsParser.js';
import { DirectoryWatcher } from '../src/infrastructure/DirectoryWatcher.js';
import { assert, rejects } from './gjsAssert.js';

export async function testFiles() {
    const directory = GLib.dir_make_tmp('ai-usage-test-XXXXXX');
    const auth = Gio.File.new_for_path(`${directory}/auth.json`);
    const contents = JSON.stringify({
        tokens: { access_token: 'synthetic-token', account_id: 'synthetic-account' },
    });

    GLib.file_set_contents(auth.get_path(), contents);

    const reader = new JsonFileReader();
    const credentials = new CodexCredentials(directory, reader, new CodexCredentialsParser());
    let changes = 0;
    const watcher = new DirectoryWatcher(
        directory,
        name => name === 'auth.json',
        () => {
            changes++;
        }
    );

    watcher.start();

    try {
        const account = await credentials.read(new Gio.Cancellable());

        assert(account.accessToken === 'synthetic-token', 'Credential read failed');
        assert(account.key.length === 64, 'Account fingerprint is not SHA256');
        GLib.file_set_contents(auth.get_path(), 'invalid');
        await rejects(() => credentials.read(new Gio.Cancellable()), 'needsAuth');
        await new Promise(resolve => GLib.timeout_add_once(GLib.PRIORITY_DEFAULT, 500, resolve));

        assert(changes > 0, 'Directory watcher did not detect replacement');

        const canceled = new Gio.Cancellable();

        canceled.cancel();

        let rejected = false;

        try {
            await reader.read(auth.get_path(), canceled);
        } catch {
            rejected = true;
        }

        assert(rejected, 'Canceled read unexpectedly succeeded');
    } finally {
        watcher.destroy();
        auth.delete(null);
        Gio.File.new_for_path(directory).delete(null);
    }
}
