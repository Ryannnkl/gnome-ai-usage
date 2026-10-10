export class TokenFixtureFiles {
    constructor() {
        this.logs = new Map();
    }

    async *paths(root, suffix) {
        for (const path of this.logs.keys()) {
            if (path.startsWith(`${root}/`) && path.endsWith(suffix))
                yield path;
        }
    }

    async *events(path) {
        yield* this.logs.get(path);
    }

    write(path, events) {
        this.logs.set(`/fixture/${path}/fixture.jsonl`, events);
    }
}

export function codexEvent(total, last, date = '2026-10-10') {
    return {timestamp: `${date}T12:00:00Z`, type: 'event_msg', payload: {
        type: 'token_count', info: {total_token_usage: {total_tokens: total},
            last_token_usage: {total_tokens: last}}}};
}

export function protoField(number, value) {
    function varint(input) {
        let integer = BigInt(input);
        const bytes = [];
        while (integer >= 128n) {
            bytes.push(Number(integer & 127n) | 128);
            integer >>= 7n;
        }
        return [...bytes, Number(integer)];
    }
    const bytes = typeof value === 'number' ? [...varint(number * 8), ...varint(value)] :
        [...varint(number * 8 + 2), ...varint(value.length), ...value];
    return Uint8Array.from(bytes);
}

export function protoHex(bytes) {
    return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
}
