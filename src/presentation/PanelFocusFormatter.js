import { PANEL_FOCUS_OPTIONS } from '../domain/PanelFocusOptions.js';

export class PanelFocusFormatter {
    constructor(formatter) {
        this.formatter = formatter;
    }

    name(focus) {
        return (
            focus.providerName ??
            PANEL_FOCUS_OPTIONS.find(option => option.id === focus.providerId)?.name ??
            this.formatter.gettext('AI Usage')
        );
    }

    describe(focus) {
        return [
            this.name(focus),
            this.window(focus.session, this.formatter.gettext('5 horas')),
            this.window(focus.weekly, this.formatter.gettext('Semanal')),
        ].join('\n');
    }

    window(state, label) {
        if (!state.window)
            return `${label} · ${this.formatter.gettext('Cota indisponível')}`;

        const usage = this.formatter
            .gettext('{percent} usado')
            .replace('{percent}', this.formatter.percent(state.usedPercent));
        const caveat = state.uncertain
            ? this.formatter.gettext('Leitura precisa de confirmação')
            : '';
        const refreshing = state.refreshing ? this.formatter.gettext('Atualizando…') : '';

        return [this.formatter.windowLabel(state.window), usage, caveat, refreshing]
            .filter(Boolean)
            .join(' · ');
    }
}
