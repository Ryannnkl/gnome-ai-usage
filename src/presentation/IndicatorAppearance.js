export class IndicatorAppearance {
    describe(state) {
        const appearances = {
            idle: {
                iconName: null, opacity: 160, colorRole: null,
                description: 'Sem atividade recente; cotas abaixo de 75%.',
            },
            recent: {
                iconName: null, opacity: 255, colorRole: null,
                description: 'Atividade recente detectada; cotas abaixo de 75%.',
            },
            warning: {
                iconName: 'dialog-warning-symbolic', opacity: 255, colorRole: 'warning',
                description: 'Pelo menos uma janela de uso atingiu 75%.',
            },
            exhausted: {
                iconName: 'dialog-error-symbolic', opacity: 255, colorRole: 'error',
                description: 'Pelo menos uma janela de uso atingiu 100%.',
            },
            unknown: {
                iconName: null, opacity: 200, colorRole: null,
                description: 'Leituras indisponíveis, desatualizadas ou aguardando confirmação.',
            },
        };
        const appearance = appearances[state.status];
        const caveat = state.uncertain && state.status !== 'unknown' ?
            ' Algumas leituras precisam de confirmação.' : '';
        return {...appearance, description: `AI Usage — ${appearance.description}${caveat}`};
    }
}
