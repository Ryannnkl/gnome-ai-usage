export class SqliteMetadata {
    constructor(command, executable) {
        this.command = command;
        this.executable = executable;
    }

    async *rows(path, table, cancellable) {
        if (!this.executable)
            throw new Error('SQLite unavailable');

        const selection =
            table === 'steps'
                ? 'rowid AS cursor, hex(metadata) AS blob FROM steps WHERE step_type = 15'
                : 'idx AS cursor, hex(data) AS blob FROM gen_metadata';

        for (let offset = 0; ; offset += 16) {
            const query = `SELECT ${selection} ORDER BY cursor LIMIT 16 OFFSET ${offset}`;
            const output = await this.command.run(
                this.executable,
                ['-readonly', '-json', '-cmd', '.timeout 1000', path, query],
                cancellable
            );
            const rows = output.trim() ? JSON.parse(output) : [];

            if (!Array.isArray(rows))
                throw new Error('Invalid SQLite output');

            for (const row of rows) {
                if (!Number.isSafeInteger(row.cursor) || typeof row.blob !== 'string')
                    throw new Error('Invalid SQLite row');

                yield row;
            }

            if (rows.length < 16)
                return;
        }
    }
}
