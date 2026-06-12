# AGENTS.md — @ilamy/calendar

This file is the canonical instructions for any AI coding assistant working on this repo. `CLAUDE.md` and `GEMINI.md` are symlinks to this file, as are `.claude/{commands,hooks,rules,settings.json}` → `.agents/…`.

## Setup (Windows)

Git on Windows defaults to writing symlinks as regular text files containing the target path, which breaks this repo's `.claude/*` and `CLAUDE.md`/`GEMINI.md` symlinks. Before cloning, run:

```
git config --global core.symlinks true
```

Alternatively, enable Windows Developer Mode (Windows 10+) which flips the default. macOS and Linux work out of the box.

## Hard Rules

These are non-negotiable. Violating any of these is a bug.

- NEVER start/stop the dev server. It's already running with hot reload.
- NEVER commit or push without explicit user approval.
- NEVER skip writing tests. TDD is mandatory.
- NEVER use npm/node/pnpm as the package manager or runtime. Always use `bun` (invoke tools via `bunx`, e.g. the demo dev server runs `bunx vite`).
- ALWAYS use the latest published version when adding a dependency. Check `npm view <pkg> version` for the true latest — never copy version numbers from existing in-repo examples or from memory. Verify peer/engine compatibility and confirm the new major has no breaking changes for the APIs used (per the docs-first rule).
- NEVER use `YYYY-MM-DD` format for storage/transmission. Always use ISO strings.
- NEVER import dayjs directly. Always import from `@/lib/dayjs-config`.
- NEVER import `datetime` from rrule. Use dayjs.
- NEVER add Claude/AI as co-author in commits.
- NEVER commit directly to main. Use feature branches.
- ALWAYS update the dev log (`docs/logs/`) after making any codebase changes. This is mandatory — not optional. See "Development Logs" section below. Review-only sessions (no `src/` changes) don't require a log entry — the stop hook (`.claude/hooks/check-dev-log.sh`) checks `git diff --quiet HEAD -- src` and skips for clean trees.
- NEVER post public-facing GitHub content (PR comments, PR reviews, PR creation, issue comments, issue creation) without an explicit, fresh "post it" (or unambiguous equivalent) from the user in their most recent message. "Okay", "looks good", and stale approval from earlier in the conversation do NOT count. A PreToolUse hook (`.claude/hooks/check-pr-post-approval.sh`) enforces this by blocking the `gh` command unless the same Bash command contains the literal substring `touch .claude/state/pr-post-approved.flag` ahead of the gh part. Chain the touch and the post in one command: `touch .claude/state/pr-post-approved.flag && gh ...`. The ritual is the deliberate, auditable bridge between conversational approval and the actual post.

## Development Logs (MANDATORY)

Daily logs in `docs/logs/` track changes across sessions. **Update the log after every task that modifies the codebase.**

- **Check logs** at session start to understand recent changes
- **Update logs** after making any codebase changes — do this BEFORE reporting completion to the user
- **Naming**: `YYYY-MM-DD.md`
- **Max 10 files**: delete oldest when exceeded
- **One file per day**: append if today's log exists

### Log Format

```markdown
# Development Log - YYYY-MM-DD

## Changes

- **[area]**: What changed and why

## Files Modified

- `path/to/file.ts` - What was changed

## Notes

Context, decisions, things to watch out for.
```

## Session Start

Run `/project:load-context` to load the full codebase map, rules, and recent dev logs before starting work.

## Commands

```bash
bun test                           # Run all tests
bun test --coverage                # Tests with coverage
bun run lint                       # Lint (oxlint)
bun run lint:fix                   # Fix lint issues
bun run prettier:check             # Check formatting
bun run prettier:fix               # Fix formatting
bun run pre-commit                 # lint:fix + prettier:fix
bun run build                      # Production build (bunup)
bun run type-check                 # TypeScript check
bun run ci                         # Full CI: lint + prettier + test + build
```

## Architecture

React calendar component library. TypeScript, Shadcn-UI, Tailwind CSS, @dnd-kit, rrule.js.

### Monorepo layout (Bun workspaces)

**Only `@ilamy/calendar` is published.** It's a monorepo for development, but at build time the internal packages are bundled into the single `@ilamy/calendar` package; the others are `private: true`.

```
packages/
  types/        @ilamy/types        (private)  shared plugin-contract types (no runtime)
  utils/        @ilamy/utils        (private)  configured dayjs (./dayjs) + helpers (./helpers)
  ui/           @ilamy/ui           (private)  shadcn primitives
  recurrence/   @ilamy/calendar-recurrence (private)  RFC 5545 recurrence plugin
  calendar/     @ilamy/calendar     (PUBLISHED) the core; bundles the four above
apps/
  demo/         @ilamy/demo         (private)  Vite playground; consumes @ilamy/calendar's public API
```

`@ilamy/calendar` ships these entry points: `.` (core), `./testing` (test harness), `./plugins/recurrence` (the recurrence plugin). The recurrence subpath's `import … from '@ilamy/calendar'` self-references the same package at runtime. **It ships no CSS** — "bring your own design system": components use the conventional shadcn token classes, and consumers `@source` the package's `dist` so Tailwind generates the utilities, styled by their own tokens. The demo (`apps/demo/src/styles/globals.css`) is the reference consumer that supplies a shadcn theme.

Paths in the **Key Paths** section below are relative to `packages/calendar/`. Run scripts at the repo root (they fan out via `bun run --filter '*' …`) or inside a single package. Build resolution: calendar's bunup `noExternal`s the internal `@ilamy/*` packages (resolved to source via tsconfig `paths`) so they're bundled in; their third-party deps (react, radix, clsx, rrule, …) stay external and are declared in calendar's `dependencies`. **`bun run ci` builds before type-check/test** (the recurrence package + demo resolve `@ilamy/calendar` through its built `dist/*.d.ts`).

### Data Flow

```
IlamyCalendar
  -> CalendarProvider (all state: events, view, date, translations, CRUD)
    -> CalendarDndContext (@dnd-kit wrapper)
      -> View components (month/week/day/year)
```

All CRUD flows through context: `addEvent`, `updateEvent`, `deleteEvent`.
Recurring events: `updateRecurringEvent`, `deleteRecurringEvent`.
Hook access: `useIlamyCalendarContext()`.

### Recurring Events (RFC 5545)

Uses `rrule.js` with strict RFC 5545 compliance. Three event types:

| Type | Has `rrule` | Has `recurrenceId` | ID pattern |
|---|---|---|---|
| Base event | yes | no | any |
| Generated instance | no | no | `originalId_number` |
| Modified instance | no | yes | any |

Core logic in `packages/recurrence/src/utils/recurrence-handler.ts`:
- `generateRecurringEvents()` — create instances from rrule
- `updateRecurringEvent()` — scoped updates (this/following/all) with EXDATE
- `deleteRecurringEvent()` — scoped deletions
- `isRecurringEvent()` — identify base vs instance

Every event must have a globally unique `uid`. EXDATE uses ISO strings in `exdates[]`.

### i18n

`CalendarProvider` handles translations. Props: `translations?: Translations` or `translator?: TranslatorFunction`. Falls back to English. All components access via `useIlamyCalendarContext().t()`. 94 translation keys. See `docs/translation-usage.md` for full details.

## Key Paths

```
packages/calendar/src/                         # (= @/… via tsconfig paths)
  index.ts                                    # Public API exports
  testing/index.tsx                            # CalendarTestProvider (@ilamy/calendar/testing)
  features/
    calendar/
      ilamy-calendar.tsx                       # Main component
      day-view/ week-view/ month-view/ year-view/  # View components
      contexts/calendar-context/               # CalendarProvider, all state
      hooks/                                   # useProcessedDayEvents, useProcessedWeekEvents
      utils/                                   # business-hours, view-hours, event-form-utils
    plugins/lib/                               # Plugin kernel + contract (re-exports @ilamy/types)
    resource-calendar/
      ilamy-resource-calendar/                 # Resource calendar component
      contexts/resource-calendar-context/      # ResourceCalendarProvider
      day-view/ week-view/ month-view/         # Resource view variants
  components/
    types.ts                                   # re-exports CalendarEvent/WeekDays/BusinessHours from @ilamy/types; ProcessedCalendarEvent
    calendar-slots.tsx                         # SLOT_* mount points + slot context re-exports
    event-form/                                # Event creation/editing forms
    drag-and-drop/                             # @dnd-kit integration
    header/                                    # Calendar header, title, view controls
    vertical-grid/                             # Time-based grid (day/week views)
    horizontal-grid/                           # Date-based grid (month view)
    all-day-row/                               # All-day event bar
  hooks/
    use-calendar-engine.ts                     # Main calendar engine
    use-smart-calendar-context.ts              # Type-safe context access
  lib/
    configs/dayjs-config.ts                    # shim → @ilamy/utils/dayjs (ALWAYS import dayjs from here)
    translations/                              # Default translations, types
    layout/                                    # geometry.ts (PositionedEvent), vertical.ts, horizontal.ts
    utils/                                     # date-utils, export-ical (cn/safeDate re-exported from @ilamy/ui & @ilamy/utils)
    constants.ts                               # Global constants

# Recurrence plugin (separate package):
packages/recurrence/src/
  utils/recurrence-handler.ts                  # Core recurring event logic
  components/recurrence-editor/                # Recurrence rule builder UI (@ilamy/ui Radix)
  components/recurrence-edit-dialog/           # Edit/delete scope dialog
  augment.ts                                   # declare module '@ilamy/calendar' { CalendarEvent.rrule … }

# Shadcn primitives live in @ilamy/ui (packages/ui/src/components/*), imported via @ilamy/ui/components/<name>.

docs/
  rfc-5545.md                                  # iCalendar spec reference
  rrule.js.md                                  # rrule.js API reference
  export-ical.md                               # iCal export guide
  resource-calendar.md                         # Resource calendar docs
  translation-usage.md                         # i18n guide
  time-grid.md                                 # Time grid architecture & DST handling
  testing-guide.md                             # Test patterns, wrappers, mocking
  types-and-interfaces.md                      # Type catalog and relationships
  hooks-and-context.md                         # Hook architecture, context system
  logs/                                        # Daily dev logs (see Development Logs)
```

### Public API (`src/index.ts`)

**Components**: `IlamyCalendar`, `IlamyResourceCalendar`
**Hooks**: `useIlamyCalendarContext()`
**Recurrence**: `generateRecurringEvents()`, `isRecurringEvent()`, `RRule`
**Types**: `CalendarEvent`, `CalendarView`, `TimeFormat`, `BusinessHours`, `WeekDays`, `RRuleOptions`, `Resource`, `Translations`, `TranslatorFunction`, `CellClickInfo`, `IlamyCalendarProps`

## Code Rules

### Dates

- Storage/transmission: `dayjs().toISOString()` — always ISO strings
- Display only: `YYYY-MM-DD` format is acceptable in UI
- Tests: use `'2025-10-13T00:00:00.000Z'` or `dayjs().toISOString()`, never `'2025-10-13'`

### Code Quality

- Extract complex operations into descriptive variables
- One operation per line, no long chains
- Meaningful names: `targetEventStartISO` not `targetEvent.start.toISOString()`
- Follow the Shadcn design system. Use predefined sizes (sm, default, lg). Don't override design tokens (h-8, h-9, custom spacing) unless absolutely necessary.

### TDD

- Write tests FIRST, then implement (red-green-refactor)
- Never create new test files — update existing `component.test.tsx` files
- Never create new functions — replace/update existing implementations
- Exact assertions: `toHaveLength(3)`, `toBe('exact-value')` — not `toBeGreaterThan(0)`

### Testing

- Co-located: `component.test.tsx` next to component files
- Integration focus: test through context and user interactions
- Recurring events: verify RFC 5545 compliance
- ~45 test files across components, recurrence, utilities, context/hooks

## Git Workflow

1. Create a feature branch
2. Make changes
3. Run tests (`bun test`)
4. Ask user to review
5. Wait for explicit approval
6. Commit with conventional prefix (`feat:`, `fix:`, `docs:`, etc.), max 100 chars
7. Ask before pushing

