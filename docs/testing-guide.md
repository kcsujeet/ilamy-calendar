# Testing Guide

Reference for writing and running tests in @ilamy/calendar.

## Running Tests

```bash
bun test                              # Run all tests
bun test --coverage                   # Tests with coverage report
bun test src/features/calendar/       # Run tests in a directory
bun test week-view.test.tsx           # Run a single file (partial match)
bun test --watch                      # Watch mode (re-run on changes)
```

## Test Framework

| Tool | Package |
|------|---------|
| Test runner | `bun:test` (built-in — not vitest or jest) |
| DOM | `@happy-dom/global-registrator` |
| Rendering | `@testing-library/react` |
| User events | `@testing-library/user-event` |
| Matchers | `@testing-library/jest-dom` (extended into `bun:test` expect) |

### Setup Files

| File | Role |
|------|------|
| `happydom.ts` | Registers happy-dom as the global DOM implementation |
| `testing-library.ts` | Extends `expect` with jest-dom matchers, runs `cleanup()` after each test |
| `matchers.d.ts` | TypeScript declarations so jest-dom matchers type-check in `bun:test` |

## File Convention

Tests are co-located next to the component they test:

```
src/features/calendar/components/week-view/
  week-view.tsx
  week-view.test.tsx       # Tests live here, not in __tests__/
```

**Never create new test files.** Add tests to the existing `*.test.tsx` file for that component.

## CalendarProvider Test Wrapper

Most tests wrap the component under test in `CalendarProvider`. Each test file defines its own render helper:

```typescript
import { render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'

const renderWeekView = (props = {}) => {
  return render(
    <CalendarProvider
      dayMaxEvents={3}
      events={mockEvents}
      firstDayOfWeek={0}
      initialDate={dayjs()}
      locale="en"
      {...props}
    >
      <WeekView />
    </CalendarProvider>
  )
}
```

To inspect context values inside tests, use a `TestWrapper` that reads from `useSmartCalendarContext()`:

```typescript
const TestWrapper = ({ children, testId }: { children: React.ReactNode; testId: string }) => {
  const { currentDate } = useSmartCalendarContext()
  return (
    <>
      <div data-testid={`${testId}-year`}>{currentDate.year()}</div>
      {children}
    </>
  )
}
```

## ResourceCalendarProvider Test Wrapper

Resource calendar tests use `ResourceCalendarProvider` instead:

```typescript
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context/provider'

const renderResourceView = (props = {}) => {
  return render(
    <ResourceCalendarProvider
      dayMaxEvents={5}
      events={mockEvents}
      resources={mockResources}
      firstDayOfWeek={0}
      {...props}
    >
      <ResourceWeekVertical />
    </ResourceCalendarProvider>
  )
}
```

## Test Event Factories

### generateMockEvents

`src/lib/utils/generator.ts` — creates an array of simple day-spanning events:

```typescript
import { generateMockEvents } from '@/lib/utils/generator'

const mockEvents = generateMockEvents({ count: 5 })
// Returns CalendarEvent[] with ids "0"-"4", each spanning one day of the current week
```

### Inline factory (common pattern)

Many test files define a local `createEvent` or `createRecurringEvent`:

```typescript
const createEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: `event-${Date.now()}`,
  title: 'Test Event',
  start: dayjs('2025-01-15T10:00:00.000Z'),
  end: dayjs('2025-01-15T11:00:00.000Z'),
  ...overrides,
})

const createRecurringEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'recurring-1',
  uid: 'recurring-1@ilamy.calendar',
  title: 'Weekly Meeting',
  start: dayjs('2025-01-06T10:00:00.000Z'),
  end: dayjs('2025-01-06T11:00:00.000Z'),
  rrule: {
    freq: RRule.WEEKLY,
    interval: 1,
    dtstart: new Date('2025-01-06T10:00:00.000Z'),
  },
  ...overrides,
})
```

## Date Handling in Tests

Always use full ISO strings. Never use `YYYY-MM-DD` format.

```typescript
// Correct
start: dayjs('2025-01-15T10:00:00.000Z')
expect(event.start.toISOString()).toBe('2025-01-15T10:00:00.000Z')

// Wrong — will cause subtle timezone bugs
start: dayjs('2025-01-15')
```

## Recurring Event Testing

Patterns for the three event types:

```typescript
// Base event (has rrule, no recurrenceId)
const baseEvent = {
  id: 'weekly-1',
  uid: 'weekly-1@ilamy.calendar',
  rrule: { freq: RRule.WEEKLY, interval: 1, dtstart: new Date('2025-01-06T10:00:00.000Z') },
  // ...
}

// Generated instance (no rrule, no recurrenceId, id = "originalId_index")
// Created by generateRecurringEvents() — you don't build these manually

// Modified instance (no rrule, has recurrenceId)
const modifiedInstance = {
  id: 'weekly-1_modified_123',
  uid: 'weekly-1@ilamy.calendar',
  recurrenceId: '2025-01-13T10:00:00.000Z',  // ISO string of original occurrence
  title: 'Updated Meeting',
  // ...
}
```

EXDATE verification — check that deleted occurrences appear in `exdates[]`:

```typescript
const updatedEvents = deleteRecurringEvent({ targetEvent, currentEvents, scope: 'this' })
const baseEvent = updatedEvents.find(e => e.rrule)
expect(baseEvent.exdates).toContain('2025-01-13T10:00:00.000Z')
```

## Mocking

### Bun's mock() function

```typescript
import { beforeEach, mock } from 'bun:test'

const mockOnEventAdd = mock(() => {})

beforeEach(() => {
  mockOnEventAdd.mockClear()
})

// Assert
expect(mockOnEventAdd).toHaveBeenCalledWith(expectedEvent)
```

### Browser APIs

happy-dom provides `ResizeObserver` and `IntersectionObserver` out of the box — no manual mocks needed.

### DST limitation

`bun test` runs in UTC, which has no DST transitions. DST bugs can only be verified manually in the browser with a DST timezone (e.g., `TZ=America/Halifax`).

## Common Gotchas

| Gotcha | Fix |
|--------|-----|
| `act()` warnings on state updates | Wrap interactions in `await userEvent.click()` or use `waitFor()` |
| Test passes alone but fails in suite | Check `beforeEach` cleanup — each test should set up its own state |
| Portal-rendered content not found | Dialogs/popovers render outside the component tree — use `screen.getByRole()` which searches the whole document |
| Events not appearing in rendered view | Ensure `initialDate` matches the event dates and `events` are passed to the provider |
| Import errors on `dayjs` | Always import from `@/lib/configs/dayjs-config`, never from `dayjs` directly |

## Key Files

| File | Role |
|------|------|
| `happydom.ts` | Global DOM registration |
| `testing-library.ts` | Matcher extensions and cleanup |
| `matchers.d.ts` | TypeScript declarations for extended matchers |
| `src/lib/utils/generator.ts` | `generateMockEvents` factory |
