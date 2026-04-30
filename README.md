# ilamy Calendar

[![NPM Version](https://img.shields.io/npm/v/@ilamy/calendar?style=flat-square&color=black)](https://www.npmjs.com/package/@ilamy/calendar)
[![License](https://img.shields.io/npm/l/@ilamy/calendar?style=flat-square&color=black)](https://github.com/kcsujeet/ilamy-calendar/blob/main/LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/kcsujeet/ilamy-calendar/ci.yml?branch=main&style=flat-square)](https://github.com/kcsujeet/ilamy-calendar/actions)

A powerful, full-featured React calendar component library built with **TypeScript**, **Tailwind CSS 4**, and **Shadcn UI**. Designed for high-performance scheduling applications with full support for RFC 5545 recurring events, resource management, and drag-and-drop interactions.

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
- **Full RRULE Support**: Daily, Weekly, Monthly, Yearly patterns with complex frequencies.
- **Smart CRUD**: Google Calendar-style operations—edit "this event", "this and following", or "all events".
- **Exclusion Dates**: Robust handling of EXDATE and modified instances within a series.
- **iCalendar Export**: Export events to `.ics` files with strict RFC 5545 compliance.

### Interactions & Globalization
- **Timezones**: Full timezone support via `dayjs.tz` with automatic DST handling.
- **Internationalization**: Support for 100+ locales with configurable week start days.
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
npm install @ilamy/calendar

# bun
bun add @ilamy/calendar

# pnpm
pnpm add @ilamy/calendar
```

> **Note**: This library requires **React 19+** and **Tailwind CSS 4+**.

---

## Quick Start

```tsx
import { IlamyCalendar } from '@ilamy/calendar';
import '@ilamy/calendar/dist/index.css'; // Import base styles

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

## Examples

Explore the [examples directory](./examples) for complete implementation patterns:

- [Next.js](./examples/nextjs) - Integration with Next.js and Tailwind CSS.
- [Astro](./examples/astro) - Static site integration with Astro.
- [Vite](./examples/vite) - Fast, minimal setup using Vite.

---

## Documentation

For comprehensive guides, API references, and interactive demos, visit [ilamy.dev](https://ilamy.dev).

---

## License

MIT © [Sujeet Kc](https://github.com/kcsujeet)
