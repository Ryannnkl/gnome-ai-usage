import {readFile} from 'node:fs/promises';
import {dirname, resolve, relative, sep} from 'node:path';

export async function packageSources(root, entries = ['extension.js', 'prefs.js']) {
    const sources = new Set();
    const pending = entries.map(entry => resolve(root, entry));
    while (pending.length) {
        const path = pending.pop();
        const name = relative(root, path);
        if (name.startsWith(`..${sep}`) || name === '..')
            throw new Error(`Import outside extension: ${name}`);
        if (sources.has(name))
            continue;
        const contents = await readFile(path, 'utf8');
        sources.add(name);
        for (const match of contents.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g))
            pending.push(resolve(dirname(path), match[1]));
    }
    return [...sources].sort();
}
