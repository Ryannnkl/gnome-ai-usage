class ProtoFields:
    def decode(self, data):
        fields = {}
        position = 0
        while position < len(data):
            tag, position = self.varint(data, position)
            kind = tag & 7
            if kind == 0:
                value, position = self.varint(data, position)
            elif kind == 2:
                length, position = self.varint(data, position)
                end = position + length
                if end > len(data):
                    raise ValueError('Truncated field')
                value = data[position:end]
                position = end
            elif kind in [1, 5]:
                position += 8 if kind == 1 else 4
                if position > len(data):
                    raise ValueError('Truncated field')
                continue
            else:
                raise ValueError('Unsupported wire type')
            fields.setdefault(tag >> 3, value)
        return fields

    def varint(self, data, position):
        value = 0
        for shift in range(0, 70, 7):
            if position >= len(data):
                raise ValueError('Truncated varint')
            byte = data[position]
            position += 1
            value |= (byte & 127) << shift
            if byte < 128:
                if value >= 2**64:
                    raise ValueError('Oversized varint')
                return value, position
        raise ValueError('Oversized varint')

    def timestamp(self, data):
        fields = self.decode(data)
        seconds, nanos = fields.get(1), fields.get(2, 0)
        if not isinstance(seconds, int) or not 1577836800 <= seconds <= 4102444800:
            return None
        if not isinstance(nanos, int) or not 0 <= nanos < 1000000000:
            return None
        return seconds + nanos / 1000000000
