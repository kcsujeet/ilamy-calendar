# @ilamy/calendar-recurrence

> **Internal package — not published.** This RFC 5545 recurrence plugin is developed and tested in isolation here, then **bundled into [`@ilamy/calendar`](https://www.npmjs.com/package/@ilamy/calendar)** and published as the subpath `@ilamy/calendar/plugins/recurrence`. Consumers import it from there, not from this package.

Recurring-events plugin powered by [rrule](https://github.com/jkbrzt/rrule).

## Usage (consumer-facing, via @ilamy/calendar)

```tsx
import { IlamyCalendar } from '@ilamy/calendar'
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'

<IlamyCalendar plugins={[recurrencePlugin()]} events={events} />
```

Adding the plugin augments `CalendarEvent` with `rrule`, `recurrenceId`, and `exdates`, and contributes the recurrence editor to the event form plus the this/following/all scope picker for edits and deletes.

The subpath also exports `generateRecurringEvents()`, `isRecurringEvent()`, `recurrenceICalProperties`, and re-exports `RRule`, `Weekday`, `RRuleOptions` from rrule.

## License

MIT
