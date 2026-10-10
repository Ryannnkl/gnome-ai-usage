import test from 'node:test';
import assert from 'node:assert/strict';

import { ProgressAnimation } from '../src/presentation/ProgressAnimation.js';

function harness() {
    let timestamp = 0;
    const clock = {
        callback: null,
        starts: 0,
        stops: 0,
        now: () => timestamp,
        start(callback) {
            this.callback = callback;

            return ++this.starts;
        },
        stop() {
            this.stops++;
            this.callback = null;
        },
    };
    const changes = [];
    const animation = new ProgressAnimation(clock, value => changes.push(value));

    return {
        animation,
        clock,
        changes,
        tick(milliseconds) {
            timestamp += milliseconds;

            if (!clock.callback())
                clock.callback = null;
        },
    };
}

test('interpolates quota changes and stops when the transition finishes', () => {
    const { animation, clock, tick } = harness();

    animation.animate(10, true);

    assert.equal(clock.starts, 0);
    animation.animate(80, true);
    tick(175);

    assert.ok(animation.value > 0.1 && animation.value < 0.8);
    tick(175);

    assert.equal(animation.value, 0.8);
    assert.equal(animation.source, 0);
    assert.equal(clock.callback, null);
});

test('unchanged readings do not restart animation and new readings interrupt smoothly', () => {
    const { animation, clock, tick } = harness();

    animation.animate(10, true);
    animation.animate(80, true);
    tick(100);

    const intermediate = animation.value;

    animation.animate(80, true);

    assert.equal(clock.starts, 1);
    animation.animate(20, true);

    assert.equal(animation.value, intermediate);
    assert.equal(clock.stops, 1);
    tick(350);

    assert.ok(Math.abs(animation.value - 0.2) < 1e-10);
});

test('reduced motion snaps to the value and stops a running animation', () => {
    const { animation, clock } = harness();

    animation.animate(10, true);
    animation.animate(80, true);
    animation.animate(80, false);

    assert.equal(animation.value, 0.8);
    assert.equal(animation.source, 0);
    assert.equal(clock.stops, 1);
});

test('missing quotas are not zero, over-limit quotas fill the ring and cleanup stops frames', () => {
    const { animation, clock } = harness();

    animation.animate(150, false);

    assert.equal(animation.value, 1);
    animation.animate(null, false);

    assert.equal(animation.value, null);
    animation.animate(0, false);

    assert.equal(animation.value, 0);
    animation.animate(50, true);
    animation.stop();

    assert.equal(clock.callback, null);
    assert.equal(animation.source, 0);
});
