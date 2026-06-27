# Writing the draft (Conventional Comments)

Part of the code-review skill (`SKILL.md`). Covers Phase 4 (drafting) and the section G comment-quality checklist. Posting (Phase 5 + section H) lives in `posting.md`.

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

## Anchor every comment to a specific line

Inline review comments are the default in this repo, not top-level PR comments. Use the full file path and line number (or line range for multi-line context). The format the user sees:

```
**Inline N** at `<full file path>:<line>` (or `<start>-<end>` for ranges)

<conventional comment body>
```

## Top-level review body

Default to none. The body must add information that no inline comment carries. Two valid use cases:

- **Workflow / structural feedback.** "Thanks for creating the issues, much clearer what this PR fixes. Would have been better one PR per issue but fine for this time." Or "this PR is stacked on #124 and cannot be reviewed in isolation."
- **Required by the API.** GitHub's `REQUEST_CHANGES` and `COMMENT` review events both require a non-empty body. If you have no unique structural content, do not use a review wrapper at all. Post individual inline comments via `/pulls/{N}/comments` (`posting.md`, Strategy 1).

Things that are **not** valid top-level bodies, even though they look summary-shaped:
- "All 8 linked issues are closed and the locale-on-mount fix is a real bug fix." (Restates inlines + corporate filler.)
- "Blocking on the public-API change and the missing test." (Restates the inline's `(blocking)` decoration.)
- "Inline comments below." / "See inline." (Achieves nothing.)
- Anything that reads like a press release or movie-trailer voiceover.

If you cannot point at a sentence that says something no inline says, drop the body.

## Show the final draft

Present the decorated comments in order. End with: "Say 'post it' to submit as a single review on commit `<sha>`. Or tell me what to tweak."

## Section G checklist items this backs

- **Conventional Comments format.** `<label>: <subject>` on one line, blank line, then optional body. (Decorations added in section H.)
- **Literal `\n\n` between subject and body in the JSON.** A single space renders the whole comment as one paragraph on GitHub and merges subject into body. Confirmed by inspecting the JSON literally (and, after posting, by opening the review URL).
- **No em dashes anywhere.** `grep "—"` on the draft returns nothing (applies to your chat reply too).
- **No pleasantries, preamble, or movie-narration prose.** No "well-scoped PR", "nice work", "tests pass", "demonstrably", "a real X", or press-release sentences. Read aloud as a check.
- **Body length 2-3 sentences by default.** Longer only when context demands (citing a prior fix, a breaking-change implication). No padding.
- **Every comment anchored to a specific file path and line / range.** No vague "somewhere in the recurrence module."
- **No false positives or weak observations.** Shaky findings are dropped, not softened. A 2-comment review beats an 8-comment one with 6 fluffy. This is about **judgment-based** findings (a possible bug you can't confirm). It does NOT apply to a confirmed section-F readability violation (multi-line ternary, nested `if`, dense condition, etc.) — those are deterministic, never "weak", and are flagged or surfaced-and-asked, never dropped as idiomatic.
- **Each `suggestion` includes a brief reason.** "Drop this `useMemo`" → "Drop this `useMemo`. Empty deps and no component-scope inputs means it's a module constant in disguise."
- **Pattern sweep done.** For every flagged pattern (useless memo, manual locale helper, hardcoded label, a readability violation, etc.), the rest of the diff has been scanned for siblings and each flagged or confirmed absent.
- **Prior-review compliance checked.** If a previous review asked the author to remove/refactor pattern X and the new revision renamed or relocated it instead, that is flagged `(blocking)` with a link to the prior comment.
- **Layout / sizing changes simulated at narrow viewports.** For any diff touching CSS or Tailwind width/height/min/max, flex/grid, or positioning: computed per-column / per-cell usable width at 375px, 600px, 768px, 1024px, subtracted padding, confirmed content still renders readably at each. Removing a `min-w-*`/`min-h-*` floor without responsive view switching is the failure pattern. Numbers surfaced in the comment. (Mark n/a if the diff has no CSS/layout.)
- **Author intent treated as not equal to absence of bug.** Where the author defended a change as deliberate (description, commit, dev log, reply), separately asked "given they intended this, does the result actually work?" For layout / observable-behavior, did NOT mark resolved on author-claim alone; required a visual check in the running dev server OR a concrete numeric / step-by-step walkthrough.
