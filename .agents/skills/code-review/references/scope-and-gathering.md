# Scope check and gathering the diff

Part of the code-review skill (`SKILL.md`). Covers Phase 0 (scope), Phase 1 (gather), and the section A/B checklist items (scope and intent; sources of truth).

## Phase 0: Scope Check

Before reading the diff for content, check the structure. Two problems are common in this repo's PRs and need to be surfaced before drafting line-level comments.

### Stacked branches

Run `gh pr list --author <author> --state open --json number,headRefName` to see the author's other open PRs. If multiple PRs exist and the diff for the current PR has 30+ files, the branches are probably stacked on top of each other rather than branched off `main`. Confirm by checking commits:

```bash
gh pr view <N> --json commits -q '.commits | length'
gh pr view <N-1> --json commits -q '.commits | length'
```

If PR N includes most of PR N-1's commits, the branches are stacked. **Stop and flag this to the user before drafting line-level reviews.** A stacked branch's diff cannot be reviewed in isolation. Suggest one of: (a) ask author to rebase each branch off main, (b) post a per-PR one-liner explaining the problem, or (c) close and reopen.

### Title vs. scope mismatch

Read the PR title against the diff. If the title says "fix X" but the diff also rewrites Y, deletes public-API surface area, or introduces a new abstraction unrelated to X, that is out-of-scope. Flag it. The right move is to ask the author to split the PR, not to silently review a scope-creep PR as if the title were honest.

Examples of out-of-scope you've seen in this repo:
- "Fix missing translations" that also removes 38 public translation keys and rewrites the date-formatting layer with `Intl.DateTimeFormat`.
- Bug-fix PRs that also delete unrelated dev logs.
- Single-fix PRs that also bundle a feature flag, a new prop, or a refactor.

When you find this, your draft becomes: "this PR is doing 4 things; the original problem is fixed by commits A and B; commits C-D should be split into PR #2; commit E into PR #3."

## Phase 1: Gather the Diff

Determine the review target from the user's request:

- **PR number or URL** → `gh pr view <N> --json title,body,state,author,files,commits,headRefOid` plus `gh pr diff <N>`. Save `headRefOid` (you need it later for inline comments).
- **Local changes** → `git diff` or `git diff main...HEAD`.
- **Specific commit** → `git show <sha>`.

If the diff is large (>35KB), save to a file and read it with `Read` using offset/limit. Don't skim. Actually read the changed lines.

Read the surrounding context of any non-trivial change. A diff hunk alone hides what was removed or why a field exists. Open the full file when the hunk touches shared components, context, or public APIs.

For PRs, also read the linked issue (`gh issue view <N>`). Issues often contain constraints ("no public-API changes", "must work for X") that the PR may have silently violated.

## Checklist items this backs

### A. Scope and intent

- **Author's other open PRs checked for stacking.** If multiple PRs exist and this one's diff is >30 files, confirmed it is not stacked on another branch (Phase 0).
- **PR title matches the diff's scope.** If the diff does more than the title promises, the out-of-scope work is called out separately rather than silently reviewed.
- **Linked issue (if any) read in full.** Constraints from the issue ("no public-API changes", "must work for X") are reflected in the review.
- **(Re-reviews only) Existing comment thread fetched.** Ran `gh api repos/<owner>/<repo>/pulls/<N>/comments` and read every reply (author and project owner) since the last posted review. Each prior comment's status (open / resolved / contested) reflects the most recent message in its thread, not just the diff state.

### B. Sources of truth

- **Diff read in full, not skimmed.** For diffs over 35KB, read in chunks with offset/limit.
- **Each finding verified against the actual file at the actual line.** Opened the file, read the line, confirmed the issue exists. No findings based purely on sub-agent reports.
- **External API claims verified.** Any statement about behavior of dayjs, React, Intl, rrule, Tailwind, GitHub API, etc. has a WebFetch backing it, cited inline in the comment body where relevant.
- **Dev logs (`docs/logs/`) checked for previously-fixed bugs** the PR might re-introduce. Don't trust the PR description; check the logs.
