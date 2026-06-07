---
name: release-new-version
description: Cut a new release of @ilamy/calendar — analyze commits since the last tag, suggest a semver bump, draft a CHANGELOG entry in the project's existing style, run the CI gate, commit, tag, push to origin, and create the GitHub release page (marked as `latest`). Pauses for the user to run `bun run release` (build + publish) interactively, then (on their signal) comments on every issue closed by the release and closes any still open. Use whenever the user says "release a new version", "cut a release", "ship v1.x", "bump the version", "prep a release", "publish the next version", "I just published X", "close the released issues", or anything that implies a new version should go out or a shipped version needs its issue follow-ups.
---

# Release a new version of @ilamy/calendar

You're shipping a new version of the `@ilamy/calendar` npm package. The flow is conservative on purpose: suggest, wait for approval, apply, wait for approval, push. The user handles the actual publish manually via `bun run release` (it needs an interactive login).

**Monorepo note.** This is a Bun-workspaces monorepo but **only `@ilamy/calendar` is published** (the other `@ilamy/*` packages are `private` and bundled into it). So:
- The shipped version lives in **`packages/calendar/package.json`**, not the root `package.json` (the root is private and versionless). Bump and read the version there.
- `CHANGELOG.md` and `docs/logs/` stay at the repo root.
- Publishing is a root command: **`bun run release`** = `build:lib` (build only `@ilamy/calendar`, bundling the internal packages) then `cd packages/calendar && bun publish` (honors `publishConfig.access` + runs prepack/postpack). `bun run release:dry` does the same with `--dry-run`.

**Why the pauses matter.** Recent git history shows version churn (`1.7.0` → `1.6.1` → `1.6.0` → `1.6.1`) from premature version bumps. Every step that writes to the tree, commits, tags, or pushes should be explicitly approved. It's cheap to pause and expensive to revert a tag.

## Phase 1 — Preflight

Do these in parallel and report anything wrong. Do not proceed if any check fails; tell the user and let them resolve it.

- `git branch --show-current` → must be `main` (releases land on main per recent history).
- `git status --short` → must be empty. If there are staged/unstaged changes, ask the user whether to commit, stash, or abort.
- `git fetch origin main` then `git rev-list --left-right --count origin/main...HEAD` → local must be **equal to or 0 ahead** of `origin/main`. If local is behind, pull first. If ahead, confirm with the user that the unpushed commits are intended for this release.
- `git describe --tags --abbrev=0` → capture the last release tag (e.g., `v1.6.1`). This is the baseline for the commit log and the changelog `compare` link.
- Read **`packages/calendar/package.json`** `version` field (NOT the root — it's private and versionless). Sanity-check it matches the last tag minus the `v` prefix. If they diverge (as happened with the `1.7.0` → `1.6.1` revert), surface the mismatch and ask the user what the correct baseline is before continuing.

Do **not** run `bun run ci` yet — save it for Phase 4 so we don't waste a clean build if the user doesn't like the version or the changelog.

## Phase 2 — Suggest a version bump

Goal: propose `patch`, `minor`, or `major` with evidence, and wait for the user's call.

1. `git log <last-tag>..HEAD --pretty=format:"%h %s"` — list every commit since the last tag.
2. Classify each commit by its conventional prefix:
   - `feat:` → minor
   - `fix:` / `perf:` → patch
   - `refactor:` / `chore:` / `docs:` / `test:` / `style:` → patch (internal-only; doesn't bump minor)
   - `!:` suffix anywhere, or `BREAKING CHANGE:` in body → major
3. The suggested bump is the **highest** level across all commits. Example: 5 `fix:` + 1 `feat:` → minor.
4. Present a short table to the user:

   ```
   Since v1.6.1 (7 commits):
     feat (1):  feat: add weekViewGranularity prop (#113)
     fix  (3):  fix: ..., fix: ..., fix: ...
     perf (1):  perf: ...
     chore(2):  chore: ..., chore: ...
   Suggested bump: minor → v1.7.0
   ```

5. Ask: *"Bump to v1.7.0 (minor), or different?"*. Wait for approval. If the user picks a different level, use their choice — don't argue.

**Edge cases to call out up front (don't fix silently):**
- A commit with no conventional prefix: show it to the user and ask how to classify.
- A `feat:` that looks trivial or a `fix:` that looks like a breaking change: flag it; the user decides.
- Zero commits since the last tag: stop, tell the user there's nothing to release.

## Phase 3 — Draft the CHANGELOG entry

Match the **existing format** in `CHANGELOG.md` exactly — the repo has a consistent style and downstream tooling/readers expect it.

### Entry template

```markdown
#### [vX.Y.Z](https://github.com/kcsujeet/ilamy-calendar/compare/vPREV...vX.Y.Z)

> DD Month YYYY

##### Features

- feat: <rewritten, user-facing description> ([`#N`](https://github.com/kcsujeet/ilamy-calendar/pull/N)) — Thanks [@handle](https://github.com/handle)!

##### Fixes

- fix: <rewritten, user-facing description> ([`#N`](https://github.com/kcsujeet/ilamy-calendar/pull/N))

##### Performance

- perf: <description>

##### Internal

- chore: <description>
```

### Rules

- **Sections, in this order, only if non-empty**: `Features`, `Fixes`, `Performance`, `Internal`. Skip empty sections entirely — don't render an empty `##### Performance` heading.
- **Section mapping**:
  - `feat:` → Features
  - `fix:` → Fixes
  - `perf:` → Performance
  - `chore:` / `refactor:` / `docs:` / `test:` / `style:` → Internal (but see "what to include" below)
- **Date**: today's date in UTC, formatted `D Month YYYY` (e.g., `19 April 2026`). Use `date -u "+%-d %B %Y"` — no leading zero on the day.
- **Compare link**: `https://github.com/kcsujeet/ilamy-calendar/compare/vPREV...vX.Y.Z`. Always include it, even if `vPREV` doesn't exist yet as a tag on GitHub — it'll render once pushed.
- **PR link format**: `([`#N`](https://github.com/kcsujeet/ilamy-calendar/pull/N))` — backticks around `#N`, trailing space before the parenthesis group.
- **Issue-closing**: if a PR body closes an issue, append `— Closes [`#M`](https://github.com/kcsujeet/ilamy-calendar/issues/M)`.
- **Contributor attribution**: for each PR, run `gh pr view <N> --json author,number`. If the author login is **not** `kcsujeet`, append `— Thanks [@<handle>](https://github.com/<handle>)!`. Don't thank the repo owner.
- **Bullet wording**: rewrite commit messages into user-facing prose. "feat: add prop X" → "feat: add `X` prop — lets consumers do Y". Read the PR/commit body for the why. Avoid internal jargon the user-facing audience won't parse. When the original commit message is already good, lifting it directly is fine.

### What to include vs. omit

- **Always include**: `feat`, `fix`, `perf` — these affect consumers.
- **Internal section**: include only things a library user might care about — dep upgrades, bundle-size wins, tooling that changes how contributors work (e.g., "Tailwind upgraded to v4.2.2"). **Omit**: test-only changes, doc-only changes not affecting the public surface, lint tweaks, dev-log updates. When in doubt, leave it out — a short section reads better than a noisy one.
- **Group duplicates**: if three commits all touch the same feature (e.g., iterating on a fix), consolidate into one bullet that describes the net outcome, with the PR link pointing at the merge PR.

### Present the draft and wait

Insert the new entry at the **top** of `CHANGELOG.md` (after the `### Changelog` preamble, before the previous release). Show the user the full draft entry (not a diff — a diff of a prepend is noisy). Ask: *"Changelog looks right? Any wording changes?"*. Wait for approval. Iterate until they're happy.

## Phase 4 — Run the CI gate

Only now run `bun run ci` (lint + type-check + test + build). If it fails, stop and surface the failure — do not bump the version or commit anything. The user fixes the failure, then re-runs the skill (Phase 1 will re-check state).

## Phase 5 — Apply the bump

In this order:

1. Edit **`packages/calendar/package.json`** to set `"version": "X.Y.Z"` (the published package — not the root). Don't use `npm version` — its default behavior creates its own commit and tag with a message you don't control, and the recent revert chaos suggests you want full control over the commit.
2. Write the new changelog entry into `CHANGELOG.md` (already drafted in Phase 3).
3. Update `docs/logs/YYYY-MM-DD.md` (today, per the project's mandatory dev-log rule) with a one-line summary: "**[release]**: Cut vX.Y.Z — <short summary of what's in it>".
4. Stage **only** these three files explicitly by name — never `git add -A`:
   ```
   git add packages/calendar/package.json CHANGELOG.md docs/logs/<today>.md
   ```
5. Commit with message exactly `X.Y.Z` (matching the project's existing release-commit style — see commits `1.6.0`, `1.6.1`, `1.7.0` in `git log`). No conventional prefix, no body, no co-author trailer (project CLAUDE.md forbids AI co-author trailers).
6. Tag: `git tag vX.Y.Z`. Lightweight tag, no `-a -m` — matches existing tag style in this repo unless `git tag -n <last-tag>` shows otherwise, in which case match that.

Show the user `git log -1 --stat` and `git tag --points-at HEAD` and ask: *"Ready to push `main` and tag `vX.Y.Z` to `origin`?"*. Wait for approval.

## Phase 6 — Push

On explicit approval:

```
git push origin main
git push origin vX.Y.Z
```

Two separate pushes. If either fails (e.g., non-fast-forward on `main` because someone pushed while you were drafting), stop immediately — **do not** use `--force`. Tell the user and let them resolve.

## Phase 7 — Create the GitHub release

Turn the pushed tag into a published release page on GitHub, marked as `latest`. This is public-facing, so follow the project's workflow rule: draft the body, get explicit approval, then post.

1. **Extract the release notes** from the changelog. Read the block you just added to `CHANGELOG.md`, starting **after** the `#### [vX.Y.Z](...)` heading (GitHub's title row already renders the version + compare link) and ending **before** the next `#### [v` heading (or EOF). Keep the `> DD Month YYYY` date line and the `##### Features` / `##### Fixes` / etc. sections verbatim.
2. **Write to a temp file**: `/tmp/release-notes-vX.Y.Z.md`. Don't inline the body as a CLI arg — shell quoting mangles backticks and newlines. A file is lossless.
3. **Show the body to the user** and ask: *"Post this as the vX.Y.Z release on GitHub and mark it latest?"* Wait for approval. Project rule (`.agents/rules/workflow.md`): never post public-facing content without explicit approval, even if the user has broadly opted-in to this skill.
4. **On approval**, create the release:
   ```
   gh release create vX.Y.Z \
     --repo kcsujeet/ilamy-calendar \
     --title "vX.Y.Z" \
     --notes-file /tmp/release-notes-vX.Y.Z.md \
     --latest \
     --verify-tag
   ```
   Notes:
   - `--latest` pins this release as the one GitHub's UI/npm badges/readme install snippets point at. Pass it explicitly — don't rely on `gh`'s auto-latest heuristic, because backport releases (e.g., a 1.5.3 after 1.6.0 exists) would otherwise lose the flag silently.
   - `--verify-tag` fails loudly if the tag didn't make it to the remote. Better than creating a release pointing at nothing.
   - No `--draft`. The user already approved the body in step 3; publishing a draft just means they have to click "Publish" again.
5. **Report the release URL** from `gh`'s output so the user can open it.

## Phase 8 — Hand off for publish

Only one manual step is left before the issue follow-ups:

```
Released vX.Y.Z. Remaining (manual):

  bun run release

  (from the repo root — builds @ilamy/calendar then publishes it; needs an
  interactive npm login, which is why this skill stops here)

Once published, say "published" (or similar) and I'll notify the issues
this release closes.
```

`bun run release` builds only `@ilamy/calendar` (bundling the private internal packages) and runs `bun publish` from `packages/calendar` — it honors `publishConfig.access: public` and the prepack/postpack scripts (which inject `sideEffects: false` and strip devDependencies). Tip: suggest `bun run release:dry` first to preview the tarball without uploading.

Do not offer to run `bun run release` yourself — it requires credentials you don't have. **Pause here.** Do not proceed to Phase 9 until the user confirms the publish landed; commenting "fixed in vX.Y.Z" on an issue before the package is on npm would be a lie to the reporter.

## Phase 9 — Notify closed issues

Triggered when the user confirms the publish succeeded (phrases like "published", "it's on npm", "done", "pushed to npm"). Comment on every issue that this release closes and close any still open — in a single approval gate, not per-issue.

### Find the issues

Collect issue numbers from two sources and deduplicate:

1. **The new CHANGELOG entry** — scan the block you wrote in Phase 3 for `Closes [`#N`](…/issues/N)` patterns. This is the canonical list.
2. **The commit range `<prev-tag>..<new-tag>`** — `git log <prev>..<new> --pretty=format:"%B"` then grep for `(Closes|Fixes|Resolves|closes|fixes|resolves) #\d+` in commit messages **and** in each referenced PR's body (`gh pr view <N> --json body`). Catches issues closed via a PR description that didn't make it verbatim into the changelog bullet.

For each number, check state with `gh issue view <N> --json state,title,number`:

- `CLOSED` (auto-closed when the PR merged): comment only, don't re-close.
- `OPEN` (PR reference didn't auto-link, or the fix landed via a commit not a PR): comment and close.

Skip numbers that resolve to pull requests, not issues. `gh issue view` on a PR number errors loudly — catch that and drop it.

### Comment template

Keep it short and human. No marketing copy, no emoji, no changelog repetition — the reporter can click through to the release page for details.

```
Fixed in vX.Y.Z — https://github.com/kcsujeet/ilamy-calendar/releases/tag/vX.Y.Z

Thanks for trying ilamy calendar! Feel free to open more issues any time.
```

The release URL must match the one `gh release create` printed in Phase 7 — don't reconstruct it manually and risk a typo.

### Single approval gate

Present the full plan in one message (issues + bodies + actions) and ask once. Example:

```
Ready to post on these 2 issues:

  #119 "Vertical ResourceCalendar: quarter-hour gridlines..." (currently CLOSED) — comment only
  #66  "Tooltips not localized" (currently OPEN) — comment + close

Comment body (same on all):

  Fixed in v1.6.2 — https://github.com/kcsujeet/ilamy-calendar/releases/tag/v1.6.2

  Thanks for trying ilamy calendar! Feel free to open more issues any time.

Post?
```

The project's workflow rule (`.agents/rules/workflow.md`) requires explicit approval before any public-facing post — one approval for the batch is fine since the body is identical and the user has seen the full list.

### Post on approval

For each issue, in sequence (small set, no benefit to parallel):

```
gh issue comment <N> --repo kcsujeet/ilamy-calendar --body "<template>"
# then, if the issue was OPEN:
gh issue close <N> --repo kcsujeet/ilamy-calendar
```

If `gh issue close` reports "already closed" (the auto-close landed between your state check and the close call), that's fine — keep going. If `gh issue comment` fails for a specific issue (e.g., the reporter deleted their account and the issue got locked), surface that one failure to the user and continue with the rest; don't abort the whole batch.

After the batch, report what landed:

```
Posted on #119, #66. Closed #66. All done.
```

## Failure modes to watch for

- **Tag already exists** (`git tag vX.Y.Z` fails): somebody already cut this version, or a previous attempt got halfway. Ask the user before using `-f`.
- **`packages/calendar/package.json` version doesn't match latest tag**: the canonical example is the recent `1.7.0` → reverted state. Flag it, ask what the true baseline is.
- **Unmerged PR references in the changelog**: the user closed a PR by rebasing/squashing. When you run `gh pr view <N>`, confirm the PR is `merged` (not `closed`). If it's `closed` without merging, don't credit it.
- **`bun run ci` is slow** (~60s+ for the full gate on this repo): run it in the background and keep drafting; don't block the user unnecessarily.
