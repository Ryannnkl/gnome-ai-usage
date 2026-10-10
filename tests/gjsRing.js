import Cairo from 'cairo';

import GLib from 'gi://GLib';

import { RingDrawing } from '../src/presentation/RingDrawing.js';
import { AnimationClock } from '../src/infrastructure/AnimationClock.js';
import { assert } from './gjsAssert.js';

const surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, 36, 36);
const context = new Cairo.Context(surface);
const color = { red: 100, green: 150, blue: 200, alpha: 255 };
const drawing = new RingDrawing();
for (const progress of [null, 0, 0.13, 0.75, 1]) {
    for (const uncertain of [false, true]) {
        drawing.paint(context, 18, 18, color, progress, uncertain, false);
        drawing.paint(context, 36, 36, color, progress, uncertain, true);
    }
}
context.$dispose();
const clock = new AnimationClock();
const loop = new GLib.MainLoop(null, false);
let frames = 0;
clock.start(() => {
    frames++;
    loop.quit();

    return false;
});
loop.run();
assert(frames === 1, 'Completed animation left a repeating timer');
let canceledFrame = false;
const source = clock.start(() => {
    canceledFrame = true;

    return false;
});
clock.stop(source);
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 40, () => {
    loop.quit();

    return GLib.SOURCE_REMOVE;
});
loop.run();
assert(!canceledFrame, 'Canceled animation published another frame');
assert(clock.now() > 0, 'Animation clock is not monotonic');
console.log('GJS: desenho Cairo do anel e cleanup dos frames validados sem iniciar o Shell.');
