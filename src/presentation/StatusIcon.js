import St from 'gi://St';
import Gio from 'gi://Gio';
import {IndicatorAppearance} from './IndicatorAppearance.js';

export class StatusIcon {
    constructor(button, iconPath, appearance = new IndicatorAppearance()) {
        this.button = button;
        this.appearance = appearance;
        this.colorRole = null;
        this.neutralIcon = new Gio.FileIcon({file: Gio.File.new_for_path(iconPath)});
        this.icon = new St.Icon({gicon: this.neutralIcon,
            style_class: 'system-status-icon'});
        button.add_child(this.icon);
        this.themeSignal = button.connect('style-changed', () => this.applyTheme());
    }

    render(state) {
        const appearance = this.appearance.describe(state);
        this.state = state.status;
        this.colorRole = appearance.colorRole;
        if (appearance.iconName)
            this.icon.icon_name = appearance.iconName;
        else
            this.icon.gicon = this.neutralIcon;
        this.icon.opacity = appearance.opacity;
        this.button.accessible_name = appearance.description;
        this.applyTheme();
    }

    applyTheme() {
        const colors = this.button.get_theme_node().get_icon_colors();
        const style = this.colorRole ? `color: ${colors[this.colorRole].to_string()};` : null;
        if (this.icon.get_style() !== style)
            this.icon.set_style(style);
    }

    destroy() {
        this.button.disconnect(this.themeSignal);
    }
}
