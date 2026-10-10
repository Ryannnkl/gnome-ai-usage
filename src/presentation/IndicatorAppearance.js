export class IndicatorAppearance {
    constructor(translator = {}) {
        this.gettext =
            typeof translator.gettext === 'function'
                ? translator.gettext.bind(translator)
                : message => message;
    }

    describe(state) {
        const appearances = {
            idle: {
                opacity: 200,
                colorRole: null,
                description: 'Sem atividade recente; cotas abaixo de 75%.',
            },
            recent: {
                opacity: 255,
                colorRole: null,
                description: 'Atividade recente detectada; cotas abaixo de 75%.',
            },
            warning: {
                opacity: 255,
                colorRole: 'warning',
                description: 'Pelo menos uma janela de uso atingiu 75%.',
            },
            exhausted: {
                opacity: 255,
                colorRole: 'error',
                description: 'Pelo menos uma janela de uso atingiu 100%.',
            },
            unknown: {
                opacity: 200,
                colorRole: null,
                description: 'Leituras indisponíveis, desatualizadas ou aguardando confirmação.',
            },
        };
        const appearance = appearances[state.status];
        const caveat =
            state.uncertain && state.status !== 'unknown'
                ? this.gettext('Algumas leituras precisam de confirmação.')
                : '';
        const usage =
            state.usedPercent === null
                ? ''
                : this.gettext('Maior consumo conhecido: {value}%.').replace(
                      '{value}',
                      Math.round(state.usedPercent)
                  );
        const refreshing = state.refreshing ? this.gettext('Atualizando cotas.') : '';

        return {
            ...appearance,
            description: [
                this.gettext('AI Usage —'),
                this.gettext(appearance.description),
                usage,
                caveat,
                refreshing,
            ]
                .filter(Boolean)
                .join(' '),
        };
    }
}
