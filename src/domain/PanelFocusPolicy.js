import { IndicatorPolicy } from './IndicatorPolicy.js';

export class PanelFocusPolicy {
    constructor(indicatorPolicy = new IndicatorPolicy()) {
        this.indicatorPolicy = indicatorPolicy;
    }

    evaluate(records, now, focus = 'automatic', previousId = null) {
        const record =
            focus === 'automatic'
                ? this.automatic(records, now, previousId)
                : records.find(candidate => candidate.id === focus);

        return {
            providerId: record?.id ?? (focus === 'automatic' ? null : focus),
            providerName: record?.name ?? null,
            session: this.windowState(record, 18000, now),
            weekly: this.windowState(record, 604800, now),
        };
    }

    automatic(records, now, previousId) {
        const candidates = records
            .filter(
                record =>
                    record.status === 'ok' &&
                    Number.isFinite(record.fetchedAt) &&
                    now - record.fetchedAt <= 900
            )
            .map(record => ({ record, window: this.highestWindow(record, 18000, now) }))
            .filter(candidate => candidate.window);

        candidates.sort(
            (first, second) =>
                second.window.usedPercent - first.window.usedPercent ||
                Number(second.record.id === previousId) - Number(first.record.id === previousId) ||
                first.record.id.localeCompare(second.record.id)
        );

        return candidates[0]?.record;
    }

    highestWindow(record, duration, now) {
        return record?.snapshot?.windows
            .filter(
                window =>
                    window.duration === duration &&
                    Number.isFinite(window.usedPercent) &&
                    window.usedPercent >= 0 &&
                    (window.resetsAt === null ||
                        (Number.isFinite(window.resetsAt) && window.resetsAt > now))
            )
            .sort(
                (first, second) =>
                    second.usedPercent - first.usedPercent || first.id.localeCompare(second.id)
            )[0];
    }

    windowState(record, duration, now) {
        const window = this.highestWindow(record, duration, now) ?? null;
        const records = record
            ? [{ ...record, snapshot: { windows: window ? [window] : [] } }]
            : [];

        return { ...this.indicatorPolicy.evaluate(records, now), window };
    }
}
