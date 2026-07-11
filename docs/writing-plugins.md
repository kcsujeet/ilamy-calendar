# Writing Plugins for @ilamy/calendar

Plugins let you extend the calendar with new event pipelines, custom UI, new views, and your own React state — all without touching the core library. This guide is written for a third-party developer who has `@ilamy/calendar` installed.

---

## What is a plugin?

A plugin is an object that satisfies the `IlamyPlugin` interface. You create it with a factory function (so callers can pass options) and pass it to the calendar's `plugins` prop.

```tsx
import type { IlamyPlugin } from '@ilamy/calendar'
import { IlamyCalendar } from '@ilamy/calendar'

const myPlugin = (): IlamyPlugin => ({
  name: 'my-plugin',
  // implement only the capabilities you need
})

export default function App() {
  return <IlamyCalendar events={[]} plugins={[myPlugin()]} />
}
```

Every member of `IlamyPlugin` except `name` is optional. A plugin implements only the hooks it needs.

**v2 ships no plugins by default.** Opt in explicitly: recurrence requires `plugins={[recurrencePlugin()]}` (see [migration guide](./migration-v2.md)).

---

## Plugin capabilities

### `transformEvents` — event pipeline

```ts
transformEvents?: (events: CalendarEvent[], range: PluginDateRange) => CalendarEvent[]
```

Called once per render cycle. The output of each plugin is fed to the next one (sequential chain). Use it to expand, filter, or decorate events before they are displayed.

- **Expand** — generate in-range instances from a base event (e.g. recurrence expansion).
- **Filter** — remove events based on custom business rules.
- **Decorate** — add computed fields (e.g. apply a `color` based on event category).

`PluginDateRange` has `start` and `end` as `Dayjs` values covering the current viewport.

```tsx
import type { IlamyPlugin, CalendarEvent, PluginDateRange } from '@ilamy/calendar'

const categoryColorPlugin = (): IlamyPlugin => ({
  name: 'category-color',
  transformEvents(events: CalendarEvent[], _range: PluginDateRange) {
    return events.map((event) => ({
      ...event,
      color: event.data?.category === 'urgent' ? 'red' : event.color,
    }))
  },
})
```

---

### `managesEvent` + `applyEdit` / `applyDelete` — scoped mutations

```ts
managesEvent?: (event: CalendarEvent) => boolean
applyEdit?: (args: PluginMutationArgs) => CalendarEvent[]
applyDelete?: (args: PluginMutationArgs) => CalendarEvent[]
```

When the user edits or deletes an event the calendar checks which plugin manages it via `managesEvent` (first-match). The managing plugin's `applyEdit` or `applyDelete` is called with a `PluginMutationArgs` object:

```ts
interface PluginMutationArgs {
  event: CalendarEvent          // the event being mutated
  updates?: Partial<CalendarEvent>  // present for edits, absent for deletes
  currentEvents: CalendarEvent[]    // the full event list at the time of mutation
  scope: unknown                    // opaque value gathered from the mutation-scope slot
}
```

`scope` is your plugin's own opaque data. The host gathers it by rendering the `SLOT_EVENT_MUTATION_SCOPE` slot before calling `applyEdit`/`applyDelete`. Your plugin produces it, the core hands it back.

```tsx
import type {
  IlamyPlugin,
  CalendarEvent,
  PluginMutationArgs,
  EventMutationScopeSlotContext,
} from '@ilamy/calendar'
import { SLOT_EVENT_MUTATION_SCOPE } from '@ilamy/calendar'

type ApprovalScope = { confirmed: boolean }

const approvalPlugin = (): IlamyPlugin => ({
  name: 'approval',

  managesEvent: (event) => Boolean(event.data?.requiresApproval),

  applyEdit: ({ event, updates, currentEvents, scope }: PluginMutationArgs) => {
    const approval = scope as ApprovalScope
    if (!approval.confirmed) return currentEvents // cancel
    return currentEvents.map((e) =>
      e.id === event.id ? { ...e, ...(updates ?? {}) } : e
    )
  },

  applyDelete: ({ event, currentEvents, scope }: PluginMutationArgs) => {
    const approval = scope as ApprovalScope
    if (!approval.confirmed) return currentEvents
    return currentEvents.filter((e) => e.id !== event.id)
  },

  renderSlot(slotName, context) {
    if (slotName === SLOT_EVENT_MUTATION_SCOPE) {
      const { resolve, cancel } = context as EventMutationScopeSlotContext
      return (
        <dialog open>
          <p>Are you sure?</p>
          <button type="button" onClick={() => resolve({ confirmed: true })}>
            Confirm
          </button>
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        </dialog>
      )
    }
    return null
  },
})
```

---

### `renderSlot` — UI contributions

```ts
renderSlot?: (slotName: string, context: unknown) => ReactNode
```

The host renders named slots at fixed mount points. All plugins may contribute to the same slot (additive). Narrow `context` by `slotName` using the typed context interfaces.

#### Built-in slots

| Constant | Value | Context type | Where it renders |
|---|---|---|---|
| `SLOT_EVENT_FORM` | `'event-form'` | `EventFormSlotContext` | Inside the create/edit event form |
| `SLOT_EVENT_MUTATION_SCOPE` | `'event-mutation-scope'` | `EventMutationScopeSlotContext` | Shown before a scoped edit/delete is applied |

**`EventFormSlotContext`**:
```ts
interface EventFormSlotContext {
  event: CalendarEvent
  onChange: (updates: Partial<CalendarEvent>) => void
}
```

**`EventMutationScopeSlotContext`**:
```ts
interface EventMutationScopeSlotContext {
  event: CalendarEvent
  operation: 'edit' | 'delete'
  resolve: (scope: unknown) => void
  cancel: () => void
}
```

Example — adding a custom field to the event form:

```tsx
import type { IlamyPlugin, EventFormSlotContext } from '@ilamy/calendar'
import { SLOT_EVENT_FORM } from '@ilamy/calendar'

const meetingTypePlugin = (): IlamyPlugin => ({
  name: 'meeting-type',

  renderSlot(slotName, context) {
    if (slotName === SLOT_EVENT_FORM) {
      const { event, onChange } = context as EventFormSlotContext
      return (
        <label>
          Meeting type
          <select
            value={(event.data?.meetingType as string) ?? ''}
            onChange={(e) =>
              onChange({ data: { ...event.data, meetingType: e.target.value } })
            }
          >
            <option value="standup">Standup</option>
            <option value="review">Review</option>
          </select>
        </label>
      )
    }
    return null
  },
})
```

> **Bring your own UI.** The host design system (Shadcn components, `@/components/ui`) is not exported. Plugins render plain React or their own component library.

---

### `contribute` / `collect` — data contributions

```ts
contribute?: (point: string, context: unknown) => unknown[]
```

The data twin of `renderSlot`. Contribute arbitrary data to a named extension point. Results from all plugins are aggregated via `collect` on `IlamyCalendarApi`. Additive — all plugins may contribute to the same point.

Example: the recurrence plugin contributes iCal property lines to the `'ical:vevent-properties'` point, and the core iCal exporter gathers them via `collect`:

```ts
const recurrencePlugin = (): IlamyPlugin => ({
  name: 'recurrence',
  contribute(point, context) {
    if (point === 'ical:vevent-properties') {
      const event = context as CalendarEvent
      // return RRULE/EXDATE/RECURRENCE-ID lines
      return event.rrule ? [`RRULE:${formatRRule(event.rrule)}`] : []
    }
    return []
  },
})
```

A plugin can also define its own points and document them so other plugins can contribute to them.

Within a plugin component or a custom view, call `collect` from context:

```ts
const { collect } = useIlamyCalendarContext()
const extraLines = collect('ical:vevent-properties', event)
```

---

### `views` — register new views

```ts
views?: PluginView[]
```

```ts
interface PluginView {
  name: string              // unique view id, e.g. 'resource-week'
  label?: string            // view-switcher label (or translation key)
  component: ComponentType  // renders the view
  navigationUnit?: ManipulateType  // how next/prev steps ('week', 'month', 'day', …)
}
```

Register one or more new calendar views. They appear in the view switcher after the built-in views. The component receives no props; it reads all state via `useIlamyCalendarContext()`.

```tsx
import type { IlamyPlugin } from '@ilamy/calendar'
import { useIlamyCalendarContext } from '@ilamy/calendar'

function AgendaView() {
  const { events, currentDate } = useIlamyCalendarContext()
  return (
    <ul>
      {events.map((event) => (
        <li key={event.id}>{event.title}</li>
      ))}
    </ul>
  )
}

const agendaPlugin = (): IlamyPlugin => ({
  name: 'agenda',
  views: [
    {
      name: 'agenda',
      label: 'Agenda',
      component: AgendaView,
      navigationUnit: 'month',
    },
  ],
})
```

---

### `provider` — plugin-owned React context

```ts
provider?: ComponentType<{ children: ReactNode }>
```

Wraps the calendar subtree so your plugin's React context is available to its views, slots, and components. Rendered as the outermost wrapper among all plugin providers.

```tsx
import { createContext, useContext, useState } from 'react'
import type { IlamyPlugin } from '@ilamy/calendar'

interface AgendaState { compact: boolean; setCompact: (v: boolean) => void }
const AgendaContext = createContext<AgendaState | null>(null)
export const useAgendaContext = () => {
  const ctx = useContext(AgendaContext)
  if (!ctx) throw new Error('Must be inside AgendaProvider')
  return ctx
}

function AgendaProvider({ children }: { children: React.ReactNode }) {
  const [compact, setCompact] = useState(false)
  return (
    <AgendaContext.Provider value={{ compact, setCompact }}>
      {children}
    </AgendaContext.Provider>
  )
}

const agendaPlugin = (): IlamyPlugin => ({
  name: 'agenda',
  provider: AgendaProvider,
  // views can now call useAgendaContext()
})
```

---

## Extending the `CalendarEvent` type

Core `CalendarEvent` is a lean interface with no plugin-specific fields. Add custom fields via TypeScript declaration merging so the type system reflects them everywhere your plugin is imported.

```ts
// In your plugin's source (e.g. augment.ts), import the module first:
import '@ilamy/calendar'

declare module '@ilamy/calendar' {
  interface CalendarEvent {
    meetingType?: string
    requiresApproval?: boolean
  }
}
```

Once this file is imported (it is re-exported from the recurrence plugin's entry for the same reason), `event.meetingType` is typed everywhere. Collisions surface as compile errors.

---

## Reading calendar state in plugin components

Use `useIlamyCalendarContext()` from `@ilamy/calendar` inside any component rendered by the calendar (views, slot content, etc.). It returns `IlamyCalendarApi`:

```ts
import { useIlamyCalendarContext } from '@ilamy/calendar'

function MyPluginView() {
  const {
    // State
    currentDate,       // Dayjs — the currently displayed date
    view,              // string — current view name
    events,            // CalendarEvent[] — plugin-transformed events for the viewport
    rawEvents,         // CalendarEvent[] — stored events before transformation
    selectedEvent,     // CalendarEvent | null
    selectedDate,      // Dayjs | null
    isEventFormOpen,   // boolean
    firstDayOfWeek,    // number (0 = Sunday, 1 = Monday, …)
    resources,         // Resource[]
    currentLocale,     // string
    timezone,          // string | undefined
    timeFormat,        // TimeFormat
    businessHours,     // BusinessHours | BusinessHours[] | undefined

    // Navigation
    setCurrentDate,    // (date: Dayjs) => void
    selectDate,        // (date: Dayjs) => void
    setView,           // (view: string, date?: Dayjs) => void
    nextPeriod,        // () => void
    prevPeriod,        // () => void
    today,             // () => void

    // CRUD
    addEvent,          // (event: CalendarEvent) => void
    updateEvent,       // (id: string | number, updates: Partial<CalendarEvent>) => void
    deleteEvent,       // (id: string | number) => void
    applyScopedEdit,   // (event, updates, scope) => void
    applyScopedDelete, // (event, scope) => void

    // Form control
    openEventForm,     // (eventData?: Partial<CalendarEvent>) => void
    closeEventForm,    // () => void

    // Querying
    getEventsForDateRange, // (start: Dayjs, end: Dayjs) => CalendarEvent[]
    getEventsForResource,  // (resourceId: string | number) => CalendarEvent[]

    // Plugin system (read-only access from inside a plugin)
    getEventManager,   // (event: CalendarEvent) => IlamyPlugin | undefined
    renderSlot,        // (slotName: string, context: unknown) => ReactNode[]
    collect,           // (point: string, context: unknown) => unknown[]
    getViews,          // () => PluginView[]

    // i18n
    t,                 // TranslatorFunction
  } = useIlamyCalendarContext()
  // ...
}
```

---

## Packaging a third-party plugin

Create a separate npm package. Declare `@ilamy/calendar` as a `peerDependency` (not a regular dependency) so consumers don't get a duplicate copy:

```json
{
  "name": "ilamy-calendar-my-plugin",
  "peerDependencies": {
    "@ilamy/calendar": ">=2.0.0",
    "react": ">=19.0.0"
  }
}
```

Import the entire SDK from `@ilamy/calendar`. Deep imports into the package (e.g. `@ilamy/calendar/src/...`) are blocked by the `exports` map; only `@ilamy/calendar` and `@ilamy/calendar/plugins/recurrence` are valid entry points.

Consumers install and wire it the same way as first-party plugins:

```bash
npm install @ilamy/calendar ilamy-calendar-my-plugin
```

```tsx
import { myPlugin } from 'ilamy-calendar-my-plugin'
<IlamyCalendar plugins={[myPlugin()]} />
```

---

## Complete example — holiday highlighter

A small plugin that uses `transformEvents` to apply a color to events on recognized holidays, and declaration merging to add a typed `isHoliday` field.

```tsx
// holiday-plugin/augment.ts
import '@ilamy/calendar'

declare module '@ilamy/calendar' {
  interface CalendarEvent {
    isHoliday?: boolean
  }
}
```

```tsx
// holiday-plugin/index.ts
import './augment'
import type { IlamyPlugin, CalendarEvent, PluginDateRange } from '@ilamy/calendar'

const HOLIDAY_COLOR = '#e11d48'

export const holidayPlugin = (): IlamyPlugin => ({
  name: 'holiday-highlighter',

  transformEvents(events: CalendarEvent[], _range: PluginDateRange) {
    return events.map((event) =>
      event.isHoliday ? { ...event, color: HOLIDAY_COLOR } : event
    )
  },
})
```

```tsx
// app.tsx
import { IlamyCalendar, dayjs } from '@ilamy/calendar'
import { holidayPlugin } from './holiday-plugin'

const events = [
  {
    id: '1',
    title: 'New Year',
    start: dayjs('2026-01-01T00:00:00Z'),
    end: dayjs('2026-01-01T23:59:59Z'),
    allDay: true,
    isHoliday: true,
  },
]

export default function App() {
  return <IlamyCalendar events={events} plugins={[holidayPlugin()]} />
}
```

---

## Summary of public imports

Everything a plugin needs comes from `@ilamy/calendar`:

```ts
import {
  // Components
  IlamyCalendar,
  IlamyResourceCalendar,

  // Plugin contract types
  type IlamyPlugin,
  type PluginView,
  type PluginMutationArgs,
  type PluginDateRange,

  // Slot catalog
  SLOT_EVENT_FORM,
  SLOT_EVENT_MUTATION_SCOPE,
  type EventFormSlotContext,
  type EventMutationScopeSlotContext,

  // Context hook
  useIlamyCalendarContext,
  type IlamyCalendarApi,

  // Core types
  type CalendarEvent,
  type CalendarView,
  type BusinessHours,
  type Resource,
  type Translations,
  type TranslatorFunction,

  // Date utilities
  dayjs,
  type Dayjs,
  type ManipulateType,
} from '@ilamy/calendar'
```

The first-party recurrence plugin ships as a separate subpath:

```ts
import {
  recurrencePlugin,
  generateRecurringEvents,
  isRecurringEvent,
  RRule,
  type RRuleOptions,
} from '@ilamy/calendar/plugins/recurrence'
```
