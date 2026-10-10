export class AntigravityTokens {
    constructor(files, database, proto) {
        this.files = files;
        this.database = database;
        this.proto = proto;
    }

    async collect(root, ledger, cancellable) {
        for (const folder of ['antigravity-cli', 'antigravity']) {
            for await (const path of this.files.paths(
                `${root}/${folder}/conversations`,
                '.db',
                cancellable,
                ledger
            )) {
                try {
                    await this.read(path, ledger, cancellable);
                } catch {
                    cancellable.set_error_if_cancelled();
                    ledger.partial = true;
                }
            }
        }
    }

    async read(path, ledger, cancellable) {
        const responseTimes = new Map();
        const generationTimes = new Map();

        for await (const row of this.database.rows(path, 'steps', cancellable)) {
            const fields = this.proto.decode(this.proto.hex(row.blob));
            const timestamp = this.proto.timestamp(fields.get(1));
            const response = this.key(this.proto.decode(fields.get(9)).get(11));
            const generation = this.proto.decode(fields.get(20)).get(3);

            if (timestamp !== null) {
                if (response)
                    responseTimes.set(response, timestamp);

                if (Number.isSafeInteger(generation))
                    generationTimes.set(generation, timestamp);
            }
        }

        for await (const row of this.database.rows(path, 'gen_metadata', cancellable)) {
            const model = this.proto.decode(this.proto.decode(this.proto.hex(row.blob)).get(1));
            const usage = this.proto.decode(model.get(4));

            if (!usage.size)
                continue;

            const response = this.key(usage.get(11));
            const generation = this.proto.decode(model.get(9));
            const timestamp =
                this.proto.timestamp(generation.get(4)) ??
                responseTimes.get(response) ??
                generationTimes.get(row.cursor);
            const values = [1, 2, 5, 9, 10].map(field => usage.get(field) ?? 0);

            if (
                timestamp === undefined ||
                timestamp === null ||
                values.some(value => !Number.isSafeInteger(value) || value < 0)
            ) {
                ledger.partial = true;
                continue;
            }

            ledger.add(
                timestamp,
                values.reduce((sum, value) => sum + value, 0),
                response || JSON.stringify([path, row.cursor])
            );
        }
    }

    key(value) {
        return value instanceof Uint8Array ? [...value].join(',') : null;
    }
}
