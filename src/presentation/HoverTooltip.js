import St from 'gi://St';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class HoverTooltip {
    constructor() {
        this.label = new St.Label({style_class: 'dash-label', visible: false});
        Main.layoutManager.addChrome(this.label);
        this.bindings = new Map();
        this.anchor = null;
        this.source = 0;
    }

    bind(actor, text) {
        actor.accessible_name = text;
        const hover = actor.connect('notify::hover', () => this.sync(actor, text));
        const mapped = actor.connect('notify::mapped', () => {
            if (!actor.mapped && this.anchor === actor)
                this.hide();
        });
        const destroy = actor.connect('destroy', () => {
            this.bindings.delete(actor);
            if (this.anchor === actor)
                this.hide();
        });
        this.bindings.set(actor, [hover, mapped, destroy]);
    }

    sync(actor, text) {
        if (!actor.hover || !actor.mapped) {
            if (this.anchor === actor)
                this.hide();
            return;
        }
        this.hide();
        this.anchor = actor;
        this.source = GLib.timeout_add_once(GLib.PRIORITY_DEFAULT, 300, () => {
            this.source = 0;
            if (actor.hover && actor.mapped)
                this.show(actor, text);
        });
    }

    show(actor, text) {
        this.label.text = text;
        Main.uiGroup.set_child_above_sibling(this.label, null);
        this.label.show();
        const [, width] = this.label.get_preferred_width(-1);
        const [, height] = this.label.get_preferred_height(width);
        const [x, y] = actor.get_transformed_position();
        const [actorWidth, actorHeight] = actor.get_size();
        this.label.set_size(width, height);
        this.label.set_position(Math.max(0, Math.min(x + (actorWidth - width) / 2,
            global.stage.width - width)), y >= height + 8 ? y - height - 8 : y + actorHeight + 8);
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
        for (const [actor, signals] of this.bindings)
            signals.forEach(signal => actor.disconnect(signal));
        this.bindings.clear();
        if (this.label) {
            Main.layoutManager.removeChrome(this.label);
            this.label.destroy();
            this.label = null;
        }
    }
}
