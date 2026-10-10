import { HistoryCalendar } from '../domain/HistoryCalendar.js';

export class HistorySummary {
    constructor(calendar = new HistoryCalendar(), translator = null, locale = undefined) {
        this.calendar = calendar;
        this.translator = translator;
        this.weekdays = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
        this.dates = new Intl.DateTimeFormat(locale, {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'UTC',
        });
        this.numbers = new Intl.NumberFormat(locale);
    }

    describe(history, available, now) {
        const recorded = new Map((history?.days ?? []).map(day => [day.date, day.tokens]));
        const days = this.calendar.days(now).map(date => {
            const value = recorded.get(date);
            const tokens = available && Number.isSafeInteger(value) && value >= 0 ? value : null;
            const dateValue = new Date(`${date}T12:00:00Z`);

            return {
                date,
                weekday: this.weekdays.format(dateValue).replace(/\.$/, ''),
                label: this.dates.format(dateValue),
                value: tokens === null ? '—' : this.format(tokens),
                tokens,
            };
        });
        const observed = days.filter(day => day.tokens !== null);
        const total = observed.length ? observed.reduce((sum, day) => sum + day.tokens, 0) : null;
        const totalLabel = !available
            ? this.gettext('Histórico indisponível')
            : total === null
              ? this.interpolate('Total registrado: {value}', '—')
              : this.interpolate('Total registrado: {value} tokens', this.format(total));
        const maximum = Math.max(0, ...observed.map(day => day.tokens));

        return {
            days: days.map(day => {
                const usage =
                    day.tokens === null
                        ? this.gettext('Sem dados')
                        : this.substitute(
                              this.ngettext('{value} token', '{value} tokens', day.tokens),
                              day.value
                          );
                const partial = history?.partial
                    ? `\n${this.gettext('Registros incompletos')}`
                    : '';

                return {
                    ...day,
                    initial: [...day.weekday][0].toLocaleUpperCase(),
                    fraction: maximum > 0 && day.tokens !== null ? day.tokens / maximum : 0,
                    tooltip: `${day.weekday}, ${day.label}\n${usage}${partial}`,
                };
            }),
            total: totalLabel,
            title: this.gettext('Tokens locais · 7 dias'),
        };
    }

    format(tokens) {
        return this.numbers.format(tokens);
    }

    gettext(message) {
        return this.translator?.gettext?.(message) ?? message;
    }

    ngettext(singular, plural, count) {
        return (
            this.translator?.ngettext?.(singular, plural, count) ??
            this.gettext(count === 1 ? singular : plural)
        );
    }

    interpolate(message, value) {
        return this.substitute(this.gettext(message), value);
    }

    substitute(message, value) {
        return message.replace('{value}', value);
    }
}
