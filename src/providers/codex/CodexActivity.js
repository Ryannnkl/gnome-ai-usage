import { DirectoryWatcher } from '../../infrastructure/DirectoryWatcher.js';

export class CodexActivity {
    constructor(home, now = () => Date.now() / 1000) {
        this.root = `${home}/sessions`;
        this.now = now;
        this.lastChange = -Infinity;
        this.watchers = [];
        this.day = null;
        this.running = false;
    }

    start() {
        this.running = true;

        this.updateDirectories();
    }

    isActive(now) {
        this.updateDirectories();

        return now - this.lastChange < 90;
    }

    updateDirectories() {
        if (!this.running)
            return;

        const today = new Date(this.now() * 1000).toISOString().slice(0, 10);

        if (today !== this.day) {
            this.watchers.forEach(watcher => watcher.destroy());
            this.day = today;

            const paths = new Set([this.root]);

            for (const offset of [0, 86400]) {
                const [year, month, day] = new Date((this.now() - offset) * 1000)
                    .toISOString()
                    .slice(0, 10)
                    .split('-');

                paths.add(`${this.root}/${year}`);
                paths.add(`${this.root}/${year}/${month}`);
                paths.add(`${this.root}/${year}/${month}/${day}`);
            }

            this.watchers = [...paths].map(
                path =>
                    new DirectoryWatcher(
                        path,
                        name => name.endsWith('.jsonl') || /^\d{2,4}$/.test(name),
                        () => {
                            this.lastChange = this.now();
                        }
                    )
            );
        }

        this.watchers.forEach(watcher => watcher.start());
    }

    destroy() {
        this.running = false;

        this.watchers.forEach(watcher => watcher.destroy());
        this.watchers = [];
        this.day = null;
    }
}
