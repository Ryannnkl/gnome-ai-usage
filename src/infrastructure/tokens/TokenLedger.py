import datetime
import json
import math


class TokenLedger:
    def __init__(self, dates):
        self.dates = set(dates)
        self.days = {}
        self.seen = set()
        self.partial = False

    def add(self, timestamp, tokens, identity):
        if identity in self.seen:
            return
        if isinstance(tokens, bool) or not isinstance(tokens, int) or not 0 <= tokens <= 2**53 - 1:
            self.partial = True
            return
        try:
            if isinstance(timestamp, (int, float)) and math.isfinite(timestamp):
                moment = datetime.datetime.fromtimestamp(timestamp).astimezone()
            else:
                moment = datetime.datetime.fromisoformat(timestamp.replace('Z', '+00:00')).astimezone()
            date = moment.date().isoformat()
        except (ValueError, TypeError, AttributeError, OverflowError):
            self.partial = True
            return
        self.seen.add(identity)
        if date in self.dates:
            self.days[date] = self.days.get(date, 0) + tokens

    def lines(self, path):
        with path.open() as stream:
            for line in stream:
                try:
                    value = json.loads(line)
                    if isinstance(value, dict):
                        yield value
                except ValueError:
                    self.partial = True

    def report(self):
        return {'days': [{'date': date, 'tokens': tokens} for date, tokens in sorted(self.days.items())],
                'partial': self.partial, 'scope': 'local-client'}
