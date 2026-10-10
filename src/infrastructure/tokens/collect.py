import json
import pathlib
import sys
from TokenLedger import TokenLedger
from CodexTokens import CodexTokens
from ClaudeTokens import ClaudeTokens
from AntigravityTokens import AntigravityTokens


def collect(provider, root, dates):
    collectors = {'codex': CodexTokens, 'claude': ClaudeTokens, 'antigravity': AntigravityTokens}
    ledger = TokenLedger(dates)
    path = pathlib.Path(root).resolve()
    if not path.is_dir():
        return None
    collectors[provider]().collect(path, ledger)
    return ledger.report()


if __name__ == '__main__':
    try:
        result = collect(sys.argv[1], sys.argv[2], json.loads(sys.argv[3]))
        print(json.dumps(result))
    except (OSError, ValueError, KeyError, TypeError):
        print('null')
