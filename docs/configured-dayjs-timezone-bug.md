# Configured dayjs: zone-carrying-string parsing bug

> Status: **documented, not yet fixed** (decision 2026-06-21). Drag-to-create works
> around it locally; the library-wide fix is a separate effort. This file is the
> reference for that effort.
>
> This is a confirmed **upstream dayjs bug**, not something we introduced:
> [iamkun/dayjs#2946 — "`dayjs.tz` parses ISO string as local time instead of UTC"](https://github.com/iamkun/dayjs/issues/2946)
> (open, filed 2025-10-24; proposed fix PR [#2949](https://github.com/iamkun/dayjs/pull/2949)).
> Our configured wrapper makes `dayjs()` route through `dayjs.tz()`, so the whole
> library inherits it. When that upstream issue ships, revisit whether the wrapper
> and the workarounds below are still needed.

## TL;DR

`@ilamy/utils/dayjs` aliases the `dayjs()` constructor to `dayjs.tz()`. Under a
`dayjs.tz.setDefault(timezone)` (which the calendar sets at runtime), passing a
**zone-carrying ISO string** (one ending in `Z`, or with a `±HH:MM` offset, i.e.
the output of `.toISOString()`) to the configured `dayjs(...)` is mis-rendered:
the zone designator is discarded and the literal wall-clock is stamped onto the
calendar timezone.

```ts
// calendar runtime has called dayjs.tz.setDefault('America/Halifax')  (UTC-3 in June)
dayjs('2026-06-01T03:00:00.000Z')   // => 2026-06-01 03:00  (WRONG)
// 03:00Z is 00:00 in Halifax; we wanted 2026-06-01 00:00
```

Safe inputs (NOT affected): a `Date` object, a `Dayjs` object, and zone-LESS
strings (`'2026-06-01'`, `'2026-06-01 09:00'`, `'2026-06-01T09:00:00'`) which are
meant to be read as the default tz.

## Why it happens (root cause)

`packages/utils/src/dayjs.ts` exports a wrapper whose constructor forwards to
`dayjs.tz()`:

```ts
const timezoneAwareDayjs = (...args) => dayjs.tz(...args)   // dayjs.ts ~line 84
```

The intent is good: make `dayjs()` honor the configured default timezone for
zone-less and now() inputs. The problem is how `dayjs.tz()` parses a string.

From the dayjs timezone-plugin source
(https://github.com/iamkun/dayjs/blob/dev/src/plugin/timezone/index.js), the
`tz` constructor does roughly:

```js
const localTs = d.utc(input, parseFormat).valueOf()
const [targetTs, targetOffset] = fixOffset(localTs, previousOffset, timezone)
```

It reads the string's **literal digits** and then `fixOffset` re-interprets those
digits as wall-clock **in the target timezone**. So any `Z`/offset in the string
is effectively dropped. This is correct and intended for wall-clock strings
(`dayjs.tz('2013-11-18T11:55:20', 'America/Toronto')` means 11:55 in Toronto —
see https://day.js.org/docs/en/timezone/parsing-in-zone). It is wrong for an
**absolute-instant** string like `toISOString()` output, where you want the
instant converted, not the digits stamped.

Because the configured `dayjs()` IS `dayjs.tz()`, every `dayjs(<instant string>)`
in the codebase inherits this mismatch.

### Verified empirically

Under `dayjs.tz.setDefault('America/Halifax')`, all of these render `03:00`
(wrong; should be `00:00`):

| input form | result |
|---|---|
| `dayjs('2026-06-01T03:00:00.000Z')` | `2026-06-01 03:00` ❌ |
| `dayjs('2026-06-01T03:00:00+00:00')` | `2026-06-01 03:00` ❌ |
| `dayjs('2026-06-01T00:00:00-03:00')` | `2026-06-01 03:00` ❌ |
| `dayjs(<Date instant>)` | `2026-06-01 00:00` ✅ |
| `dayjs(<Dayjs instant>)` | `2026-06-01 00:00` ✅ |
| `dayjs('2026-06-01T00:00:00')` (zone-less) | `2026-06-01 00:00` ✅ (intended) |

## The correct pattern

Parse the instant explicitly with `dayjs.utc()` (which honors the `Z`/offset),
then convert to the calendar zone:

```ts
timezone ? dayjs.utc(iso).tz(timezone) : dayjs.utc(iso).local()
```

This is what `packages/plugins/drag-to-create/src/utils/read-cell.ts` does, and
the only site currently doing it correctly.

The upstream reporter (#2946) gives the workaround `dayjs(str).tz(tz)` — but that
relies on the **un-aliased** `dayjs()` parsing the `Z` as an instant. In our repo
`dayjs()` IS `dayjs.tz()`, so that workaround does NOT work for us; we must reach
the real UTC parser explicitly via `dayjs.utc(str)`.

## Affected sites (verified sweep, 2026-06-21)

Only matters when a calendar `timezone` is configured.

| Impact | File:line | Code | Input source |
|---|---|---|---|
| **High** (consumer-facing) | `packages/calendar/src/lib/utils/normalize.ts:40-41` | `dayjs(event.start)` / `dayjs(event.end)` for non-Dayjs events | Consumer `CalendarEvent.start/end`; the public `IlamyCalendarPropEvent` type allows `Dayjs \| Date \| string`, so any consumer passing ISO strings hits this. `Date` and `Dayjs` inputs are safe. |
| Medium | `packages/plugins/recurrence/src/utils/update-recurring-event.ts:69` | `dayjs(event.recurrenceId).isAfter(terminationDate)` | `recurrenceId` is a `.toISOString()` value |
| Medium | `packages/plugins/recurrence/src/utils/update-recurring-event.ts:256` | `dayjs(iso)` over `baseEvent.exdates` | exdates are `.toISOString()` values |
| Medium | `packages/plugins/recurrence/src/ical.ts:~40,~46` | `formatDate(dayjs(date), ...)` for EXDATE / RECURRENCE-ID | `.toISOString()` values; affects RFC 5545 export correctness |
| Low | `packages/plugins/recurrence/src/utils/generate-recurring-events.ts:~34` | `dayjs(event.rrule.until)` | only if a consumer passes `rrule.until` as an ISO string (uncommon; usually a `Date`) |

Note: in the demo/playground and tests, event dates are built as `Dayjs`/`Date`,
so the consumer-ingestion path is not exercised today; the exposure is the public
`string` contract plus the internal `.toISOString()` round-trips in recurrence.

## Fix options (for the separate effort)

1. **Fix the wrapper (deepest, highest leverage):** make the configured
   constructor detect a zone-carrying string and parse it as an instant
   (`dayjs.utc(str).tz(default)`) instead of stamping the literal digits, while
   keeping current behavior for zone-less / Date / Dayjs / now() inputs. One
   change fixes ingestion + recurrence + iCal, but touches every `dayjs()` call
   in the library and needs a full regression pass.
2. **Patch each site** with `dayjs.utc(iso).tz(tz)` (like read-cell). Lower risk
   per change; leaves the footgun for future code.

## Testing note

A tz round-trip test is **falsely green** unless it calls
`dayjs.tz.setDefault(<tz>)` first (the mis-parse only manifests with a default
set). See `packages/plugins/drag-to-create/src/utils/read-cell.test.ts`
(`withCalendarTimezone` helper) for the pattern.
