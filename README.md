# ilamy Calendar

[![NPM Version](https://img.shields.io/npm/v/@ilamy/calendar?style=flat-square&color=black)](https://www.npmjs.com/package/@ilamy/calendar)
[![License](https://img.shields.io/npm/l/@ilamy/calendar?style=flat-square&color=black)](https://github.com/kcsujeet/ilamy-calendar/blob/main/LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/kcsujeet/ilamy-calendar/ci.yml?branch=main&style=flat-square)](https://github.com/kcsujeet/ilamy-calendar/actions)

A powerful, full-featured yet **lightweight and highly pluggable** React calendar component library built with **TypeScript**, **Tailwind CSS 4**, and **shadcn/ui**. The core is small — ~40 KB minified (≈13 KB gzipped) — with opt-in plugins for recurring events, agenda views, and more, so you only ship what you use. Built for high-performance scheduling with RFC 5545 recurring events, resource management, and drag-and-drop interactions.

<div align="center">
  <img width="1643" height="873" alt="ilamy Calendar Month View" src="https://github.com/user-attachments/assets/d289f034-0d26-4a1c-a997-dfa1ad26aa7a" />
  <p align="center"><i>Elegant month view with seamless event transitions</i></p>
</div>

---

## Features

### Core Views
- **Multiple Perspectives**: Month, Week, Day, and Year views.
- **Fluid Navigation**: Smooth transitions between dates and views.
- **Business Hours**: Customizable working hours with support for split shifts.

### Resource Management
- **Resource Timeline**: Visualize and manage events across multiple resources (rooms, people, equipment).
- **Vertical & Horizontal Layouts**: Flexible resource views to fit any application design.
- **Resource-Aware Validation**: Ensure events are correctly assigned and don't overlap where prohibited.

### Recurring Events (RFC 5545)

Opt-in via the recurrence plugin (`plugins={[recurrencePlugin()]}` from `@ilamy/calendar/plugins/recurrence`).

- **Full RRULE Support**: Daily, Weekly, Monthly, Yearly patterns with complex frequencies.
- **Smart CRUD**: Google Calendar-style operations—edit "this event", "this and following", or "all events".
- **Exclusion Dates**: Robust handling of EXDATE and modified instances within a series.
- **iCalendar Export**: Export events to `.ics` files with strict RFC 5545 compliance.

### Plugin System
- **Opt-in capabilities**: The core ships no plugins. Add behavior through the `plugins` prop, each from its own subpath: `@ilamy/calendar/plugins/recurrence` (RFC 5545 recurring events) and `@ilamy/calendar/plugins/agenda` (agenda list view).

### Internationalization & Timezones
- **Timezones**: Full timezone support via `dayjs.tz` with automatic DST handling.
- **Internationalization**: Support for 100+ locales with configurable week start days.

### Interactions
- **Drag & Drop**: Move and resize events with precision using `@dnd-kit`.
- **Responsive**: Adaptive layouts designed for desktop, tablet, and mobile.

### Developer Experience
- **Type Safety**: Written in TypeScript with comprehensive type definitions and IntelliSense support.
- **Reliability**: 100% test coverage for all mission-critical date and recurrence logic.
- **Theming**: Built on Tailwind CSS 4 variables for effortless branding and customization.
- **Modern Stack**: Zero-config integration with React 19 and modern build tools.

---

## Installation

Install the library and its peer dependencies using your preferred package manager:

```bash
# npm
npm install @ilamy/calendar dayjs

# bun
bun add @ilamy/calendar dayjs

# pnpm
pnpm add @ilamy/calendar dayjs
```

> **Note**: This library requires **React 19+** and **Tailwind CSS 4+**. Peers: `dayjs`, `react`, `react-dom`, `tailwindcss` (v4), `tailwindcss-animate`. `dayjs` is in the command above because the calendar's API uses `dayjs` objects and shares your app's instance/locale.

---

## Quick Start

```tsx
import { IlamyCalendar } from '@ilamy/calendar';

const MyApp = () => {
  const events = [
    {
      id: '1',
      title: 'Project Kickoff',
      start: '2026-05-01T10:00:00Z',
      end: '2026-05-01T11:30:00Z',
      color: 'blue'
    }
  ];

  return (
    <div style={{ height: '800px' }}>
      <IlamyCalendar 
        events={events}
        initialView="week"
        onEventClick={(event) => console.log('Clicked:', event)}
      />
    </div>
  );
};
```

---

## Styling — bring your own design system

`@ilamy/calendar` ships **no CSS**. Components use the conventional [shadcn/ui](https://ui.shadcn.com) token classes (`bg-background`, `text-muted-foreground`, `bg-primary`, `border-border`, …), so your design system supplies the look. Point Tailwind at the package so it generates the utilities (Tailwind v4 ignores `node_modules` by default — adjust the relative depth to your stylesheet):

```css
@source "../node_modules/@ilamy/calendar/dist";
```

If you already use shadcn, the tokens are defined and you're done. Otherwise, define the standard shadcn theme tokens (`--background`, `--primary`, `--border`, `--ring`, `--card`, …) so the calendar inherits your palette.

---

## Plugins

The core ships **no plugins**. Add capabilities through the `plugins` prop, each imported from its own subpath:

```tsx
import { IlamyCalendar } from '@ilamy/calendar';
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence';
import { agendaPlugin } from '@ilamy/calendar/plugins/agenda';

<IlamyCalendar
  events={events}
  plugins={[recurrencePlugin(), agendaPlugin({ window: 'week' })]}
/>
```

- **`@ilamy/calendar/plugins/recurrence`** — RFC 5545 recurring-event expansion and scoped edit/delete. Also re-adds `rrule`/`recurrenceId`/`exdates` to `CalendarEvent`.
- **`@ilamy/calendar/plugins/agenda`** — an agenda (upcoming-events list) view scoped to a `window`.

---

## Examples

Explore the [examples directory](https://github.com/kcsujeet/ilamy-calendar/tree/main/examples) for complete implementation patterns:

- [Next.js](https://github.com/kcsujeet/ilamy-calendar/tree/main/examples/nextjs) - Integration with Next.js and Tailwind CSS.
- [Astro](https://github.com/kcsujeet/ilamy-calendar/tree/main/examples/astro) - Static site integration with Astro.
- [Vite](https://github.com/kcsujeet/ilamy-calendar/tree/main/examples/vite) - Fast, minimal setup using Vite.

---

## Documentation

For comprehensive guides, API references, and interactive demos, visit [ilamy.dev](https://ilamy.dev).

---

## Support

ilamy Calendar is free and open source. If you'd like to support its development:

<a href="https://ko-fi.com/kcsujeet" target="_blank"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Buy me a coffee at ko-fi.com" style="height: 50px;" /></a>

---

## License

MIT © [Sujeet Kc](https://github.com/kcsujeet)
