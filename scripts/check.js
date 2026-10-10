import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

function hasComments(contents) {
    let quote = null;
    for (let index = 0; index < contents.length; index++) {
        const character = contents[index];
        if (quote) {
            if (character === '\\')
                index++;
            else if (character === quote)
                quote = null;
        } else if (['"', "'", '`'].includes(character)) {
            quote = character;
        } else if (contents.startsWith('//', index) || contents.startsWith('/*', index)) {
            return true;
        }
    }
    return false;
}

async function inspect(directory) {
    const entries = await readdir(directory, {withFileTypes: true});
    for (const entry of entries) {
        if (['dist', '.git', 'node_modules'].includes(entry.name))
            continue;
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            await inspect(path);
            continue;
        }
        if (!/\.(js|css|sh|xml|json|svg)$/.test(path))
            continue;
        const contents = await readFile(path, 'utf8');
        const lines = contents.split('\n').length - (contents.endsWith('\n') ? 1 : 0);
        if (lines > 100)
            throw new Error(`${path}: ${lines} linhas; limite de 100`);
        if (/\.(js|css)$/.test(path) && hasComments(contents))
            throw new Error(`${path}: comentários não são permitidos`);
        if (path.endsWith('.js')) {
            const result = spawnSync(process.execPath, ['--check', path], {encoding: 'utf8'});
            if (result.status !== 0)
                throw new Error(result.stderr);
        }
    }
}

await inspect('.');
console.log('Estrutura válida: sintaxe, ausência de comentários JS/CSS e até 100 linhas por arquivo.');
