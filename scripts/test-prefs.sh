#!/usr/bin/env bash
set -euo pipefail

extension_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$extension_dir"
glib-compile-schemas --strict schemas
export GI_TYPELIB_PATH="/usr/lib/gnome-shell/girepository-1.0${GI_TYPELIB_PATH:+:$GI_TYPELIB_PATH}"
export LD_LIBRARY_PATH="/usr/lib/gnome-shell${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export GSETTINGS_BACKEND=memory
gjs -m tests/gjsPrefs.js
