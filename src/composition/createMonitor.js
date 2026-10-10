import GLib from 'gi://GLib';
import {BackoffPolicy} from '../domain/BackoffPolicy.js';
import {PollingPolicy} from '../domain/PollingPolicy.js';
import {UsageMonitor} from '../application/UsageMonitor.js';
import {ProviderRunner} from '../application/ProviderRunner.js';
import {SettingsRepository} from '../infrastructure/SettingsRepository.js';
import {SoupHttpClient} from '../infrastructure/SoupHttpClient.js';
import {JsonFileReader} from '../infrastructure/JsonFileReader.js';
import {RequestScope} from '../infrastructure/RequestScope.js';
import {Timer} from '../infrastructure/Timer.js';
import {CodexProvider} from '../providers/codex/CodexProvider.js';
import {CodexCredentials} from '../providers/codex/CodexCredentials.js';
import {CodexCredentialsParser} from '../providers/codex/CodexCredentialsParser.js';
import {CodexUsageParser} from '../providers/codex/CodexUsageParser.js';
import {CodexActivity} from '../providers/codex/CodexActivity.js';
import {CommandLocator} from '../infrastructure/CommandLocator.js';
import {UsageCommand} from '../infrastructure/UsageCommand.js';
import {ClaudeProvider} from '../providers/claude/ClaudeProvider.js';
import {ClaudeExecutionContext} from '../providers/claude/ClaudeExecutionContext.js';
import {ClaudeUsageParser} from '../providers/claude/ClaudeUsageParser.js';
import {AntigravityProvider} from '../providers/antigravity/AntigravityProvider.js';
import {AntigravityUsageParser} from '../providers/antigravity/AntigravityUsageParser.js';
import {ProviderDiscovery} from './ProviderDiscovery.js';
import {HistoryCalendar} from '../domain/HistoryCalendar.js';
import {TokenHistoryReader} from '../infrastructure/TokenHistoryReader.js';
import {ClaudeIdentityParser} from '../providers/claude/ClaudeIdentityParser.js';

export function createMonitor(settings, home, options = {}) {
    const now = () => Date.now() / 1000;
    const repository = new SettingsRepository(settings);
    const tokenHistory = options.extensionPath && GLib.getenv('AI_USAGE_TEST_MODE') !== '1' ?
        new TokenHistoryReader(new UsageCommand(), GLib.find_program_in_path('python3'),
            `${options.extensionPath}/src/infrastructure/tokens/collect.py`, {
                codex: home, claude: new ClaudeExecutionContext(GLib.get_home_dir(),
                    new JsonFileReader()).directory,
                antigravity: GLib.getenv('GEMINI_CLI_HOME') || `${GLib.get_home_dir()}/.gemini`,
            }, new HistoryCalendar()) : null;
    const providers = createProviders(settings, home, now, options);
    const runnerFactory = (onChange, onSettled) => new ProviderRunner(repository,
        new BackoffPolicy(), () => new RequestScope(), now, onChange, onSettled, null, tokenHistory);
    return new UsageMonitor(providers, repository, new PollingPolicy(),
        runnerFactory, new Timer(), now);
}

function createProviders(settings, home, now, options) {
    const locator = options.commandLocator ?? new CommandLocator(GLib.get_home_dir());
    const discovery = options.discovery ?? new ProviderDiscovery(locator,
        path => GLib.file_test(path, GLib.FileTest.IS_DIR));
    const configuredHome = options.codexConfigured ??
        (settings.get_string('codex-home').trim() || GLib.getenv('CODEX_HOME'));
    const codexConfigured = typeof configuredHome === 'boolean' ? configuredHome :
        Boolean(configuredHome?.trim());
    const enabled = Object.fromEntries(['codex', 'claude', 'antigravity'].map(id =>
        [id, settings.get_boolean(`${id}-enabled`)]));
    const available = discovery.discover(home, codexConfigured, enabled);
    const codexAvailable = enabled.codex && (options.includeCodexProvider ?? available.codex);
    const providers = [];
    if (codexAvailable)
        providers.push(createCodexProvider(home, now));
    if (options.includeCliProviders !== false)
        providers.push(...createCliProviders({
            claude: enabled.claude && available.claude,
            antigravity: enabled.antigravity && available.antigravity,
        }));
    return providers;
}

function createCodexProvider(home, now) {
    const credentials = new CodexCredentials(home, new JsonFileReader(),
        new CodexCredentialsParser());
    return new CodexProvider(credentials, new SoupHttpClient(), new CodexUsageParser(),
        new CodexActivity(home, now));
}

function createCliProviders(available) {
    const command = new UsageCommand();
    const providers = [];
    if (available.claude) {
        const files = new JsonFileReader();
        const context = new ClaudeExecutionContext(GLib.get_home_dir(), files);
        providers.push(new ClaudeProvider(context, command, new ClaudeUsageParser(),
            available.claude, new ClaudeIdentityParser(value => files.fingerprint(value))));
    }
    if (available.antigravity) {
        const identity = new JsonFileReader().fingerprint(
            `${GLib.get_home_dir()}:${available.antigravity}`);
        providers.push(new AntigravityProvider(command, new AntigravityUsageParser(),
            available.antigravity, identity));
    }
    return providers;
}
