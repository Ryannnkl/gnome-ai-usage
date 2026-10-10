import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

export async function captureMenu(suffix = '') {
    const screenshotPath = GLib.getenv('AI_USAGE_SCREENSHOT');

    if (!screenshotPath)
        return;

    const path = suffix ? screenshotPath.replace(/\.png$/, '') + `${suffix}.png` : screenshotPath;
    const stream = Gio.File.new_for_path(path).replace(
        null,
        false,
        Gio.FileCreateFlags.PRIVATE,
        null
    );

    await new Shell.Screenshot().screenshot(false, stream);
    stream.close(null);
}
