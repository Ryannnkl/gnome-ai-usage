import {testFiles} from './gjsFiles.js';
import {testHttp} from './gjsHttp.js';
import {testClaudeExecutionContext, testClaudeProfileWatcher,
    testProviderCommands} from './gjsProviders.js';
import {testCodexHomeResolution, testCommandDiscovery,
    testOptionalProviderComposition} from './gjsDiscovery.js';

await testFiles();
await testHttp();
await testProviderCommands();
testClaudeExecutionContext();
await testClaudeProfileWatcher();
testCodexHomeResolution();
testCommandDiscovery();
testOptionalProviderComposition();
console.log('GJS: caminhos, combinações de providers, subprocessos, HTTP e redirects validados.');
