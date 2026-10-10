export class UsageFormatter {
    constructor(translator = {}) {
        this.gettext =
            typeof translator.gettext === 'function'
                ? translator.gettext.bind(translator)
                : message => message;
        this.translator = translator;
        this.ngettext =
            typeof translator.ngettext === 'function'
                ? translator.ngettext.bind(translator)
                : (singular, plural, count) => (count === 1 ? singular : plural);
    }

    percent(value) {
        return `${Math.round(value)}%`;
    }

    reset(timestamp, now) {
        if (timestamp === null)
            return this.gettext('Renovação não informada');

        if (timestamp <= now)
            return this.gettext('Renovação aguardando confirmação');

        return this.gettext('Renova em %s').replace('%s', this.duration(timestamp - now));
    }

    duration(seconds) {
        const minutes = Math.max(1, Math.ceil(seconds / 60));

        if (minutes < 60)
            return `${minutes} ${this.ngettext('min', 'min', minutes)}`;

        const hours = Math.floor(minutes / 60);

        if (hours < 24)
            return (
                `${hours} ${this.ngettext('h', 'h', hours)} ${minutes % 60} ` +
                this.ngettext('min', 'min', minutes % 60)
            );

        const days = Math.floor(hours / 24);

        return (
            `${days} ${this.ngettext('d', 'd', days)} ${hours % 24} ` +
            this.ngettext('h', 'h', hours % 24)
        );
    }

    status(record, now) {
        const labels = {
            loading: 'Aguardando primeira leitura',
            ok: 'Limites informados pelo provedor',
            stale: 'Leitura anterior — confirmando atualização',
            needsAuth:
                'Login local indisponível. Entre no aplicativo de origem ' + 'com sua assinatura.',
            expired: 'Login expirado. Renove a sessão no aplicativo de origem.',
            accountChanged: 'Conta alterada durante a consulta. Aguardando nova leitura.',
            accessDenied: 'Sem permissão para ler o login local.',
            unavailable: 'CLI oficial não encontrado ou não pôde ser iniciado.',
            rateLimited: 'O provedor pediu uma pausa nas consultas.',
            unsupported: 'Esta conta não informou janelas de uso compatíveis.',
            invalidResponse: 'Resposta do provedor incompatível.',
            network: 'Não foi possível consultar o provedor.',
        };

        if (record.refreshing)
            return this.gettext('Atualizando…');

        const waiting =
            record.retryAt > now
                ? this.gettext(' Nova tentativa em %s.').replace(
                      '%s',
                      this.duration(record.retryAt - now)
                  )
                : '';

        return `${this.gettext(labels[record.status] ?? 'Falha na consulta.')}${waiting}`;
    }

    age(record, now) {
        if (record.fetchedAt === null)
            return null;

        const elapsed = Math.max(0, now - record.fetchedAt);
        const stale =
            record.status !== 'ok' || elapsed > 900 ? this.gettext('Desatualizado · ') : '';
        const reading =
            elapsed < 60
                ? this.gettext('Lido agora')
                : this.gettext('Lido há %s').replace('%s', this.duration(elapsed));

        return `${stale}${reading}`;
    }

    windowLabel(window) {
        const units = {
            minutos: ['minuto', 'minutos'],
            horas: ['hora', 'horas'],
            dias: ['dia', 'dias'],
        };

        return window.label
            .split(' · ')
            .map(part => {
                const match = part.match(/^(\d+) (minutos|horas|dias)$/);

                if (match) {
                    const count = Number(match[1]);
                    const [singular, plural] = units[match[2]];

                    return `${count} ${this.ngettext(singular, plural, count)}`;
                }

                return this.gettext(part);
            })
            .join(' · ');
    }
}
