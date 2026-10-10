export class ProviderSummary {
    constructor(formatter) {
        this.formatter = formatter;
    }

    describe(record, now) {
        const windows = record.snapshot?.windows ?? [];
        const primary = windows.find(window => window.id === record.snapshot.headlineId);
        const previous = record.status !== 'ok' || now - record.fetchedAt > 900 ||
            (primary?.resetsAt !== null && primary?.resetsAt <= now);
        const percent = primary ? this.formatter.gettext('{percent} usado')
            .replace('{percent}', this.formatter.percent(primary.usedPercent)) : '—';
        const previousLabel = primary && previous ? ` · ${this.formatter.gettext('anterior')}` : '';
        const title = `${record.name} · ${percent}${previousLabel}`;
        const subtitle = primary ?
            `${this.formatter.windowLabel(primary)} · ${this.formatter.reset(primary.resetsAt, now)}` :
            windows.length ? this.formatter.gettext('Janela principal não informada') :
                this.formatter.status(record, now);
        const extra = windows.filter(window => window.id !== record.snapshot.headlineId &&
            window.usedPercent >= 75 && (window.resetsAt === null || window.resetsAt > now))
            .sort((first, second) => second.usedPercent - first.usedPercent)[0];
        const pendingReset = windows.some(window =>
            window.resetsAt !== null && window.resetsAt <= now);
        const notice = extra ? this.formatter.gettext('{label} · {percent} usado')
            .replace('{label}', this.formatter.windowLabel(extra))
            .replace('{percent}', this.formatter.percent(extra.usedPercent)) :
            (previous && primary) || pendingReset ?
                this.formatter.gettext('Leitura precisa de confirmação') : null;
        return {title, subtitle, notice, usedPercent: primary?.usedPercent ?? null};
    }
}
