# Posting the review

Part of the code-review skill (`SKILL.md`). Covers Phase 5 (posting), the section H decoration/approval checklist, and a clean-draft example. Only reach here after every checklist gate PASSED and the user has said "post it".

## Section H checklist items this backs

- **Decoration decided per comment.** Default is no decoration. `nitpick`/`praise`/`note`/`question`/`thought` never get one. `suggestion`/`issue`/`todo`/`chore` get one only when true severity differs materially from the label and a reader could misread it (`(blocking)`, `(non-blocking)`, `(if-minor)`). Never silently self-assign `(blocking)`.
- **User asked only for the genuinely-ambiguous decorations**, batched into one `AskUserQuestion` call (one question per comment, up to four). Skipped the ask when severity was already clear or the user signaled it.
- **Final decorated draft shown to the user**, ending with: "Say 'post it' to submit as a single review on commit `<sha>`. Or tell me what to tweak."
- **Explicit "post it" or equivalent received** in the user's most recent message. "Looks good" / "okay" / stale approval do NOT count.
- **Commit SHA captured from `headRefOid`** ready to pass as `commit_id`.
- **Posting strategy chosen.** No filler top-level body. If there are no blocking comments and no real structural observation, use individual inline comments, not a review wrapper. "The API needs a body field" is not a reason to write a body — fall back to individual inline comments.

Only when every box is checked AND the user has said "post it" do you proceed.

## Mandatory approval-marker ritual

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

## Decision tree

The key question is **"does my top-level body say something the inlines do not already say?"** That decides the strategy, not the blocking status.

(All commands below must be chained with `touch .claude/state/pr-post-approved.flag &&` to pass the hook.)

1. **No body content beyond what's in the inlines.** Post each comment as an individual inline review comment via `POST /repos/{owner}/{repo}/pulls/{N}/comments`. No review wrapper, no top-level body, no clutter. Works whether or not any comment is `(blocking)`. The GitHub UI loses the "Changes requested" status flag, but each `(blocking)` decoration in the comment body still communicates severity.
2. **Real structural observation + blocking comments.** Single `REQUEST_CHANGES` review via `POST /repos/{owner}/{repo}/pulls/{N}/reviews`. Top-level body is the structural observation only. Do not summarize the inlines.
3. **Real structural observation + no blocking comments.** Single `COMMENT` review. Top-level body is the structural observation only.

## Verify the API shape (once per session)

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

## One-off cases

- **Stacked-branch note** that applies the same to multiple PRs: write the body to a single file and `gh pr comment <N> --body-file <file>` per PR. Acceptable as a top-level comment because there is no specific line to anchor to.
- **Single comment on a linked issue**: `gh issue comment <N> --body-file <file>`.

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
