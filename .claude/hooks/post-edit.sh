#!/usr/bin/env bash
# PostToolUse hook: format (and lint-fix) the file an agent just edited, giving
# immediate, local feedback (ADR-0014, guardrails pillar).
#
# Best-effort by design: it must NEVER block an edit. If tooling isn't installed
# yet (e.g. before `pnpm install`) or a command fails, we exit 0 quietly.
set -euo pipefail

# Claude Code passes the tool event as JSON on stdin.
payload="$(cat || true)"
file="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)"

# Nothing to do if we couldn't determine the file or it's gone.
[ -n "${file:-}" ] || exit 0
[ -f "$file" ] || exit 0

# Only touch source/doc files we format.
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.md|*.css) ;;
  *) exit 0 ;;
esac

run() { "$@" >/dev/null 2>&1 || true; }

# Format with the workspace Prettier if available; fall back to npx --no-install.
if pnpm exec prettier --version >/dev/null 2>&1; then
  run pnpm exec prettier --write "$file"
fi

# Lint-fix TS/JS with the workspace ESLint if available (skip configs/docs).
case "$file" in
  *.ts|*.tsx|*.js|*.jsx)
    if pnpm exec eslint --version >/dev/null 2>&1; then
      run pnpm exec eslint --fix "$file"
    fi
    ;;
esac

exit 0
