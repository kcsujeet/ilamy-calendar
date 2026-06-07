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

## Styling — bring your own design system

`@ilamy/calendar` ships **no CSS**. The components are styled with the conventional [shadcn/ui](https://ui.shadcn.com) token classes (`bg-background`, `text-muted-foreground`, `bg-primary`, `border-border`, `bg-card`, `ring-ring`, …), so **your** design system supplies the look. If you already use shadcn, those tokens are defined and you're done — just point Tailwind at the package so it generates the utility classes (Tailwind v4 ignores `node_modules` by default — adjust the relative depth to your stylesheet):

```css
@source "../node_modules/@ilamy/calendar/dist";
```

You'll also want `tailwindcss-animate` (or `tw-animate-css`) in your Tailwind setup for the dialog/select animations — it's a peer dependency.

If you don't use shadcn, define the standard shadcn theme tokens (`--background`, `--foreground`, `--primary`, `--muted`/`--muted-foreground`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--card`, `--popover`, `--radius`) and their `@theme` color mappings; the calendar then inherits your palette.

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
