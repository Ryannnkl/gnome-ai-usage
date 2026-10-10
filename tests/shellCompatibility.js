import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import { PopupAnimation } from 'resource:///org/gnome/shell/ui/boxpointer.js';

import { menuOptions } from '../src/presentation/ShellCompatibility.js';

export function openMenu(menu) {
    menu.open(menuOptions(Config.PACKAGE_VERSION, PopupAnimation.NONE));
}

export function closeMenu(menu) {
    menu.close(menuOptions(Config.PACKAGE_VERSION, PopupAnimation.NONE));
}

export function shellVersion() {
    return Config.PACKAGE_VERSION;
}
