---
name: code-review
description: Review a GitHub PR or local diff for the @ilamy/calendar repo. Drafts findings as Conventional Comments and waits for explicit approval before posting anything to GitHub. Use when the user says "review this PR", "review PR #N", "review my changes", or shares a PR link.
---

# Code Review

Review a pull request or local diff thoroughly, draft findings as Conventional Comments anchored to specific lines, and present the draft to the user. Never post to GitHub without explicit approval.

## How this skill works — READ FIRST

This skill is a **checklist, not an agent dispatch.** There is no "Agent 1 / Agent 2 / Agent 3" that decides what matters, and there are no optional "nice to have" findings. **Every rule in this document is a Hard Rule, and every item in "The Checklist" below is mandatory.**

- The review is **complete only when you have personally verified and checked off every item in The Checklist.** Until then, the review is not done and you may not tell the user "looks good" / "all clear" / "ready to post."
- Use `TaskCreate` to create one task per checklist item, and `TaskUpdate` to mark each `completed` **only after** you have actually verified it against the diff and the files. Do not batch-mark. Do not mark an item done you didn't check.
- If an item genuinely does not apply (e.g. no layout changes in the diff), mark it done with a one-line note "n/a — no CSS/layout in diff." "Does not apply" is a verified conclusion, not a skip.
- If you cannot honestly check an item, **say so explicitly to the user** and treat the review as incomplete. Never hand-wave a box.
- Subagents are optional research helpers only. On a large diff (>300 lines or >5 files) you may dispatch `Explore` agents in parallel to gather raw material faster, but **you own every checkbox**: a sub-agent's report is an unverified input you must confirm against the actual file before it can satisfy a checklist item. Agents never "do the review"; the checklist does.

The phases below (Scope → Gather → Work the checklist → Draft → Post) are the order of operations. The Checklist is the definition of done.

## Hard Rules (process and posting)

These govern how you run the review and how you post. Violating any is a defect. (The code-quality and readability Hard Rules live as checklist items in The Checklist — they are equally non-negotiable.)

- **Never post to GitHub before the user says to post.** Showing the draft is not approval; "looks good" is not approval. Wait for explicit "post it" or equivalent.
- **Decide yourself whether a comment needs a decoration at all.** Most don't. Only ask the user about the choice of decoration (`blocking` vs `non-blocking` vs `if-minor`) for the small subset where one is actually needed AND severity is genuinely ambiguous. Never silently add `(blocking)` yourself.
- **Never use em dashes (—).** Use periods, commas, parentheses, or rewrite. The user has corrected this multiple times. This applies to the chat reply you send the user too, not only the posted comment.
- **Never add pleasantries or preamble.** No "well-scoped PR", "nice work", "tests pass" summaries. The inline comments speak for themselves. The reader can see the PR is well-scoped without being told.
- **No movie-narration prose. Plain language only.** Phrases like "demonstrably closed", "worth shipping on its own", "a real bug fix", "the locale-on-mount fix is a real bug fix worth shipping" are corporate filler the user has called "cringy" and "robotic". Direct: "fixes the bug", "right fix", "broken". Read the draft aloud. If it sounds like a press release, rewrite it.
- **Never add a top-level review body unless it says something the inline comments do not already say.** Summary lines like "All N issues are closed and the X fix is correct" only restate inlines. Even when the GitHub API requires a body (e.g. `REQUEST_CHANGES`), the rule is: either the body adds unique structural context (workflow feedback, "this PR is stacked on #N"), or you skip the review wrapper entirely and post individual inline comments via `/pulls/{N}/comments`.
- **Never make claims about external APIs from cached knowledge.** Before citing behavior of dayjs, rrule, React, Intl, Tailwind, or any other library, WebFetch the canonical docs and cite the source inline. Past sessions shipped fabricated method names.
- **Never make the review about pre-existing problems.** Flag them once briefly if they intersect the change, then move on. The PR author didn't write that code.
- **Never create follow-up commits on the user's behalf during review.** If the user asks for fixes after the review, make them but ask before committing.
- **Trust but verify.** When a sub-agent (or your own first pass) says "line 42 has a bug", open line 42 and confirm before putting it in the draft.
- **When you flag one instance of a pattern, scan the diff for the same pattern elsewhere.** If you call out a useless `useMemo` in one file, grep the diff for other `useMemo` blocks and check each. If you call out a manual `Intl`-based helper, look for siblings. The user explicitly asked "look for other such options" when a single instance was flagged and other instances existed nearby.
- **Treat author defiance of a prior review as blocking.** If the prior review explicitly asked the author to remove or refactor pattern X, and the new revision renamed or relocated pattern X instead of removing it, that is still the same architectural issue. Flag it as `(blocking)` and reference the prior review comment.
- **On re-review, fetch the comment thread first.** Before triaging your prior findings against the new revision, run `gh api repos/<owner>/<repo>/pulls/<N>/comments` (or `gh pr view <N> --json reviews,comments`) and read every reply that arrived since you last posted. Author replies change what counts as "open" vs "resolved"; project-owner replies are authoritative. Don't trust the diff alone to tell you where prior comments stand.

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

## Phase 2: Work the Checklist

Create a task per item in The Checklist (`TaskCreate`) and work it top to bottom. For a large diff you may fan out `Explore` agents to collect candidate findings in parallel, but feed everything back through the checklist: every candidate is unverified until you open the file and confirm it, and every box is checked by you. Drafting (Phase 4) happens as you go; posting (Phase 5) happens only after the whole checklist is green AND the user approves.

## The Checklist

This is the definition of done. **No item is optional.** Create one `TaskCreate` task per checkbox; mark `completed` only after real verification; if an item does not apply to this diff, mark it done with a one-line "n/a — <reason>". You may not claim the review is complete or ready to post while any box is unchecked.

### A. Scope and intent

- [ ] **Author's other open PRs checked for stacking.** If multiple PRs exist and this one's diff is >30 files, confirmed it is not stacked on another branch (Phase 0).
- [ ] **PR title matches the diff's scope.** If the diff does more than the title promises, the out-of-scope work is called out separately rather than silently reviewed.
- [ ] **Linked issue (if any) read in full.** Constraints from the issue ("no public-API changes", "must work for X") are reflected in the review.
- [ ] **(Re-reviews only) Existing comment thread fetched.** Ran `gh api repos/<owner>/<repo>/pulls/<N>/comments` and read every reply (author and project owner) since the last posted review. Each prior comment's status (open / resolved / contested) reflects the most recent message in its thread, not just the diff state.

### B. Sources of truth

- [ ] **Diff read in full, not skimmed.** For diffs over 35KB, read in chunks with offset/limit.
- [ ] **Each finding verified against the actual file at the actual line.** Opened the file, read the line, confirmed the issue exists. No findings based purely on sub-agent reports.
- [ ] **External API claims verified.** Any statement about behavior of dayjs, React, Intl, rrule, Tailwind, GitHub API, etc. has a WebFetch backing it, cited inline in the comment body where relevant.
- [ ] **Dev logs (`docs/logs/`) checked for previously-fixed bugs** the PR might re-introduce. Don't trust the PR description; check the logs.

### C. Bugs and correctness

- [ ] **Logic bugs checked.** Off-by-one, wrong operator, inverted conditions, stale state, wrong dependency arrays.
- [ ] **Leftover / dead code checked.** Duplicate JSX from incomplete refactors, dead imports, props threaded through that aren't used, commented-out blocks.
- [ ] **Breaking changes checked.** Modified shared components, changed prop shapes, removed/renamed exports. Grepped for who imports them. Removing a field or making an optional field required on a public type is a breaking change even if the PR description says it isn't.
- [ ] **Data-shape mismatches checked.** API contract drift, type assertions (`as`) that hide real errors, `any` smuggling a wrong type through.
- [ ] **Edge cases checked.** Empty arrays, null/undefined, boundary values. Timezone: this codebase uses dayjs with a configured `timezone` prop; `Intl.DateTimeFormat` without a `timeZone` option formats in the system timezone, which is wrong here.
- [ ] **Regression of a previously-fixed bug checked** against `docs/logs/`.

### D. Simplification and DRY

DRY is a primary lens. When the same shape of code (test boilerplate, condition, JSX wrapper, setup block) appears 2-3+ times, propose extracting it. The goal is not zealous dedup (three similar lines can beat a premature abstraction), but identical shapes with no real variance get named once.

- [ ] **Repeated test setup checked.** Multiple tests with the same `render(<Provider>...<X/></Provider>)` boilerplate varying one prop → propose a `renderX(overrides?)` helper. Same for repeated event literals / datetime construction (`at(hour, minute)`, `buildEvent`).
- [ ] **Repeated inline checks / computations checked.** The same condition or derived value appearing 3+ times → extract to a named const or a shared hook (e.g. a repeated `locale = currentLocale || currentDate.locale()` pattern).
- [ ] **Scope creep checked.** Props added to shared components for a single caller's use case → should it live closer to the caller? Over-parameterized components (6+ props where some are derivable from context).
- [ ] **Over-engineering checked.** A custom utility/module where a one-line library call would do (e.g. `formatLocaleDate.ts` vs `dayjs.extend(localizedFormat)` + `format('LL')`). For **every new helper in the diff**, asked: "what does this do that the underlying library / plugin / standard token does not already do?" If the answer is "nothing meaningful", flagged for deletion. Verified equivalence before claiming it.
- [ ] **Useless `useMemo` checked.** Empty deps + no inputs from component scope (it's a module constant in disguise → hoist). Deps that change every render (cache never hits → drop, inline). Every "drop this memo" comment includes the reason ("empty deps", "deps change every render", "7 cheap ops").
- [ ] **JSX / structure checked.** JSX blocks >30 lines that should be standalone components; useless wrapper divs duplicating parent styling; template-literal classNames where `cn()` is the convention.

### E. Code quality, conventions, and efficiency

- [ ] **Project conventions enforced** (`.agents/rules/code-style.md`, `.agents/rules/coding-patterns.md`): `.at(0)`/`.at(-1)` over `[0]`/`[len-1]`; no `!` non-null assertions (use guards / optional chaining / defaults); `Boolean(x)` over `!!x`; no `any` (use `unknown` + guards, interfaces, generics); no `export default` (named only); `cn(...)` multi-clause conditions extracted to named consts.
- [ ] **Efficiency checked.** Unnecessary work (`useMemo`/loops running in modes where the result is unused → guard with early return); missed memoization (inline object/callback in deps breaking child memo); stale deps (function refs in dep arrays instead of underlying data); redundant recomputation of an already-memoized value; repeated call shapes inside a memo varying one arg (→ `useCallback`); conditional memos that recompute on every change (→ split into narrower-dep memos + selector).
- [ ] **Test coverage checked.** New prop/feature added without tests. Tests asserting CSS classes (brittle in JSDOM) flagged. Gating logic (e.g. `gridType === 'hour'`) has an integration test that the feature mounts under the condition and not otherwise.
- [ ] **Naming checked.** Each file name uniquely identifies the file across the whole codebase (names appear path-less in tabs, grep, stack traces). `day-header.tsx` deep under `features/calendar/components/views/` is too generic → `resource-week-horizontal-day-header.tsx`.
- [ ] **Helper functions have a verb prefix.** A function (declaration, arrow const, or object method) named with a bare noun phrase reads like a variable, not a callable. Flag `const samePattern = (...) =>`, `function weekdayKey(...)`, `presetLabel`, `refOf`, etc. Remedies: boolean predicates → `is`/`has` (`samePattern` → `isSamePattern`); value-returning helpers → `get` (`weekdayKey` → `getWeekdayKey`, `presetToRRule` → `getPresetRRule`, `refOf` → `getReferenceDate`); mutators/handlers → `set`/`handle`/`toggle`. NOT flagged: functions already led by a clear action verb (`detectPreset`, `resolveByweekday`, `parseNum`, `renderRow`), React components (PascalCase), and hooks (`use*`). Sweep for candidates (matches arrow-function consts and function declarations, not plain value consts): `while IFS= read -r f; do grep -nE '(const [a-z][A-Za-z0-9]+ = (async )?\(|function [a-z][A-Za-z0-9]+ *\()' "$f" | grep -vE '\b(is|has|get|set|should|can|handle|toggle|render|use|parse|resolve|detect|create|build|make|format|map|filter|find|compute|ensure|validate|normalize|to|on|with|add|remove|update|select|apply|run|init|load|save|read|write|sort|merge|wrap)[A-Z]' | sed "s|^|$f:|"; done < /tmp/srcfiles.txt` then read each hit and confirm it is a noun-phrase helper, not a plain value const or an already-verbed name the exclude list missed.
- [ ] **Comments checked.** No comments narrating WHAT the code does or referencing the current task; no `TODO` without a ticket. Comments explain WHY.

### F. Readability Hard Rules (scan every changed `.ts`/`.tsx`; flag on sight)

Exceptions for this whole section: shadcn-derived `ui/` primitives (kept in sync with upstream) and pre-existing code in files this PR did not modify (`git diff` against base to confirm). When you flag one instance, grep the rest of the diff for siblings and flag them together.

**These rules are deterministic, so you MUST verify each one with a self-run mechanical sweep over the changed files and read the output yourself. A subagent's "none" NEVER satisfies an item in this section.** (A real review missed three nested `if`s and shipped a "clean" verdict because it trusted an Explore agent's "rule: none" instead of running the grep. The agent is a candidate generator, not a verifier.) Eyeballing the diff is also not enough — run the commands. Build the file list once, then run every sweep against it:

```bash
# Changed, non-test, non-ui source files (the scan set for this whole section):
git diff --name-only origin/main..HEAD -- 'src/**/*.ts' 'src/**/*.tsx' | grep -vE '\.test\.|/ui/' > /tmp/srcfiles.txt

# Nested if/switch (the rule most often missed by agents): flags an `if` opened inside an already-open `if`.
while IFS= read -r f; do [ -f "$f" ] || continue; awk -v F="$f" '
  function indent(s){n=0;while(substr(s,n+1,1)=="\t")n++;return n}
  /^[ \t]*if[ \t]*\(/{ind=indent($0);for(d in o){if(o[d]&&d<ind){print F":"NR" nested if";break}}o[ind]=1;next}
  {ind=indent($0);for(d in o){if(d>=ind)o[d]=0}}' "$f"; done < /tmp/srcfiles.txt

# Multi-line ternary (line starting with ? or :) and single-line nested ternary (a ? b : c ?):
while IFS= read -r f; do [ -f "$f" ] || continue; grep -nE '^[[:space:]]*[?:][[:space:]]' "$f" | grep -vE '\?\.' | sed "s|^|$f:|"; grep -nE '\?[^?:]*:[^?:]*\?' "$f" | grep -vE '\?\.|https?:' | sed "s|^|$f:|"; done < /tmp/srcfiles.txt

# Dense multi-clause conditions (2+ &&/||) and JSX ternaries:
while IFS= read -r f; do [ -f "$f" ] || continue; grep -nE '(&&.*&&|\|\|.*\|\||&&.*\|\||\|\|.*&&)|\{[^}]*\?[^}]*<|\? *<[A-Z]' "$f" | grep -vE '^\s*(//|\*)' | sed "s|^|$f:|"; done < /tmp/srcfiles.txt

# Any switch statement (prefer a key-value map / lookup object, even a flat one):
while IFS= read -r f; do [ -f "$f" ] || continue; grep -nE '\bswitch[[:space:]]*\(' "$f" | sed "s|^|$f:|"; done < /tmp/srcfiles.txt

# Misplaced modules: a context/store/util/hook living under components/. Bulletproof
# organizes a feature BY TYPE (components/, contexts/, hooks/, types/, utils/), so a
# non-component module under components/ is almost always in the wrong folder. Run over
# ALL changed files (added ones too — git status for untracked), not just /tmp/srcfiles.txt.
git diff --name-only origin/main..HEAD -- 'src/**/*.ts' 'src/**/*.tsx' > /tmp/allchanged.txt
git ls-files --others --exclude-standard -- 'src/**/*.ts' 'src/**/*.tsx' >> /tmp/allchanged.txt
while IFS= read -r f; do [ -f "$f" ] || continue; case "$f" in
  */components/*)
    grep -q 'createContext(' "$f" && echo "$f: createContext() under components/ -> move to contexts/ (or stores/)"
    case "$f" in
      */index.ts) ;;                                   # re-export barrel: fine
      */components/*/use-*.ts|*/components/use-*.ts) echo "$f: hook under components/ -> move to hooks/" ;;
      *.ts) echo "$f: non-component .ts under components/ -> likely utils/ (helpers), types/, or contexts/" ;;
    esac ;;
esac; done < /tmp/allchanged.txt
```

Every hit is a candidate, not a confirmed finding: open the file at the line and confirm it actually violates the rule (the sweeps over-match — e.g. a single-line single-level ternary in an assignment, or `if (!(a && b))` which is one logical test, are NOT violations). The sweeps under-match too (the nested-`if` awk is indentation-based), so still read each changed file's control flow. The boxes below are checked only after you have run these and triaged the output yourself.

- [ ] **No nested or multi-line ternaries.** Nested = a ternary in either branch or the test (`a ? b : c ? d : e`, including single-line like `opts?.until ? 'until' : opts?.count ? 'count' : 'never'`). Multi-line = a single ternary the formatter wrapped across 2+ lines, even one level deep. Only a single-level ternary that fits on one line is allowed (`isActive ? 'on' : 'off'`). Remedies: nested/value-selecting → `if`/`else if`/`else` or an early-return guard with a named result var; value-or-`undefined` prop → precomputed named const or `if` assignment (NOT `cond && value`, which yields `false`); className `cond ? 'class' : ''` → `cond && 'class'` in `cn(...)`; fixed value-per-key → module-level lookup object.
- [ ] **No dense inline conditions; use named variables.** Flag (a) multi-clause conditions (2+ `&&`/`||`/comparison clauses) inline in an `if`, `&&` JSX gate, ternary test, `return`, or `cn(...)` — e.g. `if (!event?.id || !updates || Object.keys(updates).length === 0)`; (b) array-method predicates (`.find`/`.filter`/`.some`/`.every`/`.findIndex`/`.map`) whose arrow packs computation + comparison + another clause — e.g. `(e) => (e.uid || \`${e.id}@ilamy.calendar\`) === targetUid && e.rrule && !e.recurrenceId`; (c) any single expression that takes more than a couple seconds to parse. Remedy: lift each sub-expression into a named `const`/`let` (or convert a one-expression arrow into a block with named locals + `return`) — `const hasNoUpdates = ...`, `const belongsToSeries = ...`, then `return belongsToSeries && isBaseSeries`. A truthiness clause used as a boolean becomes `Boolean(x)`. NOT flagged: single-clause conditions (`if (isOpen)`, `day.isToday && <X/>`), and an OR-chain that reads as one concept inside a named function / `Boolean(...)` (e.g. `Boolean(event.rrule || event.recurrenceId || event.uid)`).
- [ ] **No nested `if` blocks; prefer maps over `switch`.** An `if` inside an `if` → flatten with early-return guards or named guard variables. Flag **any** `switch` statement (not only nested ones): a `switch`-on-value should be a key-value lookup object (a `Record`/map), even a flat one. When the cases produce argument-dependent values, map keys to builder functions (`Partial<Record<Key, (arg) => Value>>`) and look up + invoke: `MAP[key]?.(arg) ?? fallback`. The map reads as data and has no fall-through footguns. (Genuine exhaustive `switch` over a discriminated union where each branch returns is the rare tolerable case; default to a map unless that exhaustiveness check is the point.)
- [ ] **No ternaries in JSX.** `{cond ? <A/> : <B/>}` → an early return for one branch, two `{cond && <A/>}` gates, or a value lifted to a named const above the `return` (`{isEdit ? t('a') : t('b')}` → `const label = isEdit ? t('a') : t('b')` then `{label}`).
- [ ] **No prop-drilling of context-provided values.** If a callee can read a value from a context it already consumes (`useSmartCalendarContext`, `useEffectiveBusinessHours`, etc.) but instead takes it as a prop/arg callers plumb through → have it read context directly. Same for refs, settings, callbacks. Tests can wrap the callee in a minimal provider.
- [ ] **Colocation + Bulletproof type-folders.** Verified with the misplaced-modules sweep above, not by eyeballing. A component's test sits next to it (`foo.tsx` + `foo.test.tsx`); shared code sits at the lowest common ancestor; a feature-specific util moved into a global `lib/` is questioned. **Within a feature/package, code is organized BY TYPE** — `components/`, `contexts/` (or `stores/`), `hooks/`, `types/`, `utils/` — mirroring `packages/calendar/src/features/calendar/`. A context/store, a pure helper, or a hook dumped inside `components/<name>/` is a defect, not colocation: a context belongs in `contexts/`, a `createContext()` module is never under `components/`; a pure helper (e.g. `recurrence-presets.ts`) belongs in `utils/` next to its siblings; a `use-*` hook belongs in `hooks/`. The `components/<name>/` folder holds only that component group and its sub-components. Confirm each new/moved file landed in the type-correct folder; flag any the sweep surfaced. (Reference: Bulletproof React project-structure doc, "organize by type within a feature, don't deeply nest.")
- [ ] **Package/feature boundaries (shared code lives in shared packages).** Per `.agents/rules/architecture.md`: a component used by more than one feature or package belongs in `@ilamy/ui` (shared helpers in `@ilamy/utils`, shared types in `@ilamy/types`), not in a feature folder or a plugin package that another consumer imports from. Flag (a) a plugin package importing the core's `@/features/...` internals instead of the public `@ilamy/calendar` API; (b) the core's public API being widened (a new `export` from `@ilamy/calendar`) just so another package can reuse an internal component/helper, when the right move is to relocate that piece to `@ilamy/ui`/`@ilamy/utils`; (c) the same component/logic duplicated or cross-imported between two features/packages. When the diff exports something new from a feature/core package for a sibling package to consume, ask "should this live in `@ilamy/ui` instead?"
- [ ] **No code the reader can't understand at a glance.** A changed line that takes more than a couple seconds to parse is a defect, not cleverness. A comment explaining WHAT is a smell; rewrite (named vars, smaller functions) instead of annotating.
- [ ] **Readability intermediates protected.** Variables/intermediates that aid readability are NOT suggested for removal just because they create a TS-narrowing tax or look "redundant."

### G. Comment quality (the draft itself)

- [ ] **Conventional Comments format.** `<label>: <subject>` on one line, blank line, then optional body. (Decorations added in section H.)
- [ ] **Literal `\n\n` between subject and body in the JSON.** A single space renders the whole comment as one paragraph on GitHub and merges subject into body. Confirmed by inspecting the JSON literally (and, after posting, by opening the review URL).
- [ ] **No em dashes anywhere.** `grep "—"` on the draft returns nothing (applies to your chat reply too).
- [ ] **No pleasantries, preamble, or movie-narration prose.** No "well-scoped PR", "nice work", "tests pass", "demonstrably", "a real X", or press-release sentences. Read aloud as a check.
- [ ] **Body length 2-3 sentences by default.** Longer only when context demands (citing a prior fix, a breaking-change implication). No padding.
- [ ] **Every comment anchored to a specific file path and line / range.** No vague "somewhere in the recurrence module."
- [ ] **No false positives or weak observations.** Shaky findings are dropped, not softened. A 2-comment review beats an 8-comment one with 6 fluffy.
- [ ] **Each `suggestion` includes a brief reason.** "Drop this `useMemo`" → "Drop this `useMemo`. Empty deps and no component-scope inputs means it's a module constant in disguise."
- [ ] **Pattern sweep done.** For every flagged pattern (useless memo, manual locale helper, hardcoded label, a readability violation, etc.), the rest of the diff has been scanned for siblings and each flagged or confirmed absent.
- [ ] **Prior-review compliance checked.** If a previous review asked the author to remove/refactor pattern X and the new revision renamed or relocated it instead, that is flagged `(blocking)` with a link to the prior comment.
- [ ] **Layout / sizing changes simulated at narrow viewports.** For any diff touching CSS or Tailwind width/height/min/max, flex/grid, or positioning: computed per-column / per-cell usable width at 375px, 600px, 768px, 1024px, subtracted padding, confirmed content still renders readably at each. Removing a `min-w-*`/`min-h-*` floor without responsive view switching is the failure pattern. Numbers surfaced in the comment. (Mark n/a if the diff has no CSS/layout.)
- [ ] **Author intent treated as not equal to absence of bug.** Where the author defended a change as deliberate (description, commit, dev log, reply), separately asked "given they intended this, does the result actually work?" For layout / observable-behavior, did NOT mark resolved on author-claim alone; required a visual check in the running dev server OR a concrete numeric / step-by-step walkthrough.

### H. Decoration and approval

- [ ] **Decoration decided per comment.** Default is no decoration. `nitpick`/`praise`/`note`/`question`/`thought` never get one. `suggestion`/`issue`/`todo`/`chore` get one only when true severity differs materially from the label and a reader could misread it (`(blocking)`, `(non-blocking)`, `(if-minor)`). Never silently self-assign `(blocking)`.
- [ ] **User asked only for the genuinely-ambiguous decorations**, batched into one `AskUserQuestion` call (one question per comment, up to four). Skipped the ask when severity was already clear or the user signaled it.
- [ ] **Final decorated draft shown to the user**, ending with: "Say 'post it' to submit as a single review on commit `<sha>`. Or tell me what to tweak."
- [ ] **Explicit "post it" or equivalent received** in the user's most recent message. "Looks good" / "okay" / stale approval do NOT count.
- [ ] **Commit SHA captured from `headRefOid`** ready to pass as `commit_id`.
- [ ] **Posting strategy chosen.** No filler top-level body. If there are no blocking comments and no real structural observation, use individual inline comments, not a review wrapper. "The API needs a body field" is not a reason to write a body — fall back to individual inline comments.

Only when every box above is checked AND the user has said "post it" do you proceed to Phase 5.

## Phase 4: Draft (Conventional Comments)

Follow the [Conventional Comments](https://conventionalcomments.org/) format strictly.

**Format:**

```
<label> [decoration]: <one-line subject>

<optional body, 2-3 sentences default>
```

**A blank line between subject and body is mandatory.** GitHub renders the entire JSON `body` field as markdown; a missing blank line collapses everything into one paragraph and visually merges the subject with the body. When you write the JSON, that means two `\n` characters: `"body": "praise: Right fix.\n\nuseRef(locale) matched the prop..."`. The single-`\n` form `"praise: Right fix. useRef(locale) matched..."` is broken even when it looks correct in your draft preview, because the chat preview folds whitespace.

Subject ends with a period. No em dashes anywhere.

**Right:**
```json
"body": "praise: Right fix.\n\nuseRef(locale) matched the prop immediately on mount, so the effect skipped and dayjs.locale() never ran. useRef(undefined) forces the first run."
```

**Wrong (renders as one paragraph, subject merges into body):**
```json
"body": "praise: Right fix. useRef(locale) matched the prop immediately on mount, so the effect skipped and dayjs.locale() never ran."
```

This is the failure mode you've shipped most recently. The subject and body looked separated in your draft preview but the JSON had a single space, not `\n\n`. Always check the JSON literally.

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

### Anchor every comment to a specific line

Inline review comments are the default in this repo, not top-level PR comments. Use the full file path and line number (or line range for multi-line context). The format the user sees:

```
**Inline N** at `<full file path>:<line>` (or `<start>-<end>` for ranges)

<conventional comment body>
```

### Top-level review body

Default to none. The body must add information that no inline comment carries. Two valid use cases:

- **Workflow / structural feedback.** "Thanks for creating the issues, much clearer what this PR fixes. Would have been better one PR per issue but fine for this time." Or "this PR is stacked on #124 and cannot be reviewed in isolation."
- **Required by the API.** GitHub's `REQUEST_CHANGES` and `COMMENT` review events both require a non-empty body. If you have no unique structural content, do not use a review wrapper at all. Post individual inline comments via `/pulls/{N}/comments` (Phase 5, Strategy 1).

Things that are **not** valid top-level bodies, even though they look summary-shaped:
- "All 8 linked issues are closed and the locale-on-mount fix is a real bug fix." (Restates inlines + corporate filler.)
- "Blocking on the public-API change and the missing test." (Restates the inline's `(blocking)` decoration.)
- "Inline comments below." / "See inline." (Achieves nothing.)
- Anything that reads like a press release or movie-trailer voiceover.

If you cannot point at a sentence that says something no inline says, drop the body.

### Show the final draft

Present the decorated comments in order. End with: "Say 'post it' to submit as a single review on commit `<sha>`. Or tell me what to tweak."

## Phase 5: Post (only after approval AND a fully-checked checklist)

After explicit user approval, choose the posting strategy based on whether any comment is `(blocking)` and whether you have a real structural observation for a top-level body.

### Mandatory approval-marker ritual

The repo enforces this with a PreToolUse hook on Bash (`.claude/hooks/check-pr-post-approval.sh`). Any `gh` command that posts public-facing content (`gh api .../pulls/.../{comments,reviews} -X POST`, `gh pr {comment,review,create}`, `gh issue {comment,create}`) is blocked unless the same Bash command contains the literal substring `touch .claude/state/pr-post-approved.flag` (in the same chain, before the gh part).

The hook exists because the recurring failure mode is interpreting stale or implied approval as fresh. PreToolUse hooks fire BEFORE the Bash command runs, so a file-mtime check can't see the chained touch. Instead the hook scans the command text for the ritual, which makes approval an explicit, deliberate, auditable thing typed inline.

**Rules:**
- The phrase "post it" (or unambiguous equivalent: "send it", "go ahead", "ship it") in the user's most recent message is approval. Anything older has expired. "Okay", "looks good", and "sounds right" do not approve posting on their own.
- Chain `touch` and the `gh` post in a single Bash command so the touch is part of the same auditable invocation:
  ```bash
  touch .claude/state/pr-post-approved.flag && gh api repos/<owner>/<repo>/pulls/<N>/comments -X POST --input /tmp/pr<N>-cmt-1.json
  ```
- Each separate Bash invocation that posts needs its own inline `touch`. The hook does not remember state between calls; that is intentional.
- If the hook blocks you, **stop and re-confirm with the user**. Do not touch the marker out of band to bypass the hook (it would not work anyway because the hook looks at the command text, not the file). The hook is the last line of defense against the bug it was built to prevent.

### Decision tree

The key question is **"does my top-level body say something the inlines do not already say?"** That decides the strategy, not the blocking status.

(All commands below must be chained with `touch .claude/state/pr-post-approved.flag &&` to pass the hook.)

1. **No body content beyond what's in the inlines.** Post each comment as an individual inline review comment via `POST /repos/{owner}/{repo}/pulls/{N}/comments`. No review wrapper, no top-level body, no clutter. Works whether or not any comment is `(blocking)`. The GitHub UI loses the "Changes requested" status flag, but each `(blocking)` decoration in the comment body still communicates severity.
2. **Real structural observation + blocking comments.** Single `REQUEST_CHANGES` review via `POST /repos/{owner}/{repo}/pulls/{N}/reviews`. Top-level body is the structural observation only. Do not summarize the inlines.
3. **Real structural observation + no blocking comments.** Single `COMMENT` review. Top-level body is the structural observation only.

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
touch .claude/state/pr-post-approved.flag && gh api repos/<owner>/<repo>/pulls/<N>/comments -X POST --input /tmp/pr<N>-cmt-<i>.json
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
touch .claude/state/pr-post-approved.flag && gh api repos/<owner>/<repo>/pulls/<N>/reviews -X POST --input /tmp/pr<N>-review.json
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
