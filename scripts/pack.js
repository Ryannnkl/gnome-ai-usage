import {cp, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {packageSources} from './packageSources.js';

const root = process.cwd();
const staging = await mkdtemp(join(process.env.TMPDIR ?? tmpdir(), 'ai-usage-pack-'));
const output = join(root, 'dist');
try {
    await mkdir(output, {recursive: true});
    const sources = await packageSources(root);
    for (const name of [...sources, 'metadata.json', 'stylesheet.css', 'LICENSE', 'COPYRIGHT',
        'icons', 'po', 'schemas/org.gnome.shell.extensions.ai-usage.gschema.xml']) {
        const destination = join(staging, name);
        await mkdir(dirname(destination), {recursive: true});
        await cp(join(root, name), destination, {recursive: true});
    }
    const result = spawnSync('gnome-extensions', ['pack', '--force', `--out-dir=${output}`,
        '--podir=po', '--extra-source=src', '--extra-source=icons',
        '--extra-source=LICENSE', '--extra-source=COPYRIGHT', '.'],
    {cwd: staging, stdio: 'inherit'});
    if (result.error)
        throw result.error;
    if (result.status !== 0)
        throw new Error(`Packaging failed: ${result.status}`);
    console.log(`Packaged ${sources.length} runtime modules; omitted unused sources and development files.`);
} finally {
    await rm(staging, {recursive: true, force: true});
}
