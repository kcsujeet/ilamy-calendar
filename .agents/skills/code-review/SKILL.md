---
name: code-review
description: Review a GitHub PR or local diff for the @ilamy/calendar repo. Drafts findings as Conventional Comments and waits for explicit approval before posting anything to GitHub. Use when the user says "review this PR", "review PR #N", "review my changes", or shares a PR link.
---

# Code Review

Review a pull request or local diff thoroughly, draft findings as Conventional Comments anchored to specific lines, and present the draft to the user. Never post to GitHub without explicit approval.

## Hard Rules

These are non-negotiable. Violating any of these is a defect in the review.

- **Never post to GitHub before the user says to post.** Showing the draft is not approval; "looks good" is not approval. Wait for explicit "post it" or equivalent.
- **Decide yourself whether a comment needs a decoration at all.** Most don't. Only ask the user about the choice of decoration (`blocking` vs `non-blocking` vs `if-minor`) for the small subset where one is actually needed AND severity is genuinely ambiguous. Never silently add `(blocking)` yourself.
- **Never use em dashes (—).** Use periods, commas, parentheses, or rewrite. The user has corrected this multiple times.
- **Never add pleasantries or preamble.** No "well-scoped PR", "nice work", "tests pass" summaries. The inline comments speak for themselves. The reader can see the PR is well-scoped without being told.
- **Never make claims about external APIs from cached knowledge.** Before citing behavior of dayjs, rrule, React, Intl, Tailwind, or any other library, WebFetch the canonical docs and cite the source inline. Past sessions shipped fabricated method names.
- **Never make the review about pre-existing problems.** Flag them once briefly if they intersect the change, then move on. The PR author didn't write that code.
- **Never create follow-up commits on the user's behalf during review.** If the user asks for fixes after the review, make them but ask before committing.
- **Trust but verify.** When a sub-agent says "line 42 has a bug", open line 42 and confirm before putting it in the draft.

## Phase 0: Scope Check

Before reading the diff for content, check the structure. Two problems are common in this repo's PRs and need to be surfaced before drafting line-level comments:

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

## Phase 2: Review in Parallel

For diffs >300 lines or >5 files, spawn three `Explore` agents in a single message. For smaller diffs, do this inline. Each agent gets the full diff so they work from the same source.

### Agent 1: Bugs & Correctness

- **Logic bugs**: off-by-one, wrong operator, inverted conditions, stale state.
- **Leftover code**: duplicate JSX from incomplete refactors, dead imports, props threaded through that aren't used.
- **Breaking changes**: modified shared components, changed prop shapes, removed exports. Grep for who imports them. Removing or making-required a field on a public type is a breaking change even if the PR description says it isn't.
- **Data shape mismatches**: API contract drift, type assertions that hide real errors.
- **Edge cases**: empty arrays, null/undefined, timezone issues. This codebase uses dayjs with a configured `timezone` prop. `Intl.DateTimeFormat` without a `timeZone` option formats in the system timezone, which is wrong for this calendar. The previous fix is documented in `docs/logs/2026-03-29.md` style entries.
- **Regressions of previously-fixed bugs**: check if the dev logs (`docs/logs/`) describe a fix that this PR re-introduces. Don't trust the PR author's description; check the logs.

### Agent 2: Simplification Opportunities

**DRY is the guiding principle here.** Actively hunt for repetition: any time the same shape of code (same boilerplate in tests, same condition, same JSX wrapper, same setup block) appears 2-3+ times, propose extracting it. Repetition is the single most common review finding and the easiest to undervalue. Look for it everywhere: production code, tests, demo code, documentation snippets. Test files in particular accumulate repetitive setup that begs for helpers like `renderXyzView`, `buildEvent`, `at(hour, minute)`.

Specific patterns to flag:

- **Repeated test setup**: multiple tests calling the same `render(<Provider>...<X /></Provider>)` boilerplate with one varying prop. Extract a `renderX(overrides?)` helper.
- **Scope creep**: props added to shared components for a single use case. Should it live closer to the caller instead?
- **Repeated inline checks**: the same condition appearing 3+ times. Extract to a boolean const.
- **Over-parameterized components**: 6+ props where 4 could be derived from context.
- **Duplicate computation** across sibling components. Extract to a shared hook.
- **Repeated `locale = currentLocale || currentDate.locale()`-style patterns** across multiple files. Extract to a small hook so future changes (like adding `timeZone`) are one-line.
- **Template literal classNames** where `cn()` is the codebase convention.
- **JSX blocks** >30 lines that could be standalone components.
- **Useless wrapper divs** that duplicate parent styling.
- **Over-engineering relative to alternatives**: if the PR introduces a custom utility module (e.g., `formatLocaleDate.ts`) when a one-line plugin call would do (`dayjs.extend(localizedFormat)` + `format('LL')`), call it out with the comparison. Verify both produce identical output before claiming equivalence.

The goal is not zealous deduplication. Three similar lines is sometimes better than a premature abstraction. But when the same shape appears with no real variance, name it once.

### Agent 3: Code Quality & Efficiency

- **Project conventions** (defined in `.agents/rules/code-style.md` and `.agents/rules/coding-patterns.md`):
  - `.at(0)` / `.at(-1)` over `[0]` / `[length - 1]` for first/last array access.
  - No `!` non-null assertions. Use guards, optional chaining, or default values.
  - `Boolean(x)` over `!!x` for coercion.
  - No `any`. Use `unknown` with type guards, specific interfaces, or generics.
  - No `export default`. Named exports only.
  - For `cn(...)` with multi-clause conditions, extract each conditional class to a named const, don't inline.
- **Readability conventions** (the user has stated these explicitly; reviews should flag violations):
  - **Colocation (Bulletproof React).** Tests live next to components (`foo.tsx` + `foo.test.tsx`). Hooks and utils live with the feature that owns them. Shared code sits at the lowest common ancestor in the tree. A PR that moves a feature-specific util into a global `lib/` should be questioned.
  - **Named variables over inline expressions.** When a condition has 2+ clauses (`a && b && c`), extract to a named const that describes what the combined condition represents. Example: `const canShowFeature = featureAvailable && featureEnabled && !userOptedOut` then `if (canShowFeature)`. Flag inline multi-clause conditions in `if`, `&&` JSX gates, ternary tests, and `cn(...)` calls.
  - **No multi-level ternaries.** Single-level ternaries are fine (`isActive ? 'on' : 'off'`). Two or more nested levels (`a ? b : c ? d : e`) are not. Suggest converting to `if/else if/else`, early returns, or a key-value lookup object.
  - **No nested `if` or `switch` blocks.** Suggest flattening with early returns, guard variables, or key-value object lookups. Nested control flow is almost always a sign that the logic can be expressed more clearly.
  - **No ternaries in JSX.** Prefer single-level boolean conditionals (`{condition && <X />}`) or early returns from the component. `{isLoading ? <Spinner /> : <Content />}` should become an early return for the loading branch or two consecutive `&&` gates.
  - **No code the reader can't understand at a glance.** If a line takes more than a few seconds to parse, that is a defect, not cleverness. A comment explaining mechanics is a smell; rewrite the code instead. Comments should explain WHY, not WHAT.
  - **Don't prop-drill what context already provides.** If a hook, function, or component already has access to a value via context (e.g. `useSmartCalendarContext`, `useEffectiveBusinessHours`), it should read it there directly instead of accepting it as a prop or argument and having every caller plumb it through. Flag any case where a caller pulls a value out of context only to pass it back into a callee that could pull it itself. Same rule for refs, settings, callbacks, and any other context-derived data. Tests can wrap the callee in a minimal provider.
- **Unnecessary work**: `useMemo` / loops that run in modes where the result is unused. Guard with `if (!isActive) return []`.
- **Missed memoization**: inline object/callback creation inside `useMemo` deps that breaks child memoization.
- **Stale deps**: function refs used in dep arrays instead of the underlying data.
- **Redundant recomputation**: a value already memoized by a shared hook being recomputed inline.
- **Repeated call shapes inside a memo** with only one argument varying: extract to a `useCallback` and invoke at each site.
- **Conditional memos that throw away cached work**: `useMemo(() => flag ? A() : B(), [...allDeps])` recomputes on every change. Split into two memos with narrower deps + a tiny selector.
- **Test coverage gaps**: new prop or feature added without tests. Tests that assert CSS classes (brittle in JSDOM).
- **Integration test gaps for gating logic**: if a feature is gated on a condition (e.g., `gridType === 'hour'`), there should be a test that the feature mounts under the condition and not otherwise. Component-level tests in isolation don't catch a regressed gate.
- **Naming**: file name must uniquely identify the file across the whole codebase. `day-header.tsx` inside `resource-calendar/components/week-view/horizontal/` is wrong (too generic without path context). Use `resource-week-horizontal-day-header.tsx`. Names appear path-less in IDE tabs, grep, imports, stack traces.
- **Unnecessary comments**: narrating what the code does, referencing the current task, TODO without a ticket.

## Phase 3: Triage

When agents return, filter findings:

- **Real issues**: bugs, breaking changes, missing tests, regressions of known fixes.
- **Real suggestions**: repeated patterns, scope creep, over-engineering with a simpler alternative.
- **Nitpicks**: style, naming preferences, micro-optimizations.
- **Out of scope**: pre-existing issues this PR didn't touch. Drop or mention once and move on.

Skip false positives silently. Don't pad the review with weak observations. A 2-comment review is better than an 8-comment review where 6 are fluff.

## Phase 4: Draft (Conventional Comments)

Follow the [Conventional Comments](https://conventionalcomments.org/) format strictly.

**Format:**

```
<label> [decoration]: <one-line subject>

<optional body, 2-3 sentences default>
```

A blank line between subject and body. Subject ends with a period. No em dashes anywhere.

**Labels** (pick the one that matches):
- `praise`: positive highlights. Only use if it's a specific, non-generic observation worth noting. Skip generic praise.
- `nitpick`: trivial preference. Inherently non-blocking, so the decoration is usually redundant.
- `suggestion`: proposed improvement with a clear reason.
- `issue`: a specific defect that needs attention.
- `todo`: small required change.
- `question`: you're uncertain and need clarification.
- `thought`: a reflection that may or may not need action.
- `chore`: required tasks before merging.
- `note`: informational only.

**Decorations** are optional. Most comments do not need one. The default is no decoration.
- `(blocking)`: should prevent merge until resolved.
- `(non-blocking)`: should not prevent merge.
- `(if-minor)`: resolve only if the fix is trivial.

Decide for yourself whether each comment needs a decoration at all, using this rubric:

- `nitpick`, `praise`, `note`, `question`, `thought`: **no decoration**. The label already conveys severity. Don't add one. Don't ask.
- `suggestion`, `issue`, `todo`, `chore`: usually no decoration either. Add a decoration only when the comment's severity is materially different from what the label alone suggests, and a reader could plausibly misread it. Example: a `suggestion` that you believe must be addressed before merge becomes `(blocking)`. A `suggestion` that is fine to defer needs no decoration. Use `(if-minor)` when the fix is worth doing only if it's cheap.

Only ask the user about the choice of decoration when (a) a decoration is needed and (b) you genuinely cannot tell which one fits. Skip the ask when the user already signaled severity in conversation. If asking for multiple comments, batch them into a single `AskUserQuestion` call with one question per comment.

### Draft each comment without a decoration first

Body length: default to 2-3 sentences. Longer is fine when the context demands it (e.g., explaining why a refactor breaks consumers, or citing a previous fix's log entry). Shorter is fine when the subject is self-explanatory.

### Anchor every comment to a specific line

Inline review comments are the default in this repo, not top-level PR comments. Use the full file path and line number (or line range for multi-line context). The format the user sees:

```
**Inline N** at `<full file path>:<line>` (or `<start>-<end>` for ranges)

<conventional comment body>
```

### Top-level review body

Default to none. Only include a top-level body when there is a structural observation that does not belong on any single line, for example "this PR is stacked on #124 and cannot be reviewed in isolation" or "blocking on the public-API change and the missing integration test (inline)." Never write filler like "Inline comments below." or "See inline." That achieves nothing for the reader, costs them a click, and clutters the PR conversation.

If you have no structural observation, do not wrap the comments in a review. Post them as individual inline comments instead (see Phase 5).

### Decide decorations yourself, ask only when stuck

For each comment, decide whether a decoration is needed using the rubric in the previous section. The default is no decoration. Add `(blocking)`, `(non-blocking)`, or `(if-minor)` only when the comment's true severity is materially different from what the label alone implies.

If after applying the rubric you still cannot tell which decoration fits a comment, ask the user. Batch any asks into a single `AskUserQuestion` call (one question per still-ambiguous comment, up to four). Skip the ask entirely if every comment's decoration is already decided.

### Show the final draft

Present the decorated comments in order. End with: "Say 'post it' to submit as a single review on commit `<sha>`. Or tell me what to tweak."

## Verification Checklist

Before showing the final decorated draft to the user, run through this checklist. Use `TaskCreate` to add one task per item and `TaskUpdate` to mark it completed only after verification. Do not skip items. Do not batch-mark. If an item cannot be checked off honestly, the draft is not ready.

### Scope and intent

- [ ] **Author's other open PRs checked** for stacking. If multiple PRs exist and this one's diff is >30 files, confirmed it is not stacked on top of another branch.
- [ ] **PR title matches the diff's scope.** If the diff does more than the title promises, the out-of-scope work has been called out separately rather than silently reviewed.
- [ ] **Linked issue (if any) read in full.** Constraints from the issue ("no public-API changes", etc.) are reflected in the review.

### Sources of truth

- [ ] **Diff read in full, not skimmed.** For diffs over 35KB, read in chunks with offset/limit.
- [ ] **Each finding verified against the actual file at the actual line.** Open the file, read the line, confirm the issue exists. No findings based purely on sub-agent reports.
- [ ] **External API claims verified.** Any statement about behavior of dayjs, React, Intl, rrule, Tailwind, GitHub API, etc. has a WebFetch backing it, and the source is cited inline in the comment body when relevant.
- [ ] **Dev logs (`docs/logs/`) checked for previously-fixed bugs** that the PR might re-introduce.

### Comment quality

- [ ] **Every comment follows Conventional Comments format**: `<label>: <subject>` on one line, blank line, then optional body. Decorations added in a separate step (see below).
- [ ] **No em dashes anywhere.** `grep "—"` on the draft returns nothing.
- [ ] **No pleasantries or preamble.** No "well-scoped PR", "nice work", "tests pass" summaries. Top-level body is empty unless there is a structural observation.
- [ ] **Each comment is 2-3 sentences in the body.** Longer is fine when context demands it (citing a prior fix, explaining a breaking-change implication). No padding.
- [ ] **Every comment is anchored to a specific file path and line or line range.** No vague "somewhere in the recurrence module."
- [ ] **No false positives or weak observations.** If a finding is shaky, it is dropped, not softened. A 2-comment review beats an 8-comment review with 6 fluffy ones.
- [ ] **Variables and intermediates that aid readability are not suggested for removal** just because they create a TS narrowing tax or look "redundant."
- [ ] **Readability conventions checked.** Inline multi-clause conditions, multi-level ternaries, nested if/switch blocks, ternaries in JSX, and code that is hard to understand at a glance have been flagged where present.

### Decoration and approval

- [ ] **Decoration decided per comment.** Default is no decoration. Decorations added only where the comment's true severity differs materially from what its label suggests. User asked only for the still-ambiguous subset, batched into one `AskUserQuestion` call. Never silently self-decide `(blocking)`.
- [ ] **Final decorated draft shown to user.**
- [ ] **Explicit "post it" or equivalent approval received.** "Looks good" is not approval.
- [ ] **Commit SHA captured from `headRefOid`** ready to pass as `commit_id` in the API call.
- [ ] **Posting strategy chosen.** No filler top-level body. If there are no blocking comments and no real structural observation, individual inline comments are used instead of a review wrapper.

## Phase 5: Post (only after approval)

After explicit user approval, choose the posting strategy based on whether any comment is `(blocking)` and whether you have a real structural observation for a top-level body.

### Decision tree

1. **No blocking comments AND no structural observation.** Post each comment as an individual inline review comment via `POST /repos/{owner}/{repo}/pulls/{N}/comments`. No review wrapper, no top-level body, no clutter. Each comment stands on its own anchored to its line.

2. **At least one blocking comment.** Post a single `REQUEST_CHANGES` review via `POST /repos/{owner}/{repo}/pulls/{N}/reviews`. The top-level body must summarize what is blocking. Example: "Blocking on the public-API change in `types/index.ts:81` and the missing integration test." Never write filler like "Inline comments below."

3. **Non-blocking comments + a structural observation worth making.** Single `COMMENT` review. Top-level body is the structural observation only.

### Verify the API shape (once per session)

If you haven't fetched the docs this session, WebFetch `https://docs.github.com/en/rest/pulls/reviews` and confirm the request body. The verified shapes:

**Strategy 1 (individual inline comments), per comment:**

```json
{
  "commit_id": "<headRefOid>",
  "path": "<relative file path>",
  "line": <int>,
  "side": "RIGHT",
  "body": "<conventional comment body>"
}
```

For multi-line range, replace `line` with `start_line` + `line` + `start_side` + `side`.

Post each via:
```bash
gh api repos/<owner>/<repo>/pulls/<N>/comments -X POST --input /tmp/pr<N>-cmt-<i>.json
```

**Strategy 2 or 3 (review with comments):**

```json
{
  "commit_id": "<headRefOid>",
  "event": "REQUEST_CHANGES" | "COMMENT",
  "body": "<structural observation, never filler>",
  "comments": [
    { "path": "...", "line": 81, "side": "RIGHT", "body": "..." },
    { "path": "...", "start_line": 45, "start_side": "RIGHT", "line": 50, "side": "RIGHT", "body": "..." }
  ]
}
```

Post via:
```bash
gh api repos/<owner>/<repo>/pulls/<N>/reviews -X POST --input /tmp/pr<N>-review.json
```

Return the `html_url` from the response.

### One-off cases

- **Stacked-branch note** that applies the same to multiple PRs: write the body to a single file and `gh pr comment <N> --body-file <file>` per PR. Acceptable as a top-level comment because there is no specific line to anchor to.
- **Single comment on a linked issue**: `gh issue comment <N> --body-file <file>`.

## Project Context

- Repo: `kcsujeet/ilamy-calendar` (default).
- Branch hygiene: feature branches off `main`. PRs to `main`. Stacked branches are a recurring anti-pattern.
- Dev log hook: `.claude/hooks/check-dev-log.sh` blocks session exit when `src/` mtime is newer than today's `docs/logs/YYYY-MM-DD.md`. `git checkout` between branches updates mtimes as a side effect. If the hook fires after a review-only session, `touch docs/logs/<today>.md` (creating it with a brief "review-only" entry if absent) is enough.
- Tests run with `bun test`. CI is `bun run ci`.

## Example: a clean draft

For PR #122 (closes #121, adds now-line to horizontal grids):

```
**Inline 1** at `src/features/calendar/types/index.ts:81`

suggestion: Make `axis` optional rather than required.

Issue #121 explicitly states "No public-API changes." Optional gives the same UX (the library always passes the value), aligns with the issue's intent, and avoids a hard compile break for TS strict-mode consumers who construct the props as a literal. The component already defaults to `'vertical'` at `current-time-indicator.tsx:36`.

**Inline 2** at `src/components/horizontal-grid/horizontal-grid-events-layer.tsx:45-50`

issue: No integration test locks in the `gridType === 'hour'` gate.

Component-level tests verify axis behavior in isolation, but nothing asserts the indicator mounts here when `gridType === 'hour'` and not when `gridType === 'day'`. One render with `data-testid='current-time-indicator'` assertions per gridType would catch a future regression.
```

Apply the rubric: most comments stay un-decorated. For this PR, the public-API change in #1 may be `(blocking)` if the issue's "no public-API changes" constraint is authoritative; the missing test in #2 is `(blocking)` because untested gates regress silently. If those calls feel uncertain, batch them into one `AskUserQuestion`. Otherwise pick directly, show the final, and post.
