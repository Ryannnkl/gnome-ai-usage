import test from 'node:test';
import assert from 'node:assert/strict';

import { menuOptions, motionEnabled, motionProperties } from '../src/presentation/ShellCompatibility.js';

test('GNOME 50 menus receive the legacy no-animation flag', () => {
    assert.equal(menuOptions('50.5', 0), 0);
});

test('GNOME 51 menus receive a parameters object', () => {
    assert.deepEqual(menuOptions('51.0', 0), { animate: false });
});

test('GNOME 50 observes only the available animation property', () => {
    assert.deepEqual(motionProperties(undefined), ['enable-animations']);
    assert.equal(motionEnabled({ enable_animations: true }, undefined), true);
    assert.equal(motionEnabled({ enable_animations: false }, undefined), false);
});

test('GNOME 51 respects reduced motion even when animations are enabled', () => {
    const reducedMotion = { REDUCE: 1, NO_PREFERENCE: 0 };

    assert.deepEqual(motionProperties(reducedMotion), ['enable-animations', 'reduced-motion']);
    assert.equal(motionEnabled({ enable_animations: true, reducedMotion: 0 }, reducedMotion), true);
    assert.equal(motionEnabled({ enable_animations: true, reducedMotion: 1 }, reducedMotion), false);
    assert.equal(motionEnabled({ enable_animations: false, reducedMotion: 0 }, reducedMotion), false);
});
