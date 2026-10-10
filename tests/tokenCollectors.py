import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'src/infrastructure/tokens'))
from collect import collect
from ProtoFields import ProtoFields


class TokenCollectorTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='token-fixtures-')
        self.addCleanup(self.temporary.cleanup)
        self.root = pathlib.Path(self.temporary.name)
        self.dates = ['2026-10-09', '2026-10-10']

    def write(self, folder, events):
        path = self.root / folder / 'fixture.jsonl'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('\n'.join(json.dumps(event) for event in events))
        return path

    def codexEvent(self, total, last, date='2026-10-10'):
        return {'timestamp': date + 'T12:00:00+00:00', 'type': 'event_msg', 'payload': {
            'type': 'token_count', 'info': {'total_token_usage': {'total_tokens': total},
            'last_token_usage': {'total_tokens': last}}}}

    def testCodexCounterDedupAndMidnight(self):
        events = [{'type': 'session_meta', 'payload': {'id': 'session-one'}},
                  self.codexEvent(100, 100, '2026-10-09'), self.codexEvent(100, 100),
                  self.codexEvent(140, 40), self.codexEvent(150, 10)]
        self.write('sessions/one', events)
        self.write('sessions/duplicate', events)
        report = collect('codex', self.root, self.dates)
        self.assertEqual(report['days'], [{'date': '2026-10-09', 'tokens': 100},
                                          {'date': '2026-10-10', 'tokens': 50}])

    def testCodexResetIsNotNegativeAndMissingBaselineIsNotInvented(self):
        self.write('sessions', [self.codexEvent(100, None), self.codexEvent(10, 10),
                                self.codexEvent(20, 10)])
        report = collect('codex', self.root, self.dates)
        self.assertEqual(report['days'][0]['tokens'], 10)
        self.assertTrue(report['partial'])

    def testClaudeCacheIncludedAndStreamingMessagesDeduplicated(self):
        def event(output):
            return {'type': 'assistant', 'timestamp': '2026-10-10T12:00:00Z', 'message': {
                'id': 'message-one', 'usage': {'input_tokens': 10, 'output_tokens': output,
                'cache_read_input_tokens': 30, 'cache_creation_input_tokens': 40}}}
        self.write('projects', [event(0), event(20), event(20)])
        self.write('transcripts', [event(20)])
        report = collect('claude', self.root, self.dates)
        self.assertEqual(report['days'], [{'date': '2026-10-10', 'tokens': 100}])

    def testMissingAndMalformedLogsNeverBecomeZero(self):
        self.assertEqual(collect('claude', self.root, self.dates)['days'], [])
        path = self.write('projects', [])
        path.write_text('{broken')
        report = collect('claude', self.root, self.dates)
        self.assertEqual(report['days'], [])
        self.assertTrue(report['partial'])

    def testCorruptProtoIsRejected(self):
        for blob in [b'\x0a\xff', b'\x0a\x05\x00', b'\x03', b'\x08' + b'\xff' * 11]:
            with self.assertRaises(ValueError):
                ProtoFields().decode(blob)


if __name__ == '__main__':
    unittest.main()
