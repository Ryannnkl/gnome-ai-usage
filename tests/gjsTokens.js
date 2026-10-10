import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {TokenHistoryReader} from '../src/infrastructure/TokenHistoryReader.js';
import {UsageCommand} from '../src/infrastructure/UsageCommand.js';
import {HistoryCalendar} from '../src/domain/HistoryCalendar.js';
import {assert} from './shellAssert.js';

export async function testTokens() {
    const folder = GLib.dir_make_tmp('ai-usage-token-test-XXXXXX');
    const project = GLib.build_filenamev([folder, 'projects']);
    GLib.mkdir_with_parents(project, 0o700);
    const calendar = new HistoryCalendar();
    const now = Date.now() / 1000;
    const path = GLib.build_filenamev([project, 'fixture.jsonl']);
    GLib.file_set_contents(path, JSON.stringify({type: 'assistant',
        timestamp: new Date(now * 1000).toISOString(),
        message: {id: 'synthetic', usage: {input_tokens: 123, output_tokens: 45}}}));
    const script = GLib.build_filenamev([GLib.get_current_dir(), 'src/infrastructure/tokens/collect.py']);
    const reader = new TokenHistoryReader(new UsageCommand(), GLib.find_program_in_path('python3'),
        script, {claude: folder}, calendar);
    try {
        const result = await reader.read('claude', new Gio.Cancellable(), now);
        assert(result.days[0].tokens === 168, 'Token subprocess did not aggregate real usage fields');
        const cancelled = new Gio.Cancellable();
        cancelled.cancel();
        assert(await reader.read('claude', cancelled, now) === null, 'Cancelled token reader published');
    } finally {
        GLib.unlink(path);
        GLib.rmdir(project);
        GLib.rmdir(folder);
    }
}
