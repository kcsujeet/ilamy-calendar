# Agenda View

The agenda view is a compact, chronological list of events grouped by day, skipping
empty days. It ships as an **opt-in plugin** (like recurrence), so it only appears in
the view switcher when you register it.

## Usage

```tsx
import { IlamyCalendar } from '@ilamy/calendar'
import { agendaPlugin } from '@ilamy/calendar/plugins/agenda'

<IlamyCalendar
  events={events}
  plugins={[agendaPlugin()]}
  initialView="agenda"
/>
```

Registering `agendaPlugin()` adds an `agenda` entry to the view switcher. Without it,
the agenda view is absent — nothing about the core calendar changes.

## Window

The agenda lists a date window and steps it with prev/next, like every other view.

```tsx
agendaPlugin()              // default: the current month
agendaPlugin({ window: 7 }) // a rolling 7-day window from the current date
agendaPlugin({ window: 14 })
```

| `window` | Range | prev/next step |
|---|---|---|
| `'month'` (default) | the calendar month containing the date | one month |
| `number` (N) | N days starting from the current date | N days |

## Behaviour

- **Empty days are skipped** — only days with at least one event render.
- **Multi-day events repeat under each day they span** within the window, each
  showing a `Day N/M` indicator (matching Google Calendar's Schedule view).
- **All-day events** show an "All day" label (localized) instead of a time, and sort
  before timed events within a day.
- **Clicking an event** opens the event form (and the recurrence scope dialog for
  recurring events), the same as the other views.
- When the recurrence plugin is also registered, recurring occurrences are expanded
  into the window and listed automatically.

## i18n

The view label and empty state use the `agenda` and `agendaNoEvents` translation keys
(English defaults: "Agenda" and "No upcoming events"). The `Day N/M` indicator reuses
the existing `day` key.
