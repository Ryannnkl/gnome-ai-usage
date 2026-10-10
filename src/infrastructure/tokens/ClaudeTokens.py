class ClaudeTokens:
    def collect(self, root, ledger):
        messages = {}
        for folder in ['projects', 'transcripts']:
            for path in (root / folder).rglob('*.jsonl'):
                for event in ledger.lines(path):
                    message = event.get('message') or {}
                    usage = message.get('usage') or {}
                    if event.get('type') != 'assistant' or not usage:
                        continue
                    messageId = message.get('id')
                    if not messageId:
                        ledger.partial = True
                        continue
                    fields = ['input_tokens', 'output_tokens', 'cache_read_input_tokens',
                              'cache_creation_input_tokens']
                    values = [usage.get(field, 0) for field in fields]
                    if any(isinstance(value, bool) or not isinstance(value, int) or value < 0
                           for value in values):
                        ledger.partial = True
                        continue
                    tokens = sum(values)
                    if messageId not in messages or messages[messageId][1] < tokens:
                        messages[messageId] = (event.get('timestamp'), tokens)
        for messageId, (timestamp, tokens) in messages.items():
            ledger.add(timestamp, tokens, messageId)
