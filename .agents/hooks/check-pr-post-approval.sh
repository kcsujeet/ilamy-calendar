#!/usr/bin/env bash
# PreToolUse hook for Bash. Blocks public-facing GitHub posting commands
# (gh api POST to pulls/comments|reviews, gh pr comment/review/create,
# gh issue comment/create) unless the same command chains the explicit
# approval ritual `touch .claude/state/pr-post-approved.flag &&` first.
#
# Why: the recurring failure mode is interpreting stale or implied approval
# as fresh. Requiring the literal `touch ...` substring inside the same
# Bash command makes approval explicit, deliberate, and auditable in the
# Bash history. The hook fires BEFORE the command runs, so checking file
# mtime is moot for chained commands; what matters is that the assistant
# typed the ritual into the command itself.
#
# Bypass for one post:
#   touch .claude/state/pr-post-approved.flag && <gh command>

set -u

INPUT="$(cat)"
COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"

if [[ -z "$COMMAND" ]]; then
	exit 0
fi

# Patterns that count as public-facing GitHub posts.
is_protected_command() {
	local cmd="$1"
	# gh api POST to PR comments or reviews
	if [[ "$cmd" =~ gh[[:space:]]+api[[:space:]].*pulls/[^[:space:]]+/(comments|reviews).*-X[[:space:]]+POST ]]; then return 0; fi
	if [[ "$cmd" =~ gh[[:space:]]+api[[:space:]].*-X[[:space:]]+POST.*pulls/[^[:space:]]+/(comments|reviews) ]]; then return 0; fi
	# gh pr {comment,review,create,edit}
	if [[ "$cmd" =~ gh[[:space:]]+pr[[:space:]]+(comment|review|create|edit)([[:space:]]|$) ]]; then return 0; fi
	# gh issue {comment,create,edit}
	if [[ "$cmd" =~ gh[[:space:]]+issue[[:space:]]+(comment|create|edit)([[:space:]]|$) ]]; then return 0; fi
	return 1
}

if ! is_protected_command "$COMMAND"; then
	exit 0
fi

# Approval ritual: the command itself must contain the literal touch.
# Tolerate whitespace variants around the path; the path itself is exact.
if [[ "$COMMAND" =~ touch[[:space:]]+\.claude/state/pr-post-approved\.flag ]]; then
	exit 0
fi

cat >&2 <<'EOF'
Blocked: this command posts public-facing content to GitHub but does not
include the approval ritual in the same command.

The user must say "post it" (or unambiguous equivalent: "send it", "go
ahead", "ship it") in their MOST RECENT message. Stale approval from
earlier in the conversation does not carry forward. Once you have fresh
approval, prepend the ritual so it runs in the same chained command:

  touch .claude/state/pr-post-approved.flag && <gh command>

The ritual is the deliberate, auditable bridge between conversational
approval and the actual post. Do not bypass by touching the marker out
of band; the hook only allows the post when the touch appears inline.
EOF
exit 2
