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

`safeDate` is the deliberate exception: it passes a `Dayjs` through untouched,
because its only caller that can supply one is `IlamyCalendar`'s `initialDate`,
which the navigation slice re-anchors anyway. Watch the direction of the argument
here — the navigation slice's `isDayjs` check had to GO (`initialDate` is typed
as `Dayjs` there, so the check could only ever choose pass-through, and nothing
downstream re-parses it), while `safeDate`'s had to STAY.

Removing the `timezone` prop is handled symmetrically: fresh parses go back to
the machine's zone, and the dates the calendar already holds are converted with
`.local()` rather than left on the old clock.

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
   this way proves nothing.

Note that happy-dom makes `Intl` resolve to `UTC` (`process.env.TZ` is unset),
so tests run at offset zero unless a developer exports `TZ`. At offset zero a
wall-clock misreading is a no-op, which is exactly why this class of bug hides.
Running the suite with an exported non-UTC `TZ` fails tests that hard-code
UTC-shaped display, e.g. a `09:00Z` event asserted at the 9am row: an IST viewer
correctly sees that at 14:30.

## Key files

- `packages/utils/src/dayjs.ts` — the configured constructor and the offset rule
- `packages/calendar/src/features/calendar/hooks/use-calendar-engine.ts` — the effect that applies the zone and converts held dates
- `packages/calendar/src/lib/utils/normalize.ts`, `packages/calendar/src/features/calendar/hooks/use-calendar-navigation.ts` — re-anchoring incoming props
- `packages/plugins/drag-to-create/src/utils/read-cell.ts` — the explicit `dayjs.utc(iso).tz(zone)` pattern
