import sqlite3
from contextlib import closing
from ProtoFields import ProtoFields


class AntigravityTokens:
    def __init__(self):
        self.proto = ProtoFields()

    def collect(self, root, ledger):
        for folder in ['antigravity-cli', 'antigravity']:
            for path in (root / folder / 'conversations').glob('*.db'):
                try:
                    with closing(sqlite3.connect(path.as_uri() + '?mode=ro', uri=True, timeout=1)) as database:
                        self.read(database, ledger, str(path))
                except (sqlite3.Error, ValueError, TypeError):
                    ledger.partial = True

    def read(self, database, ledger, path):
        responseTimes, generationTimes = {}, {}
        for (blob,) in database.execute('SELECT metadata FROM steps WHERE step_type = 15'):
            if not blob:
                continue
            fields = self.proto.decode(blob)
            timestamp = self.proto.timestamp(fields.get(1, b''))
            response = self.proto.decode(fields.get(9, b'')).get(11)
            generation = self.proto.decode(fields.get(20, b'')).get(3)
            if timestamp is not None:
                if response:
                    responseTimes[response] = timestamp
                if generation is not None:
                    generationTimes[generation] = timestamp
        for index, blob in database.execute('SELECT idx, data FROM gen_metadata ORDER BY idx'):
            model = self.proto.decode(self.proto.decode(blob).get(1, b''))
            usage = self.proto.decode(model.get(4, b''))
            if not usage:
                continue
            response = usage.get(11)
            generation = self.proto.decode(model.get(9, b''))
            timestamp = self.proto.timestamp(generation.get(4, b''))
            timestamp = timestamp or responseTimes.get(response) or generationTimes.get(index)
            values = [usage.get(field, 0) for field in [1, 2, 5, 9, 10]]
            if timestamp is None or any(not isinstance(value, int) for value in values):
                ledger.partial = True
                continue
            ledger.add(timestamp, sum(values), response or (path, index))
