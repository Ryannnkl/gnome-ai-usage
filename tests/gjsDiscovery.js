import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {CommandLocator} from '../src/infrastructure/CommandLocator.js';
import {CodexHomeResolver} from '../src/infrastructure/CodexHomeResolver.js';
import {ProviderDiscovery} from '../src/composition/ProviderDiscovery.js';
import {createMonitor} from '../src/composition/createMonitor.js';
import {assert} from './gjsAssert.js';

export function testCodexHomeResolution() {
    const resolver = new CodexHomeResolver();
    const home = GLib.get_home_dir();
    assert(resolver.resolve('', '/synthetic/codex') === '/synthetic/codex',
        'CODEX_HOME environment was ignored');
    assert(resolver.resolve('~/work', '') === `${home}/work`, 'Tilde was not expanded');
    assert(resolver.resolve('~', '') === home, 'Standalone tilde was not expanded');
    assert(resolver.resolve('relative', '') === `${home}/relative`,
        'Relative preference was not resolved against home');
    assert(resolver.resolve('/custom/codex', '/ignored') === '/custom/codex',
        'Explicit preference did not take precedence');
}

export function testCommandDiscovery() {
    const home = GLib.dir_make_tmp('ai-usage-discovery-XXXXXX');
    const paths = [`${home}/.local/bin`, `${home}/.local/share/mise/shims`, `${home}/path`];
    paths.forEach(path => Gio.File.new_for_path(path).make_directory_with_parents(null));
    const links = [[`${paths[0]}/claude`, '/usr/bin/true'],
        [`${paths[1]}/agy`, '/usr/bin/true'], [`${paths[2]}/codex`, '/usr/bin/true']];
    try {
        links.forEach(([path, target]) =>
            Gio.File.new_for_path(path).make_symbolic_link(target, null));
        const locator = new CommandLocator(home, paths[2]);
        assert(locator.find('claude') === links[0][0], 'Local bin was not searched first');
        assert(locator.find('agy') === links[1][0], 'mise shims were not searched');
        assert(locator.find('codex') === links[2][0], 'PATH executable was not found');
        assert(locator.find('missing') === null, 'Missing command was reported as available');
        assert(new CommandLocator(home, '').find('missing') === null,
            'Empty PATH caused command discovery failure');
    } finally {
        links.forEach(([path]) => Gio.File.new_for_path(path).delete(null));
        paths.reverse().forEach(path => Gio.File.new_for_path(path).delete(null));
        ['.local/share/mise', '.local/share', '.local'].forEach(path =>
            Gio.File.new_for_path(`${home}/${path}`).delete(null));
        Gio.File.new_for_path(home).delete(null);
    }
}

export function testOptionalProviderComposition() {
    const settings = {get_string: key => key === 'codex-home' ? '' : '{}',
        get_boolean: () => true, set_string() {}};
    for (let mask = 0; mask < 8; mask++) {
        const expected = {codex: Boolean(mask & 1), claude: Boolean(mask & 2),
            antigravity: Boolean(mask & 4)};
        const binaries = {codex: expected.codex ? '/synthetic/codex' : null,
            claude: expected.claude ? '/synthetic/claude' : null,
            agy: expected.antigravity ? '/synthetic/agy' : null};
        const locator = {find: command => binaries[command]};
        const discovery = new ProviderDiscovery(locator,
            path => path === '/synthetic/config' && expected.codex);
        for (let enabledMask = 0; enabledMask < 8; enabledMask++) {
            settings.get_boolean = key => Boolean(enabledMask &
                (1 << ['codex-enabled', 'claude-enabled', 'antigravity-enabled'].indexOf(key)));
            const monitor = createMonitor(settings, '/synthetic/config', {
                commandLocator: locator, discovery, codexConfigured: false,
            });
            assert(monitor.providers.map(provider => provider.id).join(',') ===
                Object.keys(expected).filter(id => expected[id] &&
                    settings.get_boolean(`${id}-enabled`)).join(','),
            `Provider composition differs for availability ${mask}, enabled ${enabledMask}`);
            if (!monitor.providers.length) {
                monitor.start();
                monitor.refresh('manual');
                assert(!monitor.timer.source, 'Empty monitor started a polling timer');
                assert(!monitor.runner.requests.size, 'Empty monitor started requests');
            }
            monitor.destroy();
        }
    }
}
