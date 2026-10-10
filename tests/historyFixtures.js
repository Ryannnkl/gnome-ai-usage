import {HistoryCalendar} from '../src/domain/HistoryCalendar.js';
import {HistoryRepository} from '../src/infrastructure/HistoryRepository.js';
import {HistoryTracker} from '../src/application/HistoryTracker.js';

export const historyNow = Date.parse('2026-10-10T12:00:00Z') / 1000;

export function weeklyWindow(usedPercent, overrides = {}) {
    return {id: 'weekly', label: 'Semanal', duration: 604800, usedPercent,
        resetsAt: historyNow + 604800, ...overrides};
}

export function historySnapshot(usedPercent, overrides = {}) {
    return {plan: 'plus', headlineId: 'session', windows: [weeklyWindow(usedPercent)], ...overrides};
}

export function historyHarness(initial = '{}') {
    let value = initial;
    const settings = {get_string: () => value, set_string: (_key, next) => { value = next; }};
    const calendar = new HistoryCalendar('UTC');
    const repository = new HistoryRepository(settings);
    const tracker = new HistoryTracker(repository, calendar);
    return {settings, calendar, repository, tracker, raw: () => value};
}
