#!/usr/bin/env bash
# Stop hook: block session end if src/ has UNCOMMITTED code changes that
# aren't reflected in today's dev log. Enforces the CLAUDE.md "Development
# Logs" hard rule for actual code work.
#
# Skips for review-only sessions (no code changes), branch checkouts (mtime
# noise without content changes), and after-commit states (code is already
# in git history, and the commit workflow updates the log alongside it).
# The check is: `git diff --quiet HEAD -- src` — clean tree means no
# obligation.

set -u

# No uncommitted code changes in src/ — nothing to require.
if git diff --quiet HEAD -- src 2>/dev/null; then
  exit 0
fi

TODAY=$(date +%Y-%m-%d)
LOG="docs/logs/${TODAY}.md"

if [ ! -f "$LOG" ]; then
  jq -n --arg today "$TODAY" '{
    decision: "block",
    reason: "Uncommitted changes in src/ but docs/logs/\($today).md does not exist. Per CLAUDE.md hard rules: write today'"'"'s dev log before ending the session. (Review-only sessions with no actual code changes are skipped.)"
  }'
  exit 0
fi

# Newest mtime among files that actually have uncommitted changes.
NEWEST_SRC=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue
  M=$(stat -f "%m" "$f" 2>/dev/null || stat -c "%Y" "$f")
  if [ "$M" -gt "$NEWEST_SRC" ]; then
    NEWEST_SRC=$M
  fi
done < <(git diff --name-only HEAD -- src 2>/dev/null)

if [ "$NEWEST_SRC" -eq 0 ]; then
  exit 0
fi

LOG_MTIME=$(stat -f "%m" "$LOG" 2>/dev/null || stat -c "%Y" "$LOG")

if [ "$NEWEST_SRC" -gt "$LOG_MTIME" ]; then
  jq -n --arg today "$TODAY" '{
    decision: "block",
    reason: "Uncommitted source files in src/ are newer than docs/logs/\($today).md. Per CLAUDE.md: update the dev log with today'"'"'s changes before ending the session."
  }'
fi

exit 0
