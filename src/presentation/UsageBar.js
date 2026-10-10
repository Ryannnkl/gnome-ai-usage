import St from 'gi://St';

export class UsageBar {
    constructor(width = 280) {
        this.width = width;
        this.actor = new St.BoxLayout({ style_class: 'ai-usage-track', width });
        this.fill = new St.Widget({ style_class: 'ai-usage-fill', height: 6 });

        this.actor.add_child(this.fill);
    }

    render(usedPercent) {
        const available = Number.isFinite(usedPercent) && usedPercent >= 0;

        this.actor.visible = available;
        this.fill.visible = available && usedPercent > 0;
        this.fill.width = available ? (this.width * Math.min(100, usedPercent)) / 100 : 0;
    }
}
