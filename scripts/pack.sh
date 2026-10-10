#!/usr/bin/env bash
set -euo pipefail

extension_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$extension_dir"
node scripts/check.js
glib-compile-schemas --strict schemas
mkdir -p dist
gnome-extensions pack --force --out-dir=dist \
    --extra-source=src \
    --extra-source=icons \
    .
