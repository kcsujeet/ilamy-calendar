# Review conventions: @ilamy/calendar

Read by the `project-conventions` gate of the kc-claude-kit `code-review:review-code` skill, as `.claude/review-conventions.md` (a symlink to this file, like the rest of `.claude/`). It holds only what is specific to this repo; the kit's built-in gates already cover naming, clarity, ternaries, structure, DRY/YAGNI/KISS and generic date handling.

The rules are stated once, in `AGENTS.md` and `.agents/rules/*.md`. Each section below points at its source rather than restating it; when the two disagree, the source wins and this file is what gets corrected.

## §K1. Calendar behavior follows the standard, and cites it

Anything a calendar already has a convention for (event boundaries, recurrence and overrides, all-day handling, drag across a resource axis, scrolling) follows RFC 5545 first, then FullCalendar, then Google Calendar. A deviation is a finding even when it is self-consistent and tested. New behavior of this kind must cite the RFC section, the FullCalendar docs or source, or Google's documented behavior; where no standard covers it, the diff says so and justifies the choice.

Source: `AGENTS.md` (Hard Rules, "match the established standard"). Canonical: the exclusive `end` rule in `packages/utils/src/helpers.ts` (`overlapsRange`, citing RFC 5545's non-inclusive DTEND, #248).

## §K2. Dates go through the configured dayjs

`dayjs` is imported from `@ilamy/utils/dayjs`, never from the `dayjs` package, and rrule's `datetime` is never used. Values are stored and passed as ISO strings, not `YYYY-MM-DD`. A string without an offset is anchored in the calendar's zone, and `Intl.DateTimeFormat` without the calendar's `timeZone` formats in the machine's zone, which is wrong here.

Source: `AGENTS.md` (Hard Rules, Code Rules > Dates), `docs/timezones.md`. Canonical: `packages/utils/src/dayjs.ts`.

## §K3. Shared code lives in the shared packages

A component used by more than one feature or package lives in `@ilamy/ui`, a shared helper in `@ilamy/utils`, a shared type in `@ilamy/types`. A plugin package reaches the host only through the public `@ilamy/calendar` API, never `@/features/...`. Widening `@ilamy/calendar`'s exports so another package can reuse an internal is a finding: the internal moves to the shared package instead. Before accepting a new helper, the diff was checked against the shared packages (`overlapsRange`, `safeDate`, `dayKey`, `cn`, the `@ilamy/ui` primitives).

Source: `.agents/rules/architecture.md`. Canonical: `packages/utils/src/helpers.ts`, `packages/plugins/drag-to-create/src/utils/read-cell.ts` (a plugin reading cells through the DOM contract, not core internals).

## §K4. House code style

`.at(0)`/`.at(-1)` over index access; no non-null `!`; `Boolean(x)` over `!!x`; no `any`; named exports only; a `cn(...)` condition with more than one clause is lifted into a named const. Helpers carry a verb prefix (`is`/`has` for predicates, `get` for values). When suggesting a fix for a ternary, do not propose a conditionally-built options object spread into a call (`{...(cond ? { a } : undefined)}`); the maintainer has rejected that shape.

Source: `.agents/rules/code-style.md`, `.agents/rules/coding-patterns.md`.

## §K5. Behavior changes carry unit and e2e tests, written first

A change to behavior has both a unit test, added to the existing co-located `*.test.ts(x)` (no new test files), and an e2e spec in `apps/e2e/tests/` that drives the real UI. Geometry, pointers and scrolling are e2e or they are unverified. Assertions are exact (`toBe(3)`, `toBeCloseTo(891, 0)`), never `toBeGreaterThan(0)`. Gating logic is tested both ways (mounts under the condition, not otherwise). The PR states that each fix was revert-proofed: putting the old line back fails a named test.

Source: `AGENTS.md` (Hard Rules, TDD, Browser testing), `docs/e2e-testing.md`. Canonical: `apps/e2e/tests/behaviour.spec.ts`.

## §K6. Repercussions were hunted

The diff names the meaning it changes and has swept for what depended on the old meaning: siblings in the same function, duplicated predicates in plugins that never used the shared helper, compensating clamps or `-1`/`+1` adjustments, tests pinning the old contract, and the JSDoc, `docs/` and website props table that describe it.

Source: `.agents/rules/change-impact.md`.

## §K7. The dev log is updated

A diff that touches `src/` adds or appends today's `docs/logs/YYYY-MM-DD.md` (changes, files, notes), and the directory keeps at most 10 files. Review also reads recent logs for a previously-fixed bug the diff re-introduces.

Source: `AGENTS.md` (Development Logs). Canonical: `docs/logs/`.

## §K8. Non-maintainer PRs link an issue

A PR by anyone other than `kcsujeet` links an issue (`Closes #N`, or `closingIssuesReferences`). Without one, that is the first finding, raised before the diff is reviewed.

Source: `.agents/rules/workflow.md`.

## §K9. File names are unique across the repo

A new file's name identifies it without its path (tabs, grep, stack traces show it bare). `day-header.tsx` deep under `views/` is too generic; `resource-week-horizontal-day-header.tsx` is the house form.

Canonical: `packages/calendar/src/features/calendar/components/views/resource-week-horizontal-day-header.tsx`.

## Posting in this repo

Not a gate; it applies when the user asks to post. Two PreToolUse hooks guard GitHub writes here, and both must pass:

- **This repo's hook** (`.claude/hooks/check-pr-post-approval.sh`) blocks any `gh` command that posts public content (PR and issue comments, reviews, `gh pr create`, `gh issue create`) unless the same Bash command contains `touch .claude/state/pr-post-approved.flag` before the `gh` part.
- **The kc-claude-kit code-review hook** blocks GitHub review writes (`gh pr comment`, `gh pr review`, `gh issue comment`, and `gh api` writes to comments or reviews) unless the command carries `KC_REVIEW_POST_APPROVED=1`. It does not cover `gh pr create` or issue creation, which is why this repo keeps its own hook.

Both markers are typed only after a fresh "post it" in the user's latest message. A review comment therefore needs both:

```bash
touch .claude/state/pr-post-approved.flag && KC_REVIEW_POST_APPROVED=1 gh api repos/kcsujeet/ilamy-calendar/pulls/<N>/comments -X POST --input <file>
```

Draft comments with `/code-review:post-review`, which validates each comment's file and line against the diff (`build-comment-payloads.sh`) and prints the exact commands to approve. Inline comments anchored to a line are the default; a top-level body is written only when it says something the inline comments do not.

## Gate checklist

- [ ] §K1 Calendar behavior with an existing convention follows RFC 5545, then FullCalendar, then Google Calendar, and the diff cites the source (or states that none covers it and justifies the choice). (N/A: no calendar-semantics behavior in diff)
- [ ] §K2 dayjs is imported only from `@ilamy/utils/dayjs`; no rrule `datetime`; ISO strings for storage and transmission; no `Intl.DateTimeFormat` without the calendar's `timeZone`. (N/A: no date handling in diff)
- [ ] §K3 No shared component, helper or type kept in a feature or plugin; no plugin import of `@/features/...`; no `@ilamy/calendar` export widened to share an internal; new helpers checked against the shared packages first. (N/A: no new module, export or cross-package import in diff)
- [ ] §K4 `.at()` over index access, no `!`, `Boolean(x)` over `!!x`, no `any`, named exports only, multi-clause `cn()` conditions named, verb-prefixed helpers; no fix suggested as a conditionally-built options spread. (N/A: no source code in diff)
- [ ] §K5 A behavior change has a unit test in the existing co-located test file and an e2e spec in `apps/e2e/tests/`; assertions are exact; gates are tested both ways; the PR states the revert proof. (N/A: no behavior change in diff)
- [ ] §K6 The changed meaning was swept for siblings, duplicated predicates, compensating adjustments, tests on the old contract, and stale JSDoc, docs and website props. (N/A: no behavior change in diff)
- [ ] §K7 A diff touching `src/` updates today's `docs/logs/` entry and keeps at most 10 log files; no previously-logged fix is re-introduced. (N/A: no `src/` change in diff)
- [ ] §K8 A non-maintainer PR links an issue. (N/A: author is `kcsujeet`, or the target is a local diff)
- [ ] §K9 Every new file name is unique in the repo and specific without its path. (N/A: no new files in diff)
