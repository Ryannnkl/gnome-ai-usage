import St from 'gi://St';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { ProviderRow } from './ProviderRow.js';

export class ProviderSection {
    constructor(formatter) {
        this.formatter = formatter;
        this.menu = new PopupMenu.PopupMenuSection();
        this.rows = new Map();
        this.emptyItem = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });

        this.emptyItem.add_child(
            new St.Label({
                text: this.formatter.gettext('Nenhum provedor disponível'),
            })
        );
        this.menu.addMenuItem(this.emptyItem);
    }

    render(records, now) {
        this.emptyItem.visible = records.length === 0;

        const providerIds = new Set(records.map(record => record.id));

        for (const [id, row] of this.rows) {
            if (!providerIds.has(id)) {
                row.destroy();
                this.rows.delete(id);
            }
        }

        records.forEach(record => {
            if (!this.rows.has(record.id)) {
                const row = new ProviderRow(this.formatter);

                this.menu.addMenuItem(row.item);
                this.rows.set(record.id, row);
            }

            this.rows.get(record.id).render(record, now);
        });
    }
}
