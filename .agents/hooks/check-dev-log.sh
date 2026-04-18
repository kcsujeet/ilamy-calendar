#!/usr/bin/env bash
# Stop hook: block session end if src/ has changes newer than today's dev log.
# Enforces the CLAUDE.md "Development Logs" hard rule.

set -u

TODAY=$(date +%Y-%m-%d)
LOG="docs/logs/${TODAY}.md"

# Find the newest src/ file mtime. BSD stat first, fall back to GNU stat.
NEWEST_SRC=$(find src -type f -exec stat -f "%m" {} \; 2>/dev/null | sort -rn | head -1)
[ -z "$NEWEST_SRC" ] && NEWEST_SRC=$(find src -type f -exec stat -c "%Y" {} \; 2>/dev/null | sort -rn | head -1)

# No src/ files — nothing to require.
[ -z "$NEWEST_SRC" ] && exit 0

if [ ! -f "$LOG" ]; then
  jq -n --arg today "$TODAY" '{
    decision: "block",
    reason: "Source files have been modified but docs/logs/\($today).md does not exist. Per CLAUDE.md hard rules: write today'"'"'s dev log before ending the session."
  }'
  exit 0
fi

LOG_MTIME=$(stat -f "%m" "$LOG" 2>/dev/null || stat -c "%Y" "$LOG")

if [ "$NEWEST_SRC" -gt "$LOG_MTIME" ]; then
  jq -n --arg today "$TODAY" '{
    decision: "block",
    reason: "Source modified more recently than docs/logs/\($today).md. Per CLAUDE.md: update the dev log with today'"'"'s changes before ending the session."
  }'
fi

exit 0
