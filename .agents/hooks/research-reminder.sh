#!/usr/bin/env bash
# PreToolUse hook: before writing/modifying source, nudge to research the
# existing codebase for a reusable pattern first (props, render-props, context
# methods, shared components, utils) instead of hand-rolling a new one.
# Non-blocking: injects a reminder via additionalContext.

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
    additionalContext: "Research-first reminder: before implementing this, confirm you have searched the codebase for an existing pattern to reuse rather than hand-rolling one. Check: the public API (packages/*/src/index.ts), context surface (IlamyCalendarApi / useSmartCalendarContext), render-prop hooks (e.g. renderCurrentTimeIndicator, renderEvent), shared primitives in @ilamy/ui and features/calendar/components, and lib/utils helpers. If you have not grepped for a relevant prop/component/helper yet, stop and search FIRST, then integrate with what exists."
  }
}'
