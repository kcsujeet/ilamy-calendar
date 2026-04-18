---
name: code-review
description: Review a GitHub PR or local diff for bugs, simplification opportunities, code quality issues, and efficiency problems. Present findings as a draft and wait for explicit approval before posting anything to GitHub. Use when the user says "review this PR", "review PR #N", "review my changes", or shares a PR link.
---

# Code Review

Review a pull request or local diff thoroughly and present findings as a draft. **Never post to GitHub without explicit user approval.**

## Phase 1: Gather the Diff

Determine the review target from the user's request:

- **PR number or URL** → `gh pr view <N> --json title,body,state,files,commits` + `gh pr diff <N>`
- **Local changes** → `git diff` (or `git diff main...HEAD` for branch changes)
- **Specific commit** → `git show <sha>`

If the diff is large (>35KB), save to a file and read it in chunks. Don't skim — actually read the changed lines.

Also read the surrounding context of any non-trivial change. A diff hunk alone often hides what was removed or why a field exists. Open the full file when the hunk touches shared components, context, or public APIs.

## Phase 2: Review in Parallel

Launch **three Explore agents concurrently** in a single message. Pass each agent the full diff so they work from the same source.

### Agent 1: Bugs & Correctness

Review for:
1. **Logic bugs**: off-by-one, wrong operator, inverted conditions, stale state
2. **Leftover code**: duplicate JSX from incomplete refactors (e.g., a component rendered both inside and outside a ternary), dead imports, unused props still being threaded through
3. **Breaking changes**: modified shared components, changed prop shapes, removed exports — check who else imports them
4. **Data shape mismatches**: API contract drift, type assertions that hide real errors
5. **Edge cases**: empty arrays, null/undefined, timezone issues (this codebase uses dayjs — verify ISO strings, not YYYY-MM-DD for storage)

### Agent 2: Simplification Opportunities

Review for:
1. **Scope creep**: props added to shared components for a single use case — should it live closer to the caller instead?
2. **Repeated inline checks**: the same condition (`x === 'y'`) appearing 10+ times — extract to a boolean const
3. **Over-parameterized components**: a component with 6+ props where 4 could be derived from context
4. **Duplicate computation** across sibling components — extract to a shared hook
5. **Template literal classNames** where `cn()` is the codebase convention
6. **JSX blocks** >30 lines that could be standalone components
7. **Useless wrapper divs** that duplicate parent styling

### Agent 3: Code Quality & Efficiency

Review for:
1. **Unnecessary work**: `useMemo` / loops / `getViewHours`-style calls that run in modes where the result is unused — guard with `if (!isActive) return []`
2. **Missed memoization**: inline object/callback creation inside `useMemo` deps that breaks child memoization
3. **Stale deps**: `visibleDays.map` (function ref) used in a dep array instead of `visibleDays`
4. **Redundant recomputation**: a value already derived by a shared hook being recomputed inline inside another memo (e.g., reconstructing `resourceBusinessHours` from `resources.map(...)` when the shared hook already memoizes it)
5. **Repeated call shapes inside a memo**: the same function call (`getViewHours({ referenceDate: X, businessHours, ... })`) appearing 2+ times with only one argument varying — extract to a `useCallback` and invoke it at each site
6. **Conditional memos that throw away cached work**: `useMemo(() => flag ? computeA() : computeB(), [...allDeps])` recomputes the combined dep set on every change and discards the inactive branch when `flag` flips. Split into two separate memos (each with narrower deps) + a tiny selector memo that picks between them
7. **Test coverage gaps**: new prop/feature added without tests, or tests that assert CSS classes (brittle in JSDOM)
8. **Naming**: file name doesn't match exported symbol. Names must be **self-describing** — you should be able to tell what the file/component/hook is for from the name alone, without reading its directory path. A file named `day-header.tsx` exporting `DayHeader` inside `resource-calendar/components/week-view/horizontal/` is **wrong** (too generic — "day header for what?") even though the path disambiguates. Use the full contextual name: `resource-week-horizontal-day-header.tsx` exporting `ResourceWeekHorizontalDayHeader`. Yes, this repeats words from the directory path — that's intentional. Names appear without path context in: IDE tab titles, grep results, import statements, error messages, stack traces. Rule: if the name doesn't uniquely identify the file across the whole codebase, add more context until it does.
9. **Unnecessary comments**: narrating what the code does, referencing the task, TODO markers without a ticket

## Phase 3: Triage

When agents return, filter findings:

- **Ship-blockers** (bugs, breaking changes, missing approvals): must fix
- **Strong recommendations** (repeated patterns, shared-component scope creep, useless abstractions): likely fix
- **Preferences** (style, naming debates): mention but don't belabor
- **Out of scope** (pre-existing issues not touched by this PR): note briefly, don't make it the review

Skip false positives silently. Don't pad the review.

## Phase 4: Present the Draft

Format the review in markdown, organized by severity:

```markdown
## PR #N Review: <title>

**Overall**: <one sentence — ship it / close to ship / needs work>

### Bugs
1. **<file:line>** — <what's wrong, why, suggested fix>

### Simplification
2. **<file:line>** — <what's over-engineered, suggested approach>

### Nitpicks
3. **<file:line>** — <minor preference>
```

End with: **"Want me to post this, or would you like to adjust anything?"**

## Phase 5: Post (only after approval)

After the user explicitly approves (not just "looks good" — "post it" or equivalent):

- **PR review comment**: `gh pr comment <N> --body-file <file>` for a single comment, or `gh pr review <N> --comment --body-file <file>`
- **Inline review comments** (per-line): use `gh api` with `/repos/{owner}/{repo}/pulls/{N}/comments` — rarely needed, prefer one consolidated comment
- **Issue comment on the linked issue**: `gh issue comment <N> --body-file <file>`

Always use `--body-file` with a HEREDOC or temp file — don't try to inline markdown with backticks and shell escaping.

## Hard Rules

- **NEVER post to GitHub before the user says to post.** A memory feedback rule exists on this codebase: "Never post PR reviews/comments without showing draft first." Same applies to issue comments.
- **NEVER create follow-up commits on the user's behalf during review.** If the user asks for fixes, make them but ask before committing.
- **NEVER suggest fixes you haven't verified**. If a memory or prior assumption says "file X does Y", open file X and confirm before putting it in the review.
- **NEVER make the review about pre-existing problems.** Flag them once, briefly, and move on. The PR author didn't write that code.
- **Trust but verify**: when an Explore agent says "line 42 has a bug," open line 42 and confirm before including it in the draft.
