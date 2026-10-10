import {testFiles} from './gjsFiles.js';
import {testHttp} from './gjsHttp.js';
import {testClaudeExecutionContext, testClaudeProfileWatcher,
    testProviderCommands} from './gjsProviders.js';
import {testCodexHomeResolution, testCommandDiscovery,
    testOptionalProviderComposition} from './gjsDiscovery.js';
import {testHistory} from './gjsHistory.js';
import {testTokens} from './gjsTokens.js';

await testFiles();
await testHttp();
await testProviderCommands();
testClaudeExecutionContext();
await testClaudeProfileWatcher();
testCodexHomeResolution();
testCommandDiscovery();
testOptionalProviderComposition();
testHistory();
await testTokens();
console.log('GJS: caminhos, combinações de providers, subprocessos, HTTP e redirects validados.');
