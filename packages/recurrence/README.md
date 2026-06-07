# @ilamy/calendar-recurrence

RFC 5545 recurring-events plugin for [`@ilamy/calendar`](https://www.npmjs.com/package/@ilamy/calendar), powered by [rrule](https://github.com/jkbrzt/rrule).

## Install

```sh
bun add @ilamy/calendar-recurrence
```

Peer dep: `@ilamy/calendar` (the host you plug into).

## Usage

```tsx
import { IlamyCalendar } from '@ilamy/calendar'
import { recurrencePlugin } from '@ilamy/calendar-recurrence'

<IlamyCalendar plugins={[recurrencePlugin()]} events={events} />
```

Adding the plugin augments `CalendarEvent` with `rrule`, `recurrenceId`, and `exdates`, and contributes the recurrence editor to the event form plus the this/following/all scope picker for edits and deletes.

### Also exported

- `generateRecurringEvents()`, `isRecurringEvent()` — recurrence helpers.
- `recurrenceICalProperties` — iCal serialization for recurring events.
- `RRule`, `Weekday`, `RRuleOptions` — re-exported from rrule for building rules.

The recurrence editor UI uses [`@ilamy/ui`](https://www.npmjs.com/package/@ilamy/ui); follow that package's styling/Tailwind notes so the editor renders correctly.

## Migration (v2)

The recurrence plugin is now its **own package**. Where earlier versions bundled recurrence inside the core, import it from `@ilamy/calendar-recurrence` and pass it via the `plugins` prop:

```diff
- // recurrence was part of @ilamy/calendar
+ import { recurrencePlugin } from '@ilamy/calendar-recurrence'
+ <IlamyCalendar plugins={[recurrencePlugin()]} />
```

## License

MIT
