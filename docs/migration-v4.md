# Migrating to v4

Everything 4.0 removes or changes, with its replacement. 3.3 is the last minor
before 4.0, and every name listed under **Removed in 4.0** already works the new
way in 3.3 and carries a `@deprecated` TSDoc tag, so you can migrate before
upgrading. Nothing here prints a runtime warning.

The plan behind this list is `docs/roadmap.md` (Release 4.0). All 4.0 design
decisions (D2, D3, D5, D7–D12) are settled and match FullCalendar's documented
behaviour.

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

## Single internal renderer, symmetric imports & CSS entry point

In 4.0, `@ilamy/calendar` (root `.`) is the pure headless core (Temporal helpers, controller, interactions, layout, view-models, i18n, and shared domain & slot contracts — zero framework runtime, zero UI, zero CSS). One internal Preact 11 renderer (`packages/calendar/src/lib/renderer/`, never exposed in `.d.ts` or headless core `.`) drives the calendar UI and is wrapped symmetrically by **all five framework adapters** (`@ilamy/calendar/react`, `@ilamy/calendar/vue`, `@ilamy/calendar/svelte`, `@ilamy/calendar/solid`, `@ilamy/calendar/angular`):

```diff
- import { IlamyCalendar, useIlamyCalendarContext } from '@ilamy/calendar'
+ import { IlamyCalendar, useIlamyCalendarContext } from '@ilamy/calendar/react'
+ import '@ilamy/calendar/styles.css'
```

- **React adapter (`@ilamy/calendar/react`):** Wraps the internal Preact renderer and mounts region `slots` and React render callbacks (`renderEvent`, `headerComponent`, `renderEventForm`, `renderResource`, `renderHour`, `renderCurrentTimeIndicator`, `onMoreEventsClick`) via `ReactDOM.createPortal`, with `useSyncExternalStore` + Context powering `useIlamyCalendarContext()` and `ref`.
- **Unified drag-and-drop & resize:** Built into `lib/interactions/`'s single zero-dependency pointer engine across every framework. `@dnd-kit/core` and `@dnd-kit/modifiers` are completely removed.
- **Framework-agnostic plugins:** `@ilamy/calendar/plugins/{recurrence,agenda,year,ical,drag-to-create}` implement a single framework-agnostic `CalendarPlugin` contract and work identically across React, Vue, Svelte, Solid, and Angular.

If you used Tailwind v4's `@source` directive for `@ilamy/calendar/dist`, remove it — Tailwind is no longer required:

```diff
  @import 'tailwindcss';
- @source "../node_modules/@ilamy/calendar/dist";
```

## Zero UI-library dependencies & region slots (#401)

`@ilamy/calendar` removes all third-party UI and drag dependencies: `@radix-ui/*`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `@mui/material`, `@stylexjs/stylex`, `class-variance-authority` (`cva`), `clsx`, `tailwind-merge`, `lucide-react`, and unreleased `CalendarComponents` overrides are all gone.

- **Single native HTML defaults:** The internal renderer renders accessible native HTML primitives (`<dialog>`, `<button>`, `<input>`, `<textarea>`, `<select>`, `<input type="checkbox">`, `<label>`) and inline SVG icons, styled directly by `@ilamy/calendar/styles.css` (zero Tailwind required).
- **Custom UI via region `slots` & CSS tokens:** Plug in **shadcn with Base UI (#401)**, **Radix**, **MUI**, **bits-ui**, **React Aria**, or your own components via region-level `slots` (`header`, `event`, `resource`, `eventForm`, `moreEventsDialog`, `recurrenceScopeDialog` — or React portal callbacks like `renderEventForm` and `headerComponent`), while `@ilamy/calendar/styles.css` auto-bridges shadcn/Tailwind variables or takes `--ilamy-*` / `slotProps` overrides.

## Runtime dependencies & optional peers

`temporal-polyfill` and internal `preact` (`11.2.0`, never leaked into public `.d.ts` or headless core `.`) are the only runtime `dependencies` of `@ilamy/calendar`. Everything else is an optional `peerDependency` installed only for what you use (zero `@dnd-kit/*`, zero `@mui/material`, and zero `@stylexjs/stylex` peers):

- **Framework runtimes:** `react` & `react-dom`, `vue`, `svelte`, `solid-js`, or `@angular/core`
- **Recurrence:** `rrule` (only needed when using `@ilamy/calendar/plugins/recurrence`)
- **Tailwind:** `tailwindcss` (optional; `@ilamy/calendar/styles.css` works standalone with zero Tailwind)

## Direct CSS & token styling

v4 ships zero UI-component or CSS-in-JS adapter subpaths (`@ilamy/calendar/styles/stylex`, `./styles/mui`, `./themes/*`, and `./react/mui` were never shipped in 3.x and are removed in 4.0); every styling integration uses standard CSS stylesheets and `slotProps` across all five frameworks:

- `@ilamy/calendar/styles.css` — combined `@layer ilamy.base, ilamy.theme` stylesheet (auto-bridges shadcn `--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--radius`, and `.dark` CSS variables when present — works with Base UI #401, Radix, React Aria, shadcn-vue, shadcn-svelte, and plain CSS)
- `@ilamy/calendar/styles/base.css` — structural layout only (`@layer ilamy.base`)
- `@ilamy/calendar/styles/theme.css` — default visual theme layer only (`@layer ilamy.theme`)
- **StyleX / MUI / Tailwind recipes:** Pass `--ilamy-*` CSS variables via `slotProps.root` or pass `unstyled` with Tailwind utility `slotProps.className` (see website Styling docs)

## Moved to plugins in 4.0

- **Year view (`plugins/year`) and iCal export (`plugins/ical`)** move out of
  core into plugins (D7), matching FullCalendar (`multimonth`, `icalendar`).
  `onEventAdd`, `onEventUpdate` and `onEventDelete` are **kept** alongside
  `onEventsChange` (D2), matching FullCalendar (`eventAdd`, `eventChange`,
  `eventRemove` alongside `eventsSet`).

## Default changes in 4.0

- **`nowIndicator` defaults to `false`** (D3; was `true` in 3.x), matching
  FullCalendar (`https://fullcalendar.io/docs/nowIndicator`). Pass
  `nowIndicator` to show the current-time line.
- **`editable` defaults to `false`** (D8; was `true` in 3.x), matching
  FullCalendar (`https://fullcalendar.io/docs/editable`). Pass `editable` to
  enable drag and resize.
- **`displayEventTime` and `displayEventEnd` defaults** (D9; were off unless
  set or `eventTimeFormat` was passed in 3.x): `displayEventTime` defaults to
  `true`, and `displayEventEnd` defaults to `false` in month view and `true`
  in week/day time-grid views, matching FullCalendar
  (`https://fullcalendar.io/docs/displayEventTime`, `displayEventEnd`).
- **`onDateChange` and `currentRange` trim to drawn days** when `hiddenDays`
  or `weekends` hide days (D10; 3.x kept the full un-trimmed range), matching
  FullCalendar's `activeStart` / exclusive `activeEnd` on `datesSet`
  (`https://fullcalendar.io/docs/datesSet`, `view-object`).
- **Month cells report `allDay: true`** in `onCellClick` and drag-to-create
  selections, and a form opened from one defaults to all-day (D11; was
  `allDay: false` in 3.x), matching FullCalendar's day grid
  (`https://fullcalendar.io/docs/dateClick`, `DayGridRows.tsx:256`, v7.1.1).

- **`BusinessHours.daysOfWeek` defaults to Monday to Friday.** In 3.x a
  `BusinessHours` without `daysOfWeek` applies to every day, weekends included
  (changed in 3.2.1's docs to say so). The standard (FullCalendar's
  `core/src/structs/business-hours.ts`, v6.1.21, per the TODO in
  `packages/calendar/src/features/calendar/utils/business-hours.ts`) defaults it
  to Monday to Friday, and ignores an array entry that omits it. To keep a
  seven-day schedule after upgrading, list all seven days in `daysOfWeek` now.
- **Business hours shade; they no longer refuse.** In 3.x a cell outside
  `businessHours` (a resource's own, or the calendar's) refuses clicks
  (`onCellClick` and the form it opens), drops, resizes and drag-to-create,
  and so does a month view's padding day from the neighbouring month. In 4.0
  `businessHours` only shades the closed time, and `hideNonBusinessHours`
  still hides it; every cell takes clicks, drops, resizes and drag-to-create.
  `isCellDisabled` is unchanged: it is your own refusal and keeps refusing.
  Restricting becomes opt-in, with FullCalendar's options:
  - `eventConstraint: 'businessHours'` limits moves and resizes. The whole
    event must fit inside business hours, not just the cell under the pointer
    (a 10:00 to 12:00 event cannot be dropped at 16:00 when business hours end
    at 17:00).
  - `selectConstraint: 'businessHours'` limits drag-to-create the same way.
  - The event form's business-hours limits (the resource-aware day and time
    pickers) follow these options too, so the form and the grid give one
    answer. FullCalendar has no event form, so this part is ilamy's choice,
    made to match the roadmap's "one answer for drag, resize, select and form"
    (`docs/roadmap.md`, 4.1.2).

  The standard, read on 2026-10-25 (RFC 5545 has no notion of business hours,
  so FullCalendar decides):
  - https://fullcalendar.io/docs/businessHours: business hours "emphasize"
    time slots; the default is `false` and the page states no restriction.
  - https://fullcalendar.io/docs/eventConstraint: with `"businessHours"`,
    dragged or resized events "must be fully contained within the week's
    business hours".
  - https://fullcalendar.io/docs/selectConstraint: the same values, for
    selection.
  - https://fullcalendar.io/docs/dateClick and
    https://fullcalendar.io/docs/showNonCurrentDates: neither states a
    restriction; the source settles both (below).

  What the v7.1.1 source does (`packages/preact/src/`, tag `v7.1.1`, commit
  `786d1b2`):
  - Business hours are parsed into background events, `display:
    'inverse-background'`, Monday to Friday 09:00 to 17:00 by default
    (`structs/business-hours.ts:12-19`). Validation consults them only for the
    `'businessHours'` constraint (`validation.ts:273-277`), and a constraint
    exists only when `eventConstraint` or `selectConstraint` is set
    (`reducers/CalendarDataManager.ts:690` and `:701`,
    `component-util/event-ui.ts:68`). A move or resize is checked by
    `isInteractionValid` (`EventDragging.ts:193`, `EventResizing.ts:150`, in
    `interaction-plugin/interactions/`), a selection by `isDateSelectionValid`
    (`DateSelecting.ts:85`); both test `validRange` and the constraints, and
    nothing else about business hours (`validation.ts:23-46`). Containment is
    of the whole range (`validation.ts:307-319`).
  - `dateClick` fires outside business hours. `DateClicking.ts` gates only on
    a `dateClick` handler existing and the press not being on an event, a
    "+more" link, a nav link or a popover (`DateClicking.ts:48-53`,
    `component/DateComponent.ts:46-53`), then fires whenever the press and
    release land on the same hit (`DateClicking.ts:64-73`), with no
    validation call.
  - Padding days take drops, resizes, clicks and selection by default. A hit
    counts only inside the view's `activeRange`
    (`interaction-plugin/interactions/HitDragging.ts:184-185`), and
    `activeRange` is the whole rendered range, padding days included, unless
    `showNonCurrentDates` is `false` (`DateProfileGenerator.ts:127-131`;
    default `true` at `options.ts:501`). With `showNonCurrentDates: false`
    they become dead cells (`daygrid/DayTableModel.ts:91-93`). So in 4.0 a
    padding day refuses nothing; it stays styled as another month's day.
    (`showNonCurrentDates` itself is roadmap 4.3.5.)

  These are readings of the source, not runs of FullCalendar.
- **Public dates are ISO strings or `Date`** (see above). That touches every
  field and callback that currently carries a `Dayjs`: an event's `start` and
  `end`, `CellInfo`, `EventDropInfo`, the `onDateChange` arguments, the render
  props and the plugin contract. `EventsChange.delta` is unaffected: it is
  plain numbers.

- **iCal export writes `TZID` for a recurring series in a configured zone**
  (planned, with the iCal plugin). In 3.x such a series is exported as a UTC
  `DTSTART` and `RRULE` (see `docs/export-ical.md`); the file's `DTSTART` lines
  will change for those series, and importers will then keep the wall-clock time
  across a clock change.

## Upgrade checklist

1. On the latest 3.x, search your code for the names in the first table and move
   each to its replacement. A `@deprecated` tag makes editors strike them
   through.
2. Update React imports from `@ilamy/calendar` to `@ilamy/calendar/react`, add
   `import '@ilamy/calendar/styles.css'`, and remove any `@source` rule pointing
   at `@ilamy/calendar/dist`.
3. Remove `@dnd-kit/core` and `@dnd-kit/modifiers` if you only had them for `@ilamy/calendar` (drag and resize now use `lib/interactions`'s built-in pointer engine), and install `rrule` only if you use `@ilamy/calendar/plugins/recurrence`.
4. Style via CSS tokens (`@ilamy/calendar/styles.css`), `unstyled` + `slotProps`, and `--ilamy-*` variables, and integrate custom dialogs/headers/events/resources via region `slots` (`header`, `event`, `resource`, `eventForm`, `moreEventsDialog`, `recurrenceScopeDialog`) or React portal callbacks (`renderEventForm`, `headerComponent`, `renderEvent`, `renderResource`, `onMoreEventsClick`).
5. Pass `nowIndicator`, `editable`, `displayEventTime` and `displayEventEnd`
   explicitly if you want the 3.x defaults.
6. If you use `BusinessHours`, add `daysOfWeek` wherever you rely on the
   seven-day default.
7. If you use `businessHours` to stop people booking closed time, add
   `eventConstraint="businessHours"` and `selectConstraint="businessHours"`
   when you upgrade; without them 4.0 only shades the closed time. If you
   relied on month padding days refusing drops, refuse them in `isCellDisabled`.
8. Wrap `dayjs`/`Dayjs` usage at your boundaries so dates cross them as ISO
   strings.
9. Update imports for the year view (`@ilamy/calendar/plugins/year`) and iCal
   export (`@ilamy/calendar/plugins/ical`).
10. Do not rely on `onDateChange`/`currentRange` including hidden days or on
    month cell clicks reporting `allDay: false`.
