# iCalendar Export Feature

This document describes the iCalendar export functionality in `@ilamy/calendar`, provided as the opt-in `@ilamy/calendar/plugins/ical` plugin (`icalPlugin()`).

## Overview

`@ilamy/calendar/plugins/ical` exports calendar events to RFC 5545 iCalendar (`.ics`) format for Google Calendar, Apple Calendar, Outlook, Thunderbird, and CalDAV servers. When a calendar or event `timezone` is set, timed events emit `DTSTART;TZID=` / `DTEND;TZID=` paired with RFC 5545 §3.6.5 `VTIMEZONE` definitions so recurring series preserve local wall-clock time across DST transitions.

## Features

- **Full RFC 5545 compliance**: CRLF line ends, lines folded at 75 octets without splitting UTF-8 code points (§3.1), trailing CRLF (§3.4), `VTIMEZONE` + `TZID` (§3.6.5), and typed `UNTIL` / `EXDATE` / `RECURRENCE-ID` (§3.3.10, §3.8.5.1, §3.8.4.4).
- **Full Event Support**: Simple events, all-day events (`VALUE=DATE`), recurring series (`RRULE`), `EXDATE`, and `RECURRENCE-ID` overrides.
- **Opt-in Toolbar Action**: Registers the header Export button (desktop + mobile) via `SLOT_TOOLBAR`. Omit `icalPlugin()` to omit the button, or call `exportToICalendar` / `downloadICalendar` directly.
- **Automatic Filename**: Timestamped filenames (`ilamy-calendar-YYYY-MM-DD.ics`).

## Usage

```tsx
import { IlamyCalendar } from '@ilamy/calendar/react'
import { icalPlugin } from '@ilamy/calendar/plugins/ical'

<IlamyCalendar events={events} plugins={[icalPlugin()]} />
```

## Technical Implementation

### Core Files

- `packages/plugins/ical/src/export-ical.ts` — RFC 5545 serializer (`VTIMEZONE`, escaping, line folding, `VCALENDAR` wrapper)
- `packages/plugins/ical/src/ical-plugin.tsx` — `icalPlugin()` + `SLOT_TOOLBAR` Export button
- `packages/utils/src/ical-format.ts` — shared RFC 5545 date/time & `TZID` formatting helpers
- `packages/plugins/recurrence/src/ical.ts` — `RRULE`, `EXDATE`, and `RECURRENCE-ID` property emitter
- `packages/plugins/ical/src/export-ical.test.ts`, `packages/plugins/ical/src/ical-plugin.test.tsx`, `packages/plugins/recurrence/src/ical.test.ts` — unit tests
- `apps/e2e/tests/ical-export.spec.ts` — downloaded `.ics` verification

### Key Functions

#### `exportToICalendar(events, collect?, options?)`

Converts an array of `CalendarEvent` objects to an RFC 5545 `.ics` string. `options` accepts `{ calendarName?: string; timezone?: string }` (or a `calendarName` string).

#### `downloadICalendar(events, collect?, filename?, options?)`

Exports events and triggers a browser `.ics` download.

## Supported Event Properties

### Basic Properties

- `title` → `SUMMARY`
- `description` → `DESCRIPTION`
- `location` → `LOCATION`
- `start` → `DTSTART`
- `end` → `DTEND`
- `uid` → `UID`
- `allDay` → Date format handling

### Recurring Events

- `rrule` → `RRULE` (converted via rrule.js)
- `exdates` → `EXDATE`
- `recurrenceId` → `RECURRENCE-ID`

### Generated Properties

- `DTSTAMP` - Current timestamp
- `CREATED` - Current timestamp
- `LAST-MODIFIED` - Current timestamp
- `STATUS` - Default to "CONFIRMED"
- `SEQUENCE` - Default to 0
- `TRANSP` - Default to "OPAQUE"

## Compatibility

The exported `.ics` files are compatible with:

- ✅ Google Calendar
- ✅ Apple Calendar (macOS/iOS)
- ✅ Microsoft Outlook
- ✅ Mozilla Thunderbird
- ✅ CalDAV servers

These applications read the syntax. Whether a recurring series keeps its clock
time across a daylight-saving change depends on the timezone limitation below.

## Character Escaping

Special characters in event text are properly escaped according to RFC 5545:

- Backslashes (`\`) → `\\`
- Semicolons (`;`) → `\;`
- Commas (`,`) → `\,`
- Newlines (`\n`) → `\\n`
- Carriage returns are removed

## Line folding and the final line

Content lines longer than 75 octets are folded: a CRLF and one space are
inserted, and a multi-octet UTF-8 character is never split (RFC 5545 §3.1).
The file ends with a CRLF after `END:VCALENDAR` (§3.4).

## All-day series

An all-day series writes `DTSTART;VALUE=DATE`, and so its `RRULE` `UNTIL`
(`UNTIL=20250330`), `EXDATE;VALUE=DATE` and `RECURRENCE-ID;VALUE=DATE` are
dates too, on the same calendar day the calendar shows (§3.3.10, §3.8.5.1,
§3.8.4.4).

## Timezone Handling

- When `event.timezone` or `options.timezone` is set to a non-UTC IANA timezone, timed events emit `DTSTART;TZID=<zone>:YYYYMMDDTHHMMSS` and `DTEND;TZID=<zone>:YYYYMMDDTHHMMSS`, paired with an RFC 5545 §3.6.5 `VTIMEZONE` component generated from Temporal DST transitions.
- When UTC or no timezone is set, timed events emit UTC timestamps (`DTSTART:20250804T100000Z`).
- All-day events use `VALUE=DATE` format (`DTSTART;VALUE=DATE:20250804`).

## Testing

```bash
cd packages/plugins/ical && bun test
cd packages/plugins/recurrence && bun test src/ical.test.ts
```
