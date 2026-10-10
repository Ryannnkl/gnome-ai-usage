import test from 'node:test';
import assert from 'node:assert/strict';

import { UsageMonitor } from '../src/application/UsageMonitor.js';

function monitorFor(providers) {
    const calls = { loads: 0, refreshes: [], timerStarts: 0, timerStops: 0 };
    const repository = {
        load() {
            calls.loads++;

            return {};
        },
    };
    const runner = {
        refresh(provider) {
            calls.refreshes.push(provider.id);
        },
        cancel() {},
        destroy() {},
    };
    const timer = {
        start() {
            calls.timerStarts++;
        },
        stop() {
            calls.timerStops++;
        },
    };
    const monitor = new UsageMonitor(
        providers,
        repository,
        { shouldRefresh: () => true },
        () => runner,
        timer,
        () => 1000
    );

    return { monitor, calls };
}

test('zero providers start, refresh, and shut down without cache reads or timers', () => {
    const { monitor, calls } = monitorFor([]);
    let observed;

    monitor.subscribe(records => {
        observed = records;
    });
    monitor.start();
    monitor.refresh('manual');
    monitor.destroy();

    assert.deepEqual(observed, []);
    assert.equal(calls.loads, 0);
    assert.deepEqual(calls.refreshes, []);
    assert.equal(calls.timerStarts, 0);
    assert.equal(calls.timerStops, 1);
});

test('a provider setup or activity failure does not block other providers', () => {
    const providers = [
        {
            id: 'broken',
            name: 'Broken',
            start() {
                throw new Error('isolated');
            },
            isActive() {
                throw new Error('isolated');
            },
            destroy() {
                throw new Error('isolated');
            },
        },
        {
            id: 'available',
            name: 'Available',
            started: false,
            start() {
                this.started = true;
            },
            isActive() {
                return true;
            },
            destroy() {},
        },
    ];
    const { monitor, calls } = monitorFor(providers);

    monitor.start();
    monitor.destroy();

    assert.equal(monitor.records[0].status, 'unavailable');
    assert.equal(providers[1].started, true);
    assert.deepEqual(calls.refreshes, ['broken', 'available']);
    assert.equal(calls.timerStarts, 1);
});
