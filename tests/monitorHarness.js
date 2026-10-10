import {UsageMonitor} from '../src/application/UsageMonitor.js';
import {PollingPolicy} from '../src/domain/PollingPolicy.js';

export function monitorHarness() {
    const refreshes = [];
    let active = false;
    let timestamp = 1000;
    let onAccountChanged;
    const provider = {id: 'codex', name: 'Codex', destroyed: false,
        start(callback) { onAccountChanged = callback; },
        isActive: () => active,
        destroy() { this.destroyed = true; }};
    const timer = {callback: null,
        start(_seconds, callback) { this.callback = callback; },
        stop() { this.callback = null; }};
    const runner = {destroyed: false, canceled: null,
        refresh(_provider, record) {
            record.lastAttempt = timestamp;
            record.nextRefreshAt = timestamp + 30;
            refreshes.push(timestamp);
        },
        cancel(id) { this.canceled = id; },
        destroy() { this.destroyed = true; }};
    const monitor = new UsageMonitor([provider], {load: () => ({})},
        new PollingPolicy(() => 0.25), () => runner, timer, () => timestamp);
    return {monitor, timer, runner, provider, refreshes,
        advance(seconds) { timestamp += seconds; },
        setActive(value) { active = value; },
        changeAccount() { onAccountChanged(); }};
}
