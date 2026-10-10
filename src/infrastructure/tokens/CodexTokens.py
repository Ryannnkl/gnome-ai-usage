class CodexTokens:
    def collect(self, root, ledger):
        for path in root.glob('sessions/**/*.jsonl'):
            previous = None
            sessionId = str(path)
            for index, event in enumerate(ledger.lines(path)):
                payload = event.get('payload') or {}
                if event.get('type') == 'session_meta':
                    sessionId = payload.get('id') or sessionId
                if event.get('type') != 'event_msg' or payload.get('type') != 'token_count':
                    continue
                info = payload.get('info') or {}
                usage = info.get('total_token_usage') or {}
                total = usage.get('total_tokens')
                if not isinstance(total, int) or isinstance(total, bool) or total < 0:
                    continue
                if previous is not None and total == previous:
                    continue
                if previous is not None and total < previous:
                    previous = total
                    ledger.partial = True
                    continue
                if previous is None:
                    last = (info.get('last_token_usage') or {}).get('total_tokens')
                    delta = last if isinstance(last, int) and 0 <= last <= total else None
                else:
                    delta = total - previous
                previous = total
                if delta is None:
                    ledger.partial = True
                    continue
                ledger.add(event.get('timestamp'), delta, (sessionId, total))
