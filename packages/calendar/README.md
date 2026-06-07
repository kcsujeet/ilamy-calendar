# @ilamy/calendar

[![NPM Version](https://img.shields.io/npm/v/@ilamy/calendar?style=flat-square&color=black)](https://www.npmjs.com/package/@ilamy/calendar)
[![License](https://img.shields.io/npm/l/@ilamy/calendar?style=flat-square&color=black)](https://github.com/kcsujeet/ilamy-calendar/blob/main/LICENSE)

A full-featured React calendar component library built with **TypeScript**, **Tailwind CSS 4**, and **shadcn/ui** — month/week/day/year views, resource scheduling, drag-and-drop, i18n, and a plugin system (RFC 5545 recurrence ships in the box at `@ilamy/calendar/plugins/recurrence`).

Full documentation and screenshots: https://github.com/kcsujeet/ilamy-calendar

## Install

```sh
bun add @ilamy/calendar
# peers: react, react-dom, tailwindcss (v4), tailwindcss-animate
```

## Quick start

```tsx
import { IlamyCalendar } from '@ilamy/calendar'

export function App() {
  return <IlamyCalendar events={events} />
}
```

## Styling (required)

The components use shadcn design tokens shipped with the package. Import them once at your CSS entry and register the package as a source so Tailwind v4 generates the pre-built classes (it ignores `node_modules` by default — adjust the relative depth to your stylesheet):

```css
@import '@ilamy/calendar/styles.css';

@source "../node_modules/@ilamy/calendar/dist";
```

## Public API

- **Components:** `IlamyCalendar`, `IlamyResourceCalendar`
- **Hook:** `useIlamyCalendarContext()`
- **dayjs:** the configured instance + `Dayjs` type
- **Types:** `CalendarEvent`, `CalendarView`, `TimeFormat`, `BusinessHours`, `WeekDays`, `Resource`, `IlamyCalendarProps`, `CalendarClassesOverride`, `Translations`, `TranslatorFunction`, and the plugin SDK contract (`IlamyPlugin`, …).

## Plugins

```tsx
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'

<IlamyCalendar plugins={[recurrencePlugin()]} events={events} />
```

## License

MIT
