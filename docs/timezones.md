# Timezones

How `@ilamy/calendar` decides what clock a date is shown on. Read this before
touching anything that parses a date.

> History: the parsing half of this was an open bug until #247 — the configured
> `dayjs()` was aliased to `dayjs.tz()`, which discards the offset on an ISO
> string. That is upstream dayjs behavior for strings
> ([timezone plugin docs](https://day.js.org/docs/en/plugin/timezone), and the
> report [iamkun/dayjs#2946](https://github.com/iamkun/dayjs/issues/2946) with
> proposed fix [#2949](https://github.com/iamkun/dayjs/pull/2949)); the wrapper
> now branches instead of forwarding blindly, so the workarounds that used to be
> needed at call sites are not.

## The rule

**With a `timezone` prop, the machine's zone decides nothing. Without one,
everything falls back to the machine's zone.**

Instants never move. The only thing a zone changes is the clock a moment is
rendered against.

## What the configured constructor does

`@ilamy/utils/dayjs` exports a one-argument constructor. What anchors the value
depends on whether it carries an instant of its own:

| Input | Anchored by | Example (calendar in `Asia/Tokyo`) |
|---|---|---|
| String with `Z` / `±HH:MM` / `±HHMM` | its own offset; only the display zone changes | `'2026-08-17T22:00:00.000Z'` → `2026-08-18T07:00+09:00` |
| String with no offset (`'2026-03-02'`, `'2026-03-02T09:00'`) | the configured zone | `'2026-03-02'` → `2026-03-02T00:00+09:00` |
| `Date`, number, `Dayjs` | already an instant; only the display zone changes | — |
| Unparseable | nothing; an invalid Dayjs comes back | `'not-a-date'` → `isValid() === false` |

With no `timezone` prop an offset-less string is read by dayjs's own local parse,
the machine's zone, and never by `dayjs.tz()`. `dayjs.tz()` ends in
`utcOffset(targetOffset)`, and an offset of 0 takes `utc()`
(`dayjs/plugin/utc`, `proto.utcOffset`, v1.11.23), which returns a UTC-flagged
instance with no zone. Europe/London, Lisbon and Dublin read 0 in winter, so a
date in winter came back flagged: `add(1, 'day')` added 24 hours and
`startOf('day')` rounded in UTC, and across the 30 March 2025 change an all-day
event ended at 01:00 BST and the month grid's cells started an hour late. Zones
that are never at 0 (New York) were unaffected, and so was a London calendar
WITH the prop, where the zone name lets the patched `startOf` repair the day.

Both string rules serve the same rule at the top. An offset-carrying string
already names a moment, so re-reading its digits in the calendar's zone would
invent a different moment (that was #247: in Europe/Vienna a `…T22:00Z` all-day
event landed on the 17th instead of the 18th). An offset-less string names a
clock reading and nothing else, so anchoring it in the machine's zone would put
the same calendar on a different instant for every viewer.

Two consequences worth knowing:

- **`dayjs.tz()` throws on invalid input** (`RangeError: date value is not
  finite`) rather than returning an invalid instance, so the constructor checks
  validity before it can be reached. Call `.isValid()`; do not rely on a throw.
- **A second argument is ignored.** It used to be forwarded to `dayjs.tz()` as a
  zone name and blew up as `RangeError: invalid time zone: YYYY-MM-DD` (#242).
  The type rejects it. Format parsing would need the CustomParseFormat plugin,
  which `@ilamy/utils/dayjs` deliberately does not extend.

### Saying it explicitly

- `dayjs.tz(value)` — read a wall-clock string in the calendar's zone on
  purpose. Use it when the value IS a clock reading, e.g. the `'YYYY-MM-DD'` an
  `<input type="date">` reports.
- `dayjs.utc(iso).tz(zone)` — parse an instant and render it in a zone named
  explicitly, depending on no global at all. `read-cell.ts` in the
  drag-to-create plugin does this for the `data-start`/`data-end` attributes.

## Ordering: applied in an effect, then converted

`dayjs.tz.setDefault` is a module-level global, so **when** it is set matters as
much as what it is set to. `useCalendarEngine` sets it in an effect, which means
the first render happens in the machine's zone and the same effect then converts
what the calendar is already holding:

```
render:   IlamyCalendar normalizes events -> machine zone
          engine slices hold initialDate  -> machine zone
effect:   dayjs.tz.setDefault(timezone)   -> every LATER parse is in-zone
          currentDate + currentEvents converted with .tz(timezone)
```

**Why not during render, when that would be correct on the first paint?**
Because a component renders on the server too — Next.js prerenders `'use client'`
components ([docs](https://nextjs.org/docs/app/getting-started/server-and-client-components))
— and a module-global write there is shared across concurrent requests, so a
multi-tenant server prerendering two zones at once could interleave them. Effects
never run during SSR, so keeping the write in an effect keeps it on the client.
The cost is one extra render and a brief first paint on the machine's clock.

The ref that guards the effect must start at `undefined`, **not** at the
`timezone` prop. Seeding it with the prop makes the guard false on mount, so
`setDefault` never runs at all and the prop only takes effect if it later changes
— that was half of #247, and it is why `docs/performance.md`'s guard pattern
needs this one exception.

**A single global means a single zone.** Two calendars mounted with different
`timezone` props will fight over it. A known limit of the design.

## Incoming props are re-anchored

`normalizeEvents` and the navigation slice route even an already-`Dayjs` value
back through the configured constructor. A consumer builds those in its own
module, in the machine's zone; passing them through would render a correct
instant against the wrong clock. Re-anchoring keeps the instant and changes only
the clock.

`initialDate` is the one prop that does NOT come through parsed, and it cannot:
re-anchoring keeps the instant, but the date a calendar opens on is a position
in the grid rather than a moment, so `'2026-03-02'` has to mean 2 March wherever
it is read. Telling those apart needs the raw value, because a parse has already
thrown the distinction away. The engine therefore takes the prop unparsed and
applies the same rule the constructor does, with the zone passed in rather than
read from the module default (`setDefault` runs in an effect, too late for the
first render). The shared predicate is `isWallClockReading` in
`packages/utils/src/dayjs.ts`.

This is FullCalendar's `timeZone` rule too: a string without an offset is
"parsed (and thus displayed) as if it were" in the configured zone, one with an
offset is "appropriately shifted to display" in it.

Removing the `timezone` prop is handled symmetrically: fresh parses go back to
the machine's zone, and the dates the calendar already holds are converted with
`.local()` rather than left on the old clock.

## Comparing dates

Unitless comparison answers by INSTANT. `isBefore`, `isAfter`, `isSame`,
`isSameOrBefore` and `isSameOrAfter` are overridden in
`packages/utils/src/dayjs.ts` (`compareByInstant`) to compare epoch
milliseconds whenever no unit is given and the operand is already a Dayjs.
Anything else, a unit or a string/Date/number operand, falls through to dayjs
untouched.

This is what dayjs documents unitless comparison to be, "default milliseconds"
(https://day.js.org/docs/en/query/is-before), and upstream does not deliver it
for zone-aware instances. Every comparator routes through `startOf`,
dayjs-timezone overrides `startOf` with a format, reparse and `.tz(zone, true)`
round-trip, and that re-anchor MOVES an instance whose offset is stale. Two
instants an hour apart compared equal. Reported upstream as dayjs#1399 (open
since 2021); the cost, 45µs to 135µs per call, as dayjs#2344 (open since 2023).

Three consequences worth knowing:

- **A drifted instance now orders by its real instant.** `add(n, 'day')` across
  a DST transition holds the wall clock but carries the previous offset, so
  such a value compares as the instant it actually is, not as the instant its
  clock face suggests.
- **`dayjs.max` and `dayjs.min` change with it.** The minMax plugin calls
  `isAfter`/`isBefore` with a Dayjs and no unit, so both take the fast path.
- **The override is global.** `dayjs.extend` mutates the prototype of whichever
  `dayjs` module instance resolves, so an app whose own `dayjs` dedupes to the
  same copy gets this behaviour outside the calendar too. The same is already
  true of `fixTimezoneOffset`.

**Building a day or a clock time: re-anchor, do not step.** `add`, `subtract`
and the `.hour()` setter keep the UTC offset of the date they start from, so on a
day the clocks change they give the right clock face but an instant an hour off
(the previous day at midnight, or 10:00 for a picked 9:00), and `format()` hides
it. This is independent of the machine's zone and is not the machine-zone gap
below. Anything that becomes an instant (a cell's `data-start`, a saved event, a
date handed to `onDateChange`) is re-anchored after stepping: `startOf('day')`
for a day, `withOwnOffset` (`utils/date-utils.ts`) for a date that keeps its
time of day, or a zoneless wall-clock string for a clock time (as the event form
and `calculateDropTimes` do). A wall-clock time the clocks skip reads with the
offset before the gap, a repeated one is its first occurrence (RFC 5545
section 3.3.5), so 02:30 on a spring-forward day is 03:30. `date-utils.test.ts`
pins every day of the 2025 New York, London and Sydney changes. The title
dropdown's month and year grids hand over `withOwnOffset(...)` of the date they
rebuilt, for the same reason.

**The event form does not rewrite a schedule the user did not touch.** The form
shows an event as days and times in the calendar's zone and builds `start` and
`end` back from them, which cannot reproduce a value the zone does not represent:
an all-day event stored as UTC midnights (`T00:00Z` to the next `T00:00Z`) read in
a New York calendar came back 48 hours long. An existing event saved with no
schedule field edited keeps its `start`, `end` and `allDay` exactly as stored. Once
a field is edited the form's values are written, so an all-day event edited in a
zone other than the one it was stored in is rebuilt from that zone's days. How an
all-day event should be anchored across zones (FullCalendar treats its dates as
zoneless) is not decided; see the dev log of 2026-10-22.

**Comparing calendar DAYS is a different question.** `isSame(x, 'day')` carries
a unit, so it still routes through dayjs-timezone's `startOf` at ~101µs. Use
`isSameDay` from `@ilamy/utils/helpers` instead, which compares rendered
`YYYY-MM-DD` keys for ~1.5µs. It renders each operand in ITS OWN zone, so it
expects both to share one, which every call site in the calendar does. It is
not a drop-in for `isSame(x, 'day')`: for a single instant held as 23:00 in New
York and 12:00 the next day in Tokyo, dayjs answers true and `isSameDay`
answers false.

## Writing timezone tests

Four rules, each learned from a test that lied:

1. **Set the zone explicitly.** `dayjs.tz.setDefault('Asia/Tokyo')` in the test.
   Without it the misparse cannot manifest and the test is falsely green.
2. **Assert an instant at least once** — `toISOString()` or `valueOf()`, not only
   `format()`. A shifted instant hides behind a matching format when both sides
   were parsed the same wrong way. This is why 1127 tests missed #247.
3. **Never assert "whatever the machine would say".** Expectations must be
   absolute, so they hold on CI and on a laptop in any zone.
4. **You cannot vary the machine's zone inside a test.** dayjs's timezone plugin
   caches an `Intl.DateTimeFormat` per zone, so mutating `process.env.TZ`
   mid-run is ignored once that formatter exists — the first zone used wins for
   the rest of the process. A helper that appears to prove machine-independence
   this way proves nothing. To test on another machine zone, start a child
   process with `TZ` set (`runOnMachineIn` in `packages/utils/src/dayjs.test.ts`);
   in the browser, set Playwright's `timezoneId` (`test.use`).

### Why the suite runs in UTC, and why that is fine

`bun test` ignores the machine's zone: "By default, `bun test` runs in UTC
(`Etc/UTC`)" (https://bun.com/docs/test/time). Measured on a Vancouver machine:
plain `bun` reports `America/Vancouver`, the same code inside `bun test` reports
`UTC`. CI runs in UTC too. So every developer and CI run the suite at the same
offset, and it passes everywhere without anyone setting anything.

Most tests are written for that: fixtures are full ISO strings with `Z`, and
expectations read them on a UTC clock (a `09:00Z` event asserted at the 9am row).
That is deliberate, not an oversight. It keeps every fixture a full ISO string
(see the date rules in `AGENTS.md`), and it keeps expectations absolute (rule 3).

What it means: exporting a zone, e.g. `TZ=America/Vancouver bun test`, fails
about 150 tests in `packages/calendar`. That is expected and is not a bug. With
no `timezone` prop the calendar correctly shows a `09:00Z` event at 01:00 in
Vancouver; only the test's UTC-shaped expectation is wrong. Measured on
2026-10-12: replaying those tests with the calendar's zone set to UTC makes them
pass on Vancouver, Kolkata and Auckland machines. Do not rewrite fixtures to
make the suite pass under an exported `TZ`.

The cost: at offset zero a wall-clock misreading is a no-op, so the suite cannot
catch bugs that only appear on a machine in another zone. Those are tested on
purpose, one case at a time, in a child process with `TZ` set (rule 4), or in
the browser with Playwright's `timezoneId`.

## The machine's zone still leaks through dayjs (Temporal migration required)

The rule above says the machine's zone decides nothing once a `timezone` prop
is set. dayjs does not fully keep that promise, and the next major version
**must** move date math to Temporal to fix it.

dayjs keeps a date in another zone as a local `Date` shifted by that zone's
offset, and reads its hours through the machine's zone (`proto.utcOffset` in
`dayjs/plugin/utc`, `proto.tz` in `dayjs/plugin/timezone`, v1.11.23). When the
shifted time falls in the machine's own clock change, the reading is an hour
off. Measured on dayjs 1.11.23 in Chrome, Firefox, Safari and Bun, all correct
with the machine in UTC:

- With a Havana calendar on a Vancouver machine, `06:30Z` (02:30 in Havana)
  reads 03:30 (dayjs#2304).
- With a New York calendar on a Vancouver machine, `startOf('day')` on 9 March
  2025 returned 23:00 the day before, and the week view skipped the week of
  9 March (dayjs#1437).

`startOf`/`endOf` are patched in `packages/utils/src/dayjs.ts`: the clock is
rounded in UTC, so the week view and day boundaries no longer depend on the
machine. That is a symptom fix. Other readings can still be an hour wrong, for
roughly one hour a year, when the calendar's zone and the machine's change
their clocks at different times.

The same leak reached week numbers: dayjs `week()` diffs two instants, and the
utc plugin flags a zone whose offset is 0 (London in winter) as UTC but not the
same zone in summer, so `diff` falls back to the machine's zone and the number
was a week early from April to October on a UTC machine
(`dayjs/plugin/utc` `proto.diff`, `dayjs/plugin/timezone` `proto.tz`: `isUTC = !Number(offset)`,
v1.11.23). `getWeekNumber` therefore counts days on a plain UTC calendar and
calls no dayjs date math.

Each patch here covers one symptom of the same design, so the fix is not more
patches. FullCalendar keeps clock times in UTC "date markers" and converts at
the edges through the zone database, with Temporal since v7
(`packages/headless-calendar/src/marker.ts` and `env.ts`, v7.1.1). Moving to
Temporal changes the public `dayjs` export of the plugin SDK, so it needs a
major version.

Temporal needs a polyfill. Native support covers 70.18% of users
([caniuse](https://caniuse.com/temporal), checked 2026-10-10): Chrome and Edge
144+, Firefox 139+, but Safari only in Technology Preview and neither iOS
Safari nor Samsung Internet. The plan is to do what FullCalendar v7 does:
depend on `temporal-polyfill` (MIT, by FullCalendar's author; v7.1.1 pins
`^1.0.1`) and import its function API (`temporal-polyfill/fns/ZonedDateTime`,
`.../PlainDateTime`, `.../Instant`), which leaves the global `Temporal` alone
and tree-shakes. Every browser then runs the same code, and consumers install
nothing extra. The polyfill does not defer to native Temporal by itself; its
README offers a codemod to move to `Temporal.*` once Safari ships it. Its
README claims "Less than 20 kB"; measure what it adds to our bundle before
committing to it.

The migration also removes a second hazard, found on 2026-10-12: the dayjs
configuration can load twice. The patches in `dayjs.ts` modify dayjs's shared
prototype and assume they run once, and a second copy wraps the first.

- **The published bundle** held two copies up to 3.3.0. Bun resolves an import
  through the tsconfig nearest the importing file, and `packages/ui/tsconfig.json`
  had no `paths`, so `@ilamy/ui` reached `@ilamy/utils` through its package
  exports (`packages/utils/dist`), not the source the calendar uses. That copy
  was whatever `dist` was lying around: 3.3.0 shipped one built before #378. A
  fresh clone could not run `build:lib` at all. Fixed on 2026-10-25: ui maps
  `@ilamy/utils/*` to source like the calendar and plugins do (its own build
  drops the mapping, see `packages/ui/tsconfig.build.json`), and the build has
  one copy (one `dayjs/plugin/timezone.js` import in `dist`).
- **Tests** still load two copies when they load a plugin: a plugin imports the
  host through `@ilamy/calendar`, which resolves to the built `dist` and its
  bundled copy, next to the source the test imports. That is deliberate, since
  plugins consume only the public API.

The 2026-10-12 note reported a symptom: near the machine's own clock change the
second copy read an hour early, so a London calendar on an Auckland machine
started the week of 1 October 2025 at 23:00 on 27 September, and the month grid
repeated a week and dropped the next (`month.test.tsx` "across a DST
transition"). Checked on 2026-10-25 with `TZ=Pacific/Auckland`, that test passes
with and without the fix above, and also with a `utils` `dist` built from before
#378 and from before #328. It does not reproduce, and what fixed it is
unverified. With the function API nothing is patched, so a second copy is
harmless. The build should still resolve `@ilamy/utils` to one module, or the
code ships twice and any module-level state (like today's default zone) splits.

The plan for the public API, so consumers and plugins stop depending on a date
library:

- **Date math** runs on `temporal-polyfill`'s `fns` API inside `@ilamy/utils`,
  the way that package wraps dayjs today. **Formatting** uses `Intl`. `Intl`
  alone can display a moment in a zone but cannot do date arithmetic (start of
  day, add a day, a clock time in a zone), which is why Temporal is needed.
- **Public dates become ISO strings or `Date`**, not a library type:
  `CalendarEvent.start`/`end`, cell info, `renderCell(date)` and callback
  arguments. Consumers then need no date library, and native Temporal can
  replace the polyfill later without another breaking change. Exposing
  Temporal objects instead was considered: more precise, but it ties every
  consumer to the polyfill's types until Safari ships Temporal.
- **The `dayjs`, `Dayjs` and `ManipulateType` exports are removed.** They exist
  so consumers can build event dates and third-party plugins can do math in
  the calendar's zone; ISO strings cover the first.
- **`timezone` on the context API** (`IlamyCalendarApi.timezone`, already
  there since v2) covers the second: a plugin reads the calendar's zone and
  uses Temporal, or any library, itself.
- **Scope at the time of writing (2026-10-11):** 81 source files and 64 test files import
  the configured dayjs.
- **Before starting:** check what FullCalendar v7 exposes publicly for dates
  (unverified so far), and measure the polyfill's bundle cost.

The migration's acceptance check: for calendar zones with awkward rules
(clocks changing at midnight, by half an hour, in the southern hemisphere, and
offsets that are not whole hours), around every clock change of a year, every
day, week, month and hour boundary and every clock reading must match a
reference built on `Intl` alone, on several machine zones (child processes with
`TZ` set). Where a clock reading occurs twice, Temporal decides: a day starts
at its first midnight (`ZonedDateTime#startOfDay()`), ends just before the next
day starts, and an hour rounds within its own offset
(`round({ roundingMode: 'floor' })`). Measured on dayjs 1.11.23 across 14
such zones: `main` gave 38 wrong results on a UTC machine, 92 on Vancouver and
54 on London; with this patch 13 remain on every machine (zones whose clocks
change at midnight, where dayjs picks the wrong one of a repeated midnight),
plus up to 27 more depending on the machine (Havana, London, Beirut, New York).

## A moved event keeps its wall-clock length

A drag applies one delta to both edges (FullCalendar `event-mutation.ts:110-114`
with `marker.ts:48-58`, v7.1.1), so a moved event keeps its length on the
clock, not on the stopwatch: its elapsed length changes by an hour when the
move crosses a clock change (a 12 hour overnight shift moved over the spring
change then lasts 11 elapsed hours), and `delta` equals `endDelta`. An end
that would land in the skipped hour is read forward by the zone, as a
clock reads it. Resize and drag-to-create snap an edge to a slot boundary, an
exact slot length, so they have no such length to keep.

## Key files

- `packages/utils/src/dayjs.ts` — the configured constructor, the offset rule, and `compareByInstant`
- `packages/utils/src/helpers.ts` — `dayKey` / `isSameDay` for calendar-day questions
- `packages/calendar/src/features/calendar/hooks/use-calendar-engine.ts` — `anchorInitialDate` (the date the calendar opens on) and the effect that applies the zone and converts held dates
- `packages/calendar/src/features/calendar/utils/normalize.ts` — re-anchoring incoming events
- `packages/plugins/drag-to-create/src/utils/read-cell.ts` — the explicit `dayjs.utc(iso).tz(zone)` pattern
