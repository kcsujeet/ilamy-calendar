# Gemini Context & Instructions

## Project Overview
This is the `@ilamy/calendar` project, a React Calendar component library built with **Bun**.
It features standard calendar views (Month, Week, Day, Year) and a Resource Calendar.

## Critical Instructions (Inherited from CLAUDE.md)
- **Primary Guide**: Strictly follow instructions in `./CLAUDE.md`.
- **Package Manager**: **ALWAYS use Bun**. (`bun test`, `bun run`, `bun install`).
- **TDD**: Always write tests FIRST.
- **Date Format**: Always use full **ISO 8601** format for date-time strings in tests and storage (`YYYY-MM-DDTHH:mm:ss.sssZ`). Use `dayjs` for manipulation.
- **Commits**: **NEVER commit changes without asking first.**
- **Branches**: **NEVER merge or push directly to `main`.** Always create a feature/fix branch and open a Pull Request.

## Key Implementations & Patterns

### Event Positioning
- **`src/lib/utils/position-day-events.ts`**: Handles positioning of events in Day/Resource views.
  - Supports `gridType`: `'hour'` (continuous, vertical) and `'day'` (discrete, horizontal).
  - For `gridType="day"`, events are treated as full-day blocks (discrete units), clamped to the grid boundaries.
  - Uses `days.length` as the total unit count for flexible grid sizes (not just 24h).

### Resource Calendar (`IlamyResourceCalendar`)
- **`firstDayOfWeek` Prop**:
  - **Strict Input**: Must be a lowercase string key of `WEEK_DAYS_NUMBER_MAP` (e.g., `'sunday'`, `'monday'`).
  - **Case Sensitive**: `'Monday'` (capitalized) or `1` (number) are **invalid** and will fallback to default (Sunday/0).
  - **Implementation**: The prop is mapped via `WEEK_DAYS_NUMBER_MAP` before being passed to `ResourceCalendarProvider`.

### Recurring Events
- **RFC 5545**: Strictly adhered to.
- **Storage**: `rrule` object + `exdates` array.
- **Timezone Handling (Floating Time)**:
  - Human-scheduled recurring events (e.g., "Every Wednesday at 4 PM") are evaluated in **Floating Time**.
  - **Pattern**: Dates are converted to a "floating" UTC representation (preserving local year/month/day/hour) before RRule processing, then mapped back to the user's local timezone.
  - **Reason**: Ensures events stay on the correct local day regardless of UTC day shifts (important for evening events in negative offsets like PST).
  - **Implementation**: See `generateRecurringEvents` in `recurrence-handler.ts`.

### Test IDs
- **Convention**: Use hardcoded `data-testid` attributes in components.
- **Prohibition**: Do not pass `data-testid` as a prop.
- **Testing**: Update tests to select by these hardcoded IDs.

## Testing Patterns

### Isolated Component Testing
When testing components in isolation that rely on `useSmartCalendarContext`, use a minimal `CalendarContext.Provider` wrapper instead of the full `CalendarProvider`.
- **Reason**: The full `CalendarProvider` has complex internal `useEffect` hooks and engine logic that can trigger infinite re-render loops when the component under test is rendered in isolation.
- **Implementation**: Provide only the minimal properties required by the component to the provider's `value`.

### Consistent Helper Usage
For components that require re-rendering (e.g., testing date boundaries), use a helper component that wraps the component with its necessary providers.
- **Consistency**: This ensures that `render` and `rerender` calls use the exact same provider setup.
- **Conciseness**: Removes boilerplate from individual test cases.

### Mutable Test State
Use `let` variables for mock functions or test data that need to be captured or modified across tests.
- **Cleanup**: Always reset these variables in `beforeEach` to ensure test isolation.
- **Verification**: Capture props passed to custom render functions in these variables for precise assertions.
### JSDOM and CSS `calc()` with Variables
- **Issue**: JSDOM drops `calc()` expressions containing CSS variables (e.g., `calc(50% + var(--spacing) * 0.25)`).
- **Solution**: Use `data-*` attributes to expose positioning values for testing:
  ```tsx
  <div
    data-left={event.left}
    data-width={event.width}
    data-top={event.top}
    style={{
      left: `calc(${event.left}% + var(--spacing) * 0.25)`,
      ...
    }}
  >
  ```
- **Testing**: Use `getAttribute('data-left')` instead of parsing style strings.
- **Example**: See `horizontal-grid-events-layer.tsx` and `resource-week-horizontal.test.tsx`.

## Memory Bank
- **User Preference**: The user prefers strict adherence to `CLAUDE.md` and explicitly asked to be consulted before commits.
- **Recent Changes**: 
  - Refactored `getPositionedDayEvents` to be adaptive to grid size and type.
  - Implemented **Floating Time** evaluation for recurring events to fix timezone day-shift bugs.

