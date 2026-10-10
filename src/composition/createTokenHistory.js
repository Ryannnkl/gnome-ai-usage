import GLib from 'gi://GLib';
import {TokenHistoryReader} from '../infrastructure/TokenHistoryReader.js';
import {TokenFiles} from '../infrastructure/tokens/TokenFiles.js';
import {CodexTokens} from '../infrastructure/tokens/CodexTokens.js';
import {ClaudeTokens} from '../infrastructure/tokens/ClaudeTokens.js';
import {AntigravityTokens} from '../infrastructure/tokens/AntigravityTokens.js';
import {SqliteMetadata} from '../infrastructure/tokens/SqliteMetadata.js';
import {ProtoFields} from '../infrastructure/tokens/ProtoFields.js';
import {HistoryCalendar} from '../domain/HistoryCalendar.js';
import {UsageCommand} from '../infrastructure/UsageCommand.js';
import {JsonFileReader} from '../infrastructure/JsonFileReader.js';
import {ClaudeExecutionContext} from '../providers/claude/ClaudeExecutionContext.js';

export function createTokenHistory(home) {
    const files = new TokenFiles();
    const database = new SqliteMetadata(new UsageCommand(), GLib.find_program_in_path('sqlite3'));
    return new TokenHistoryReader({
        codex: new CodexTokens(files),
        claude: new ClaudeTokens(files),
        antigravity: new AntigravityTokens(files, database, new ProtoFields()),
    }, {
        codex: home,
        claude: new ClaudeExecutionContext(GLib.get_home_dir(), new JsonFileReader()).directory,
        antigravity: GLib.getenv('GEMINI_CLI_HOME') || `${GLib.get_home_dir()}/.gemini`,
    }, new HistoryCalendar());
}
