#!/usr/bin/env bash
set -euo pipefail

extension_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$extension_dir"
bash scripts/pack.sh
temporary_root=${TMPDIR:-/tmp/opencode}
mkdir -p "$temporary_root"
export TMPDIR="$temporary_root"
export NO_AT_BRIDGE=1
dbus-run-session -- gnome-shell-test-tool --devkit --disable-animations \
    --extension dist/ai-usage@ryannnkl.dev.shell-extension.zip tests/shellPreview.js
