import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { TokenHistoryReader } from '../src/infrastructure/TokenHistoryReader.js';
import { TokenFiles } from '../src/infrastructure/tokens/TokenFiles.js';
import { ClaudeTokens } from '../src/infrastructure/tokens/ClaudeTokens.js';
import { HistoryCalendar } from '../src/domain/HistoryCalendar.js';
import { assert } from './shellAssert.js';

export async function testTokens() {
    const folder = GLib.dir_make_tmp('ai-usage-token-test-XXXXXX');
    const project = GLib.build_filenamev([folder, 'projects']);

    GLib.mkdir_with_parents(project, 0o700);

    const calendar = new HistoryCalendar();
    const now = Date.now() / 1000;
    const path = GLib.build_filenamev([project, 'fixture.jsonl']);

    GLib.file_set_contents(
        path,
        JSON.stringify({
            type: 'assistant',
            timestamp: new Date(now * 1000).toISOString(),
            message: { id: 'synthetic', usage: { input_tokens: 123, output_tokens: 45 } },
        })
    );

    const reader = new TokenHistoryReader(
        { claude: new ClaudeTokens(new TokenFiles()) },
        { claude: folder },
        calendar
    );

    try {
        const result = await reader.read('claude', new Gio.Cancellable(), now);

        assert(result.days[0].tokens === 168, 'GJS collector did not aggregate usage fields');
        assert(!result.partial, 'Valid JSONL unexpectedly partial');
        GLib.file_set_contents(
            path,
            '{broken\n' +
                JSON.stringify({
                    type: 'assistant',
                    timestamp: new Date(now * 1000).toISOString(),
                    message: { id: 'ação', usage: { input_tokens: 7 } },
                })
        );

        const partial = await reader.read('claude', new Gio.Cancellable(), now);

        assert(
            partial.partial && partial.days[0]?.tokens === 7,
            'Corrupt JSONL lost valid metadata'
        );

        const cancelled = new Gio.Cancellable();

        cancelled.cancel();

        assert(
            (await reader.read('claude', cancelled, now)) === null,
            'Cancelled token reader published'
        );

        const active = new Gio.Cancellable();
        const interrupted = new TokenHistoryReader(
            {
                claude: {
                    async collect(root, ledger) {
                        ledger.add(new Date(now * 1000).toISOString(), 99, 'cancelled');
                        active.cancel();
                    },
                },
            },
            { claude: folder },
            calendar
        );

        assert(
            (await interrupted.read('claude', active, now)) === null,
            'Reader published tokens after cancellation'
        );
    } finally {
        GLib.unlink(path);
        GLib.rmdir(project);
        GLib.rmdir(folder);
    }
}
