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

### Test IDs
- **Convention**: Use hardcoded `data-testid` attributes in components.
- **Prohibition**: Do not pass `data-testid` as a prop.
- **Testing**: Update tests to select by these hardcoded IDs.

## Memory Bank
- **User Preference**: The user prefers strict adherence to `CLAUDE.md` and explicitly asked to be consulted before commits.
- **Recent Changes**: Refactored `getPositionedDayEvents` to be adaptive to grid size and type.
