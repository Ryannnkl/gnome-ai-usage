import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { UsageCommand } from '../src/infrastructure/UsageCommand.js';
import { ClaudeExecutionContext } from '../src/providers/claude/ClaudeExecutionContext.js';
import { ClaudeProvider } from '../src/providers/claude/ClaudeProvider.js';
import { ClaudeUsageParser } from '../src/providers/claude/ClaudeUsageParser.js';
import { assert, rejects } from './gjsAssert.js';

export async function testProviderCommands() {
    const command = new UsageCommand();
    const output = await command.run(
        '/usr/bin/printf',
        ['%s', 'synthetic usage'],
        new Gio.Cancellable()
    );

    assert(output === 'synthetic usage', 'Subprocess output was not captured');

    const environment = await command.run(
        '/usr/bin/printenv',
        ['LC_ALL', 'CLAUDE_CONFIG_DIR'],
        new Gio.Cancellable(),
        { CLAUDE_CONFIG_DIR: '/synthetic/claude-profile' }
    );

    assert(environment === 'C\n/synthetic/claude-profile\n', 'CLI environment was not isolated');
    await rejects(
        () =>
            command.run('/usr/bin/printenv', ['CLAUDE_CONFIG_DIR'], new Gio.Cancellable(), {
                CLAUDE_CONFIG_DIR: null,
            }),
        'network'
    );

    const cancellable = new Gio.Cancellable();

    GLib.timeout_add_once(GLib.PRIORITY_DEFAULT, 100, () => cancellable.cancel());
    await rejects(() => command.run('/usr/bin/sleep', ['10'], cancellable), 'network');
    await rejects(() => command.run('/usr/bin/false', [], new Gio.Cancellable()), 'network');
    await rejects(
        () => command.run('/usr/bin/printf', ['Not logged in'], new Gio.Cancellable()),
        'needsAuth'
    );
    await rejects(
        () => command.run('/missing/usage-command', [], new Gio.Cancellable()),
        'unavailable'
    );
}

export function testClaudeExecutionContext() {
    const home = '/synthetic/home';
    const reader = {
        fingerprint: value => `hash:${value}`,
        read: () => {
            throw new Error('Account files must not be read');
        },
    };
    const defaultContext = new ClaudeExecutionContext(home, reader, null).read();

    assert(defaultContext.directory === `${home}/.claude`, 'Default Claude directory differs');
    assert(
        defaultContext.environment.CLAUDE_CONFIG_DIR === null,
        'Default profile must not be overridden'
    );

    const relative = new ClaudeExecutionContext(home, reader, 'work').read();

    assert(relative.directory === `${home}/work`, 'Relative profile was not resolved against home');
    assert(
        relative.environment.CLAUDE_CONFIG_DIR === relative.directory,
        'CLI must use the resolved configured profile'
    );

    const tilde = new ClaudeExecutionContext(home, reader, '~/claude-work').read();

    assert(tilde.directory === `${home}/claude-work`, 'Tilde profile was not expanded');
    assert(relative.key !== tilde.key, 'Different Claude directories shared an account scope');

    const provider = new ClaudeProvider(
        { home, directory: relative.directory, read: () => relative },
        { run() {} },
        new ClaudeUsageParser(),
        '/synthetic/claude'
    );

    assert(provider.cacheable === false, 'Claude usage must not persist without report identity');
    provider.destroy();
}

export async function testClaudeProfileWatcher() {
    const home = GLib.dir_make_tmp('ai-usage-claude-watch-XXXXXX');
    const directory = Gio.File.new_for_path(`${home}/work`);

    directory.make_directory(null);

    let changes = 0;
    const context = { home, directory: directory.get_path(), read: () => ({ key: 'synthetic' }) };
    const provider = new ClaudeProvider(
        context,
        { run() {} },
        new ClaudeUsageParser(),
        '/synthetic/claude'
    );

    try {
        provider.start(() => {
            changes++;
        });
        GLib.file_set_contents(`${home}/work/.credentials.json`, '{}');
        await wait(250);

        assert(changes === 0, 'CLI token rotation must not cancel its usage request');

        const beforeMetadata = changes;

        GLib.file_set_contents(`${home}/work/.claude.json`, '{}');
        await wait(250);

        assert(changes === beforeMetadata, 'CLI metadata writes must not invalidate usage');
        provider.destroy();

        const previous = changes;

        GLib.file_set_contents(`${home}/.claude.json`, '{}');
        await wait(250);

        assert(changes === previous, 'Destroyed Claude provider kept its file watchers');
    } finally {
        provider.destroy();
        Gio.File.new_for_path(`${home}/work/.credentials.json`).delete(null);
        Gio.File.new_for_path(`${home}/work/.claude.json`).delete(null);
        Gio.File.new_for_path(`${home}/.claude.json`).delete(null);
        directory.delete(null);
        Gio.File.new_for_path(home).delete(null);
    }
}

function wait(milliseconds) {
    return new Promise(resolve =>
        GLib.timeout_add_once(GLib.PRIORITY_DEFAULT, milliseconds, resolve)
    );
}
