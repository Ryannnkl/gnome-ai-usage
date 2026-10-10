#!/usr/bin/env bash
set -euo pipefail

extension_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$extension_dir"
bash scripts/pack.sh
temporary_root=${TMPDIR:-/tmp/opencode}
mkdir -p "$temporary_root"
export TMPDIR="$temporary_root"
codex_home=$(mktemp -d "$temporary_root/ai-usage-no-login.XXXXXX")
export CODEX_HOME="$codex_home"
export AI_USAGE_TEST_MODE=1
trap 'rmdir -- "$CODEX_HOME"' EXIT
export NO_AT_BRIDGE=1
dbus-run-session -- gnome-shell-test-tool --devkit --disable-animations \
    --extension dist/ai-usage@ryannnkl.com.shell-extension.zip tests/shellSmoke.js
