# Migrating to @ilamy/calendar v2

v2 introduces a plugin architecture. The core is now plugin-agnostic; capabilities like recurring events are opt-in plugins. This guide covers every breaking change with before/after examples.

---

## 1. Plugins are opt-in — recurrence no longer works by default

In v1, recurring event expansion happened automatically. In v2 the core ships zero plugins. You must register `recurrencePlugin` explicitly.

**Before (v1)**

```tsx
import { IlamyCalendar } from '@ilamy/calendar'

// Recurring events expanded automatically
<IlamyCalendar events={events} />
```

**After (v2)**

```tsx
import { IlamyCalendar } from '@ilamy/calendar'
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'

// Register the plugin to restore recurring-event behavior
<IlamyCalendar events={events} plugins={[recurrencePlugin()]} />
```

If you have no recurring events you can omit the plugin entirely and skip the `@ilamy/calendar/plugins/recurrence` import.

---

## 2. Recurrence helpers moved to a subpath

`generateRecurringEvents`, `isRecurringEvent`, `RRule`, and `RRuleOptions` are no longer exported from the main `@ilamy/calendar` entry. Import them from the dedicated subpath.

**Before (v1)**

```ts
import {
  generateRecurringEvents,
  isRecurringEvent,
  RRule,
  type RRuleOptions,
} from '@ilamy/calendar'
```

**After (v2)**

```ts
import {
  generateRecurringEvents,
  isRecurringEvent,
  RRule,
  type RRuleOptions,
} from '@ilamy/calendar/plugins/recurrence'
```

---

## 3. `CalendarEvent` no longer has recurrence fields by default

In v1, `CalendarEvent` declared `rrule`, `recurrenceId`, and `exdates` directly. In v2 those fields are not on the core type. They are re-added via TypeScript declaration merging when you import from `@ilamy/calendar/plugins/recurrence`.

**Before (v1)**

```ts
// rrule, recurrenceId, exdates were always present on CalendarEvent
const event: CalendarEvent = {
  id: '1',
  title: 'Weekly standup',
  start: dayjs('2026-01-05T09:00:00Z'),
  end: dayjs('2026-01-05T09:30:00Z'),
  rrule: { freq: RRule.WEEKLY },
}
```

**After (v2)**

```ts
// Import the recurrence subpath first — this runs the declaration merge
import '@ilamy/calendar/plugins/recurrence'
// or, more commonly, import recurrencePlugin (same effect)
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'

// Now CalendarEvent has rrule / recurrenceId / exdates again
const event: CalendarEvent = {
  id: '1',
  title: 'Weekly standup',
  start: dayjs('2026-01-05T09:00:00Z'),
  end: dayjs('2026-01-05T09:30:00Z'),
  rrule: { freq: RRule.WEEKLY },
}
```

If TypeScript reports `Property 'rrule' does not exist on type 'CalendarEvent'`, make sure you are importing from `@ilamy/calendar/plugins/recurrence` somewhere in your project.

---

## 4. Context method renames

The recurrence-specific context methods were replaced with generic plugin-routing equivalents. The public context type is now `IlamyCalendarApi` (was `UseIlamyCalendarContextReturn`).

| v1 method | v2 replacement | Notes |
|---|---|---|
| `updateRecurringEvent(event, updates, options)` | `applyScopedEdit(event, updates, scope)` | `scope` is opaque; gathered via the mutation-scope slot |
| `deleteRecurringEvent(event, options)` | `applyScopedDelete(event, scope)` | same |
| `findParentRecurringEvent(event)` | **removed** | moved into the recurrence plugin; use `rawEvents` to find the base series if needed |

**Before (v1)**

```ts
import { useIlamyCalendarContext } from '@ilamy/calendar'

const { updateRecurringEvent, deleteRecurringEvent } = useIlamyCalendarContext()

// Edit this and following
updateRecurringEvent(event, { title: 'New title' }, { scope: 'thisAndFollowing' })

// Delete just this occurrence
deleteRecurringEvent(event, { scope: 'this' })
```

**After (v2)**

```ts
import { useIlamyCalendarContext } from '@ilamy/calendar'

const { applyScopedEdit, applyScopedDelete } = useIlamyCalendarContext()

// The scope value is produced by the recurrence plugin's mutation-scope dialog
// and passed back automatically by useScopedEventMutation inside the host.
// Direct callers pass the opaque scope they received from the plugin:
applyScopedEdit(event, { title: 'New title' }, scope)
applyScopedDelete(event, scope)
```

In most applications you do not call `applyScopedEdit`/`applyScopedDelete` directly. The host's built-in scoped-mutation flow (driven by the event form and drag-and-drop) handles them automatically when the recurrence plugin is registered.

**`rawEvents` is now public.** If you previously relied on `findParentRecurringEvent` to locate the base rrule event of a generated instance, use `rawEvents` from `useIlamyCalendarContext()` and filter by `uid`:

```ts
const { rawEvents } = useIlamyCalendarContext()
const baseEvent = rawEvents.find(
  (e) => e.uid === instance.uid && e.rrule !== undefined
)
```

---

## 5. `CalendarView` is now `string`

In v1 `CalendarView` was a closed union (`'month' | 'week' | 'day' | 'year'`). In v2 it is `string` so plugins can register additional views.

**Before (v1)**

```ts
import type { CalendarView } from '@ilamy/calendar'

const view: CalendarView = 'week' // one of four literal values
```

**After (v2)**

```ts
import type { CalendarView } from '@ilamy/calendar'

const view: CalendarView = 'week' // still works — CalendarView is now string
```

Code that compares or switches on the built-in view names still works. The change only matters if you previously relied on exhaustive narrowing or type-level enforcement of exactly four views.

The built-in views are `'month'`, `'week'`, `'day'`, and `'year'` — themselves `PluginView` specs resolved through the same path as plugin views (see `docs/custom-views.md`).

---

## 6. Deep imports are blocked

The `exports` map in `package.json` now encapsulates the package. Any import path that is not listed in the map throws `ERR_PACKAGE_PATH_NOT_EXPORTED` at runtime (and a TypeScript error at compile time).

**Before (v1)**

```ts
// Some projects imported internal modules directly
import { something } from '@ilamy/calendar/src/lib/utils'
import { CalendarContext } from '@ilamy/calendar/src/features/calendar/contexts/...'
```

**After (v2)**

These paths no longer work. The only valid entry points are:

```ts
import { ... } from '@ilamy/calendar'
import { ... } from '@ilamy/calendar/plugins/recurrence'
```

Everything that was previously accessible via deep imports is either available from one of these two entries or was intentionally internal. If you find something you need that is missing, open an issue.

---

## Type tightening (v2 structure overhaul, Phase 0)

### `Translations` is now a derived type alias, not an interface

`Translations` is now `Record<keyof typeof defaultTranslations, string>`. Annotating your
translation objects keeps working unchanged. The only break: `declare module` augmentation
that merged extra keys into the `Translations` interface no longer compiles — pass a
`translator` function for custom keys instead.

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

---

## Provider unification (v2 structure overhaul, Phase 2)

### Resource calendar: cell-click fallback now respects the cell's `allDay` flag

**Before (v1):** clicking a cell on `IlamyResourceCalendar` without a custom `onCellClick`
always pre-filled the event form with `allDay: false`, even for all-day cells.

**After (v2):** the pre-filled event respects the clicked cell's flag (`allDay: true` for
all-day cells), matching what `IlamyCalendar` has always done. If you depended on the old
hardcode, pass `onCellClick` and open the form yourself with the shape you want.

### `getEventsForResource` on `useIlamyCalendarContext()` is now optional

It only ever existed at runtime on resource calendars; the v1 type claimed it was always
present, so calling it on a regular calendar compiled and then crashed. v2 types it honestly.

**Before (v1)**

```ts
const { getEventsForResource } = useIlamyCalendarContext()
const roomEvents = getEventsForResource('room-1')
```

**After (v2)**

```ts
const { getEventsForResource } = useIlamyCalendarContext()
const roomEvents = getEventsForResource?.('room-1') ?? []
```

---

### `PluginView` gains optional view-spec fields (non-breaking)

`PluginView` adds `navigationStep`, `range`, `columns`, `layout`, `renderHeader`, and
`supportsResources` — all optional. Existing view objects (`{ name, label, component,
navigationUnit }`) keep working unchanged; verified against the v1 plugin-view shape in the
test suite. New capability, not a break: a view that declares `columns` + `layout` renders
through the calendar's shared engines, `range` drives the event pipeline, and
`navigationStep` makes prev/next jump custom windows. See `docs/custom-views.md`.

One behavior change ships alongside (see "View switcher" below): on a **resource** calendar
the switcher now hides plugin views that don't declare `supportsResources: true`. They
previously showed a button that rendered a blank body.

---

### View switcher: resource calendars hide resource-incapable plugin views

On `IlamyResourceCalendar`, plugin views now appear in the view switcher only if they
declare `supportsResources: true`. Previously every plugin view got a button that rendered
a blank body. Regular calendars list plugin views exactly as before. Plugin view `label`s
are now passed through the translator; unknown keys render verbatim, so plain-text labels
are unaffected.

---

## Summary checklist

- [ ] Add `import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'` and pass `plugins={[recurrencePlugin()]}` to `<IlamyCalendar>` / `<IlamyResourceCalendar>`.
- [ ] Move any `generateRecurringEvents`, `isRecurringEvent`, `RRule`, `RRuleOptions` imports to `@ilamy/calendar/plugins/recurrence`.
- [ ] If TypeScript reports missing `rrule`/`recurrenceId`/`exdates`, ensure the recurrence subpath is imported somewhere in your project.
- [ ] Replace `updateRecurringEvent` calls with `applyScopedEdit` and `deleteRecurringEvent` calls with `applyScopedDelete`.
- [ ] Remove any calls to `findParentRecurringEvent`; use `rawEvents` filtering instead if needed.
- [ ] Remove any deep `@ilamy/calendar/src/...` imports; use only the two public entry points.
- [ ] If you have TypeScript code that narrows `CalendarView` as an exhaustive union, update it for the new `string` type.
- [ ] If you read properties off `event.data` / `resource.data`, add narrowing or a boundary cast (`Record<string, unknown>` now).
- [ ] Remove any use of `Resource.position`; order the `resources` array instead.
- [ ] Resource calendars: if you relied on cell-click always creating `allDay: false` events, handle it in `onCellClick`.
- [ ] Call `getEventsForResource?.(id) ?? []` — it is `undefined` on regular calendars now (the type finally says so).
