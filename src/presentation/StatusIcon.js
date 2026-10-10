import St from 'gi://St';
import Clutter from 'gi://Clutter';

import { IndicatorAppearance } from './IndicatorAppearance.js';
import { AnimationClock } from '../infrastructure/AnimationClock.js';
import { ProgressAnimation } from './ProgressAnimation.js';
import { RingDrawing } from './RingDrawing.js';

export class StatusIcon {
    constructor(button, appearance = new IndicatorAppearance()) {
        this.button = button;
        this.appearance = appearance;
        this.colorRole = null;
        this.icon = new St.DrawingArea({
            width: 18,
            height: 18,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.progress = null;
        this.drawing = new RingDrawing();
        this.animation = new ProgressAnimation(new AnimationClock(), progress => {
            this.progress = progress;

            this.icon.queue_repaint();
        });
        this.repaintSignal = this.icon.connect('repaint', () => this.repaint());

        button.add_child(this.icon);
        this.themeSignal = button.connect('style-changed', () => this.applyTheme());
        this.motionSettings = St.Settings.get();
        this.motionSignals = ['enable-animations', 'reduced-motion'].map(property =>
            this.motionSettings.connect(`notify::${property}`, () => this.animateProgress())
        );
    }

    render(state) {
        const appearance = this.appearance.describe(state);

        this.state = state.status;
        this.usedPercent = state.usedPercent;
        this.uncertain = state.uncertain;
        this.refreshing = state.refreshing;
        this.colorRole = appearance.colorRole;
        this.icon.opacity = appearance.opacity;
        this.button.accessible_name = appearance.description;

        this.applyTheme();
        this.animateProgress();
        this.icon.queue_repaint();
    }

    animateProgress() {
        const enabled =
            this.motionSettings.enable_animations &&
            this.motionSettings.reducedMotion !== St.ReducedMotion.REDUCE;

        this.animation.animate(this.usedPercent, enabled);
    }

    repaint() {
        const context = this.icon.get_context();

        try {
            const [width, height] = this.icon.get_surface_size();

            this.drawing.paint(
                context,
                width,
                height,
                this.icon.get_theme_node().get_foreground_color(),
                this.progress,
                this.uncertain,
                this.refreshing
            );
        } finally {
            context.$dispose();
        }
    }

    applyTheme() {
        const colors = this.button.get_theme_node().get_icon_colors();
        const style = this.colorRole
            ? `color: ${colors[this.colorRole].to_string()};`
            : 'color: -st-accent-color;';

        if (this.icon.get_style() !== style)
            this.icon.set_style(style);
    }

    destroy() {
        this.animation.stop();

        for (const signal of this.motionSignals)
            this.motionSettings.disconnect(signal);

        this.button.disconnect(this.themeSignal);
        this.icon.disconnect(this.repaintSignal);
    }
}
