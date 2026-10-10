export class JsonLines {
    constructor(ledger) {
        this.ledger = ledger;
        this.parts = [];
        this.length = 0;
        this.skipping = false;
        this.decoder = new TextDecoder('utf-8', { fatal: true });
    }

    *push(bytes, end = false) {
        let start = 0;

        for (let index = 0; index <= bytes.length; index++) {
            if (index < bytes.length && bytes[index] !== 10)
                continue;

            this.append(bytes.subarray(start, index));
            start = index + 1;

            if (index < bytes.length || end) {
                const event = this.take();

                if (event)
                    yield event;
            }
        }
    }

    append(bytes) {
        if (this.skipping || !bytes.length)
            return;

        this.length += bytes.length;

        if (this.length > 4 * 1024 * 1024) {
            this.parts = [];
            this.length = 0;
            this.skipping = true;
            this.ledger.partial = true;
        } else {
            this.parts.push(bytes);
        }
    }

    take() {
        const bytes = new Uint8Array(this.length);
        let position = 0;

        for (const part of this.parts) {
            bytes.set(part, position);
            position += part.length;
        }

        const skipping = this.skipping;

        this.parts = [];
        this.length = 0;
        this.skipping = false;

        if (skipping || !bytes.length)
            return null;

        try {
            const line = this.decoder.decode(bytes);

            if (!line.trim())
                return null;

            const value = JSON.parse(line);

            return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
        } catch {
            this.ledger.partial = true;

            return null;
        }
    }
}
