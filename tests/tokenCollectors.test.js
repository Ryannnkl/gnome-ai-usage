import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

for (const file of ['tokenCollectors.py', 'tokenAntigravity.py']) {
    test(`local token collectors use synthetic metadata only: ${file}`, () => {
        const result = spawnSync('python3', ['-B', `tests/${file}`], {
            encoding: 'utf8', env: {...process.env, TZ: 'America/Sao_Paulo'},
        });
        assert.equal(result.status, 0, result.stderr);
    });
}
