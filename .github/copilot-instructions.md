# Ilamy Calendar - AI Coding Instructions

## 🚨 CRITICAL RULES

### 🚨 CRITICAL: ALWAYS WRITE HUMAN-READABLE CODE

**ABSOLUTE REQUIREMENT**: ALL code must be extremely readable and maintainable. NO EXCEPTIONS.

**MANDATORY Code Readability Standards:**

- **Extract complex operations into descriptive variables** - Never use inline calculations or nested operations
- **Use meaningful variable names** - `targetEventStartISO` instead of `targetEvent.start.toISOString()`
- **Break down complex expressions** - Separate date calculations, object creation, and conditional logic
- **One operation per line** - Avoid chaining multiple operations in a single statement
- **Descriptive intermediate variables** - `existingExdates`, `updatedExdates`, `dayBeforeTarget`, `terminationDate`

**Examples of GOOD vs BAD code:**

```typescript
// ❌ BAD - Unreadable inline operations
const updatedBaseEvent = {
  ...baseEvent,
  exdates: [...(baseEvent.exdates || []), targetEvent.start.toISOString()],
}

// ✅ GOOD - Readable with extracted variables
const targetEventStartISO = targetEvent.start.toISOString()
const existingExdates = baseEvent.exdates || []
const updatedExdates = [...existingExdates, targetEventStartISO]
const updatedBaseEvent = {
  ...baseEvent,
  exdates: updatedExdates,
}
```

**STRICT ENFORCEMENT:**

- **NEVER write complex inline expressions** - Always extract to variables first
- **NEVER chain multiple operations** without intermediate variables
- **ALWAYS use descriptive variable names** that explain the purpose
- **ALWAYS separate logical steps** into individual, readable operations

### NEVER START/STOP DEV SERVER

**The development server is ALWAYS running. NEVER run `bun dev` or any server start/stop commands. Always assume hot reloading is active.**

### 🚨 CRITICAL: SHORT AND INFORMATIVE COMMIT MESSAGES

**ABSOLUTE REQUIREMENT**: ALL commit messages must be short and informative. NO LONG, VERBOSE COMMIT MESSAGES.

**MANDATORY Commit Message Standards:**

- **Keep it concise** - Maximum 100 characters for the subject line
- **Use present tense** - "Fix bug" not "Fixed bug" or "Fixes bug"
- **Be specific** - Describe what was changed, not why
- **No redundant words** - Avoid "update", "modify", "change" when the action is clear

**Examples:**

- ✅ GOOD: `Fix recurring event deletion scope`
- ✅ GOOD: `Add recurrenceId validation to EventForm`
- ✅ GOOD: `Remove unused RecurrenceHandler class refs`
- ❌ BAD: `Update the copilot instructions file to fix the conflicting information about recurrenceId usage`
- ❌ BAD: `Fixed an issue where the recurring event deletion was not working properly`

**CONVENTIONAL COMMIT TYPES:**

Use conventional commit prefixes for consistency and automated tooling:

- **feat**: New feature or functionality
  - `feat: Add drag-and-drop for recurring events`
  - `feat: Implement weekly view navigation`

- **fix**: Bug fix or correction
  - `fix: Resolve timezone shift in EXDATE handling`
  - `fix: Prevent infinite loop in RecurrenceEditor`

- **docs**: Documentation changes
  - `docs: Update RFC 5545 compliance guidelines`
  - `docs: Add recurring event examples`

- **refactor**: Code restructuring without behavior change
  - `refactor: Extract event validation logic`
  - `refactor: Simplify RRULE parsing functions`

- **test**: Adding or updating tests
  - `test: Add recurring event edge case coverage`
  - `test: Fix RecurrenceEditor test assertions`

- **style**: Code formatting, linting fixes
  - `style: Fix ESLint violations in EventForm`
  - `style: Apply Prettier formatting`

- **chore**: Build, tooling, dependency updates
  - `chore: Update rrule.js to latest version`
  - `chore: Configure TypeScript strict mode`

**STRICT ENFORCEMENT:**

- **NEVER write commit messages longer than 100 characters**
- **NEVER use past tense** - always present tense
- **NEVER explain the why** - focus on the what
- **ALWAYS be direct and actionable**
- **ALWAYS use conventional commit prefixes** - feat, fix, docs, refactor, test, style, chore

### 🚨 CRITICAL: STRICT iCALENDAR (RFC 5545) COMPLIANCE

**ABSOLUTE REQUIREMENT**: ALL calendar functionality MUST strictly adhere to iCalendar RFC 5545 standards. NO EXCEPTIONS, NO FALLBACKS, NO SHORTCUTS.

**MANDATORY iCalendar Standards:**

- **RECURRENCE-ID**: Use `recurrenceId` field ONLY for modified recurring event instances
- **UID**: Every event must have a globally unique `uid` field - all instances share same UID
- **RRULE**: Use RFC 5545 compliant RRULE patterns (FREQ, INTERVAL, COUNT, UNTIL, BYDAY)
- **EXDATE**: Exclude instances using ISO string dates in `exdates` array
- **NO CUSTOM SCHEMES**: Never create custom ID parsing or fallback mechanisms

**STRICT ENFORCEMENT:**

```typescript
// ✅ CORRECT: Strict iCalendar compliance for modified instances
if (targetEvent.recurrenceId) {
  // This is a modified instance - handle accordingly
  console.log('Processing modified recurring instance')
}

// Find base event by UID and RRULE presence (with fallback UID generation)
const targetUID = targetEvent.uid
const baseEvent = events.find(
  (e) => (e.uid || `${e.id}@ilamy.calendar`) === targetUID && e.rrule
)
```

**Generated Event Instances (Regular) Must Have:**

- ✅ `uid`: Same UID as base event (iCalendar standard)
- ✅ ID pattern: `originalId_number` format
- ❌ NO `recurrenceId`: Regular instances don't have this field

**Modified Event Instances Must Have:**

- ✅ `recurrenceId`: ISO string of original occurrence date
- ✅ `uid`: Same UID as base event (iCalendar standard)
- ❌ NO `rrule`: Modified instances are standalone

### NEVER USE YYYY-MM-DD DATE FORMAT

**CRITICAL**: Never use `YYYY-MM-DD` format for date serialization, storage, or transmission. This format causes timezone shifts and day-before bugs in western timezones.

**ALWAYS use full ISO strings** (`toISOString()`) when:

- Storing dates in state, localStorage, or databases
- Transmitting dates via API calls or URL params
- Serializing dates in form inputs or data structures
- Comparing dates or performing date operations
- Testing date values in test files

**ONLY exception**: Use `YYYY-MM-DD` format exclusively for display purposes in UI components.

**Examples:**

- ✅ CORRECT: `dayjs().toISOString()` → `"2025-01-06T09:00:00.000Z"`
- ❌ WRONG: `dayjs().format('YYYY-MM-DD')` → `"2025-01-06"` (causes timezone bugs)
- ✅ DISPLAY ONLY: `dayjs().format('YYYY-MM-DD')` → Only for showing dates to users

### 🚨 CRITICAL: TEST-DRIVEN DEVELOPMENT (TDD) IS MANDATORY

**TDD IS NON-NEGOTIABLE. NEVER WRITE CODE BEFORE WRITING TESTS.**

**ALWAYS follow the Red-Green-Refactor cycle:**

1. **🔴 RED**: Write a failing test that describes the desired behavior FIRST
2. **🟢 GREEN**: Write the minimal code to make the test pass
3. **🔵 REFACTOR**: Improve the code while keeping tests green

**CRITICAL TDD RULES:**

- **NEVER implement any function, component, or feature without writing tests first**
- **NEVER create new files - always update existing test files when adding tests**
- **NEVER create new functions - always replace or update existing implementations**
- **ALL code changes must start with failing tests**
- **Tests must use exact assertions - NEVER use weak checks like `toBeGreaterThan(0)`**
- **Always use precise counts: `toHaveLength(3)`, `toBe('exact-value')`, etc.**
- **Test behavior, not implementation details**
- **Co-locate tests with components: `component.test.tsx`**

**Examples of TDD Violations (NEVER DO THIS):**

- ❌ Writing implementation code before tests
- ❌ Creating new test files instead of updating existing ones
- ❌ Creating new functions instead of replacing existing ones
- ❌ Using weak assertions like `expect(result.length).toBeGreaterThan(0)`
- ❌ Skipping tests for "quick fixes"

**TDD SUCCESS PATTERN:**

```typescript
// 1. RED: Write failing test first
it('should update only this recurring event instance', () => {
  const result = updateRecurringEvent({
    targetEvent,
    updates,
    currentEvents: events,
    scope: 'this',
  })
  expect(result).toHaveLength(2) // Exact assertion: base event + standalone modified event

  const baseEvent = result.find((e) => e.id === targetEvent.id)
  const standaloneEvent = result.find((e) => e.id !== targetEvent.id)

  expect(baseEvent?.exdates).toHaveLength(1) // Precise check: EXDATE exclusion
  expect(standaloneEvent?.rrule).toBeUndefined() // Standalone event has no rrule
})

// 2. GREEN: Implement minimal code to pass
// 3. REFACTOR: Improve while keeping tests green
```

## Project Overview

A full-featured React calendar component library built with Bun, TypeScript, and modern React patterns. The project uses a component-based architecture with multiple calendar views (month, week, day, year) and advanced features like drag-and-drop, recurring events, and internationalization.

## Architecture & Core Patterns

### 1. Context-First State Management

The calendar state is centralized in `src/contexts/calendar-context/` with a provider pattern:

- **CalendarProvider** wraps the entire calendar component
- **useCalendarContext** hook provides access to all calendar operations
- State includes: currentDate, view, events, form state, and navigation methods
- All event operations (CRUD) flow through the context

### 2. View-Based Component Architecture

Calendar views are separate components in dedicated folders:

- `month-view/`, `week-view/`, `day-view/`, `year-view/`
- Each view handles its own layout logic and event positioning
- Views are switched via AnimatePresence for smooth transitions
- Main calendar component (`ilamy-calendar.tsx`) orchestrates view rendering

### 3. Event System with RRULE Recurring Support

Events use RFC 5545 compliant RRULE system defined in `src/components/types.ts`:

- Base `CalendarEvent` interface with optional `rrule` patterns (RFC 5545 standard)
- Google Calendar-style recurring event operations: "this", "following", "all" scopes
- EXDATE exclusions for individual instance modifications
- Clean "exclude + add standalone" approach instead of complex modification tracking
- Event positioning calculated in view-specific components
- Full timezone safety with ISO string date handling

### 4. Drag & Drop Integration

DnD implemented via `@dnd-kit/core` in `src/contexts/calendar-dnd-context.tsx`:

- Wraps calendar views with DndContext
- Handles event dragging between time slots and dates
- Uses sensors for mouse/touch with reduced activation constraints
- Updates events through context after successful drops

## Project Structure & Organization

### Bullet-Proof React Project Structure

**ALWAYS follow the bullet-proof React project structure** for maintainability, scalability, and team collaboration:

#### Component Organization

- **One component per folder** with dedicated files for logic, types, and tests
- **Co-located files**: Keep related files together (component.tsx, component.test.tsx, types.ts, utils.ts)
- **Index files**: Each component folder exports through an index.ts file
- **Feature-based grouping**: Group components by calendar features (month-view/, week-view/, event-form/)

#### File Naming Conventions

- **Components**: PascalCase (`EventForm.tsx`, `MonthView.tsx`)
- **Hooks**: camelCase with `use` prefix (`useCalendarContext.ts`, `useRecurringEventActions.ts`)
- **Utilities**: camelCase (`utils.ts`, `dayjs-config.ts`)
- **Types**: camelCase with descriptive names (`types.ts`, `calendar-types.ts`)
- **Tests**: Match component name with `.test.tsx` suffix

#### Folder Structure Rules

```
project-root/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── ui/          # Base UI components (shadcn/ui)
│   │   ├── [feature-name]/  # Feature-specific components
│   │   │   ├── index.ts     # Barrel exports
│   │   │   ├── component.tsx
│   │   │   ├── component.test.tsx
│   │   │   ├── types.ts     # Component-specific types
│   │   │   └── utils.ts     # Component-specific utilities
│   ├── contexts/        # React contexts and providers
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities, configurations, and helpers
│   ├── types/           # Global TypeScript definitions
│   └── features/        # Large feature modules (if needed)
├── styles/              # Global styles and themes
├── .github/             # GitHub workflows and templates
└── README.md            # Main project documentation
```

#### Import Organization

- **Absolute imports**: Always use `@/` alias for internal imports
- **Import grouping**: External dependencies → Internal modules → Relative imports
- **Type imports**: Use `import type` for TypeScript types
- **Barrel exports**: Use index.ts files to create clean import paths

#### Component Architecture

- **Single Responsibility**: Each component should have one clear purpose
- **Composition over Inheritance**: Prefer component composition patterns
- **Props Interface**: Define clear TypeScript interfaces for all props
- **Error Boundaries**: Implement error handling at appropriate component levels
- **Accessibility**: Follow ARIA standards and semantic HTML

#### Documentation Organization

- **Changelog**: Keep version history in CHANGELOG.md
- **README**: Project overview stays in root
- **RFC 5545 Documentation**: Complete iCalendar specification reference at `docs/rfc-5545.md` - **MANDATORY reference for all calendar standards compliance**
- **RRULE Documentation**: Complete rrule.js API reference at `docs/rrule.js.md` - **MANDATORY reference for all RRULE work**

This structure ensures code remains maintainable, testable, and scalable as the project grows.

## Development Workflow

### ⚠️ CRITICAL: Never Start/Stop Dev Server

**NEVER RUN `bun dev` OR START/STOP THE DEVELOPMENT SERVER** - The dev server is already running and should remain running. Only use existing terminal sessions and assume hot reloading is active.

### Build System (Bun-First)

- **Always use Bun** instead of npm/node/vite (see `.cursor/rules/`)
- **🚨 NEVER start dev server** - it's already running with hot reloading enabled
- **🚨 NEVER stop dev server** - assume it's always available
- Dev server: `bun dev` (hot reloading enabled) - ⚠️ DO NOT RUN THIS
- Build: `bun run build.ts` (custom build script with CLI options)
- Production: `bun start`

### Test-Driven Development (TDD)

**⚠️ CRITICAL: TDD IS MANDATORY - NO EXCEPTIONS**

- **Write tests FIRST** before implementing any new functionality
- **All new code must have meaningful tests** - no exceptions
- **NEVER create new files - always update existing test files when adding tests**
- **NEVER create new functions - always replace or update existing implementations**
- Test files should be co-located with components: `component.test.tsx`
- Use `bun test` for running tests (no Jest/Vitest)
- Test structure:
  - Unit tests for utilities and pure functions
  - Component tests for UI behavior and interactions
  - Integration tests for context and provider logic
- **Mandatory Red-Green-Refactor cycle:**
  1. **🔴 Red**: Write failing test that describes desired behavior FIRST
  2. **🟢 Green**: Write minimal code to make test pass
  3. **🔵 Refactor**: Improve code while keeping tests green

**STRICT TEST ASSERTION RULES:**

- **NEVER use weak assertions** like `toBeGreaterThan(0)` for count checks
- **ALWAYS use exact counts**: `toHaveLength(3)`, `toBe('exact-value')`, etc.
- **Test behavior, not implementation details**
- **Use precise assertions for every expectation**

### Component Development

1. **Start with tests** - define expected behavior before coding
2. New components go in `src/components/[component-name]/`
3. Export from component's index file and `src/components/index.ts`
4. UI components use shadcn/ui pattern in `src/components/ui/`
5. All components import dayjs from `@/lib/dayjs-config` (pre-configured with plugins)

### Styling & UI

- TailwindCSS with custom config supporting CSS4 features
- shadcn/ui components for consistent design system
- Framer Motion for animations (imported as `motion`)
- CSS variables for theming in `styles/globals.css`

### Internationalization

- DayJS with 100+ locales pre-loaded in `dayjs-config.ts`
- Locale switching via calendar context
- Week start day configurable (Sunday/Monday)
- Timezone support built-in

### Date Handling & Timezone Safety

- **🚨 CRITICAL**: NEVER use `YYYY-MM-DD` format for date serialization, storage, or transmission
- **ALWAYS use full ISO strings** (`toISOString()`) when storing/transmitting dates
- `YYYY-MM-DD` format causes timezone shifts (day-before bugs) in western timezones
- Use `dayjs().toISOString()` instead of `dayjs().format('YYYY-MM-DD')`
- This applies to: form inputs, API calls, localStorage, database storage, URL params, test assertions
- **ONLY exception**: Use `YYYY-MM-DD` exclusively for display purposes in UI components
- **In tests**: Always use `toISOString()` for date comparisons and assertions
- **🚨 CRITICAL**: NEVER import `datetime` from rrule - ALWAYS use dayjs for consistency
- **Date library consistency**: Stick with dayjs throughout the project - it's pre-configured with all needed plugins

### RRULE Recurring Events System with rrule.js

**STRICT RFC 5545 iCalendar Standard Compliance** using **rrule.js library** and Google Calendar-Style operations:

#### 🚨 CRITICAL: ALWAYS CHECK RRULE AND RFC 5545 DOCUMENTATION

**MANDATORY**: Before working with any RRULE functionality, patterns, or recurring calendar events, **ALWAYS check both comprehensive documentation references:**

1. **RFC 5545 Standard**: `docs/rfc-5545.md` - Official iCalendar specification
2. **rrule.js Library**: `docs/rrule.js.md` - Implementation-specific API reference

**RFC 5545 Documentation (`docs/rfc-5545.md`) includes:**

- Official iCalendar specification standards
- Calendar component definitions (VEVENT, VCALENDAR, etc.)
- Property specifications (UID, DTSTART, DTEND, RRULE, EXDATE, RECURRENCE-ID)
- Date-time format standards and timezone handling
- Recurrence rule (RRULE) official specification
- Exception dates (EXDATE) standards
- Recurrence-ID usage for instance modifications
- Status property handling (CANCELLED events)
- Complete RFC 5545 compliance examples

**rrule.js Documentation (`docs/rrule.js.md`) includes:**

- Complete rrule.js API reference with examples
- RFC 5545 compliance guidelines and differences
- Natural language conversion methods (`toText()`, `fromText()`)
- iCalendar string methods (`toString()`, `fromString()`)
- RRule constructor options and instance properties
- RRuleSet for complex recurrence patterns
- Timezone support and UTC date handling
- All occurrence retrieval methods (`all()`, `between()`, `before()`, `after()`)

**When to reference both documents:**

- Creating or parsing RRULE strings
- Converting between RRULE objects and strings
- Working with recurring event generation
- Implementing natural language descriptions
- Debugging RRULE patterns or timezone issues
- Adding new recurrence features or validations
- Ensuring RFC 5545 standard compliance
- Understanding UID, RECURRENCE-ID, and EXDATE behavior

#### Core Components:

- **`rrule.js`** library for robust RFC 5545 RRULE parsing and generation
- **Recurring Event Functions** in `src/lib/recurrence-handler/index.ts` for Google Calendar operations:
  - `isRecurringEvent()` - Identifies base events, instances, and modified instances
  - `generateRecurringEvents()` - Creates event instances using rrule.js
  - `updateRecurringEvent()` - Google Calendar-style "this/following/all" updates
  - `deleteRecurringEvent()` - Google Calendar-style "this/following/all" deletions
- **EXDATE exclusions** for individual instance modifications using ISO strings
- **RecurrenceEditOptions** with `scope: 'this' | 'following' | 'all'` and `eventDate`
- **STRICT VALIDATION**: All recurring operations REQUIRE proper UID and event identification

#### rrule.js Integration:

```typescript
import { RRule } from 'rrule'
import dayjs from '@/lib/dayjs-config'

// Convert RRULE string to RRule object for event generation
const rruleObj = RRule.fromString(event.rrule) // e.g., "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR"
const occurrences = rruleObj.between(startDate, endDate, true)

// Generate CalendarEvent instances with proper iCalendar fields
occurrences.forEach((date) => {
  // Each instance has same UID as base event, proper timezone handling
  // Use dayjs for date manipulation instead of rrule's datetime helper
})

// CRITICAL: Use dayjs instead of rrule's datetime() helper
// ✅ CORRECT: Use dayjs for date creation and manipulation
const startDate = dayjs().toDate()
const endDate = dayjs(formData.endDate).endOf('day').toDate()

// ❌ AVOID: Don't mix rrule's datetime helper with dayjs
// import { datetime } from 'rrule' // Don't do this
```

#### Date Handling Best Practices:

- **ALWAYS use dayjs** for date creation, parsing, and manipulation
- **NEVER import `datetime` from rrule** - stick with dayjs for consistency
- **Convert dayjs to Date objects** when needed for RRule constructor: `dayjs().toDate()`
- **Use ISO strings** for date serialization: `dayjs().toISOString()`
- **Avoid mixing date libraries** - dayjs is pre-configured with all needed plugins

````

#### Google Calendar-Style Update Operations:

```typescript
// CRITICAL: Modified target event has recurrenceId and uid
const targetEvent = {
  id: 'recurring-event_1',
  recurrenceId: '2025-01-07T09:00:00.000Z', // Original occurrence date (ISO)
  uid: 'recurring-event@ilamy.calendar', // Same UID as base event
  // ... other properties
}

// "This event only" - Exclude + add standalone event
updateRecurringEvent({
  targetEvent,
  updates,
  currentEvents: events,
  scope: 'this',
})
// Result: Base event gets EXDATE + new standalone modified event

// "This and following" - Terminate original + create new series
updateRecurringEvent({
  targetEvent,
  updates,
  currentEvents: events,
  scope: 'following',
})
// Result: Original series ends before target + new series starts from target

// "All events" - Update base event properties
updateRecurringEvent({
  targetEvent,
  updates,
  currentEvents: events,
  scope: 'all',
})
// Result: Base recurring event updated
````

#### Google Calendar-Style Delete Operations:

```typescript
// "This event only" - Add EXDATE exclusion
deleteRecurringEvent({
  targetEvent,
  currentEvents: events,
  scope: 'this',
})

// "This and following" - Terminate series with UNTIL
deleteRecurringEvent({
  targetEvent,
  currentEvents: events,
  scope: 'following',
})

// "All events" - Remove entire series
deleteRecurringEvent({
  targetEvent,
  currentEvents: events,
  scope: 'all',
})
```

#### rrule.js RRULE Generation:

- **`rrule.js`** handles all RFC 5545 RRULE parsing, validation, and occurrence generation
- **`generateRecurringEvents()`** uses rrule.js for reliable event instances
- **Automatic EXDATE handling** - excluded dates filtered after rrule.js generation
- **Full RFC 5545 support** - UNTIL, COUNT, BYDAY, BYMONTH, complex patterns via proven library
- **Timezone-safe** - rrule.js handles timezone complexities, we use ISO strings for consistency
- **Performance optimized** - rrule.js is battle-tested for large recurring series

#### rrule.js Integration Benefits:

- ✅ **Battle-tested library** - Used by major calendar applications worldwide
- ✅ **Full RFC 5545 compliance** - Complete RRULE specification support
- ✅ **Complex pattern support** - BYSETPOS, BYWEEKNO, advanced recurrence rules
- ✅ **Performance optimized** - Efficient occurrence generation for large date ranges
- ✅ **Robust parsing** - Handles malformed RRULE strings gracefully
- ✅ **Timezone aware** - Proper handling of DST and timezone transitions

#### Recurring Event Identification:

**CRITICAL: Understanding the Three Types of Recurring Events**

According to RFC 5545, there are **three distinct types** of calendar events in a recurring series:

1. **Base Recurring Event**: Has `rrule` property, no `recurrenceId`
   - Contains the RRULE pattern that defines the recurrence
   - Serves as the "template" for generating instances
   - Example: `{ id: 'meeting-1', rrule: 'FREQ=WEEKLY;BYDAY=MO', uid: 'meeting-1@calendar' }`

2. **Generated Instance**: No `rrule`, no `recurrenceId`, shares same `UID` as base event
   - Created by `generateRecurringEvents()` function using rrule.js
   - Has ID pattern like `originalId_number` (e.g., `meeting-1_0`, `meeting-1_1`)
   - Same UID as base event for proper iCalendar grouping
   - Example: `{ id: 'meeting-1_2', uid: 'meeting-1@calendar', start: '2025-01-20T09:00:00' }`

3. **Modified Instance**: Has `recurrenceId`, no `rrule`, created when user modifies a specific occurrence
   - Contains the original occurrence date in `recurrenceId` field
   - Same UID as base event but different properties (time, title, etc.)
   - Example: `{ id: 'meeting-1_modified', recurrenceId: '2025-01-20T09:00:00.000Z', uid: 'meeting-1@calendar' }`

**Identification Functions:**

```typescript
// Check if event is part of recurring series (any type)
isRecurringEvent(event) // Returns true for base event OR instances

// Specific type checking (if needed)
const isBase = !!(event.rrule && !event.recurrenceId)
const isModified = !!event.recurrenceId
const isGenerated = !event.rrule && !event.recurrenceId && event.uid
```

**Important Note:** Regular generated instances have NO `recurrenceId` - this field is only present for modified instances. To identify generated instances, check the ID pattern (`originalId_number`) and UID sharing with a base event.

#### Key Principles:

- ✅ **rrule.js for all RRULE operations** - No custom RRULE parsing or generation
- ✅ **STRICT RFC 5545 compliance** - rrule.js ensures standard compliance
- ✅ **Proper event identification** - Base events (RRULE), generated instances (ID pattern + UID), modified instances (RECURRENCE-ID)
- ✅ **Google Calendar UX** - Same "this/following/all" scope patterns users expect
- ✅ **Clean separation** - rrule.js for generation, recurrence functions for operations
- ✅ **EXDATE + standalone pattern** - Simple approach for modifications
- ✅ **Timezone safe** - ISO strings prevent western timezone day-before bugs
- ✅ **Error on violations** - Throw errors when iCalendar standards are not met

## Key Conventions

### Import Patterns

```tsx
// Absolute imports using @/ alias
import { useCalendarContext } from '@/contexts/calendar-context/context'
import dayjs from '@/lib/dayjs-config' // Always use pre-configured dayjs
import type { CalendarEvent } from '@/components/types'
```

### Event Handling

- Events flow through context methods: `addEvent`, `updateEvent`, `deleteEvent`
- **Recurring events** use `updateRecurringEvent`, `deleteRecurringEvent` with scope options
- Form state managed via `isEventFormOpen`, `selectedEvent`, `selectedDate`
- Date selection triggers `selectDate` and optionally opens event form
- **RRULE events** generate instances automatically via `generateRecurringEvents()`

### Component Composition

- Calendar wrapped in providers: `CalendarProvider` → `CalendarDndContext` → Views
- Demo page in `src/components/demo/` shows integration patterns
- Settings component demonstrates configuration options

### File Organization

- One component per file with co-located types when needed
- Shared types in `src/components/types.ts`
- Utilities in `src/lib/` (utils, dayjs config, seed data)
- Contexts have separate provider and context files

## Integration Points

### External Dependencies

- `@dnd-kit/core` for drag and drop (configured in dnd-context)
- `dayjs` for date manipulation (extensive plugin configuration)
- `@radix-ui` components via shadcn/ui
- `motion` (framer-motion) for view transitions

### Data Flow

1. Events stored in calendar context state
2. Views query context for date-specific events
3. Event positioning calculated per view (month/week/day have different logic)
4. Form submissions update context state
5. DnD operations update event times/dates via context

## Testing & Debugging

- **Test-First Development**: Always write tests before implementation
- **🚨 CRITICAL: TDD IS MANDATORY** - Never implement code without tests first
- Use `bun test` for testing (no Jest/Vitest)
- **Mandatory test coverage**: Every new function, component, and feature must have tests
- **NEVER create new test files - always update existing test files when adding tests**
- **NEVER create new functions - always replace or update existing implementations**
- Test file naming: `component.test.tsx` or `utility.test.ts`
- Focus on testing behavior, not implementation details
- Mock external dependencies and focus on unit isolation
- Console logs echo from browser to server in development
- Hot reloading enabled for rapid development
- Build script supports sourcemaps and various output formats

### 🚨 CRITICAL: Strict Test Assertion Guidelines

**NEVER use weak assertions in tests - always be precise and exact:**

- ❌ **NEVER** use `toBeGreaterThan(0)` for count checks
- ✅ **ALWAYS** use exact counts: `toHaveLength(3)`, `toHaveLength(5)`, etc.
- ❌ **NEVER** use vague assertions like "should render something"
- ✅ **ALWAYS** verify exact behavior: specific elements, exact positioning, precise values
- ❌ **AVOID** complex style matching that can break due to testing library issues
- ✅ **PREFER** direct property checks: `instance.style.position`, `instance.getAttribute()`
- ❌ **NEVER** assume implementation details - test observable behavior
- ✅ **ALWAYS** test with exact test ID patterns and specific DOM queries

**Examples of Good vs Bad Assertions:**

```tsx
// ❌ BAD - Weak assertion
expect(screen.getAllByTestId(/event-/).length).toBeGreaterThan(0)

// ✅ GOOD - Exact assertion
expect(screen.getAllByTestId(/event-/)).toHaveLength(3)

// ❌ BAD - Vague check
expect(eventInstances.length).toBeGreaterThan(0)

// ✅ GOOD - Specific validation
expect(eventInstances).toHaveLength(5)
eventInstances.forEach((instance) => {
  expect(instance.getAttribute('data-testid')).toMatch(/event-id-\d+/)
  expect(instance).toBeInTheDocument()
})

// ❌ BAD - Fragile style testing
expect(instance).toHaveStyle({ position: 'absolute' })

// ✅ GOOD - Direct property check
expect(instance.style.position).toBe('absolute')
```

**Apply strict assertions to all test scenarios:**

- Recurring event counts: exact instances, not "greater than 0"
- Element positioning: specific coordinates or property values
- Component rendering: exact elements and their properties
- Data validation: precise values, not ranges
- User interactions: exact state changes and side effects

## Common Patterns to Follow

- Always destructure what you need from `useCalendarContext()`
- Use `dayjs` consistently for all date operations
- Wrap new calendar features in the existing provider hierarchy
- Follow the view component pattern for new calendar layouts
- Use the event form pattern for user interactions with events
