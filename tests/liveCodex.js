import GLib from 'gi://GLib';
import {CodexHomeResolver} from '../src/infrastructure/CodexHomeResolver.js';
import {JsonFileReader} from '../src/infrastructure/JsonFileReader.js';
import {SoupHttpClient} from '../src/infrastructure/SoupHttpClient.js';
import {RequestScope} from '../src/infrastructure/RequestScope.js';
import {CodexCredentials} from '../src/providers/codex/CodexCredentials.js';
import {CodexCredentialsParser} from '../src/providers/codex/CodexCredentialsParser.js';
import {CodexUsageParser} from '../src/providers/codex/CodexUsageParser.js';
import {CodexProvider} from '../src/providers/codex/CodexProvider.js';

if (GLib.getenv('AI_USAGE_LIVE_CODEX') !== '1')
    throw new Error('Defina AI_USAGE_LIVE_CODEX=1 para consultar a conta real.');

const home = new CodexHomeResolver().resolve('');
const credentials = new CodexCredentials(home, new JsonFileReader(), new CodexCredentialsParser());
const provider = new CodexProvider(credentials, new SoupHttpClient(), new CodexUsageParser(),
    {destroy() {}});
const request = new RequestScope();
try {
    const account = await provider.readAccount(request.cancellable);
    const snapshot = await provider.fetch(account, request.cancellable, () => Date.now() / 1000);
    console.log(JSON.stringify(snapshot));
} catch (error) {
    console.log(`Consulta Codex: ${error.code ?? 'error'}`);
    throw new Error('A consulta real não retornou uma leitura válida.');
} finally {
    request.close();
    provider.destroy();
}
