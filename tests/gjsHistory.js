import { JsonFileReader } from '../src/infrastructure/JsonFileReader.js';
import { ClaudeIdentityParser } from '../src/providers/claude/ClaudeIdentityParser.js';
import { HistoryCalendar } from '../src/domain/HistoryCalendar.js';
import { HistoryRepository } from '../src/infrastructure/HistoryRepository.js';
import { HistoryTracker } from '../src/application/HistoryTracker.js';
import { assert } from './gjsAssert.js';

export function testHistory() {
    const files = new JsonFileReader();
    const parser = new ClaudeIdentityParser(value => files.fingerprint(value));
    const identity = parser.parse(
        JSON.stringify({
            loggedIn: true,
            authMethod: 'claude.ai',
            email: 'synthetic@example.invalid',
            configDirectory: '/synthetic/claude',
            orgId: 'test',
        })
    );

    assert(/^[a-f0-9]{64}$/.test(identity.historyKey), 'GJS identity hash is not stable SHA-256');

    let stored = '{}';
    const repository = new HistoryRepository({
        get_string: () => stored,
        set_string: (_key, value) => {
            stored = value;
        },
    });
    const tracker = new HistoryTracker(repository, new HistoryCalendar('America/Recife'));
    const timestamp = Date.parse('2026-10-10T02:00:00Z') / 1000;
    const snapshot = points => ({
        plan: 'team',
        windows: [
            { id: 'weekly', duration: 604800, usedPercent: points, resetsAt: timestamp + 604800 },
        ],
    });

    tracker.observe('synthetic', identity.historyKey, snapshot(20), timestamp);

    const history = tracker.observe('synthetic', identity.historyKey, snapshot(23), timestamp + 60);

    assert(history.weekly.total === 3, 'GJS did not aggregate daily quota deltas');
    assert(history.weekly.days[6].date === '2026-10-09', 'GJS history ignored local timezone');
    assert(!stored.includes('example.invalid'), 'Auth metadata was persisted instead of its hash');
}
