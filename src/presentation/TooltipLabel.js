import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class TooltipLabel {
    constructor() {
        this.label = new St.Label({ style_class: 'dash-label', visible: false, reactive: false });

        Main.layoutManager.addChrome(this.label);
    }

    show(actor, text) {
        this.label.text = text;

        this.label.set_size(-1, -1);

        const [, width] = this.label.get_preferred_width(-1);
        const [, height] = this.label.get_preferred_height(width);
        const [x, y] = actor.get_transformed_position();
        const [actorWidth, actorHeight] = actor.get_size();

        this.label.set_size(width, height);
        this.label.set_position(
            Math.max(0, Math.min(x + (actorWidth - width) / 2, global.stage.width - width)),
            y >= height + 8 ? y - height - 8 : y + actorHeight + 8
        );
        Main.uiGroup.set_child_above_sibling(this.label, null);
        this.label.show();
    }

    destroy() {
        if (!this.label)
            return;

        Main.layoutManager.removeChrome(this.label);
        this.label.destroy();
        this.label = null;
    }
}
