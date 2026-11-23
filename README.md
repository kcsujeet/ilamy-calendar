# ilamy Calendar

[![NPM Version](https://img.shields.io/npm/v/@ilamy/calendar?style=flat-square&color=black)](https://www.npmjs.com/package/@ilamy/calendar)
[![License](https://img.shields.io/npm/l/@ilamy/calendar?style=flat-square&color=black)](https://github.com/kcsujeet/ilamy-calendar/blob/main/LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/kcsujeet/ilamy-calendar/ci.yml?branch=main&style=flat-square)](https://github.com/kcsujeet/ilamy-calendar/actions)

A framework-agnostic, **lightweight and pluggable** calendar library with a TC39 Temporal core, a single zero-framework DOM renderer (`@ilamy/calendar/dom`), a layered CSS token contract (`@ilamy/calendar/styles.css`), and symmetric first-class wrappers for **React 19, Vue 3.5+, Svelte 5, Solid 2.0, Angular 22, and Vanilla DOM**. Zero Tailwind, Radix, `@dnd-kit`, or MUI runtime components required — works standalone out of the box and auto-bridges shadcn/ui CSS variables when present.

<div align="center">
  <img width="1159" height="698" alt="Screenshot 2026-07-12 at 2 44 36 PM" src="https://github.com/user-attachments/assets/316c6ad4-2965-4dc4-b779-88b0ac916669" />
  <p align="center"><i>Elegant month view with seamless event transitions</i></p>
</div>

---

## Support

ilamy Calendar is free and open source. If you'd like to support its development:

<a href="https://ko-fi.com/kcsujeet" target="_blank"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Buy me a coffee at ko-fi.com" style="height: 50px;" /></a>

---

## Features

- **Core Views & Resources**: Month, Week, Day, and Resource Timeline views (horizontal & vertical layouts, split-shift business hours, resource-aware availability).
- **Single-Renderer Multi-Framework Architecture**: One pure headless core (`@ilamy/calendar`) and one shared zero-framework DOM renderer (`@ilamy/calendar/dom`) wrapped symmetrically by React, Vue, Svelte, Solid, Angular, and Vanilla DOM, with framework-agnostic plugins across every adapter.
- **Layered CSS, Zero Tailwind Required**: Import `@ilamy/calendar/styles.css` (`@layer ilamy.base, ilamy.theme`) in any CSS setup. Automatically bridges shadcn/ui variables (`--background`, `--primary`, `--border`, `--radius`, `.dark`) when present, with zero `@source` directive needed.
- **RFC 5545 Recurring Events & iCal**: Opt-in `@ilamy/calendar/plugins/recurrence` (RRULE expansion, EXDATE, overrides, Google Calendar-style scoped edits) and `@ilamy/calendar/plugins/ical` (`.ics` export with `VTIMEZONE` / `TZID`).
- **TC39 Temporal & Native `Intl` i18n**: Exact timezone and DST math without `dayjs` or external locale bundles. Any BCP 47 `locale` works natively, plus `translations` / `translator` for UI copy.
- **Drag, Drop & Resize**: Smooth event moving and edge resizing via a zero-dependency pointer engine across every framework, with business-hour constraints and `eventAllow` validation.

---

## Entry Points

| Entry Point | Purpose |
|---|---|
| `@ilamy/calendar` | Pure headless core (`createCalendarController`, Temporal helpers, layout engines, view-model builders, `defaultTranslations`, `createTranslator`, canonical domain & plugin types: `CalendarEvent`, `Resource`, `BusinessHours`, `Translations`, `IlamyPlugin`, `PluginView`, `SLOT_*`) — zero framework, DOM, or CSS code |
| `@ilamy/calendar/react` | Thin React 19 wrapper over the shared DOM renderer (`IlamyCalendar`, `useIlamyCalendarContext`, `CalendarThemeProvider`, `useSlotProps`, `SLOT_*`, `IlamyPlugin`) with `ReactDOM.createPortal` support for custom UIs (`renderEventForm`, `renderHeader`/`headerComponent`, `renderEvent`, `renderResource`, `onMoreEventsClick`) |
| `@ilamy/calendar/vue` | Thin Vue 3.5+ wrapper over the shared DOM renderer (`IlamyCalendar`, `useIlamyCalendar`) |
| `@ilamy/calendar/svelte` | Thin Svelte 5 wrapper over the shared DOM renderer (`ilamyCalendar`, `ilamyCalendarAction`, `createIlamyCalendar`) |
| `@ilamy/calendar/solid` | Thin Solid 2.0 wrapper over the shared DOM renderer (`IlamyCalendar`, `createIlamyCalendar`) |
| `@ilamy/calendar/angular` | Thin Angular 22 wrapper over the shared DOM renderer (`registerIlamyCalendarElement`, `IlamyCalendarElement`, `createAngularCalendar`) |
| `@ilamy/calendar/dom` | Single zero-framework DOM renderer & pointer drag/resize engine (`mountCalendar`, `MountedCalendar`, `DomCalendarOptions`, render-context types) |
| `@ilamy/calendar/styles.css` | Combined layered CSS (`@layer ilamy.base, ilamy.theme`) — covers grid, header, dialogs, popovers, inputs, selects, and checkboxes with zero Tailwind |
| `@ilamy/calendar/styles/base.css` | Structural layout only (`@layer ilamy.base`, zero visual chrome) |
| `@ilamy/calendar/styles/theme.css` | Visual theme tokens (`@layer ilamy.theme`, `--ilamy-*` CSS custom properties) |
| `@ilamy/calendar/styles/stylex` | Framework-agnostic StyleX CSS-var token & slot helper (`createStylexCalendarTheme`, `stylexCalendarTheme`, `stylexCalendarDarkTheme`, `stylexSlot`, `createStylexSlotProps`) — zero React |
| `@ilamy/calendar/styles/mui` | Framework-agnostic Material UI token mapper (`createMuiCalendarTheme`) mapping a MUI `Theme` palette, typography, and shape into `--ilamy-*` CSS custom properties — zero `@mui/material` runtime components |
| `@ilamy/calendar/plugins/*` | Opt-in framework-agnostic DOM plugins working across React, Vue, Svelte, Solid, Angular, and Vanilla DOM: `recurrence`, `agenda`, `drag-to-create`, `year`, `ical` |
| `@ilamy/calendar/testing` | React test harness (`CalendarTestProvider` + fixtures) |

---

## Installation

```bash
npm install @ilamy/calendar
# or
bun add @ilamy/calendar
# or
pnpm add @ilamy/calendar
```

`temporal-polyfill` is the **only** required runtime dependency (`@ilamy/calendar` has zero `@dnd-kit/*`, `@radix-ui/*`, `@mui/material`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, or `dayjs` dependencies).

All other integrations are **optional peer dependencies** — install only what you use:

- **React UI**: `react`, `react-dom`
- **Other Frameworks**: `vue`, `svelte`, `solid-js`, `@angular/core`
- **Recurrence Plugin (`@ilamy/calendar/plugins/recurrence`)**: `rrule`
- **Optional Styling Integrations**: `@stylexjs/stylex` (optional types for `@ilamy/calendar/styles/stylex`), `tailwindcss` (optional)

---

## Styling Systems (Framework-Agnostic)

All CSS entry points and token mappers work across React, Vue, Svelte, Solid, Angular, and Vanilla DOM with zero Tailwind required.

### Default Layered CSS (`@ilamy/calendar/styles.css`)

Import the pre-built layered stylesheet once in your app — covers the grid, header, dialogs, popovers, inputs, selects, and checkboxes out of the box with **no Tailwind installation or `@source` directive**:

```ts
import '@ilamy/calendar/styles.css';
```

### Tailwind CSS Auto-Bridging

In a Tailwind v4 CSS entry file, import `@ilamy/calendar/styles.css` **before** `@import 'tailwindcss';` so Tailwind utilities sit in a higher cascade layer:

```css
@import '@ilamy/calendar/styles.css';
@import 'tailwindcss';
```

If your app defines shadcn/ui CSS variables (`--background`, `--foreground`, `--border`, `--primary`, `--muted`, `--radius`, or `.dark`), `--ilamy-*` tokens inherit them automatically — working seamlessly with Base UI, Radix, React Aria, shadcn-vue, shadcn-svelte, and plain CSS.

### Unstyled / Structural Layout Only (`@ilamy/calendar/styles/base.css`)

Import `@ilamy/calendar/styles/base.css` (structural layout only, `@layer ilamy.base`) and/or pass `unstyled` with `slotProps`, or target `[data-ilamy-slot="..."]` directly without `!important`. You can also import `@ilamy/calendar/styles/theme.css` separately for just the `@layer ilamy.theme` token defaults.

### StyleX (`@ilamy/calendar/styles/stylex`)

Framework-agnostic StyleX CSS-var helper (zero React dependency) that maps `--ilamy-*` token vars and merges `stylex.props(...)` slot overrides across React, Vue, Svelte, Solid, Angular, or DOM:

```tsx
import { IlamyCalendar } from '@ilamy/calendar/react';
import { createStylexCalendarTheme } from '@ilamy/calendar/styles/stylex';
import '@ilamy/calendar/styles.css';

const theme = createStylexCalendarTheme({ mode: 'light' });

export function StylexCalendar({ events }) {
  return <IlamyCalendar {...theme} events={events} />;
}
```

### Material UI Tokens (`@ilamy/calendar/styles/mui`)

Framework-agnostic Material UI token mapper (`createMuiCalendarTheme(theme)`) that maps a MUI `Theme` palette, typography, and shape into `--ilamy-*` CSS custom properties — with **zero** `@mui/material` runtime component wrappers, usable in React, Vue, Svelte, Solid, Angular, or Vanilla DOM:

```tsx
import { useTheme } from '@mui/material/styles';
import { IlamyCalendar } from '@ilamy/calendar/react';
import { createMuiCalendarTheme } from '@ilamy/calendar/styles/mui';
import '@ilamy/calendar/styles.css';

export function MuiCalendar({ events }) {
  const muiTheme = useTheme();
  const calendarTheme = createMuiCalendarTheme(muiTheme);
  return <IlamyCalendar {...calendarTheme} events={events} />;
}
```

---

## Quick Start

### React 19

```tsx
import { IlamyCalendar } from '@ilamy/calendar/react';
import type { CalendarEvent } from '@ilamy/calendar';
import '@ilamy/calendar/styles.css';

const events: CalendarEvent[] = [
  {
    id: '1',
    title: 'Project Kickoff',
    start: '2026-05-01T10:00:00Z',
    end: '2026-05-01T11:30:00Z',
    color: 'blue',
  },
];

export function MyApp() {
  return (
    <div style={{ height: '700px' }}>
      <IlamyCalendar
        events={events}
        initialView="week"
        editable
        onEventClick={(event) => console.log('Clicked:', event)}
      />
    </div>
  );
}
```

### Multi-Framework & Headless Examples

<details>
<summary>Vue 3.5+ (<code>@ilamy/calendar/vue</code>)</summary>

```vue
<script setup lang="ts">
import { IlamyCalendar } from '@ilamy/calendar/vue';
import '@ilamy/calendar/styles.css';

const events = [
  {
    id: '1',
    title: 'Team Sync',
    start: '2026-05-01T10:00:00-05:00',
    end: '2026-05-01T11:00:00-05:00',
  },
];
</script>

<template>
  <div style="height: 600px">
    <IlamyCalendar :events="events" editable />
  </div>
</template>
```

</details>

<details>
<summary>Svelte 5 (<code>@ilamy/calendar/svelte</code>)</summary>

```svelte
<script lang="ts">
  import { ilamyCalendar } from '@ilamy/calendar/svelte';
  import '@ilamy/calendar/styles.css';

  const events = [
    {
      id: '1',
      title: 'Team Sync',
      start: '2026-05-01T10:00:00-05:00',
      end: '2026-05-01T11:00:00-05:00',
    },
  ];
</script>

<div style="height: 600px" {@attach ilamyCalendar({ events, editable: true })} />
```

</details>

<details>
<summary>Solid 2.0 (<code>@ilamy/calendar/solid</code>)</summary>

```tsx
import { IlamyCalendar } from '@ilamy/calendar/solid';
import '@ilamy/calendar/styles.css';

export function App() {
  return (
    <div style={{ height: '600px' }}>
      <IlamyCalendar
        events={[
          {
            id: '1',
            title: 'Team Sync',
            start: '2026-05-01T10:00:00-05:00',
            end: '2026-05-01T11:00:00-05:00',
          },
        ]}
        editable
      />
    </div>
  );
}
```

</details>

<details>
<summary>Angular 22 (<code>@ilamy/calendar/angular</code>)</summary>

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { registerIlamyCalendarElement } from '@ilamy/calendar/angular';
import '@ilamy/calendar/styles.css';

registerIlamyCalendarElement();

@Component({
  selector: 'app-calendar',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<ilamy-calendar style="height: 600px" [events]="events"></ilamy-calendar>`,
})
export class CalendarComponent {
  events = [
    {
      id: '1',
      title: 'Team Sync',
      start: '2026-05-01T10:00:00-05:00',
      end: '2026-05-01T11:00:00-05:00',
    },
  ];
}
```

</details>

<details>
<summary>Vanilla DOM (<code>@ilamy/calendar/dom</code>) &amp; Headless Core (<code>@ilamy/calendar</code>)</summary>

```ts
// Vanilla DOM renderer
import { mountCalendar } from '@ilamy/calendar/dom';
import '@ilamy/calendar/styles.css';

const calendar = mountCalendar(document.getElementById('calendar')!, {
  events: [
    {
      id: '1',
      title: 'Team Sync',
      start: '2026-05-01T10:00:00-05:00',
      end: '2026-05-01T11:00:00-05:00',
    },
  ],
  editable: true,
});
```

```ts
// Framework-agnostic headless controller & view-models
import { createCalendarController, buildMonthViewModel } from '@ilamy/calendar';

const controller = createCalendarController({
  initialView: 'month',
  timezone: 'America/New_York',
});
```

</details>

---

## Custom UI & Portals / Slots

`@ilamy/calendar` ships **zero UI-library wrappers** (`@radix-ui/*`, `@mui/material`, etc.) — every framework wraps the same accessible DOM renderer styled via `--ilamy-*` CSS tokens by default.

Design systems (**shadcn/ui with Base UI or Radix, React Aria, MUI, Vuetify, Bits UI**, or your own components) plug in cleanly through `--ilamy-*` CSS token mapping plus whole-region custom renderers (`renderEventForm`, `renderHeader` / `headerComponent`, `renderEvent`, `renderResource`, `onMoreEventsClick`):

- **React (`@ilamy/calendar/react`)**: Custom regions mount into DOM targets via `ReactDOM.createPortal` and stay synced with `useIlamyCalendarContext()`
- **Vue (`@ilamy/calendar/vue`)**: Scoped slots
- **Svelte / Solid / Angular / Vanilla DOM**: Render callbacks

```tsx
import { IlamyCalendar, type EventFormProps } from '@ilamy/calendar/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import '@ilamy/calendar/styles.css';

function CustomEventForm({ open, onClose, selectedEvent, onAdd, onUpdate }: EventFormProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{selectedEvent?.id ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>
        {/* Render your own Base UI, Radix, React Aria, or MUI form controls */}
        <Input defaultValue={selectedEvent?.title} />
        <Button onClick={onClose}>Close</Button>
      </DialogContent>
    </Dialog>
  );
}

export function ShadcnCalendar({ events }) {
  return (
    <IlamyCalendar
      events={events}
      renderEventForm={(props) => <CustomEventForm {...props} />}
      renderEvent={(event) => <strong>{event.title}</strong>}
    />
  );
}
```

---

## Plugins

The core ships **no plugins**. Every plugin is a **framework-agnostic DOM plugin** — import from its subpath and pass it via `plugins` in **React, Vue, Svelte, Solid, Angular, or Vanilla DOM**:

```tsx
// React
import { IlamyCalendar } from '@ilamy/calendar/react';
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence';
import { agendaPlugin } from '@ilamy/calendar/plugins/agenda';
import { dragToCreatePlugin } from '@ilamy/calendar/plugins/drag-to-create';
import { yearPlugin } from '@ilamy/calendar/plugins/year';
import { icalPlugin } from '@ilamy/calendar/plugins/ical';

<IlamyCalendar
  events={events}
  plugins={[
    recurrencePlugin(),
    agendaPlugin({ window: 'week' }),
    dragToCreatePlugin(),
    yearPlugin(),
    icalPlugin(),
  ]}
/>
```

```ts
// Vanilla DOM (and identically in Vue, Svelte, Solid, or Angular)
import { mountCalendar } from '@ilamy/calendar/dom';
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence';
import { agendaPlugin } from '@ilamy/calendar/plugins/agenda';
import { dragToCreatePlugin } from '@ilamy/calendar/plugins/drag-to-create';
import { yearPlugin } from '@ilamy/calendar/plugins/year';
import { icalPlugin } from '@ilamy/calendar/plugins/ical';

mountCalendar(document.getElementById('calendar')!, {
  events,
  plugins: [
    recurrencePlugin(),
    agendaPlugin({ window: 'week' }),
    dragToCreatePlugin(),
    yearPlugin(),
    icalPlugin(),
  ],
});
```

- **`@ilamy/calendar/plugins/recurrence`** — RFC 5545 recurring-event expansion and scoped edit/delete. Augments `CalendarEvent` with `rrule`, `recurrenceId`, and `exdates`.
- **`@ilamy/calendar/plugins/agenda`** — an agenda (upcoming-events list) view scoped to a `window`.
- **`@ilamy/calendar/plugins/drag-to-create`** — drag across empty cells to open the event form preselected with that range.
- **`@ilamy/calendar/plugins/year`** — 12-month year overview grid.
- **`@ilamy/calendar/plugins/ical`** — RFC 5545 `.ics` export with `VTIMEZONE` & `TZID` support.

---

## Examples

Explore the [examples directory](https://github.com/kcsujeet/ilamy-calendar/tree/main/examples) for complete implementation patterns:

- [Next.js](https://github.com/kcsujeet/ilamy-calendar/tree/main/examples/nextjs) — Integration with Next.js and Tailwind CSS.
- [Astro](https://github.com/kcsujeet/ilamy-calendar/tree/main/examples/astro) — Static site integration with Astro.
- [Vite](https://github.com/kcsujeet/ilamy-calendar/tree/main/examples/vite) — Fast, minimal setup using Vite.

---

## Documentation

For comprehensive guides, API references, and interactive demos, visit [ilamy.dev](https://ilamy.dev).

---

## License

MIT © [Sujeet Kc](https://github.com/kcsujeet)
