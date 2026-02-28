# CLAUDE.md — @ilamy/calendar

## Hard Rules

These are non-negotiable. Violating any of these is a bug.

- NEVER start/stop the dev server. It's already running with hot reload.
- NEVER commit or push without explicit user approval.
- NEVER skip writing tests. TDD is mandatory.
- NEVER use npm/node/vite/pnpm. Always use `bun`.
- NEVER use `YYYY-MM-DD` format for storage/transmission. Always use ISO strings.
- NEVER import dayjs directly. Always import from `@/lib/dayjs-config`.
- NEVER import `datetime` from rrule. Use dayjs.
- NEVER add Claude/AI as co-author in commits.
- NEVER commit directly to main. Use feature branches.

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

Core logic in `src/features/recurrence/utils/recurrence-handler.ts`:
- `generateRecurringEvents()` — create instances from rrule
- `updateRecurringEvent()` — scoped updates (this/following/all) with EXDATE
- `deleteRecurringEvent()` — scoped deletions
- `isRecurringEvent()` — identify base vs instance

Every event must have a globally unique `uid`. EXDATE uses ISO strings in `exdates[]`.

### i18n

`CalendarProvider` handles translations. Props: `translations?: Translations` or `translator?: TranslatorFunction`. Falls back to English. All components access via `useIlamyCalendarContext().t()`. 94 translation keys. See `docs/translation-usage.md` for full details.

## Key Paths

```
src/
  index.ts                                    # Public API exports
  features/
    calendar/
      ilamy-calendar.tsx                       # Main component
      day-view/ week-view/ month-view/ year-view/  # View components
      contexts/calendar-context/               # CalendarProvider, all state
      hooks/                                   # useProcessedDayEvents, useProcessedWeekEvents
      utils/                                   # business-hours, view-hours, event-form-utils
    recurrence/
      utils/recurrence-handler.ts              # Core recurring event logic
      components/recurrence-editor/            # Recurrence rule builder UI
      components/recurrence-edit-dialog/       # Edit/delete scope dialog
      hooks/useRecurringEventActions.ts        # Recurring CRUD hook
    resource-calendar/
      ilamy-resource-calendar/                 # Resource calendar component
      contexts/resource-calendar-context/      # ResourceCalendarProvider
      day-view/ week-view/ month-view/         # Resource view variants
  components/
    types.ts                                   # CalendarEvent, ProcessedCalendarEvent, WeekDays, BusinessHours
    ui/                                        # Shadcn design system (button, dialog, input, etc.)
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
    configs/dayjs-config.ts                    # Pre-configured dayjs (ALWAYS import from here)
    translations/                              # Default translations, types
    utils/                                     # date-utils, position-*-events, export-ical
    constants.ts                               # Global constants

docs/
  rfc-5545.md                                  # iCalendar spec reference
  rrule.js.md                                  # rrule.js API reference
  export-ical.md                               # iCal export guide
  resource-calendar.md                         # Resource calendar docs
  translation-usage.md                         # i18n guide
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

## Development Logs

Daily logs in `docs/logs/` track changes across sessions.

- **Check logs** at session start to understand recent changes
- **Update logs** after making any codebase changes
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
