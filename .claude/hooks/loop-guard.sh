#!/usr/bin/env bash
# loop-guard.sh — Stop / SubagentStop hook (ADR-0016).
#
# When a session touched product source but skipped the loop bracket — no mulch
# record written, or the work isn't linked to a claimed seed — nudge the author.
# A crewmate (SubagentStop) is blocked so it self-corrects before returning; the
# main session gets a soft, non-blocking reminder. Force hard mode anywhere with
# LOOP_GUARD_BLOCK=1.
#
# Deliberately a nudge, not a hard gate: mulch's own guidance is "skip if nothing
# surfaced" rather than write ritual filler, so a genuinely empty session must be
# able to end. The `stop_hook_active` check prevents re-prompt loops.
set -uo pipefail

payload="$(cat || true)"
jqr() { printf '%s' "$payload" | jq -r "$1" 2>/dev/null || true; }

# Never loop: if we already re-prompted on this stop, let it end.
[ "$(jqr '.stop_hook_active')" = "true" ] && exit 0

export PATH="$HOME/.bun/bin:$PATH"
cwd="$(jqr '.cwd')"
[ -n "$cwd" ] && cd "$cwd" 2>/dev/null || true

# Only enforce when the session touched product source (.ts/.tsx under packages/ or apps/).
touched="$(git status --porcelain -- packages apps 2>/dev/null | grep -E '\.(ts|tsx)$' || true)"
[ -z "$touched" ] && exit 0

reasons=""
git status --porcelain -- .mulch/expertise 2>/dev/null | grep -q . \
  || reasons="${reasons}\n• Changed product code but recorded nothing to mulch — if a non-obvious learning surfaced: ml record <domain> --type <...> --description \"...\" --evidence-seeds <id> (skip only if truly nothing)."
[ -n "$(sd list --status in_progress --format ids 2>/dev/null)" ] \
  || reasons="${reasons}\n• Work isn't linked to an in-progress seed — sd ready → sd update <id> --status in_progress (or sd create)."

[ -z "$reasons" ] && exit 0
text="Loop bracket incomplete (ADR-0016):${reasons}"

# Crewmate → block to self-correct; main session → soft reminder (shown to you).
if [ "$(jqr '.hook_event_name')" = "SubagentStop" ] || [ "${LOOP_GUARD_BLOCK:-0}" = "1" ]; then
  jq -n --arg r "$(printf '%b' "$text")" '{decision:"block", reason:$r}'
else
  printf '%b\n' "$text" >&2
fi
exit 0
