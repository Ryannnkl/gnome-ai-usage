export class ProgressAnimation {
    constructor(clock, onChange) {
        this.clock = clock;
        this.onChange = onChange;
        this.value = null;
        this.target = null;
        this.source = 0;
    }

    animate(value, enabled) {
        const target = Number.isFinite(value) && value >= 0 ? Math.min(100, value) / 100 : null;

        if (target === this.target && (enabled || !this.source))
            return;

        this.stop();
        this.target = target;

        if (!enabled || target === null || this.value === null || this.value === target) {
            this.value = target;

            this.onChange(target);

            return;
        }

        const previous = this.value;
        const startedAt = this.clock.now();

        this.source = this.clock.start(() => {
            const elapsed = Math.min(1, (this.clock.now() - startedAt) / 350);

            this.value = previous + (target - previous) * (1 - (1 - elapsed) ** 3);

            this.onChange(this.value);

            if (elapsed === 1)
                this.source = 0;

            return elapsed < 1;
        });
    }

    stop() {
        if (this.source)
            this.clock.stop(this.source);

        this.source = 0;
    }
}
