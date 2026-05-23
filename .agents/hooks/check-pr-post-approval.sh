#!/usr/bin/env bash
# PreToolUse hook for Bash. Blocks public-facing GitHub posting commands
# (gh api POST to pulls/comments|reviews, gh pr comment/review/create,
# gh issue comment/create) unless `.claude/state/pr-post-approved.flag`
# was touched within the last 30 seconds.
#
# Why: a recurring failure mode is interpreting stale or implied approval
# as fresh. The marker file makes the approval explicit and time-bound,
# so even when conversation context drifts, the hook physically blocks
# the post until the assistant deliberately runs `touch` right before it.
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
	# gh pr {comment,review,create}
	if [[ "$cmd" =~ gh[[:space:]]+pr[[:space:]]+(comment|review|create)([[:space:]]|$) ]]; then return 0; fi
	# gh issue {comment,create}
	if [[ "$cmd" =~ gh[[:space:]]+issue[[:space:]]+(comment|create)([[:space:]]|$) ]]; then return 0; fi
	return 1
}

if ! is_protected_command "$COMMAND"; then
	exit 0
fi

FLAG=".claude/state/pr-post-approved.flag"

if [[ ! -f "$FLAG" ]]; then
	cat >&2 <<'EOF'
Blocked: this command posts public-facing content to GitHub, but no fresh
post-approval marker exists.

The user must say "post it" (or equivalent) and you must then run:
  touch .claude/state/pr-post-approved.flag
right before the gh command, ideally chained:
  touch .claude/state/pr-post-approved.flag && <gh command>

The marker expires 30 seconds after it is touched, so a stale approval
from earlier in the session does not carry forward.
EOF
	exit 2
fi

# Portable mtime read (BSD `stat -f` on macOS, GNU `stat -c` on Linux).
if FLAG_MTIME=$(stat -f %m "$FLAG" 2>/dev/null); then
	:
elif FLAG_MTIME=$(stat -c %Y "$FLAG" 2>/dev/null); then
	:
else
	echo "Blocked: cannot read mtime of $FLAG (stat unsupported)." >&2
	exit 2
fi

NOW=$(date +%s)
AGE=$(( NOW - FLAG_MTIME ))

if (( AGE > 30 )); then
	cat >&2 <<EOF
Blocked: post-approval marker is stale (touched ${AGE}s ago, max 30s).

Approval does not carry across messages. Ask the user again, then chain:
  touch .claude/state/pr-post-approved.flag && <gh command>
EOF
	exit 2
fi

exit 0
