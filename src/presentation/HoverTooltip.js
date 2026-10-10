import GLib from 'gi://GLib';
import {TooltipLabel} from './TooltipLabel.js';

export class HoverTooltip {
    constructor(display = new TooltipLabel()) {
        this.display = display;
        this.bindings = new Map();
        this.anchor = null;
        this.source = 0;
    }

    get label() {
        return this.display.label;
    }

    bind(actor, text) {
        const hover = actor.connect('notify::hover', () => this.sync(actor));
        const mapped = actor.connect('notify::mapped', () => {
            if (!actor.mapped && this.anchor === actor)
                this.hide();
        });
        const destroy = actor.connect('destroy', () => {
            this.bindings.delete(actor);
            if (this.anchor === actor)
                this.hide();
        });
        this.bindings.set(actor, {signals: [hover, mapped, destroy], text});
        this.update(actor, text);
    }

    update(actor, text) {
        const changed = this.bindings.get(actor).text !== text;
        this.bindings.get(actor).text = text;
        actor.accessible_name = text;
        if (changed && this.anchor === actor && this.label.visible)
            this.show(actor);
    }

    schedule(delay, callback) {
        if (this.source)
            GLib.Source.remove(this.source);
        this.source = GLib.timeout_add_once(GLib.PRIORITY_DEFAULT, delay, () => {
            this.source = 0;
            callback();
        });
    }

    sync(actor) {
        if (!actor.hover || !actor.mapped) {
            if (this.anchor === actor)
                this.schedule(100, () => this.hide());
            return;
        }
        if (this.source)
            GLib.Source.remove(this.source);
        this.source = 0;
        this.anchor = actor;
        if (this.label.visible) {
            this.show(actor);
            return;
        }
        this.schedule(300, () => {
            if (actor.hover && actor.mapped)
                this.show(actor);
        });
    }

    show(actor) {
        const text = this.bindings.get(actor)?.text;
        if (!text)
            return;
        this.display.show(actor, text);
    }

    hide() {
        if (this.source)
            GLib.Source.remove(this.source);
        this.source = 0;
        this.anchor = null;
        this.label?.hide();
    }

    destroy() {
        this.hide();
        for (const [actor, {signals}] of this.bindings)
            signals.forEach(signal => actor.disconnect(signal));
        this.bindings.clear();
        this.display.destroy();
    }
}
