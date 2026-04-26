Load the full codebase context for @ilamy/calendar. Read the CLAUDE.md file, review the project structure, and check the latest logs.

## Step 1: Read Project Instructions

Read `CLAUDE.md` at the project root. This is the source of truth for all development rules, architecture decisions, and conventions. Follow every instruction in it.

## Step 2: Codebase Map

Here is the full codebase layout. Internalize it before doing any work.

### Root Config Files

- `package.json` - Dependencies, scripts, metadata
- `bunup.config.ts` - Bun bundler config (ESM, minified, source maps)
- `tsconfig.json` - TypeScript config, path alias `@/*` -> `./src/*`
- `biome.json` - Linter/formatter (Biome v2)
- `.lintstagedrc.json` - Pre-commit lint rules
- `components.json` - Shadcn component registry
- `bunfig.toml` - Bun runtime config
- `happydom.ts` - DOM env for tests
- `testing-library.ts` - Testing Library setup

### Documentation (`docs/`)

- `rfc-5545.md` - Complete iCalendar RFC 5545 specification
- `rrule.js.md` - Full rrule.js API reference
- `export-ical.md` - iCalendar export guide
- `resource-calendar.md` - Resource calendar feature docs
- `translation-usage.md` - i18n/translation system guide
- `logs/` - Daily development logs (see Step 3)

### Source Code (`src/`)

#### Entry Points

- `src/index.ts` - Main library exports (public API)
- `src/index.tsx` - Dev/demo entry
- `src/App.tsx` - Demo app component
- `src/index.css` - Global styles

#### Types (`src/types/`)

- `index.ts` - `CalendarView`, `TimeFormat` types

#### Components (`src/components/`)

Shared UI building blocks used across all features:

- `types.ts` - Core types: `CalendarEvent`, `ProcessedCalendarEvent`, `WeekDays`, `BusinessHours`
- `grid-cell.tsx` - Generic grid cell
- `day-number.tsx` - Day number display
- `droppable-cell.tsx` - Drop zone for DnD
- `all-events-dialog.tsx` - Modal for all events
- `current-time-indicator.tsx` - Live time indicator
- `resource-cell.tsx` - Resource calendar cell

**`components/ui/`** - Shadcn Design System:
`badge`, `button`, `card`, `checkbox`, `dialog`, `input`, `label`, `date-picker`, `time-picker`, `calendar`, `popover`, `scroll-area`, `select`, `tabs`

**`components/drag-and-drop/`** - @dnd-kit integration:
- `calendar-dnd-context.tsx` - DnD context wrapper
- `dnd-utils.ts` - Drag-drop utilities
- `event-drag-overlay.tsx` - Drag visual feedback

**`components/event-form/`** - Event CRUD UI:
- `event-form.tsx` - Main form component
- `event-form-dialog.tsx` - Form in dialog wrapper

**`components/header/`** - Calendar header:
- `base-header.tsx` - Main header with title and controls
- `title-content.tsx` - Date display
- `view-controls.tsx` - View switcher buttons

**`components/vertical-grid/`** - Time-based grid (day/week views):
- `vertical-grid.tsx`, `vertical-grid-col.tsx`, `vertical-grid-header-container.tsx`, `vertical-grid-events-layer.tsx`

**`components/horizontal-grid/`** - Month-style grid:
- `horizontal-grid.tsx`, `horizontal-grid-row.tsx`, `horizontal-grid-header-container.tsx`, `horizontal-grid-events-layer.tsx`

**`components/all-day-row/`** - All-day events bar:
- `all-day-row.tsx`, `all-day-cell.tsx`

**`components/animations/`** - `animated-section.tsx` (Framer Motion)
**`components/draggable-event/`** - `draggable-event.tsx`

#### Features (`src/features/`)

##### Calendar Feature (`features/calendar/`)

The main calendar feature module:

**Components** (4 views):
- `ilamy-calendar.tsx` - Main exported component
- `day-view/day-view.tsx` - Single day view
- `week-view/week-view.tsx` - Weekly view
- `month-view/month-view.tsx` - Monthly grid view
- `year-view/year-view.tsx` - Year overview

**Context** (`features/calendar/contexts/calendar-context/`):
- `context.ts` - React Context definition
- `provider.tsx` - CalendarProvider (all state management, CRUD ops, view state, translations)

**Hooks**:
- `useProcessedDayEvents.ts` - Process events for day view
- `useProcessedWeekEvents.ts` - Process events for week view

**Utils**:
- `business-hours.ts` - Business hours highlighting
- `view-hours.ts` - Visible hours calculation
- `event-form-utils.ts` - Form validation/processing

##### Recurrence Feature (`features/recurrence/`)

RFC 5545 compliant recurring events:

**Components**:
- `recurrence-editor/recurrence-editor.tsx` - Build recurrence rules UI
- `recurrence-edit-dialog/recurrence-edit-dialog.tsx` - Edit/delete scope dialog

**Hooks**:
- `useRecurringEventActions.ts` - CRUD for recurring events

**Utils** (`recurrence-handler.ts`) - Core logic:
- `generateRecurringEvents()` - Create instances from rrule
- `isRecurringEvent()` - Identify base vs instance
- `updateRecurringEvent()` - Scoped updates (this/following/all)
- `deleteRecurringEvent()` - Scoped deletions

**Tests** (4 files): `recurrence-handler.test.ts`, `calendar-integration.test.ts`, `crud-operations.test.ts`, `recurrence-timezone.test.ts`

##### Resource Calendar Feature (`features/resource-calendar/`)

Multi-resource calendar views:

- `ilamy-resource-calendar/ilamy-resource-calendar.tsx` - Main resource calendar
- `day-view/`, `week-view/`, `month-view/` - Resource-specific view variants
- `contexts/resource-calendar-context/` - ResourceCalendarProvider

#### Hooks (`src/hooks/`)

- `use-calendar-engine.ts` - Main calendar engine
- `use-smart-calendar-context.ts` - Type-safe context access
- `use-autocomplete-timepicker.ts` - Time picker autocomplete

#### Library (`src/lib/`)

- `configs/dayjs-config.ts` - Pre-configured dayjs (always import from here)
- `translations/default.ts` - Default English translations (94 keys)
- `translations/types.ts` - Translation types
- `utils/date-utils.ts` - Date manipulation
- `utils/position-day-events.ts` - Day view event positioning
- `utils/position-week-events.ts` - Week view event positioning
- `utils/export-ical.ts` - iCalendar export
- `utils/generator.ts` - Event data generator
- `constants.ts` - Global constants
- `seed.ts` - Sample event data

### Public API Exports (`src/index.ts`)

**Components**: `IlamyCalendar`, `IlamyResourceCalendar`
**Hooks**: `useIlamyCalendarContext()`
**Recurrence**: `generateRecurringEvents()`, `isRecurringEvent()`, `RRule`
**Types**: `CalendarEvent`, `CalendarView`, `TimeFormat`, `BusinessHours`, `WeekDays`, `RRuleOptions`, `Resource`, `Translations`, `TranslatorFunction`, `CellClickInfo`, `IlamyCalendarProps`

### CI/CD & GitHub (`.github/`)

- `workflows/ci.yml` - CI pipeline
- `copilot-instructions.md` - Dev guidelines
- `pull_request_template.md` - PR template
- `ISSUE_TEMPLATE/` - Issue templates

## Step 3: Check the Logs

Read the development logs in `docs/logs/`. These are daily logs tracking what was changed in the codebase. They are critical for understanding recent changes and avoiding conflicts.

- List all files in `docs/logs/` and read the most recent ones (up to the last 3 days)
- Logs are named by date (e.g., `2025-01-15.md`)
- We keep a maximum of 10 log files. When creating a new log, if there are more than 10, delete the oldest ones
- After you make any changes to the codebase during this session, update or create today's log file in `docs/logs/` with a summary of what was changed

### Log File Format

Each log file should follow this format:

```markdown
# Development Log - YYYY-MM-DD

## Changes

- **[area]**: Description of what changed and why

## Files Modified

- `path/to/file.ts` - What was changed

## Notes

Any additional context, decisions made, or things to watch out for.
```

## Step 4: Confirm Ready

After loading all context, confirm to the user:
1. That you've read the project instructions (CLAUDE.md)
2. A brief summary of any recent log entries
3. That you're ready to work and will update the logs after making changes

Remember: Always use `bun` (never npm/node). Always write tests. Never commit without asking. Always use ISO date strings. Always import dayjs from `@/lib/dayjs-config`.
