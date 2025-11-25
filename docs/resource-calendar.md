# Resource Calendar

The **Resource Calendar** is a powerful feature of `@ilamy/calendar` that allows you to visualize and manage events across multiple resources in a timeline layout. Perfect for room bookings, equipment scheduling, team availability, and any scenario where events need to be tracked across different entities.

## Overview

The Resource Calendar extends the standard calendar with resource-based event organization, displaying events in horizontal rows where each row represents a resource (person, room, equipment, etc.). It supports all standard calendar features including drag-and-drop, recurring events, multiple views, and internationalization.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Resource Interface](#resource-interface)
- [Resource Calendar Events](#resource-calendar-events)
- [Props](#props)
- [Context API](#context-api)
- [Views](#views)
- [Cross-Resource Events](#cross-resource-events)
- [Custom Resource Rendering](#custom-resource-rendering)
- [Styling & Theming](#styling--theming)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Basic Usage

```tsx
import { IlamyResourceCalendar } from '@ilamy/calendar'
import type { Resource, CalendarEvent } from '@ilamy/calendar'

const resources: Resource[] = [
  {
    id: 'room-a',
    title: 'Conference Room A',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  {
    id: 'room-b',
    title: 'Conference Room B',
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
]

const events: CalendarEvent[] = [
  {
    id: 'event-1',
    title: 'Team Meeting',
    start: dayjs('2025-08-04T09:00:00.000Z'),
    end: dayjs('2025-08-04T10:00:00.000Z'),
    uid: 'event-1@ilamy.calendar',
    resourceId: 'room-a',
  },
]

function App() {
  return (
    <IlamyResourceCalendar
      resources={resources}
      events={events}
      firstDayOfWeek="sunday"
      initialView="week"
    />
  )
}
```

## Resource Interface

Resources represent the entities across which events are organized (rooms, people, equipment, etc.).

```typescript
interface Resource {
  /** Unique identifier for the resource */
  id: string | number

  /** Display title of the resource */
  title: string

  /**
   * Color for the resource (supports CSS color values, hex, rgb, hsl, or CSS class names)
   * @example "#3b82f6", "blue-500", "rgb(59, 130, 246)"
   */
  color?: string

  /**
   * Background color for the resource (supports CSS color values, hex, rgb, hsl, or CSS class names)
   * @example "#dbeafe", "blue-100", "rgba(59, 130, 246, 0.1)"
   */
  backgroundColor?: string

  /** Optional position for resource display */
  position?: number
}
```

### Resource Color System

The resource calendar supports custom colors and backgrounds for each resource:

```tsx
const resources: Resource[] = [
  {
    id: 'designer',
    title: 'Design Team',
    color: '#8B5CF6', // Purple text
    backgroundColor: '#F5F3FF', // Light purple background
  },
  {
    id: 'engineer',
    title: 'Engineering Team',
    color: '#10B981', // Green text
    backgroundColor: '#ECFDF5', // Light green background
  },
]
```

## Resource Calendar Events

The standard `CalendarEvent` interface includes optional resource assignment fields for use with resource calendars.

```typescript
interface CalendarEvent {
  // ... standard event properties (id, title, start, end, etc.)

  /** Single resource assignment */
  resourceId?: string | number

  /** Multiple resource assignment (cross-resource events) */
  resourceIds?: (string | number)[]
}
```

### Event Types

#### 1. Single Resource Events

Events assigned to a single resource using `resourceId`:

```tsx
const event: CalendarEvent = {
  id: 'meeting-1',
  title: 'Team Standup',
  start: dayjs('2025-08-04T10:00:00.000Z'),
  end: dayjs('2025-08-04T10:30:00.000Z'),
  uid: 'meeting-1@ilamy.calendar',
  resourceId: 'room-a', // Assigned to one resource
}
```

#### 2. Cross-Resource Events

Events that span multiple resources using `resourceIds`:

```tsx
const event: CalendarEvent = {
  id: 'all-hands',
  title: 'All Hands Meeting',
  start: dayjs('2025-08-04T14:00:00.000Z'),
  end: dayjs('2025-08-04T15:00:00.000Z'),
  uid: 'all-hands@ilamy.calendar',
  resourceIds: ['room-a', 'room-b', 'room-c'], // Spans multiple resources
}
```

#### 3. Unassigned Events

Events without resource assignment are handled gracefully:

```tsx
const event: CalendarEvent = {
  id: 'floating-event',
  title: 'No Resource Assigned',
  start: dayjs('2025-08-04T12:00:00.000Z'),
  end: dayjs('2025-08-04T13:00:00.000Z'),
  uid: 'floating-event@ilamy.calendar',
  // No resourceId or resourceIds
}
```

## Props

The `IlamyResourceCalendar` component extends all props from `IlamyCalendar` with resource-specific additions:

```typescript
interface IlamyResourceCalendarProps extends IlamyCalendarProps {
  /** Array of events to display */
  events?: CalendarEvent[]

  /** Array of resources */
  resources?: Resource[]

  /** Custom render function for resources */
  renderResource?: (resource: Resource) => React.ReactNode
}
```

### Key Props

| Prop                 | Type                                | Default     | Description                                                          |
| -------------------- | ----------------------------------- | ----------- | -------------------------------------------------------------------- |
| `resources`          | `Resource[]`                        | `[]`        | Array of resources to display                                        |
| `events`             | `CalendarEvent[]`                   | `[]`        | Array of events with resource assignments                            |
| `renderResource`     | `(resource: Resource) => ReactNode` | `undefined` | Custom resource rendering function                                   |
| `initialView`        | `CalendarView`                      | `'month'`   | Initial view mode (Note: 'year' view is not supported for resources) |
| `firstDayOfWeek`     | `'sunday' \| 'monday'`              | `'sunday'`  | First day of the week                                                |
| `disableDragAndDrop` | `boolean`                           | `false`     | Disable event drag-and-drop                                          |
| `onEventClick`       | `(event: CalendarEvent) => void`    | `undefined` | Event click handler                                                  |
| `onCellClick`        | `(info: CellClickInfo) => void`     | `undefined` | Cell click handler with `start`, `end`, and optional `resourceId`    |
| `onEventAdd`         | `(event: CalendarEvent) => void`    | `undefined` | Event add callback                                                   |
| `onEventUpdate`      | `(event: CalendarEvent) => void`    | `undefined` | Event update callback                                                |
| `onEventDelete`      | `(eventId: string) => void`         | `undefined` | Event delete callback                                                |

For all inherited props, see the [standard calendar documentation](https://ilamy.dev/docs/calendar).

## Context API

The Resource Calendar provides a specialized context with resource-specific utilities.

### useIlamyResourceCalendarContext

Access the resource calendar context from within custom components:

```tsx
import { useIlamyResourceCalendarContext } from '@ilamy/calendar'

function CustomComponent() {
  const {
    resources,
    events,
    currentDate,
    view,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForResource,
  } = useIlamyResourceCalendarContext()

  const roomAEvents = getEventsForResource('room-a')

  return <div>Room A has {roomAEvents.length} events</div>
}
```

### Context Methods

```typescript
interface UseIlamyResourceCalendarContextReturn {
  // Standard calendar properties
  readonly currentDate: Dayjs
  readonly view: CalendarView
  readonly events: CalendarEvent[]
  readonly isEventFormOpen: boolean
  readonly selectedEvent: CalendarEvent | null
  readonly selectedDate: Dayjs | null
  readonly firstDayOfWeek: number

  // Resource-specific properties
  readonly resources: Resource[]

  // Navigation methods
  setCurrentDate: (date: Dayjs) => void
  selectDate: (date: Dayjs) => void
  setView: (view: CalendarView) => void
  nextPeriod: () => void
  prevPeriod: () => void
  today: () => void

  // Event management methods
  addEvent: (event: CalendarEvent) => void
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void
  deleteEvent: (eventId: string) => void
  openEventForm: (eventData?: Partial<CalendarEvent>) => void
  closeEventForm: () => void

  // Resource-specific methods
  getEventsForResource: (resourceId: string | number) => CalendarEvent[]
}
```

## Views

The Resource Calendar supports three views, each displaying resources in horizontal rows:

### Month View

Timeline view showing resources as rows and days as columns:

```tsx
<IlamyResourceCalendar
  resources={resources}
  events={events}
  initialView="month"
/>
```

Features:

- Full month overview with resource rows
- Compact event display
- Scroll to see all resources
- All-day events displayed prominently

### Week View

Detailed timeline with hourly time slots:

```tsx
<IlamyResourceCalendar
  resources={resources}
  events={events}
  initialView="week"
/>
```

Features:

- 7-day view with resource rows
- Hourly time slots (24-hour format)
- Precise event positioning
- Drag-and-drop between resources and time slots
- Collision detection and overlapping event handling

### Day View

Focused single-day view with maximum detail:

```tsx
<IlamyResourceCalendar
  resources={resources}
  events={events}
  initialView="day"
/>
```

Features:

- Single day with all resources
- Full hourly breakdown
- Maximum event detail
- Ideal for day-of scheduling

## Cross-Resource Events

Cross-resource events span multiple resources simultaneously, perfect for meetings that require multiple rooms or involve multiple team members.

### Creating Cross-Resource Events

Use `resourceIds` array to assign an event to multiple resources:

```tsx
const crossResourceEvent: CalendarEvent = {
  id: 'quarterly-review',
  title: 'Quarterly Business Review',
  start: dayjs('2025-08-04T13:00:00.000Z'),
  end: dayjs('2025-08-04T17:00:00.000Z'),
  uid: 'quarterly-review@ilamy.calendar',
  resourceIds: ['room-a', 'room-b', 'projector-1'], // Multiple resources
  color: '#8B5CF6',
}
```

### Visual Representation

Cross-resource events are displayed across all assigned resource rows:

```
┌─────────────┬─────────────────────────────────┐
│ Room A      │ ████ Quarterly Review ████      │
├─────────────┼─────────────────────────────────┤
│ Room B      │ ████ Quarterly Review ████      │
├─────────────┼─────────────────────────────────┤
│ Projector 1 │ ████ Quarterly Review ████      │
└─────────────┴─────────────────────────────────┘
```

### Working with Cross-Resource Events

```tsx
import { useIlamyResourceCalendarContext } from '@ilamy/calendar'

function EventManager() {
  const { events, resources } = useIlamyResourceCalendarContext()

  // Find all cross-resource events
  const crossResourceEvents = events.filter(
    (event) => event.resourceIds && event.resourceIds.length > 1
  )

  // Get all resources for an event
  const getEventResources = (event: CalendarEvent) => {
    const eventResourceIds = event.resourceIds || [event.resourceId]
    return resources.filter((resource) =>
      eventResourceIds.includes(resource.id)
    )
  }

  return (
    <div>
      {crossResourceEvents.map((event) => (
        <div key={event.id}>
          {event.title} - {getEventResources(event).length} resources
        </div>
      ))}
    </div>
  )
}
```

## Custom Resource Rendering

Customize how resources are displayed using the `renderResource` prop:

### Basic Custom Rendering

```tsx
import { IlamyResourceCalendar } from '@ilamy/calendar'
import type { Resource } from '@ilamy/calendar'

const CustomResourceRenderer = (resource: Resource) => (
  <div className="flex items-center gap-2 p-2">
    <div
      className="h-3 w-3 rounded-full"
      style={{ backgroundColor: resource.color }}
    />
    <span className="font-semibold">{resource.title}</span>
  </div>
)

function App() {
  return (
    <IlamyResourceCalendar
      resources={resources}
      events={events}
      renderResource={CustomResourceRenderer}
    />
  )
}
```

### Advanced Custom Rendering

```tsx
const AdvancedResourceRenderer = (resource: Resource) => {
  const { getEventsForResource } = useIlamyResourceCalendarContext()
  const eventCount = getEventsForResource(resource.id).length

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="flex items-center justify-between">
        <span className="font-bold">{resource.title}</span>
        <span className="text-xs text-muted-foreground">
          {eventCount} events
        </span>
      </div>
      {resource.color && (
        <div
          className="h-1 w-full rounded"
          style={{ backgroundColor: resource.color }}
        />
      )}
    </div>
  )
}
```

### With Icons and Status

```tsx
import { Calendar, MapPin, Users } from 'lucide-react'

const IconResourceRenderer = (resource: Resource) => {
  const getResourceIcon = (resourceId: string) => {
    if (resourceId.includes('room')) return <MapPin className="h-4 w-4" />
    if (resourceId.includes('team')) return <Users className="h-4 w-4" />
    return <Calendar className="h-4 w-4" />
  }

  return (
    <div className="flex items-center gap-2 p-2">
      <div style={{ color: resource.color }}>
        {getResourceIcon(resource.id)}
      </div>
      <div className="flex flex-col">
        <span className="font-medium">{resource.title}</span>
        {resource.backgroundColor && (
          <span className="text-xs" style={{ color: resource.color }}>
            Available
          </span>
        )}
      </div>
    </div>
  )
}
```

## Styling & Theming

The Resource Calendar inherits all styling capabilities from the standard calendar and adds resource-specific styling options.

### Resource Colors

Customize resource appearance with color and backgroundColor:

```tsx
const resources: Resource[] = [
  {
    id: 'vip-room',
    title: 'VIP Conference Room',
    color: '#F59E0B', // Amber text
    backgroundColor: '#FEF3C7', // Light amber background
  },
]
```

### Custom CSS Classes

Apply custom styles using Tailwind CSS or custom CSS:

```tsx
<IlamyResourceCalendar
  resources={resources}
  events={events}
  viewHeaderClassName="bg-gradient-to-r from-blue-500 to-purple-500"
  headerClassName="border-b-4 border-blue-500"
/>
```

### Event Styling by Resource

Style events differently based on their resource:

```tsx
const CustomEventRenderer = (event: CalendarEvent) => {
  const { getResourceById } = useIlamyResourceCalendarContext()
  const resource = event.resourceId
    ? getResourceById(event.resourceId)
    : undefined

  return (
    <div
      className="rounded p-1 text-xs font-medium"
      style={{
        backgroundColor: resource?.backgroundColor || event.color,
        color: resource?.color || '#000',
        borderLeft: `3px solid ${resource?.color || event.color}`,
      }}
    >
      {event.title}
    </div>
  )
}

;<IlamyResourceCalendar
  resources={resources}
  events={events}
  renderEvent={CustomEventRenderer}
/>
```

## Examples

### Room Booking System

```tsx
import { IlamyResourceCalendar } from '@ilamy/calendar'
import type { CalendarEvent, CellClickInfo, Resource } from '@ilamy/calendar'
import { useState } from 'react'
import dayjs from 'dayjs'

const RoomBookingCalendar = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([])

  const rooms: Resource[] = [
    {
      id: 'conf-a',
      title: 'Conference Room A (10 people)',
      color: '#3B82F6',
      backgroundColor: '#EFF6FF',
      position: 1,
    },
    {
      id: 'conf-b',
      title: 'Conference Room B (20 people)',
      color: '#EF4444',
      backgroundColor: '#FEF2F2',
      position: 2,
    },
    {
      id: 'board-room',
      title: 'Board Room (8 people)',
      color: '#8B5CF6',
      backgroundColor: '#F5F3FF',
      position: 3,
    },
  ]

  const handleCellClick = (info: CellClickInfo) => {
    const { start, end, resourceId } = info
    if (!resourceId) return

    const newEvent: CalendarEvent = {
      id: `booking-${Date.now()}`,
      title: 'New Booking',
      start,
      end,
      uid: `booking-${Date.now()}@company.com`,
      resourceId,
      color: '#10B981',
    }

    setEvents((prev) => [...prev, newEvent])
  }

  const handleEventUpdate = (event: CalendarEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
  }

  return (
    <IlamyResourceCalendar
      resources={rooms}
      events={events}
      initialView="week"
      onCellClick={handleCellClick}
      onEventUpdate={handleEventUpdate}
      firstDayOfWeek="monday"
    />
  )
}
```

### Team Schedule

```tsx
const TeamScheduleCalendar = () => {
  const teamMembers: Resource[] = [
    {
      id: 'alice',
      title: 'Alice Johnson - Senior Developer',
      color: '#3B82F6',
      backgroundColor: '#EFF6FF',
    },
    {
      id: 'bob',
      title: 'Bob Smith - Product Manager',
      color: '#EF4444',
      backgroundColor: '#FEF2F2',
    },
    {
      id: 'carol',
      title: 'Carol Williams - Designer',
      color: '#8B5CF6',
      backgroundColor: '#F5F3FF',
    },
  ]

  const teamEvents: CalendarEvent[] = [
    {
      id: 'standup',
      title: 'Daily Standup',
      start: dayjs('2025-08-04T10:00:00.000Z'),
      end: dayjs('2025-08-04T10:15:00.000Z'),
      uid: 'standup@team.com',
      resourceIds: ['alice', 'bob', 'carol'], // All team members
      color: '#10B981',
    },
    {
      id: 'alice-coding',
      title: 'Feature Development',
      start: dayjs('2025-08-04T11:00:00.000Z'),
      end: dayjs('2025-08-04T15:00:00.000Z'),
      uid: 'alice-coding@team.com',
      resourceId: 'alice',
      color: '#3B82F6',
    },
    {
      id: 'bob-planning',
      title: 'Sprint Planning',
      start: dayjs('2025-08-04T14:00:00.000Z'),
      end: dayjs('2025-08-04T16:00:00.000Z'),
      uid: 'bob-planning@team.com',
      resourceId: 'bob',
      color: '#EF4444',
    },
  ]

  return (
    <IlamyResourceCalendar
      resources={teamMembers}
      events={teamEvents}
      initialView="week"
      firstDayOfWeek="monday"
    />
  )
}
```

### Equipment Scheduling

```tsx
const EquipmentScheduleCalendar = () => {
  const equipment: Resource[] = [
    {
      id: 'projector-1',
      title: 'HD Projector #1',
      color: '#F59E0B',
      backgroundColor: '#FEF3C7',
    },
    {
      id: 'projector-2',
      title: 'HD Projector #2',
      color: '#F59E0B',
      backgroundColor: '#FEF3C7',
    },
    {
      id: 'camera-1',
      title: 'Video Camera #1',
      color: '#EC4899',
      backgroundColor: '#FCE7F3',
    },
  ]

  const customResourceRenderer = (resource: Resource) => (
    <div className="flex items-center gap-2 p-2">
      <div
        className="h-4 w-4 rounded-full"
        style={{ backgroundColor: resource.color }}
      />
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{resource.title}</span>
        <span className="text-xs text-muted-foreground">Available</span>
      </div>
    </div>
  )

  return (
    <IlamyResourceCalendar
      resources={equipment}
      events={[]}
      initialView="day"
      renderResource={customResourceRenderer}
    />
  )
}
```

## Best Practices

### 1. Resource Organization

- **Use meaningful IDs**: Choose descriptive resource IDs (`'room-a'`, `'john-doe'`) instead of generic ones
- **Set positions**: Use the `position` property to control resource display order
- **Group related resources**: Organize resources by type (rooms, equipment, people)

```tsx
const resources: Resource[] = [
  // Group 1: Small rooms
  { id: 'small-1', title: 'Small Room 1', position: 1 },
  { id: 'small-2', title: 'Small Room 2', position: 2 },

  // Group 2: Large rooms
  { id: 'large-1', title: 'Large Room 1', position: 3 },
  { id: 'large-2', title: 'Large Room 2', position: 4 },
]
```

### 2. Event Assignment

- **Use `resourceId` for single assignments**: Simpler and more performant
- **Use `resourceIds` for cross-resource events**: When event truly spans multiple resources
- **Validate resource IDs**: Ensure event resource IDs exist in resources array

```tsx
const validateEvent = (
  event: CalendarEvent,
  resources: Resource[]
): boolean => {
  const resourceIds = event.resourceIds || [event.resourceId]
  const validIds = resources.map((r) => r.id)

  return resourceIds.every((id) => id && validIds.includes(id))
}
```

### 3. Performance Optimization

- **Memoize event filtering**: Cache filtered events per resource
- **Virtualize large resource lists**: For 50+ resources, implement virtualization
- **Batch updates**: Group multiple event updates into single state update

```tsx
const MemoizedResourceEvents = React.memo(({ resourceId }: Props) => {
  const { getEventsForResource } = useIlamyResourceCalendarContext()
  const events = React.useMemo(
    () => getEventsForResource(resourceId),
    [resourceId, getEventsForResource]
  )

  return <EventList events={events} />
})
```

### 4. User Experience

- **Clear resource labels**: Use descriptive resource titles
- **Visual distinction**: Use different colors for different resource types
- **Handle conflicts**: Validate resource availability before booking
- **Show resource capacity**: Include capacity info in resource titles

```tsx
const resources: Resource[] = [
  {
    id: 'room-1',
    title: 'Conference Room A (Capacity: 10)',
    color: '#3B82F6',
  },
]
```

### 5. Accessibility

- **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
- **ARIA labels**: Add appropriate ARIA labels to resource headers
- **Color contrast**: Ensure resource colors meet WCAG contrast requirements
- **Screen reader support**: Provide descriptive text for resource relationships

### 6. Data Management

- **Centralize state**: Keep events and resources in parent component state
- **Immutable updates**: Always create new arrays/objects when updating
- **Validate on change**: Check for conflicts and validate data on every update

```tsx
const handleEventUpdate = (updatedEvent: CalendarEvent) => {
  setEvents((prevEvents) =>
    prevEvents.map((event) =>
      event.id === updatedEvent.id ? updatedEvent : event
    )
  )
}
```

### 7. Testing

- **Test resource filtering**: Verify events are correctly assigned to resources
- **Test cross-resource events**: Ensure multi-resource events display correctly
- **Test drag-and-drop**: Verify events can move between resources
- **Test edge cases**: Empty resources, events without resources, etc.

```tsx
describe('ResourceCalendar', () => {
  it('should filter events by resource', () => {
    const { getEventsForResource } = useIlamyResourceCalendarContext()
    const roomAEvents = getEventsForResource('room-a')
    expect(roomAEvents).toHaveLength(3)
  })
})
```

## Internationalization

The Resource Calendar fully supports internationalization through the same system as the standard calendar:

```tsx
import { useTranslation } from 'react-i18next'

const LocalizedResourceCalendar = () => {
  const { t } = useTranslation('calendar')

  return (
    <IlamyResourceCalendar
      resources={resources}
      events={events}
      translator={(key) => t(key)}
      locale="es"
      firstDayOfWeek="monday"
    />
  )
}
```

See the [Translation Usage Guide](./translation-usage.md) for comprehensive i18n documentation.

## Advanced Features

### Recurring Events with Resources

Resource calendar supports all RFC 5545 recurring event features:

```tsx
import { RRule } from 'rrule'

const recurringMeeting: CalendarEvent = {
  id: 'weekly-standup',
  title: 'Weekly Team Standup',
  start: dayjs('2025-08-04T10:00:00.000Z'),
  end: dayjs('2025-08-04T10:30:00.000Z'),
  uid: 'weekly-standup@team.com',
  resourceIds: ['alice', 'bob', 'carol'],
  rrule: new RRule({
    freq: RRule.WEEKLY,
    byweekday: [RRule.MO, RRule.WE, RRule.FR],
    count: 20,
  }).toString(),
}
```

### Export Resource Events

Export resource calendar events to iCalendar format:

```tsx
import { downloadICalendar } from '@ilamy/calendar'

const handleExport = () => {
  const { events } = useIlamyResourceCalendarContext()
  downloadICalendar(events, 'resource-schedule.ics')
}
```

See the [iCalendar Export Guide](./export-ical.md) for more details.

## TypeScript Support

The Resource Calendar is fully typed with comprehensive TypeScript definitions:

```typescript
import type {
  Resource,
  CalendarEvent,
  CellClickInfo,
  IlamyResourceCalendarProps,
  UseIlamyResourceCalendarContextReturn,
} from '@ilamy/calendar'

// Type-safe resource definition
const typedResource: Resource = {
  id: 'room-a',
  title: 'Conference Room A',
  color: '#3B82F6',
  backgroundColor: '#EFF6FF',
}

// Type-safe event definition
const typedEvent: CalendarEvent = {
  id: 'meeting-1',
  title: 'Team Meeting',
  start: dayjs(),
  end: dayjs().add(1, 'hour'),
  uid: 'meeting-1@company.com',
  resourceId: 'room-a',
}

// Type-safe cell click handler
const handleCellClick = (info: CellClickInfo) => {
  // CellClickInfo contains: { start: Dayjs, end: Dayjs, resourceId?: string | number }
  console.log('Clicked:', info.start, info.end, info.resourceId)
}
```

## Troubleshooting

### Events not showing for resources

Ensure event `resourceId` or `resourceIds` match existing resource IDs:

```tsx
// Check if event resources exist
const eventResources = event.resourceIds || [event.resourceId]
const validResources = resources.filter((r) => eventResources.includes(r.id))

if (validResources.length === 0) {
  console.warn('Event has no valid resources:', event)
}
```

### Resource colors not applying

Verify color format and ensure values are valid CSS colors:

```tsx
const isValidColor = (color: string): boolean => {
  const s = new Option().style
  s.color = color
  return s.color !== ''
}
```

### Performance issues with many resources

Implement virtualization for large resource lists or limit visible resources:

```tsx
const [visibleResourceIds, setVisibleResourceIds] = useState<Set<string>>(
  new Set(resources.slice(0, 10).map((r) => r.id))
)

const visibleResources = resources.filter((r) => visibleResourceIds.has(r.id))
```

## Related Documentation

- [Standard Calendar Documentation](https://ilamy.dev/docs/calendar)
- [Translation Usage Guide](./translation-usage.md)
- [iCalendar Export Guide](./export-ical.md)
- [RFC 5545 Recurring Events](./rfc-5545.md)
- [rrule.js Integration](./rrule.js.md)

## Support

For issues, feature requests, or questions:

- GitHub Issues: [github.com/ilamy/calendar/issues](https://github.com/ilamy/calendar/issues)
- Documentation: [ilamy.dev](https://ilamy.dev)

---

Built with ❤️ by the ilamy team
