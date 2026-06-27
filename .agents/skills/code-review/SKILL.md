---
name: code-review
description: Review a GitHub PR or local diff for the @ilamy/calendar repo. Drafts findings as Conventional Comments and waits for explicit approval before posting anything to GitHub. Use when the user says "review this PR", "review PR #N", "review my changes", or shares a PR link.
---

# Code Review

Review a pull request or local diff thoroughly, draft findings as Conventional Comments anchored to specific lines, and present the draft to the user. Never post to GitHub without explicit approval.

This file is the spine: the gate, the process hard rules, and the checklist. **Each checklist section points to a file in `references/` that holds the full detection detail, examples, remedies, and mechanical sweeps for that area. Open the matching reference file before working a section — the terse checkbox here is not the whole rule.**

## How this skill works — READ FIRST

This skill is a **checklist, not an agent dispatch.** There is no "Agent 1 / Agent 2 / Agent 3" that decides what matters, and there are no optional "nice to have" findings. **Every rule in this document (and its `references/`) is a Hard Rule, and every item in "The Checklist" below is mandatory.**

- The review is **complete only when you have personally verified and checked off every item in The Checklist.** Until then, the review is not done and you may not tell the user "looks good" / "all clear" / "ready to post."
- Use `TaskCreate` to create one task per checklist item, and `TaskUpdate` to mark each `completed` **only after** you have actually verified it against the diff and the files. Do not batch-mark. Do not mark an item done you didn't check.
- If an item genuinely does not apply (e.g. no layout changes in the diff), mark it done with a one-line note "n/a — no CSS/layout in diff." "Does not apply" is a verified conclusion, not a skip.
- If you cannot honestly check an item, **say so explicitly to the user** and treat the review as incomplete. Never hand-wave a box.
- **On review, you fan out one reviewer agent per reference file** (see "Agent fan-out" below). Each agent owns its checklist and returns a PASS/FAIL verdict with evidence; you (the orchestrator) own the binary gate, aggregate the verdicts, and assemble the draft. You must not rubber-stamp an agent's PASS on a deterministic section (readability, project-structure, conventions) without seeing the sweep output it ran. A PASS with no evidence is treated as FAIL, and you re-dispatch that agent.

## The review is one pass/fail gate — any single failed check fails the whole review

The Checklist is a set of independent checks grouped into sections (A–H). **Treat the review as a binary gate, not a score.** Each check has exactly two outcomes:

- **PASS** — you ran/verified it and it is clean, or it is a verified `n/a` ("n/a — no CSS/layout in diff").
- **FAIL** — it found an unaddressed violation, OR you could not (or did not) verify it.

**The entire review FAILS if even one check FAILS.** There is no "mostly passed," no "passed with minor notes," no averaging, no rounding up. One missed multi-line dense condition, one nested `if`, one un-run sweep, one un-opened file, one unverified external-API claim → the review verdict is **FAILED**, full stop. A review that overlooks a single deterministic violation is a failed review, not a 95%-good one.

Consequences of the gate:

- You may tell the user the review **PASSED** (or "clean" / "no findings" / "ready to post") **only when every check in every section has individually PASSED.** If any check failed, you must report the review as **FAILED** and name exactly which check(s) failed and why.
- A check that surfaced real findings is doing its job: that is still a FAILED gate until those findings are drafted (and, if the user asks, fixed and re-verified). "Found issues" is not "review done and good" — it is "review failed, here is the draft."
- A check you skipped, hand-waved, or trusted a subagent for is a FAIL by definition, exactly like a check that found a violation. "I didn't get to it" and "an agent said none" both fail the gate.
- Before reporting any verdict, restate the gate to yourself: *every* section A–H check is PASS. If you cannot say that for even one, the verdict is FAILED.

This binary gate is the whole point of the skill. The recurring failure mode is declaring a review clean while one deterministic check (a multi-line `&&` condition split one clause per line; a nested `if`; a switch) slipped through because a sweep was line-based or skipped. Under the gate, that single miss is not a footnote — it fails the review.

The phases below (Scope → Gather → Work the checklist → Draft → Post) are the order of operations. The Checklist is the definition of done, and the gate above is its verdict.

## The most important rule: YAGNI / simplest-form

**This is the highest-priority lens.** For every new construct in the diff (variable, branch, guard, helper, prop, param, option, type, default, wrapper, abstraction), ask: **"what breaks if I delete or collapse this?"** If the answer is "nothing, the behavior is identical," it is a finding. Apply it to type signatures too, not only runtime code. Full detail, the canonical examples, and the "verify claimed consistency, never assert a mirror" rule: **`references/yagni-simplest-form.md`**.

## Hard Rules (process and posting)

These govern how you run the review and how you post. Violating any is a defect. (The code-quality and readability Hard Rules live as checklist items / references below — they are equally non-negotiable.)

- **Never post to GitHub before the user says to post.** Showing the draft is not approval; "looks good" is not approval. Wait for explicit "post it" or equivalent.
- **Decide yourself whether a comment needs a decoration at all.** Most don't. Only ask the user about the choice of decoration (`blocking` vs `non-blocking` vs `if-minor`) for the small subset where one is actually needed AND severity is genuinely ambiguous. Never silently add `(blocking)` yourself.
- **Never use em dashes (—).** Use periods, commas, parentheses, or rewrite. The user has corrected this multiple times. This applies to the chat reply you send the user too, not only the posted comment.
- **Never add pleasantries or preamble.** No "well-scoped PR", "nice work", "tests pass" summaries. The inline comments speak for themselves. The reader can see the PR is well-scoped without being told.
- **No movie-narration prose. Plain language only.** Phrases like "demonstrably closed", "worth shipping on its own", "a real bug fix" are corporate filler the user has called "cringy" and "robotic". Direct: "fixes the bug", "right fix", "broken". Read the draft aloud. If it sounds like a press release, rewrite it.
- **Never add a top-level review body unless it says something the inline comments do not already say.** Even when the GitHub API requires a body (e.g. `REQUEST_CHANGES`), either the body adds unique structural context, or you skip the review wrapper and post individual inline comments via `/pulls/{N}/comments`.
- **Never make claims about external APIs from cached knowledge.** Before citing behavior of dayjs, rrule, React, Intl, Tailwind, or any other library, WebFetch the canonical docs and cite the source inline. Past sessions shipped fabricated method names.
- **Never make the review about pre-existing problems.** Flag them once briefly if they intersect the change, then move on. The PR author didn't write that code.
- **Never create follow-up commits on the user's behalf during review.** If the user asks for fixes after the review, make them but ask before committing.
- **Trust but verify.** When a sub-agent (or your own first pass) says "line 42 has a bug", open line 42 and confirm before putting it in the draft.
- **When you flag one instance of a pattern, scan the diff for the same pattern elsewhere.** If you call out a useless `useMemo` in one file, grep the diff for other `useMemo` blocks and check each.
- **Treat author defiance of a prior review as blocking.** If a prior review asked the author to remove/refactor pattern X and the new revision renamed or relocated it instead, that is still the same issue. Flag it as `(blocking)` and reference the prior review comment.
- **On re-review, fetch the comment thread first.** Run `gh api repos/<owner>/<repo>/pulls/<N>/comments` and read every reply since you last posted. Author replies change what counts as "open" vs "resolved"; project-owner replies are authoritative.

## References map

Open the file for the section you are working. Each holds the detection detail, examples, remedies, and sweeps.

| Area | File |
|---|---|
| Scope check + gathering the diff (Phase 0/1, checklist A & B) | `references/scope-and-gathering.md` |
| Bugs and correctness (checklist C) | `references/bugs-and-correctness.md` |
| YAGNI / simplest-form (the highest-priority lens, checklist D) | `references/yagni-simplest-form.md` |
| DRY and reuse (checklist D) | `references/dry-and-reuse.md` |
| Conventions, efficiency, tests, naming, comments (checklist E) | `references/conventions-and-quality.md` |
| Readability hard rules + mechanical sweeps (checklist F) | `references/readability.md` |
| Code placement / project structure (checklist F) | `references/project-structure.md` |
| Writing the draft, Conventional Comments (Phase 4, checklist G) | `references/writing-comments.md` |
| Posting, approval ritual, API shapes (Phase 5, checklist H) | `references/posting.md` |

## Agent fan-out — one agent per reference file

When the user says "review <something>", you do NOT work the checklist yourself top to bottom. You **dispatch a fleet of reviewer agents, one per reference file**, each of which verifies only its own checklist and returns a PASS/FAIL verdict. A fresh fleet runs on every review. You are the orchestrator: you gather the target, dispatch, aggregate, apply the binary gate, and assemble the draft. You never declare a verdict an agent did not earn.

Roster (agent name → reference file → checklist section):

| Agent (`subagent_type`) | Reference | Section |
|---|---|---|
| `code-review-scope` | scope-and-gathering.md | A, B |
| `code-review-bugs` | bugs-and-correctness.md | C |
| `code-review-yagni` | yagni-simplest-form.md | D |
| `code-review-dry` | dry-and-reuse.md | D |
| `code-review-conventions` | conventions-and-quality.md | E |
| `code-review-readability` | readability.md | F |
| `code-review-project-structure` | project-structure.md | F |
| `code-review-draft-quality` | writing-comments.md | G |
| `code-review-posting-gate` | posting.md | H |

(If a `code-review-*` subagent type is not registered in this session, fall back to dispatching a `general-purpose` agent whose prompt is "Act as the agent defined in `.agents/agents/<name>.md`" plus the target. The agent definitions are the source of truth either way.)

Three waves:

1. **Wave 1 — diff checkers (parallel).** After Phase 0/1 gathering, dispatch the seven diff-checking agents (`scope`, `bugs`, `yagni`, `dry`, `conventions`, `readability`, `project-structure`) **in a single message so they run concurrently.** Pass each the same target (PR number / "local diff main..HEAD" / saved diff path). Each returns the contract verdict.
2. **Wave 2 — draft quality.** Aggregate Wave 1 findings into the draft (`references/writing-comments.md`), then dispatch `code-review-draft-quality` with that draft to lint it (section G).
3. **Wave 3 — posting gate.** Only after the user says "post it", dispatch `code-review-posting-gate` to verify section-H preconditions, then post per `references/posting.md`.

**Aggregation and the gate.** Collect every agent's verdict.

- **The review PASSES only if every agent returned PASS.** If any agent returned FAIL, the whole review is **FAILED** (this is the same binary gate as above — each agent owns a slice of it).
- Report the per-agent verdict table to the user (agent → PASS/FAIL → one-line reason) so it is clear which checklist failed.
- A `PASS` with no evidence on a deterministic section, or an agent that did not run its sweeps, counts as FAIL — re-dispatch it.
- Every finding from a FAILed agent flows into the draft. "Some agents passed" never upgrades the verdict; one FAIL fails the review.
- If a deterministic-section agent is genuinely unsure whether a hit is a real violation or a documented over-match, it surfaces the hit and you ask the user — it is never silently dropped.

## Phases (order of operations)

- **Phase 0 — Scope check.** Stacked branches; title-vs-scope mismatch. See `references/scope-and-gathering.md`. (Owned by `code-review-scope`, but you may pre-check stacking before fan-out.)
- **Phase 1 — Gather the diff.** `gh pr view`/`gh pr diff`, save the diff, capture `headRefOid`. Pass the target to every agent.
- **Phase 2 — Fan out (Wave 1).** Dispatch the seven diff-checking agents in parallel; collect verdicts; apply the binary gate.
- **Phase 4 — Draft (Wave 2).** Assemble findings into Conventional Comments; lint with `code-review-draft-quality`. See `references/writing-comments.md`.
- **Phase 5 — Post (Wave 3).** Only after a fully-passed gate sequence AND explicit "post it"; verify with `code-review-posting-gate`. See `references/posting.md`.

## The Checklist

This is the definition of done. **No item is optional, and the review is a single pass/fail gate: every checkbox below must individually PASS or the whole review is FAILED** (see "The review is one pass/fail gate" above). Each section is owned and verified by its agent (see "Agent fan-out"); the agent reports PASS/FAIL per item with evidence, and you mark that section done only when its agent returns PASS. Create one `TaskCreate` task per agent/section; mark it `completed` only when that agent's verdict is PASS (or a justified `n/a`). You may not claim the review is complete, passed, or ready to post while any agent's verdict is FAIL or missing. Each section names its reference file (the agent's rule book) — the checkbox text is a summary, the reference is the rule.

### A. Scope and intent → `references/scope-and-gathering.md`

- [ ] **Author's other open PRs checked for stacking** (if >30 files, confirmed not stacked).
- [ ] **PR title matches the diff's scope** (out-of-scope work called out, not silently reviewed).
- [ ] **Linked issue (if any) read in full** and its constraints reflected.
- [ ] **(Re-reviews only) Existing comment thread fetched** and each prior comment's status reflects the latest reply.

### B. Sources of truth → `references/scope-and-gathering.md`

- [ ] **Diff read in full, not skimmed** (chunked for >35KB).
- [ ] **Each finding verified against the actual file at the actual line** (no subagent-only findings).
- [ ] **External API claims verified** with a WebFetch, cited inline.
- [ ] **Dev logs (`docs/logs/`) checked** for bugs the PR might re-introduce.

### C. Bugs and correctness → `references/bugs-and-correctness.md`

- [ ] **Logic bugs checked** (off-by-one, wrong operator, inverted conditions, stale state, wrong deps).
- [ ] **Leftover / dead code checked** (duplicate JSX, dead imports, unused threaded props, commented-out blocks).
- [ ] **Breaking changes checked** (shared components, prop shapes, removed/renamed exports; grepped importers).
- [ ] **Data-shape mismatches checked** (`as` hiding errors, `any` smuggling).
- [ ] **Edge cases checked** (empty/null/boundary; timezone via dayjs `timezone`, not bare `Intl`).
- [ ] **Regression of a previously-fixed bug checked** against `docs/logs/`.

### D. Simplification and DRY → `references/yagni-simplest-form.md`, `references/dry-and-reuse.md`

- [ ] **Reuse of existing code checked** (grepped shared packages + adjacent files before accepting anything new).
- [ ] **YAGNI / simplest-form checked (highest priority)** on every new construct, with the concrete simpler form.
- [ ] **Type signatures run through YAGNI** (`=> X | undefined` whose sink drops `''` narrows to `=> X`).
- [ ] **Claimed consistency verified by diffing signatures** (never assert a "mirror").
- [ ] **Repeated test setup checked** (→ `renderX(overrides?)` / builders).
- [ ] **Repeated inline checks / computations checked** (same value 3+ times → named const / hook).
- [ ] **Scope creep checked** (props on shared components for one caller; over-parameterization).
- [ ] **Over-engineering checked** (custom helper where a one-line library call does the same).
- [ ] **Useless `useMemo` checked** (empty deps / deps change every render), with the reason.
- [ ] **JSX / structure checked** (>30-line blocks, useless wrappers, template-literal classNames vs `cn()`).

### E. Code quality, conventions, and efficiency → `references/conventions-and-quality.md`

- [ ] **Project conventions enforced** (`.at()`, no `!`, `Boolean(x)`, no `any`, named exports, `cn()` named consts).
- [ ] **Efficiency checked** (unused work, missed/broken memoization, stale deps, redundant recompute).
- [ ] **Test coverage checked** (new prop/feature tested; brittle CSS-class asserts flagged; gating logic has an integration test).
- [ ] **Naming checked** (each file name uniquely identifies the file).
- [ ] **Helper functions have a verb prefix** (ran the verb sweep; `is`/`has`/`get`/`set`/`handle`).
- [ ] **Comments checked** (explain WHY, not WHAT; no task-narration; no `TODO` without a ticket).

### F. Readability hard rules → `references/readability.md` (control flow) + `references/project-structure.md` (placement)

Deterministic. **Run every mechanical sweep in those files yourself and read the output** — a subagent's "none" never satisfies these. Triage hits only against the documented over-match shapes; never drop a real hit as "idiomatic". If unsure, surface and ask.

- [ ] **All section-F sweeps run**, including the trailing-`&&`/`||` multi-line-condition sweep (the line-based sweep cannot see a condition split one clause per line).
- [ ] **No nested or multi-line ternaries** (only a single-level one-line ternary is allowed).
- [ ] **No dense inline conditions** (2+ clauses, on one line OR wrapped one clause per line) → named variables.
- [ ] **No nested `if` blocks; prefer maps over `switch`** (flag every `switch`).
- [ ] **No ternaries in JSX.**
- [ ] **No prop-drilling of context-provided values.**
- [ ] **Colocation + Bulletproof type-folders** (ran the misplaced-modules sweep; context/hook/util not under `components/`).
- [ ] **Package/feature boundaries** (shared code in `@ilamy/ui`/`@ilamy/utils`/`@ilamy/types`, not cross-imported internals).
- [ ] **No code the reader can't understand at a glance.**
- [ ] **Readability intermediates protected** (not removed just for a TS-narrowing tax).

### G. Comment quality (the draft itself) → `references/writing-comments.md`

- [ ] **Conventional Comments format** (`<label>: <subject>`, blank line, body).
- [ ] **Literal `\n\n` between subject and body in the JSON** (verified literally).
- [ ] **No em dashes anywhere** (`grep "—"` returns nothing, chat reply too).
- [ ] **No pleasantries, preamble, or movie-narration prose.**
- [ ] **Body length 2-3 sentences by default.**
- [ ] **Every comment anchored to a specific file path and line / range.**
- [ ] **No false positives or weak observations** (judgment-based only; never drop a confirmed section-F violation).
- [ ] **Each `suggestion` includes a brief reason.**
- [ ] **Pattern sweep done** (every flagged pattern's siblings checked across the diff).
- [ ] **Prior-review compliance checked** (renamed/relocated ≠ removed → `(blocking)`).
- [ ] **Layout / sizing changes simulated at narrow viewports** (375/600/768/1024px; numbers in the comment). (n/a if no CSS/layout.)
- [ ] **Author intent treated as not equal to absence of bug** (deliberate ≠ working; require a check).

### H. Decoration and approval → `references/posting.md`

- [ ] **Decoration decided per comment** (default none; never silently self-assign `(blocking)`).
- [ ] **User asked only for the genuinely-ambiguous decorations**, batched into one `AskUserQuestion`.
- [ ] **Final decorated draft shown to the user** with the "Say 'post it'…" closer.
- [ ] **Explicit "post it" or equivalent received** in the user's most recent message.
- [ ] **Commit SHA captured from `headRefOid`.**
- [ ] **Posting strategy chosen** (no filler top-level body).

Only when every box above PASSES AND the user has said "post it" do you proceed to post (`references/posting.md`).

## Project Context

- Repo: `kcsujeet/ilamy-calendar` (default).
- Branch hygiene: feature branches off `main`. PRs to `main`. Stacked branches are a recurring anti-pattern.
- Dev log hook: `.claude/hooks/check-dev-log.sh` blocks session exit when `src/` mtime is newer than today's `docs/logs/YYYY-MM-DD.md`. `git checkout` between branches updates mtimes as a side effect. If the hook fires after a review-only session, `touch docs/logs/<today>.md` (creating it with a brief "review-only" entry if absent) is enough.
- Tests run with `bun test`. CI is `bun run ci`.
