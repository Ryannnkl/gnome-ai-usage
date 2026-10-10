import { UsageRecord } from '../src/domain/UsageRecord.js';
import { BackoffPolicy } from '../src/domain/BackoffPolicy.js';
import { ProviderRunner } from '../src/application/ProviderRunner.js';
import { usageSnapshot } from './fixtures.js';

export function runnerHarness(fetch = async () => usageSnapshot()) {
    const writes = [];
    let updates = 0;
    const requests = [];
    const repository = { save: (id, reading) => writes.push({ id, reading }) };
    const createRequest = () => {
        const request = {
            cancellable: {},
            canceled: false,
            closed: false,
            cancel() {
                this.canceled = true;
            },
            close() {
                this.closed = true;
            },
        };

        requests.push(request);

        return request;
    };
    const provider = {
        id: 'codex',
        name: 'Codex',
        fetch,
        readAccount: async () => ({ key: 'account-a', accessToken: 'synthetic-token' }),
    };
    const record = new UsageRecord(provider);
    const runner = new ProviderRunner(
        repository,
        new BackoffPolicy(),
        createRequest,
        () => 1000,
        () => {
            updates++;
        }
    );

    return { runner, provider, record, writes, requests, updates: () => updates };
}
