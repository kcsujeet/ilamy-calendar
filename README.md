# ilamy Calendar

[![NPM Version](https://img.shields.io/npm/v/@ilamy/calendar?style=flat-square&color=black)](https://www.npmjs.com/package/@ilamy/calendar)
[![License](https://img.shields.io/npm/l/@ilamy/calendar?style=flat-square&color=black)](https://github.com/kcsujeet/ilamy-calendar/blob/main/LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/kcsujeet/ilamy-calendar/ci.yml?branch=main&style=flat-square)](https://github.com/kcsujeet/ilamy-calendar/actions)

A framework-agnostic, **lightweight and pluggable** calendar library with a TC39 Temporal core, a layered CSS token contract (`@ilamy/calendar/styles.css`), and symmetric first-class wrappers for **React 19, Vue 3.5+, Svelte 5, Solid 2.0, Angular 22, and Vanilla DOM**. Zero Tailwind required — works standalone out of the box and auto-bridges shadcn/ui CSS variables when present.

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
- **Symmetric Multi-Framework Architecture**: One pure headless engine (`@ilamy/calendar`) shared across React, Vue, Svelte, Solid, Angular, and Vanilla DOM.
- **Layered CSS, Zero Tailwind Required**: Import `@ilamy/calendar/styles.css` (`@layer ilamy.base, ilamy.theme`) in any CSS setup. Automatically bridges shadcn/ui variables (`--background`, `--primary`, `--border`, `--radius`, `.dark`) when present, with zero `@source` directive needed.
- **RFC 5545 Recurring Events & iCal**: Opt-in `@ilamy/calendar/plugins/recurrence` (RRULE expansion, EXDATE, overrides, Google Calendar-style scoped edits) and `@ilamy/calendar/plugins/ical` (`.ics` export with `VTIMEZONE` / `TZID`).
- **TC39 Temporal & Native `Intl` i18n**: Exact timezone and DST math without `dayjs` or external locale bundles. Any BCP 47 `locale` works natively, plus `translations` / `translator` for UI copy.
- **Drag, Drop & Resize**: Smooth event moving and edge resizing with business-hour constraints and `eventAllow` validation.

---

## Entry Points

| Entry Point | Purpose |
|---|---|
| `@ilamy/calendar` | Pure headless core (`createCalendarController`, Temporal helpers, layout engines, view-model builders, `defaultTranslations`, `createTranslator`, domain types: `CalendarEvent`, `Resource`, `BusinessHours`, `Translations`, etc.) |
| `@ilamy/calendar/react` | React 19 UI wrapper (`IlamyCalendar`, `useIlamyCalendarContext`, `CalendarThemeProvider`, `useSlotProps`, `useCalendarComponents`, `SLOT_*`, `IlamyPlugin`) |
| `@ilamy/calendar/vue` | Vue 3.5+ wrapper (`IlamyCalendar`, `useIlamyCalendar`) |
| `@ilamy/calendar/svelte` | Svelte 5 wrapper (`ilamyCalendar`, `ilamyCalendarAction`, `createIlamyCalendar`) |
| `@ilamy/calendar/solid` | Solid 2.0 wrapper (`IlamyCalendar`, `createIlamyCalendar`) |
| `@ilamy/calendar/angular` | Angular 22 wrapper (`registerIlamyCalendarElement`, `IlamyCalendarElement`, `createAngularCalendar`) |
| `@ilamy/calendar/dom` | Vanilla DOM renderer (`mountCalendar`, `generateDomIcal`, render-context types) |
| `@ilamy/calendar/styles.css` | Combined layered CSS (`@layer ilamy.base, ilamy.theme`) |
| `@ilamy/calendar/styles/base.css` | Structural layout only (`@layer ilamy.base`, zero visual chrome) |
| `@ilamy/calendar/themes/mui` | Material UI theme bridge (`createMuiCalendarTheme`, `useMuiCalendarTheme`, `muiCalendarComponents`) |
| `@ilamy/calendar/themes/stylex` | StyleX token contract (`createStylexCalendarTheme`, `stylexCalendarTheme`, `stylexCalendarDarkTheme`, `stylexSlot`, `createStylexSlotProps`) |
| `@ilamy/calendar/plugins/*` | Opt-in plugins: `recurrence`, `agenda`, `drag-to-create`, `year`, `ical` |
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

All framework peers (`react`, `vue`, `svelte`, `solid-js`, `@angular/core`, `@mui/material`, `@stylexjs/stylex`, `tailwindcss`) are **optional** — install only the framework you use. No `dayjs` or external date library is required.

---

## Styling (`@ilamy/calendar/styles.css`)

Import the pre-built layered stylesheet once in your app — **no Tailwind installation or `@source` directive is required**:

```ts
import '@ilamy/calendar/styles.css';
```

Or in a Tailwind v4 CSS entry file, import it **before** `@import 'tailwindcss';` so Tailwind utilities sit in a higher cascade layer:

```css
@import '@ilamy/calendar/styles.css';
@import 'tailwindcss';
```

- **Auto-bridges shadcn/ui**: If your app defines `--background`, `--foreground`, `--border`, `--primary`, `--muted`, `--radius`, or `.dark`, `--ilamy-*` tokens inherit them automatically.
- **Unstyled / custom chrome**: Import `@ilamy/calendar/styles/base.css` (structural layout only) and/or pass `unstyled` with `slotProps` or override `[data-ilamy-slot="..."]` directly without `!important`.

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

## Theme Adapters (Zero Tailwind)

### Material UI (`@ilamy/calendar/themes/mui`)

Maps your active MUI `Theme` to `--ilamy-*` CSS custom properties and provides native MUI primitives (`Button`, `Dialog`, `TextField`, `Select`, `Popover`, `Checkbox`):

```tsx
import { IlamyCalendar } from '@ilamy/calendar/react';
import { useMuiCalendarTheme } from '@ilamy/calendar/themes/mui';
import '@ilamy/calendar/styles.css';

export function MuiCalendar({ events }) {
  const muiTheme = useMuiCalendarTheme();
  return <IlamyCalendar {...muiTheme} events={events} />;
}
```

### StyleX (`@ilamy/calendar/themes/stylex`)

Applies `--ilamy-*` token vars across React, Vue, Svelte, Solid, Angular, or DOM — with optional `stylex.props(...)` slot overrides:

```tsx
import { IlamyCalendar } from '@ilamy/calendar/react';
import { createStylexCalendarTheme } from '@ilamy/calendar/themes/stylex';
import '@ilamy/calendar/styles.css';

const theme = createStylexCalendarTheme({ mode: 'light' });

export function StylexCalendar({ events }) {
  return <IlamyCalendar {...theme} events={events} />;
}
```

---

## Plugins

The core ships **no plugins**. Add capabilities through the `plugins` prop in React, each imported from its own subpath:

```tsx
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
