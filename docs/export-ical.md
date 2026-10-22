# iCalendar Export Feature

This document describes the iCalendar export functionality added to the ilamy Calendar.

## Overview

The calendar now supports exporting events to iCalendar (.ics) format, which popular calendar applications such as Google Calendar, Apple Calendar and Outlook can import. See "Known limitation: timezones" below before relying on a recurring series in a configured `timezone`.

## Features

- **Follows RFC 5545 for the syntax**: CRLF line ends, lines folded at 75 octets (§3.1), the object ends with CRLF (§3.4), `UNTIL`, `EXDATE` and `RECURRENCE-ID` carry the same value type as `DTSTART` (§3.3.10, §3.8.5.1, §3.8.4.4). It is not fully compliant for recurring series in a configured timezone; see the known limitation below
- **Full Event Support**: Exports all event types including:
  - Simple events with title, description, location
  - All-day events
  - Recurring events with RRULE patterns
  - Events with exception dates (EXDATE)
  - Modified recurring instances (RECURRENCE-ID)
- **Desktop and Mobile**: Export button available on both desktop and mobile interfaces (can be hidden via `hideExportButton`)
- **Automatic Filename**: Generates timestamped filenames (e.g., `ilamy-calendar-2025-08-04.ics`)

## Usage

### Hiding the export button

Pass `hideExportButton` to `IlamyCalendar` or `IlamyResourceCalendar` to remove the export control from the default header (desktop and mobile). Defaults to `false`.

```tsx
<IlamyCalendar events={events} hideExportButton />
```

When using a custom `headerComponent`, this prop has no effect — you control export UI yourself.

### Desktop

1. Look for the "Export" button in the top-right corner of the calendar header
2. Click the button to download the `.ics` file

### Mobile

1. Tap the menu button (☰) in the top-right corner
2. Select "Export Calendar (.ics)" from the dropdown menu
3. The file will be downloaded to your device

## Technical Implementation

### Core Files

- `packages/calendar/src/features/calendar/utils/export-ical.ts` - Main export functionality (escaping, line folding, the VCALENDAR wrapper)
- `packages/calendar/src/features/calendar/hooks/use-export-calendar.ts` - the header button's handler and the filename
- `packages/plugins/recurrence/src/ical.ts` - the `RRULE`, `EXDATE` and `RECURRENCE-ID` lines
- `packages/calendar/src/features/calendar/utils/export-ical.test.ts`, `packages/plugins/recurrence/src/ical.test.ts` - tests
- `apps/e2e/tests/ical-export.spec.ts` - the downloaded file, read as an importer would

### Key Functions

#### `exportToICalendar(events, calendarName)`

Converts an array of CalendarEvent objects to RFC 5545 compliant iCalendar format.

```typescript
const icalContent = exportToICalendar(events, 'My Calendar')
```

#### `downloadICalendar(events, filename, calendarName)`

Exports events and triggers download in the browser.

```typescript
downloadICalendar(events, 'my-calendar.ics', 'My Calendar')
```

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

- All times are exported in UTC format (`DTSTART:20250804T100000Z`)
- Date-only events use `VALUE=DATE` format for all-day events

### Known limitation: timezones

The export has no `TZID` and writes no real `VTIMEZONE` (the `UTC` one in the
header only names UTC). A recurring series in a configured `timezone` is
therefore exported as a UTC `DTSTART` and `RRULE`. An importer repeats it at
that fixed UTC time, so after a daylight-saving change the series appears an
hour off from what the calendar shows. RFC 5545 §3.8.5.3 says a recurring
`DTSTART` should be a local time with a time zone reference. One-off events are
unaffected: their instant is exact.

Exporting `DTSTART;TZID=...` with a `VTIMEZONE` is planned for 4.x, with the
iCal plugin (`docs/roadmap.md`, 4.3.9). Until then, do not rely on the file to
round-trip a recurring series across a clock change.

## Testing

The export functionality includes comprehensive tests covering:

- Basic event export
- Recurring event patterns
- All-day events
- Special character escaping
- EXDATE handling
- RECURRENCE-ID support
- Multiple event export
- Header/footer generation

Run tests with:

```bash
bun test src/lib/export-ical.test.ts
```

## Future Enhancements

Potential improvements for future versions:

- `TZID` and `VTIMEZONE` export (custom timezone support), see above
- Selective export (date range, specific calendars)
- Import functionality
- Additional iCalendar properties (PRIORITY, CATEGORIES, etc.)
- Calendar color export via X-properties
