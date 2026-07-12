# Types and Interfaces

Type catalog for @ilamy/calendar. All field tables reflect actual source definitions.

## Type Relationship Chain

```
IlamyCalendarPropEvent          User provides (flexible date types: string | Date | dayjs)
        |
    normalization               IlamyCalendar converts start/end to dayjs objects
        |
CalendarEvent                   Internal canonical type (dayjs dates)
        |
    positioning                 lib/layout (geometry / vertical / horizontal)
        |
PositionedEvent                 { event: CalendarEvent } + placement fields (left/width + top/height/zIndex or row)
```

## CalendarEvent

`packages/types/src/index.ts` (`@ilamy/types`)

The core event type used throughout the library.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string \| number` | yes | Unique identifier |
| `title` | `string` | yes | Display title |
| `start` | `dayjs.Dayjs` | yes | Start date/time |
| `end` | `dayjs.Dayjs` | yes | End date/time |
| `color` | `string` | no | Text/border color (CSS value, hex, rgb, or class name) |
| `backgroundColor` | `string` | no | Background color |
| `description` | `string` | no | Event description |
| `location` | `string` | no | Event location |
| `allDay` | `boolean` | no | All-day event flag (default `false`) |
| `rrule` | `RRuleOptions` | no | Recurrence rule (RFC 5545) |
| `exdates` | `string[]` | no | Exception dates as ISO strings |
| `recurrenceId` | `string` | no | Original occurrence date this event modifies |
| `uid` | `string` | no | iCalendar UID for cross-system compatibility |
| `resourceId` | `string \| number` | no | Single resource assignment |
| `resourceIds` | `(string \| number)[]` | no | Multiple resource assignment |
| `data` | `Record<string, unknown>` | no | Custom application metadata |

## IlamyCalendarPropEvent

`src/features/calendar/types/index.ts`

Public-facing event type that accepts flexible date inputs. Extends `CalendarEvent` but replaces `start`/`end`:

| Field | Type | Description |
|-------|------|-------------|
| `start` | `dayjs.Dayjs \| Date \| string` | Accepts any date format |
| `end` | `dayjs.Dayjs \| Date \| string` | Accepts any date format |
| *(other fields)* | *(same as CalendarEvent)* | Inherited |

## Resource

`packages/types/src/index.ts` (re-exported from `src/features/calendar/types/index.ts`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string \| number` | yes | Unique resource identifier |
| `title` | `string` | yes | Display title |
| `color` | `string` | no | Resource color |
| `backgroundColor` | `string` | no | Resource background color |
| `businessHours` | `BusinessHours | BusinessHours[]` | no | Resource-specific business hours (overrides global) |
| `data` | `Record<string, unknown>` | no | Custom resource metadata |

## PluginView (view contract)

`packages/types/src/index.ts`

Describes a view — contributed by a plugin or built into the core (the four built-ins are
`PluginView` specs in `src/features/calendar/components/views/`, resolved through one path).
Core fields: `name`, `label?`, `component`, `navigationUnit?`. Optional view-spec fields:
`navigationStep?`, `range?`, `columns?` (returns `VerticalColumnSpec[]` or
`HorizontalRowSpec[]`), `layout?` (`'vertical' | 'horizontal'`), `renderHeader?`,
`supportsResources?`. A view declares `columns` + `layout` to render through the shared
grid engines, or just `component` (the escape hatch). Supporting types: `ViewConfig`,
`ColumnSpec`, `VerticalColumnSpec`, `HorizontalCellSpec`, `HorizontalRowSpec`,
`ViewHeaderContext` — all exported from `@ilamy/calendar`. Authoring guide:
`docs/custom-views.md`.

## IlamyCalendarProps

`src/features/calendar/types/index.ts`

Top-level props for `<IlamyCalendar>`. Key props summarized below — see source JSDoc for full descriptions.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `events` | `IlamyCalendarPropEvent[]` | `[]` | Events to display |
| `firstDayOfWeek` | `WeekDays` | `'sunday'` | First day of week |
| `initialView` | `CalendarView` | `'month'` | Starting view |
| `initialDate` | `dayjs \| Date \| string` | today | Starting date |
| `renderEvent` | `(event) => ReactNode` | — | Custom event renderer |
| `onEventClick` | `(event) => void` | — | Event click callback |
| `onCellClick` | `(info: CellClickInfo) => void` | — | Cell click callback |
| `onViewChange` | `(view) => void` | — | View change callback |
| `onEventAdd` | `(event) => void` | — | Event add callback |
| `onEventUpdate` | `(event) => void` | — | Event update callback |
| `onEventDelete` | `(event) => void` | — | Event delete callback |
| `onDateChange` | `(date: Dayjs, range: { start: Dayjs; end: Dayjs }) => void` | — | Date navigation callback |
| `locale` | `string` | — | dayjs locale |
| `timezone` | `string` | — | dayjs timezone |
| `translations` | `Translations` | — | Translation object |
| `translator` | `TranslatorFunction` | — | Translator function |
| `timeFormat` | `TimeFormat` | `'12-hour'` | Time display format |
| `businessHours` | `BusinessHours \| BusinessHours[]` | — | Working hours config |
| `hideExportButton` | `boolean` | `false` | Hide the iCalendar export button in the default header (desktop and mobile) |
| `hideNonBusinessHours` | `boolean` | `false` | Hide off-hours in day/week views |
| `slotDuration` | `15 \| 30 \| 60` | `60` | Time-grid granularity (minutes). `60` gives one row per hour with no sub-hour lines; `30` two; `15` four with dashed separators. Applies to day, week, and resource hour views. |
| `hiddenDays` | `WeekDays[]` | `[]` | Days to hide from vertical week view. Ignored in resource vertical week view with daily granularity (`weekViewGranularity: 'daily'`) — non-contiguous days would break multi-day event positioning. |
| `disableCellClick` | `boolean` | — | Disable cell clicks |
| `disableEventClick` | `boolean` | — | Disable event clicks |
| `disableDragAndDrop` | `boolean` | — | Disable DnD |
| `dayMaxEvents` | `number` | `4` | Max events per day in month view |
| `onMoreEventsClick` | `(day: Dayjs, events: CalendarEvent[]) => void` | — | Called when the "+N more" overflow indicator is clicked, with the cell's day and full event list. Overrides the built-in all-events dialog when provided |
| `eventSpacing` | `number` | `1` | Gap between stacked events (px) |
| `stickyViewHeader` | `boolean` | `true` | Sticky day/week headers |
| `headerComponent` | `ReactNode` | — | Custom header replacement |
| `renderEventForm` | `(props) => ReactNode` | — | Custom event form |
| `renderCurrentTimeIndicator` | `(props) => ReactNode` | — | Custom time indicator |
| `classesOverride` | `CalendarClassesOverride` | — | CSS class overrides |

## IlamyResourceCalendarProps (deprecated alias)

`src/features/calendar/components/ilamy-resource-calendar.tsx`

Deprecated alias of `IlamyCalendarProps` — the resource axis lives on `IlamyCalendar`
directly (`resources`, `renderResource`, `orientation`, `weekViewGranularity`):

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `resources` | `Resource[]` | `undefined` | Resource definitions |
| `renderResource` | `(resource) => ReactNode` | — | Custom resource renderer |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Where the resource axis goes |
| `weekViewGranularity` | `'hourly' \| 'daily'` | `'hourly'` | Week-view slot granularity with resources |

## Recurrence Types

`src/features/recurrence/types/index.ts`

### RRuleOptions

```typescript
type RRuleOptions = {
  freq: Options['freq']    // Required: RRule.DAILY, RRule.WEEKLY, etc.
  dtstart: Date            // Required: recurrence start date
} & Partial<Omit<Options, 'freq' | 'dtstart'>>
// Optional: interval, count, until, byweekday, bymonthday, bymonth, etc.
```

### RecurrenceEditScope

```typescript
type RecurrenceEditScope = 'this' | 'following' | 'all'
```

### Event Type Identification

| Type | Has `rrule` | Has `recurrenceId` | ID pattern |
|------|-------------|-------------------|------------|
| Base event | yes | no | any |
| Generated instance | no | no | `originalId_number` |
| Modified instance | no | yes | any |

Use `isRecurringEvent(event)` to check if an event is part of a recurring series.

## Union Types

`src/types/index.ts`

```typescript
type CalendarView = 'month' | 'week' | 'day' | 'year'
type TimeFormat = '12-hour' | '24-hour'
```

`packages/types/src/index.ts` (`@ilamy/types`)

```typescript
type WeekDays = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'
```

## BusinessHours

`packages/types/src/index.ts` (`@ilamy/types`)

```typescript
interface BusinessHours {
  daysOfWeek?: WeekDays[]   // Default: ['monday'...'friday']
  startTime?: number        // Default: 9 (24-hour format, 0-24)
  endTime?: number          // Default: 17
}
```

Can be a single object or an array for different hours on different days.

## CellClickInfo

`src/features/calendar/types/index.ts`

```typescript
interface CellClickInfo {
  start: dayjs.Dayjs
  end: dayjs.Dayjs
  resourceId?: string | number
  allDay?: boolean
}
```

## Key File Locations

| Type | File |
|------|------|
| `CalendarEvent`, `WeekDays`, `BusinessHours` | `packages/types/src/index.ts` (`@ilamy/types`) |
| `IlamyCalendarProps`, `IlamyCalendarPropEvent`, `CellClickInfo`, `CalendarClassesOverride` | `src/features/calendar/types/index.ts` |
| `Resource` | `packages/types/src/index.ts` (`@ilamy/types`) |
| `RRuleOptions`, `RecurrenceEditScope`, `RecurrenceEditOptions` | `src/features/recurrence/types/index.ts` |
| `CalendarView`, `TimeFormat` | `src/types/index.ts` |
| `CalendarContextType` | `src/features/calendar/contexts/calendar-context/context.ts` |
| `Translations`, `TranslatorFunction` | `src/lib/translations/types.ts` |
