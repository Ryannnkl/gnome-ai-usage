export class UsageFormatter {
    percent(value) {
        return `${Math.round(value)}%`;
    }

    reset(timestamp, now) {
        if (timestamp === null)
            return 'Renovação não informada';
        if (timestamp <= now)
            return 'Renovação aguardando confirmação';
        return `Renova em ${this.duration(timestamp - now)}`;
    }

    duration(seconds) {
        const minutes = Math.max(1, Math.ceil(seconds / 60));
        if (minutes < 60)
            return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return `${hours} h ${minutes % 60} min`;
        return `${Math.floor(hours / 24)} d ${hours % 24} h`;
    }

    status(record, now) {
        const labels = {
            loading: 'Aguardando primeira leitura',
            ok: 'Limites informados pelo provider',
            stale: 'Leitura anterior — confirmando atualização',
            needsAuth: 'Login local indisponível. Entre no aplicativo de origem com sua assinatura.',
            expired: 'Login expirado. Renove a sessão no aplicativo de origem.',
            accessDenied: 'Sem permissão para ler o login local.',
            unavailable: 'CLI oficial não encontrado ou não pôde ser iniciado.',
            rateLimited: 'Provider pediu uma pausa nas consultas.',
            unsupported: 'Esta conta não informou janelas de uso compatíveis.',
            invalidResponse: 'Resposta do provider incompatível.',
            network: 'Não foi possível consultar o provider.',
        };
        if (record.refreshing)
            return 'Atualizando…';
        const waiting = record.retryAt > now ?
            ` Nova tentativa em ${this.duration(record.retryAt - now)}.` : '';
        return `${labels[record.status] ?? 'Falha na consulta.'}${waiting}`;
    }

    age(record, now) {
        if (record.fetchedAt === null)
            return null;
        const elapsed = Math.max(0, now - record.fetchedAt);
        const stale = record.status !== 'ok' || elapsed > 900 ? 'Desatualizado · ' : '';
        return `${stale}Lido ${elapsed < 60 ? 'agora' : `há ${this.duration(elapsed)}`}`;
    }
}
