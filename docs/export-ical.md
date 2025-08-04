# iCalendar Export Feature

This document describes the iCalendar export functionality added to the ilamy Calendar.

## Overview

The calendar now supports exporting events to iCalendar (.ics) format, which is compatible with popular calendar applications like Google Calendar, Apple Calendar, Outlook, and more.

## Features

- **RFC 5545 Compliant**: Exports follow the official iCalendar specification
- **Full Event Support**: Exports all event types including:
  - Simple events with title, description, location
  - All-day events
  - Recurring events with RRULE patterns
  - Events with exception dates (EXDATE)
  - Modified recurring instances (RECURRENCE-ID)
- **Desktop and Mobile**: Export button available on both desktop and mobile interfaces
- **Automatic Filename**: Generates timestamped filenames (e.g., `calendar-2025-08-04.ics`)

## Usage

### Desktop
1. Look for the "Export" button in the top-right corner of the calendar header
2. Click the button to download the `.ics` file

### Mobile
1. Tap the menu button (☰) in the top-right corner
2. Select "Export Calendar (.ics)" from the dropdown menu
3. The file will be downloaded to your device

## Technical Implementation

### Core Files
- `/src/lib/export-ical.ts` - Main export functionality
- `/src/components/header/base-header.tsx` - UI integration
- `/src/lib/export-ical.test.ts` - Comprehensive tests

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
- ✅ Any RFC 5545 compliant calendar application

## Character Escaping

Special characters in event text are properly escaped according to RFC 5545:
- Backslashes (`\`) → `\\`
- Semicolons (`;`) → `\;`
- Commas (`,`) → `\,`
- Newlines (`\n`) → `\\n`
- Carriage returns are removed

## Timezone Handling

- All times are exported in UTC format
- Timezone information is included in the calendar header
- Date-only events use `VALUE=DATE` format for all-day events

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
- Custom timezone support
- Selective export (date range, specific calendars)
- Import functionality
- Additional iCalendar properties (PRIORITY, CATEGORIES, etc.)
- Calendar color export via X-properties
