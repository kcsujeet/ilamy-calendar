# Migrating to v4

Everything 4.0 removes or changes, with its replacement. 3.3 is the last minor
before 4.0, and every name listed under **Removed in 4.0** already works the new
way in 3.3 and carries a `@deprecated` TSDoc tag, so you can migrate before
upgrading. Nothing here prints a runtime warning.

The plan behind this list is `docs/roadmap.md` (Release 4.0). Dates in the
roadmap's open decisions are not fixed until 4.0 starts; the **Under
consideration** section says which defaults may change.

## Removed in 4.0

The first three names are deprecated in 3.3 with a `@deprecated` tag and a replacement that already works. `dayjs`, `Dayjs` and `ManipulateType` are removed in 4.0 but carry no deprecation tag in 3.x: `Dayjs` is the type of every callback date throughout 3.x and its replacement (ISO strings or `Date`, plus `timezone` on the context API) only exists in 4.0, so a tag now would strike through every consumer's date types with nothing to move to.

| Name | Replacement | Available since | Deprecation tag |
|---|---|---|---|
| `disableDragAndDrop` prop | `editable={false}`. An explicit `eventStartEditable` still enables moving, as `disableDragAndDrop` did. | 3.3 | `@deprecated` on `IlamyCalendarProps.disableDragAndDrop` |
| `IlamyResourceCalendar` component | `IlamyCalendar` with the `resources` prop (it carries the resource axis, `renderResource`, `orientation` and `weekViewGranularity` directly) | 2.0 | `@deprecated` |
| `IlamyResourceCalendarProps` type | `IlamyCalendarProps` | 2.0 | `@deprecated` |
| `dayjs` export | Public dates become ISO strings or `Date`; use `Date`, `Intl` or your own date library in consumer code | 4.0 only | None in 3.x: removed in 4.0; the replacement arrives in 4.0 |
| `Dayjs` type export | `string` (ISO) or `Date` (and `timezone` on the context API), wherever a callback, render prop, `CellInfo`, event or plugin contract field carried a `Dayjs` | 4.0 only | None in 3.x: removed in 4.0; the replacement arrives in 4.0 |
| `ManipulateType` type export | None; it only existed to type `dayjs` arithmetic | 4.0 only | None in 3.x: removed in 4.0; the replacement arrives in 4.0 |

### Why the `dayjs` exports go

The date core moves from dayjs to Temporal (`temporal-polyfill`), because dayjs
reads a date in another zone through the machine's own zone and can be an hour
off for about an hour a year. The reasoning, the measured cases and the
acceptance check are in `docs/timezones.md` ("The machine's zone still leaks
through dayjs"). The plugin SDK's `dayjs` export changes with it, which is why
this needs a major version.

What to do in 3.x: keep using `dayjs` and `Dayjs` as before, they work. When
writing new code, keep dates as ISO strings at your own boundaries
(`dayjs(value).toISOString()` to produce one) and convert to `dayjs` only
inside a function, so the 4.0 change is a local edit. Plugin authors: the
contract's `Dayjs` fields (`PluginDateRange`, `CellInfo`, render contexts)
become ISO strings or `Date`.

Also in 4.0 (not a rename): the context API gains `timezone`, and several zones
can be shown on one page.

## Under consideration for 4.0

These are open decisions. Each is a default or a behaviour that would change
output for code that did nothing wrong, so it is decided by the owner when 4.0
starts. Until then 3.x keeps today's behaviour. The IDs match
`docs/roadmap.md`.

| ID | Today (3.x) | Proposed 4.0 | What to do now to be safe |
|---|---|---|---|
| D2 | `onEventAdd`, `onEventUpdate`, `onEventDelete` fire one call per row | Possibly removed: `onEventsChange` reports the whole action once and covers them | Prefer `onEventsChange` in new code |
| D3 | `nowIndicator` defaults to `true` (the current time marker always shows) | Possibly `false`, the convention FullCalendar follows | Pass `nowIndicator` explicitly |
| D8 | `editable` defaults to `true` | Possibly `false` (read-only unless enabled), the convention | Pass `editable` explicitly |
| D9 | `displayEventTime` and `displayEventEnd` unset keep today's title-only bars | Possibly default `true`, the convention | Pass both explicitly |
| D10 | `onDateChange` and the `currentRange` keep the range as it was before `hiddenDays` and `weekends` existed | Possibly trimmed to the days actually drawn | Do not depend on the range including hidden days |
| D7 | iCal export and the year view are built into the core | Possibly moved to plugins (`plugins/ical`, `plugins/year`); the resource axis only if the plugin contract carries it cleanly | Nothing yet; imports will change if it happens |

## Default changes planned for 4.0

- **`BusinessHours.daysOfWeek` defaults to Monday to Friday.** In 3.x a
  `BusinessHours` without `daysOfWeek` applies to every day, weekends included
  (changed in 3.2.1's docs to say so). The standard (FullCalendar's
  `core/src/structs/business-hours.ts`, v6.1.21, per the TODO in
  `packages/calendar/src/features/calendar/utils/business-hours.ts`) defaults it
  to Monday to Friday, and ignores an array entry that omits it. To keep a
  seven-day schedule after upgrading, list all seven days in `daysOfWeek` now.
- **Public dates are ISO strings or `Date`** (see above). That touches every
  field and callback that currently carries a `Dayjs`: an event's `start` and
  `end`, `CellInfo`, `EventDropInfo`, the `onDateChange` arguments, the render
  props and the plugin contract. `EventsChange.delta` is unaffected: it is
  plain numbers.

## Upgrade checklist

1. On the latest 3.x, search your code for the names in the first table and move
   each to its replacement. A `@deprecated` tag makes editors strike them
   through.
2. Pass explicitly any option listed under **Under consideration** whose
   default you rely on.
3. If you use `BusinessHours`, add `daysOfWeek` wherever you rely on the
   seven-day default.
4. Wrap `dayjs`/`Dayjs` usage at your boundaries so dates cross them as ISO
   strings.

This file grows with each decision: a row moves from **Under consideration** to
**Removed in 4.0** or **Default changes** (or is dropped) when the owner
settles it.
