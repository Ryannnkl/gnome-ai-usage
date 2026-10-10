import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

export const METRICS = {};

export async function run() {
    await Scripting.sleep(2000);
    const extension = Main.extensionManager.lookup('ai-usage@ryannnkl.com');
    if (!extension?.stateObj?.indicator)
        throw new Error(`Extension failed: ${extension?.error}`);
    Main.overview.hide();
    await Scripting.sleep(300);
    extension.stateObj.indicator.button.menu.open({animate: false});
    console.log('AI Usage DevKit preview is open. Close the DevKit window to stop it.');
    while (true)
        await Scripting.sleep(60000);
}
