import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { packageSources } from '../scripts/packageSources.js';

test('package contains reachable runtime modules, not obsolete history or Python', async () => {
    const sources = await packageSources(process.cwd());

    for (const name of [
        'extension.js',
        'prefs.js',
        'src/composition/createTokenHistory.js',
        'src/presentation/ShellCompatibility.js',
        'src/infrastructure/tokens/AntigravityTokens.js',
        'src/infrastructure/tokens/JsonLines.js',
    ])
        assert.ok(sources.includes(name), name);

    for (const name of [
        'src/application/HistoryTracker.js',
        'src/infrastructure/HistoryRepository.js',
    ])
        assert.ok(!sources.includes(name), name);

    assert.ok(sources.every(name => !name.startsWith('tests/') && name.endsWith('.js')));
});

test('published metadata links to source and includes only tested Shell versions', async () => {
    const metadata = JSON.parse(await readFile('metadata.json', 'utf8'));

    assert.equal(metadata.url, 'https://github.com/Ryannnkl/gnome-ai-usage');
    assert.deepEqual(metadata['shell-version'], ['50', '51']);
    assert.match(await readFile('COPYRIGHT', 'utf8'), /either version 2 of the License/);
    assert.match(await readFile('LICENSE', 'utf8'), /GNU GENERAL PUBLIC LICENSE/);
});
