#!/usr/bin/env bash
# PreToolUse hook: warn when editing non-test source files — nudge toward TDD.
# Non-blocking: injects a reminder via additionalContext without denying the tool call.

set -u

FILE=$(jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] && exit 0

# Only source files under src/
case "$FILE" in */src/*|src/*) ;; *) exit 0 ;; esac

# Only .ts / .tsx
case "$FILE" in *.ts|*.tsx) ;; *) exit 0 ;; esac

# Skip test / spec files
case "$FILE" in *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) exit 0 ;; esac

jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: "TDD reminder: you are about to modify a non-test source file. Per CLAUDE.md hard rules, TDD is mandatory — write or update the corresponding .test file FIRST. If this is a trivial edit (rename, comment, typo fix) or you already updated the test in this session, proceed; otherwise switch to the test file first."
  }
}'
