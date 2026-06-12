# v2 Overhaul — Phase 0: Cheap Wins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the zero-risk deletions and type tightenings from the v2 overhaul master plan
(`docs/v2-overhaul-plan.md`, Phase 0): derive the `Translations` type from the dictionary,
delete six verified-dead code surfaces, and ship the v2 breaking type fixes
(`Record<string, any> → unknown`, drop unused `Resource.position`) with migration entries.

**Architecture:** Pure subtraction plus type derivation. No new behavior anywhere, so the TDD
exception for deletions applies (you cannot write a failing test for code that should not
exist); the regression net is the full suite + type-check + build after every task. The one
ordering constraint: the `Translations` derivation reverses an import (today `default.ts`
imports the type from `types.ts`; afterwards `types.ts` imports the value from `default.ts`).

**Tech Stack:** TypeScript, bun, bunup, biome. Run everything from the repo root.

**Verification commands used throughout** (expected outputs given per step):

```bash
bun run type-check     # expect: exits 0, no errors
bun run test           # expect: "0 fail" in every package section
bun run build          # expect: exits 0 (needed when ui entries or public types change)
bun run check:fix      # biome lint+format; expect: no errors (warnings pre-exist)
```

---

### Task 1: Branch setup

**Files:** none

- [ ] **Step 1: Create the feature branch**

```bash
git checkout main && git pull origin main && git checkout -b feat/v2-phase0-cheap-wins
```

- [ ] **Step 2: Confirm a green baseline**

Run: `bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: `0 fail` for both `@ilamy/calendar-recurrence` and `@ilamy/calendar`. If the
baseline is red, STOP and report — do not start on a broken main.

---

### Task 2: Derive `Translations` from `defaultTranslations`

Deletes the hand-maintained 94-key interface mirror. The type becomes derived, so adding a
translation key in `default.ts` automatically updates the type.

**Files:**
- Modify: `packages/calendar/src/lib/translations/default.ts:1-3`
- Modify: `packages/calendar/src/lib/translations/types.ts` (whole file shrinks to ~6 lines)
- Append: `docs/migration-v2.md` (interface → type alias note)

- [ ] **Step 1: Remove the annotation (and with it the circular dependency) from `default.ts`**

Replace lines 1-3:

```ts
import type { Translations } from './types'

export const defaultTranslations: Translations = {
```

with:

```ts
export const defaultTranslations = {
```

and at the very end of the file, change the closing `}` of the object literal to:

```ts
} satisfies Record<string, string>
```

(`satisfies` keeps "every value is a string" checking that the old annotation provided,
without fixing the key set to a separate interface.)

- [ ] **Step 2: Replace the interface in `types.ts` with the derived type**

Replace the ENTIRE content of `packages/calendar/src/lib/translations/types.ts` with:

```ts
import { defaultTranslations } from './default'

/** All translation keys, derived from the canonical English dictionary in `default.ts`. */
export type Translations = Record<keyof typeof defaultTranslations, string>

export type TranslationKey = keyof Translations
export type TranslatorFunction = (key: TranslationKey | string) => string
```

`TranslationKey` and `TranslatorFunction` keep their exact current shapes; only the
`Translations` interface body (94 hand-written keys) is deleted.

- [ ] **Step 3: Verify nothing depended on the interface-ness**

Run: `bun run type-check`
Expected: exits 0. Known consumers (verified): `src/index.ts:41` (public re-export),
`features/calendar/types/index.ts`, both provider/engine/smart-context files, and the engine
test — all use `Translations` as an annotation or `keyof Translations`, which work identically
with a type alias.

Run: `bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: `0 fail` everywhere (translation behavior is pinned by existing i18n tests).

- [ ] **Step 4: Append the migration note to `docs/migration-v2.md`**

Insert a new section immediately BEFORE the `## Summary checklist` heading:

```markdown
## Type tightening (v2 structure overhaul, Phase 0)

### `Translations` is now a derived type alias, not an interface

`Translations` is now `Record<keyof typeof defaultTranslations, string>`. Annotating your
translation objects keeps working unchanged. The only break: `declare module` augmentation
that merged extra keys into the `Translations` interface no longer compiles — pass a
`translator` function for custom keys instead.
```

- [ ] **Step 5: Commit**

```bash
git add packages/calendar/src/lib/translations docs/migration-v2.md
git commit -m "refactor(i18n): derive Translations type from defaultTranslations dictionary"
```

---

### Task 3: Delete dead month-view types + the unread `dayMaxEvents` prop thread

`MonthView` destructures no props; `MonthViewProps`, `SelectedDayEvents` (the live one is in
`all-events-dialog.tsx`), `MultiDayEventPosition`, and `EventMap` in `month-view/types.ts`
are dead (verified: the only import of this file is `month-view.tsx` taking `MonthViewProps`).

**Files:**
- Delete: `packages/calendar/src/features/calendar/components/month-view/types.ts`
- Modify: `packages/calendar/src/features/calendar/components/month-view/month-view.tsx:8,10`
- Modify: `packages/calendar/src/features/calendar/components/ilamy-calendar.tsx:28-36`

- [ ] **Step 1: Detach `month-view.tsx` from the dead types**

Remove line 8 (`import type { MonthViewProps } from './types'`) and change line 10:

```ts
export const MonthView: React.FC<MonthViewProps> = () => {
```

to:

```ts
export const MonthView: React.FC = () => {
```

- [ ] **Step 2: Delete the dead file**

```bash
git rm packages/calendar/src/features/calendar/components/month-view/types.ts
```

- [ ] **Step 3: Stop threading `dayMaxEvents` into `MonthView`**

In `ilamy-calendar.tsx`, the `CalendarContent` component currently reads:

```ts
const { view, dayMaxEvents, getViews } = useSmartCalendarContext((c) => ({
	view: c.view,
	dayMaxEvents: c.dayMaxEvents,
	getViews: c.getViews,
}))

const builtInViews: Record<string, React.ReactNode> = {
	month: <MonthView dayMaxEvents={dayMaxEvents} key="month" />,
```

Change to:

```ts
const { view, getViews } = useSmartCalendarContext((c) => ({
	view: c.view,
	getViews: c.getViews,
}))

const builtInViews: Record<string, React.ReactNode> = {
	month: <MonthView key="month" />,
```

(`dayMaxEvents` still flows to the cells through context — `GridCell` reads it from
`useSmartCalendarContext()` directly; only the dead prop thread is removed.)

- [ ] **Step 4: Verify and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail`.

```bash
git add -A packages/calendar/src/features/calendar/components
git commit -m "refactor(month-view): delete dead types file and unread dayMaxEvents prop"
```

---

### Task 4: Drop the unused `locale` prop from `DayNumber`

`DayNumber` declares `locale?: string` but never destructures it (verified:
`day-number.tsx:16` destructures only `date` and `className`).

**Files:**
- Modify: `packages/calendar/src/components/day-number.tsx:9`
- Modify: `packages/calendar/src/components/grid-cell.tsx:148` (the only caller passing it)

- [ ] **Step 1: Remove the prop from the interface**

In `day-number.tsx`, delete the `locale?: string` line from `DayNumberProps`.

- [ ] **Step 2: Update the caller**

In `grid-cell.tsx:148`, change:

```tsx
{showDayNumber && <DayNumber date={day} locale={currentLocale} />}
```

to:

```tsx
{showDayNumber && <DayNumber date={day} />}
```

Then check whether `currentLocale` is still used elsewhere in `grid-cell.tsx`:

Run: `grep -n 'currentLocale' packages/calendar/src/components/grid-cell.tsx`
Expected: if the only remaining hit is the context destructuring (~line 56), remove
`currentLocale,` from that destructuring too. If other uses exist, leave the destructuring.

- [ ] **Step 3: Verify and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail`.

```bash
git add packages/calendar/src/components/day-number.tsx packages/calendar/src/components/grid-cell.tsx
git commit -m "refactor(day-number): drop unused locale prop"
```

---

### Task 5: Delete the dead `ProcessedCalendarEvent` type

A third near-duplicate positioned-event type with zero usages anywhere in packages/ or apps/
(verified by grep; it is not part of the public index).

**Files:**
- Modify: `packages/calendar/src/components/types.ts:11-30`

- [ ] **Step 1: Delete the interface**

Remove the `ProcessedCalendarEvent` interface (lines ~11-30 of `components/types.ts`,
including its doc comment). Keep everything else in the file.

- [ ] **Step 2: Verify and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail`.

```bash
git add packages/calendar/src/components/types.ts
git commit -m "refactor(types): delete unused ProcessedCalendarEvent interface"
```

---

### Task 6: Delete `Badge` and `InputGroup` from `@ilamy/ui`

Both have zero consumers across all packages and the demo (verified; the only references are
their own bunup entries).

**Files:**
- Delete: `packages/ui/src/components/badge.tsx`
- Delete: `packages/ui/src/components/input-group.tsx`
- Modify: `packages/ui/bunup.config.ts:8,14`

- [ ] **Step 1: Re-verify zero consumers (cheap insurance before deleting)**

Run: `grep -rn "components/badge\|components/input-group" packages apps --include='*.ts*' | grep -v node_modules | grep -v dist | grep -v bunup.config`
Expected: no output. If anything appears, STOP and report instead of deleting.

- [ ] **Step 2: Delete the components and their build entries**

```bash
git rm packages/ui/src/components/badge.tsx packages/ui/src/components/input-group.tsx
```

In `packages/ui/bunup.config.ts`, delete these two lines from the `entry` array:

```ts
		'src/components/badge.tsx',
		'src/components/input-group.tsx',
```

- [ ] **Step 3: Verify the workspace still builds and passes**

Run: `bun run build && bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: build exits 0 (the ui package's dist no longer emits badge/input-group);
type-check exits 0; `0 fail`. The `@ilamy/ui` package is private (bundled into the calendar
at build time), so no migration entry is needed.

- [ ] **Step 4: Commit**

```bash
git add -A packages/ui
git commit -m "chore(ui): delete unused Badge and InputGroup primitives"
```

---

### Task 7: Delete the demo's dead Bun-serve entry point

`apps/demo/src/index.tsx` imports a `./index.html` that does not exist; the demo runs via
Vite (`bunx vite`) through the repo-root `index.html` → `frontend.tsx`. Nothing references
the file (verified against `apps/demo/package.json` scripts and `index.html`).

**Files:**
- Delete: `apps/demo/src/index.tsx`

- [ ] **Step 1: Re-verify it is unreferenced, then delete**

Run: `grep -rn "src/index" apps/demo/package.json apps/demo/index.html apps/demo/vite.config.* 2>/dev/null`
Expected: no output referencing `src/index.tsx`. Then:

```bash
git rm apps/demo/src/index.tsx
```

- [ ] **Step 2: Verify and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail`. Do NOT start the dev server to verify (it is already running
with hot reload per repo rules); type-check failing to mention the file is the proof.

```bash
git add -A apps/demo
git commit -m "chore(demo): delete dead bun-serve entry point"
```

---

### Task 8: v2 breaking type fixes — `data` fields to `unknown`, drop `Resource.position`

The v2 release sanctions these (master plan, "Public API redesigned deliberately").
`Resource.position` has zero usages in src (verified).

**Files:**
- Modify: `packages/types/src/index.ts:57-59` (CalendarEvent.data)
- Modify: `packages/calendar/src/features/resource-calendar/types/index.ts:63-77`
  (Resource.position + Resource.data)
- Append: `docs/migration-v2.md`

- [ ] **Step 1: Tighten `CalendarEvent.data`**

In `packages/types/src/index.ts`, replace:

```ts
	// oxlint-disable-next-line no-explicit-any
	data?: Record<string, any>
```

with:

```ts
	data?: Record<string, unknown>
```

(The `oxlint-disable` comment is dead either way — the repo lints with biome.)

- [ ] **Step 2: Tighten `Resource`**

In `packages/calendar/src/features/resource-calendar/types/index.ts`, delete:

```ts
	/** Optional position for resource display */
	position?: number
```

and replace:

```ts
	// oxlint-disable-next-line no-explicit-any
	// biome-ignore lint/suspicious/noExplicitAny: Metadata can be anything
	data?: Record<string, any>
```

with:

```ts
	data?: Record<string, unknown>
```

- [ ] **Step 3: Find and fix internal fallout**

Run: `grep -rn '\.data\b' packages/calendar/src packages/recurrence/src apps/demo/src --include='*.ts*' | grep -v node_modules | grep -v '\.test\.' | grep -v 'mock.calls'`
Expected: hits only in type definitions and doc comments. WRITES to `data` keep compiling
under `unknown`; if any READ of a `data` property appears (e.g. `event.data.foo`), fix it at
the read site with a narrowing guard, never a cast:

```ts
const meetingType = typeof event.data?.meetingType === 'string'
	? event.data.meetingType
	: undefined
```

- [ ] **Step 4: Verify (build first — recurrence/demo type-check against calendar's dist)**

Run: `bun run build && bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: all exit 0; `0 fail`.

- [ ] **Step 5: Append migration entries**

Add to the "Type tightening" section created in Task 2 (still before `## Summary checklist`):

```markdown
### `data` fields are `Record<string, unknown>` (was `Record<string, any>`)

Applies to `CalendarEvent.data` and `Resource.data`. Writing data is unchanged. Reads now
need narrowing:

**Before (v1)**

```ts
const role = resource.data.role
```

**After (v2)**

```ts
const role = typeof resource.data?.role === 'string' ? resource.data.role : undefined
```

Or cast once at your own boundary: `const meta = resource.data as MyResourceMeta`.

### `Resource.position` removed

The optional `position` field on `Resource` was never read by the calendar. Order resources
by ordering the `resources` array itself.
```

Also add to the `## Summary checklist`:

```markdown
- [ ] If you read properties off `event.data` / `resource.data`, add narrowing or a boundary cast (`Record<string, unknown>` now).
- [ ] Remove any use of `Resource.position`; order the `resources` array instead.
```

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/index.ts packages/calendar/src/features/resource-calendar/types/index.ts docs/migration-v2.md
git commit -m "feat(types)!: data fields are Record<string, unknown>; drop unused Resource.position"
```

---

### Task 9: Final gate, dev log, PR

**Files:**
- Create/append: `docs/logs/<today YYYY-MM-DD>.md`

- [ ] **Step 1: Full CI gate**

Run: `bun run ci`
Expected: exits 0 (biome check → build → type-check → tests all green).

- [ ] **Step 2: Dev log (mandatory per CLAUDE.md)**

Append to today's `docs/logs/YYYY-MM-DD.md` (create if absent; delete the oldest log file if
the directory exceeds 10): summarize under `## Changes` as
`**[v2 phase 0]**: derived Translations type; deleted dead code (month-view types,
DayNumber.locale, ProcessedCalendarEvent, ui Badge/InputGroup, demo dead entry); data fields
→ unknown; dropped Resource.position. Migration entries added.` and list the files under
`## Files Modified`.

- [ ] **Step 3: Ask the user to review; on explicit approval, push and open the PR**

Suggested title: `feat(v2)!: phase 0 — derived Translations, dead-code deletion, type tightening`
PR body links `docs/v2-overhaul-plan.md` (Phase 0) and the new migration entries. NEVER push
or post without explicit approval in the user's latest message; chain the
`touch .claude/state/pr-post-approved.flag` ritual with the `gh pr create` command.

---

## Self-review notes

- Spec coverage: all five master-plan Phase 0 bullets are covered (Translations → Task 2;
  dead exports → Tasks 3-7; v2 type fixes → Task 8). The `ProcessedCalendarEvent` deletion
  and `Resource.position` removal added during the validation pass are Tasks 5 and 8.
- Deletion tasks intentionally have no new tests (TDD deletion exception, sanctioned by the
  master plan); every task ends with the full suite + type-check as the regression gate, and
  Task 8 is gated on a build because recurrence/demo resolve `@ilamy/calendar` through dist.
- Order matters only for Task 2 (import-direction flip) and Task 8 (build before type-check);
  Tasks 3-7 are independent and may be reordered or parallelized across worktrees if desired.
