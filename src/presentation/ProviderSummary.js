export class ProviderSummary {
    constructor(formatter) {
        this.formatter = formatter;
    }

    describe(record, now) {
        const windows = record.snapshot?.windows ?? [];
        const primary = windows.find(window => window.id === record.snapshot.headlineId);
        const previous = record.status !== 'ok' || now - record.fetchedAt > 900 ||
            (primary?.resetsAt !== null && primary?.resetsAt <= now);
        const percent = primary ? `${this.formatter.percent(primary.usedPercent)} usado` : '—';
        const title = `${record.name} · ${percent}${primary && previous ? ' · anterior' : ''}`;
        const subtitle = primary ?
            `${primary.label} · ${this.formatter.reset(primary.resetsAt, now)}` :
            windows.length ? 'Janela principal não informada' : this.formatter.status(record, now);
        const extra = windows.filter(window => window.id !== record.snapshot.headlineId &&
            window.usedPercent >= 75 && (window.resetsAt === null || window.resetsAt > now))
            .sort((first, second) => second.usedPercent - first.usedPercent)[0];
        const pendingReset = windows.some(window =>
            window.resetsAt !== null && window.resetsAt <= now);
        const notice = extra ? `${extra.label} · ${this.formatter.percent(extra.usedPercent)} usado` :
            (previous && primary) || pendingReset ? 'Leitura precisa de confirmação' : null;
        return {title, subtitle, notice, usedPercent: primary?.usedPercent ?? null};
    }
}
