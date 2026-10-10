#!/usr/bin/env bash
set -euo pipefail

extension_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$extension_dir"
node scripts/check.js
node scripts/pack.js
