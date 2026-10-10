import datetime
import pathlib
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'src/infrastructure/tokens'))
from collect import collect


def varint(value):
    data = bytearray()
    while value >= 128:
        data.append((value & 127) | 128)
        value >>= 7
    data.append(value)
    return bytes(data)


def field(number, value):
    if isinstance(value, int):
        return varint(number << 3) + varint(value)
    return varint((number << 3) | 2) + varint(len(value)) + value


class AntigravityTokenTests(unittest.TestCase):
    def testUsageMetadataAndResponseTimeWithoutConversationContent(self):
        with tempfile.TemporaryDirectory(prefix='antigravity-fixture-') as temporary:
            root = pathlib.Path(temporary)
            folder = root / 'antigravity-cli/conversations'
            folder.mkdir(parents=True)
            path = folder / 'synthetic.db'
            timestamp = int(datetime.datetime(2026, 10, 10, 12, tzinfo=datetime.timezone.utc).timestamp())
            usage = b''.join(field(key, value) for key, value in [(1, 10), (2, 20), (5, 30),
                                                                (9, 40), (10, 50), (11, b'response')])
            metadata = field(1, field(1, timestamp)) + field(9, field(11, b'response'))
            blob = field(1, field(4, usage))
            with sqlite3.connect(path) as database:
                database.execute('CREATE TABLE steps (step_type INTEGER, metadata BLOB)')
                database.execute('CREATE TABLE gen_metadata (idx INTEGER, data BLOB)')
                database.execute('INSERT INTO steps VALUES (15, ?)', [metadata])
                database.executemany('INSERT INTO gen_metadata VALUES (?, ?)', [(0, blob), (1, blob)])
            database.close()
            original = path.read_bytes()
            report = collect('antigravity', root, ['2026-10-10'])
            self.assertEqual(report['days'], [{'date': '2026-10-10', 'tokens': 150}])
            self.assertFalse(report['partial'])
            self.assertEqual(path.read_bytes(), original)
            with sqlite3.connect(path) as database:
                database.execute('DELETE FROM steps')
            database.close()
            report = collect('antigravity', root, ['2026-10-10'])
            self.assertEqual(report['days'], [])
            self.assertTrue(report['partial'])


if __name__ == '__main__':
    unittest.main()
