export class CodexWindowParser {
    parse(id, payload, now) {
        if (!payload || !Number.isFinite(payload.used_percent) ||
            payload.used_percent < 0)
            return null;
        const duration = this.positiveNumber(payload.limit_window_seconds);
        const resetAt = this.positiveNumber(payload.reset_at);
        const resetAfter = Number.isFinite(payload.reset_after_seconds) &&
            payload.reset_after_seconds >= 0 ? payload.reset_after_seconds : null;
        return {
            id,
            label: this.label(duration, id),
            usedPercent: payload.used_percent,
            resetsAt: resetAt ?? (resetAfter === null ? null : now + resetAfter),
            duration,
        };
    }

    positiveNumber(value) {
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    label(duration, id) {
        if (duration === null)
            return id === 'primary' ? 'Janela principal' : 'Janela adicional';
        if (duration < 3600)
            return `${Math.round(duration / 60)} minutos`;
        if (duration < 86400)
            return `${Math.round(duration / 3600)} horas`;
        if (duration === 604800)
            return 'Semanal';
        return `${Math.round(duration / 86400)} dias`;
    }
}
