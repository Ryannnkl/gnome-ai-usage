export class ProtoFields {
    decode(data = new Uint8Array()) {
        const fields = new Map();
        let position = 0;
        while (position < data.length) {
            const [tag, start] = this.varint(data, position);
            position = start;
            const kind = Number(tag & 7n);
            const field = Number(tag >> 3n);
            if (!field || !Number.isSafeInteger(field))
                throw new Error('Invalid field');
            let value;
            if (kind === 0) {
                [value, position] = this.varint(data, position);
                value = value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value;
            } else if (kind === 2) {
                const [length, next] = this.varint(data, position);
                if (length > BigInt(data.length - next))
                    throw new Error('Truncated field');
                position = next + Number(length);
                value = data.subarray(next, position);
            } else if (kind === 1 || kind === 5) {
                position += kind === 1 ? 8 : 4;
                if (position > data.length)
                    throw new Error('Truncated field');
                continue;
            } else {
                throw new Error('Unsupported wire type');
            }
            if (!fields.has(field))
                fields.set(field, value);
        }
        return fields;
    }

    varint(data, position) {
        let value = 0n;
        for (let shift = 0n; shift < 70n; shift += 7n) {
            if (position >= data.length)
                throw new Error('Truncated varint');
            const byte = data[position++];
            value |= BigInt(byte & 127) << shift;
            if (byte < 128) {
                if (value >= 1n << 64n)
                    throw new Error('Oversized varint');
                return [value, position];
            }
        }
        throw new Error('Oversized varint');
    }

    timestamp(data) {
        const fields = this.decode(data);
        const seconds = fields.get(1);
        const nanos = fields.get(2) ?? 0;
        if (!Number.isInteger(seconds) || seconds < 1577836800 || seconds > 4102444800 ||
            !Number.isInteger(nanos) || nanos < 0 || nanos >= 1000000000)
            return null;
        return seconds + nanos / 1000000000;
    }

    hex(value) {
        if (typeof value !== 'string' || !/^(?:[0-9a-f]{2})*$/i.test(value))
            throw new Error('Invalid blob');
        return Uint8Array.from(value.match(/../g) ?? [], byte => Number.parseInt(byte, 16));
    }
}
