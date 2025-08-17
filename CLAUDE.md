# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Critical**: NEVER start/stop the dev server. It's already running with hot reloading enabled.

```bash
# Testing
bun test                    # Run all tests
bun test --coverage         # Run tests with coverage
bun test --coverage --reporter=html  # Coverage report

# Linting & Formatting
bun run lint               # Check code with oxlint
bun run lint:fix           # Fix linting issues
bun run prettier:check     # Check formatting
bun run prettier:fix       # Fix formatting
bun run pre-commit         # Run lint:fix + prettier:fix

# Build & Type Check
bun run build              # Production build using bunup
bun run type-check         # TypeScript type checking
bun run ci                 # Full CI pipeline (lint + prettier + test + build)

# Development (DO NOT RUN - already running)
# bun dev                  # Development server with hot reload
```

## Project Architecture

### Component Library Structure

- **Main Export**: `IlamyCalendar` component with full calendar functionality
- **Context-First**: `CalendarProvider` manages all state, wrapped by `CalendarDndContext` for drag-and-drop
- **View-Based Architecture**: Separate components for `month-view/`, `week-view/`, `day-view/`, `year-view/`
- **Feature Organization**: Components grouped by functionality (`drag-and-drop/`, `recurrence/`, `event-form/`)

### State Management

- **CalendarProvider** (`src/contexts/calendar-context/`) centralizes all calendar state
- **useCalendarContext** hook provides access to events, view state, and operations
- All CRUD operations flow through context methods: `addEvent`, `updateEvent`, `deleteEvent`
- Recurring events use specialized functions: `updateRecurringEvent`, `deleteRecurringEvent`

### Recurring Events System

- **RFC 5545 Compliant**: Full iCalendar standard compliance using `rrule.js` library
- **Google Calendar UX**: "this/following/all" scope operations for recurring events
- **Core Functions** in `src/lib/recurrence-handler/`:
  - `generateRecurringEvents()` - Creates instances using rrule.js
  - `updateRecurringEvent()` - Handles scoped updates with EXDATE exclusions
  - `deleteRecurringEvent()` - Handles scoped deletions
  - `isRecurringEvent()` - Identifies base events vs instances
- **Three Event Types**:
  1. Base events (have `rrule`, no `recurrenceId`)
  2. Generated instances (no `rrule`, no `recurrenceId`, ID pattern `originalId_number`)
  3. Modified instances (have `recurrenceId`, no `rrule`)

### Drag & Drop Integration

- **@dnd-kit/core** integration via `CalendarDndContext`
- Handles event dragging between dates and time slots
- Updates events through calendar context after successful drops

## Important Development Rules

### Bun-First Workflow

- **Always use Bun** instead of npm/node/vite (see `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc`)
- Use `bun test` instead of Jest/Vitest
- Use `bun install` for dependencies
- Use `bun run <script>` for package scripts

### Test-Driven Development (TDD)

- **Mandatory TDD**: Always write tests FIRST before implementing features
- **Red-Green-Refactor**: Write failing test → minimal implementation → refactor
- **Never create new test files** - always update existing `component.test.tsx` files
- **Never create new functions** - always replace/update existing implementations
- **Exact assertions**: Use `toHaveLength(3)`, `toBe('exact-value')` instead of weak checks like `toBeGreaterThan(0)`

### Date Handling Standards

- **Never use YYYY-MM-DD format** for storage/transmission (causes timezone bugs)
- **Always use ISO strings**: `dayjs().toISOString()` for serialization
- **Use YYYY-MM-DD only for display** in UI components
- **Always import dayjs from `@/lib/dayjs-config`** (pre-configured with plugins)
- **Never import `datetime` from rrule** - stick with dayjs for consistency

### Code Quality Requirements

- **Human-readable code**: Extract complex operations into descriptive variables
- **One operation per line**: Avoid chaining multiple operations
- **Meaningful variable names**: `targetEventStartISO` instead of `targetEvent.start.toISOString()`
- **Design System Compliance**: Strictly follow the design system - DO NOT override button heights, spacing, or other design tokens unless absolutely necessary. Use the design system's predefined sizes (sm, default, lg) instead of custom h-8, h-9 values.

### Git Commit Guidelines

- **Short commit messages**: Max 100 characters, use conventional commit prefixes (feat, fix, docs, etc.)
- **No co-author attribution**: Never add Claude or AI as co-author in commits
- **Branch workflow**: Create feature branches for new work, don't commit directly to main

### iCalendar (RFC 5545) Compliance

- **Strict RFC 5545 adherence**: No shortcuts or fallbacks
- **Required fields**: Every event must have globally unique `uid`
- **RECURRENCE-ID**: Only for modified recurring instances
- **RRULE**: Use RFC 5545 compliant patterns
- **EXDATE**: ISO string dates in `exdates` array for exclusions

## Key Files & Directories

- `src/index.ts` - Main library exports
- `src/components/ilamy-calendar/ilamy-calendar.tsx` - Main calendar component
- `src/contexts/calendar-context/` - Calendar state management
- `src/lib/recurrence-handler/` - Recurring events logic with rrule.js
- `src/features/` - View-specific components (month, week, day, year)
- `src/components/event-form/` - Event creation/editing UI
- `docs/rfc-5545.md` - Complete iCalendar specification reference
- `docs/rrule.js.md` - Complete rrule.js API reference
- `.github/copilot-instructions.md` - Comprehensive development guidelines

## Integration Patterns

```tsx
// Basic calendar integration
import { IlamyCalendar } from '@ilamy/calendar'
;<IlamyCalendar
  events={events}
  firstDayOfWeek="sunday"
  onEventClick={handleEventClick}
  onCellClick={handleCellClick}
/>

// Context access for advanced integrations
import { useIlamyCalendarContext } from '@ilamy/calendar'

const { addEvent, updateEvent, deleteEvent, view, currentDate } =
  useIlamyCalendarContext()
```

## Testing Strategy

- **Co-located tests**: `component.test.tsx` files alongside components
- **Integration focus**: Test calendar behavior through context and user interactions
- **Recurring event testing**: Verify RFC 5545 compliance and rrule.js integration
- **Drag & drop testing**: Test event movement and position updates
- **View switching**: Test AnimatePresence transitions and state persistence
