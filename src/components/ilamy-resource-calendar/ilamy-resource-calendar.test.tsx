// No mocking - test the real CalendarDndContext
import dayjs from '@/lib/dayjs-config'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, mock } from 'bun:test'
import { IlamyResourceCalendar } from './ilamy-resource-calendar'
import type { Resource, ResourceCalendarEvent } from './types'

const translator = (key: string) => `Translated: ${key}`
const customRenderEvent = (event: ResourceCalendarEvent) => (
  <div data-testid={`custom-event-${event.id}`}>Custom: {event.title}</div>
)

// Mock the export function
mock.module('@/lib/export-ical', () => ({
  downloadICalendar: mock(),
}))

describe('IlamyResourceCalendar', () => {
  const mockResources: Resource[] = [
    {
      id: 'resource-1',
      title: 'Conference Room A',
      color: '#3B82F6',
      backgroundColor: '#EFF6FF',
      position: 1,
    },
    {
      id: 'resource-2',
      title: 'Conference Room B',
      color: '#EF4444',
      backgroundColor: '#FEF2F2',
      position: 2,
    },
    {
      id: 'resource-3',
      title: 'Meeting Room C',
      color: '#10B981',
      backgroundColor: '#ECFDF5',
      position: 3,
    },
  ]

  const mockEvents: ResourceCalendarEvent[] = [
    {
      id: 'event-1',
      title: 'Team Meeting',
      start: dayjs('2025-08-04T09:00:00.000Z'),
      end: dayjs('2025-08-04T10:00:00.000Z'),
      uid: 'event-1@ilamy.calendar',
      resourceId: 'resource-1',
    },
    {
      id: 'event-2',
      title: 'Client Presentation',
      start: dayjs('2025-08-04T14:00:00.000Z'),
      end: dayjs('2025-08-04T15:30:00.000Z'),
      uid: 'event-2@ilamy.calendar',
      resourceIds: ['resource-1', 'resource-2'], // Cross-resource event
    },
    {
      id: 'event-3',
      title: 'Department Standup',
      start: dayjs('2025-08-05T10:00:00.000Z'),
      end: dayjs('2025-08-05T11:00:00.000Z'),
      uid: 'event-3@ilamy.calendar',
      resourceId: 'resource-3',
    },
  ]

  it('should render without crashing', () => {
    render(<IlamyResourceCalendar />)

    // Should render the calendar header
    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should render with resources and events', () => {
    render(
      <IlamyResourceCalendar resources={mockResources} events={mockEvents} />
    )

    // Should render the calendar header
    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()

    // Should render header with resource controls
    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should use default props correctly', () => {
    render(<IlamyResourceCalendar />)

    // Component should render with empty resources/events arrays
    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should handle firstDayOfWeek prop correctly', () => {
    const { rerender } = render(
      <IlamyResourceCalendar firstDayOfWeek="monday" />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()

    // Test sunday as well
    rerender(<IlamyResourceCalendar firstDayOfWeek="sunday" />)
    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should handle initialView prop', () => {
    render(
      <IlamyResourceCalendar initialView="week" resources={mockResources} />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should render custom header when provided', () => {
    const customHeader = <div data-testid="custom-header">Custom Header</div>

    render(
      <IlamyResourceCalendar
        headerComponent={customHeader}
        resources={mockResources}
      />
    )

    expect(screen.getByTestId('custom-header')).toBeInTheDocument()
    expect(screen.getByText('Custom Header')).toBeInTheDocument()
  })

  it('should handle event callbacks', async () => {
    const onEventClick = mock()
    const onCellClick = mock()
    const onEventAdd = mock()
    const onEventUpdate = mock()
    const onEventDelete = mock()
    const onViewChange = mock()
    const onDateChange = mock()

    render(
      <IlamyResourceCalendar
        resources={mockResources}
        events={mockEvents}
        onEventClick={onEventClick}
        onCellClick={onCellClick}
        onEventAdd={onEventAdd}
        onEventUpdate={onEventUpdate}
        onEventDelete={onEventDelete}
        onViewChange={onViewChange}
        onDateChange={onDateChange}
      />
    )

    // All callbacks should be properly passed to provider
    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should handle disabled states', () => {
    render(
      <IlamyResourceCalendar
        disableCellClick={true}
        disableEventClick={true}
        disableDragAndDrop={true}
        resources={mockResources}
        events={mockEvents}
      />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should handle dayMaxEvents prop', () => {
    render(
      <IlamyResourceCalendar
        dayMaxEvents={5}
        resources={mockResources}
        events={mockEvents}
      />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should handle sticky view header', () => {
    render(
      <IlamyResourceCalendar
        stickyViewHeader={true}
        viewHeaderClassName="custom-view-header"
        resources={mockResources}
      />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should handle internationalization props', () => {
    render(
      <IlamyResourceCalendar
        translator={translator}
        locale="en"
        timezone="America/New_York"
        resources={mockResources}
      />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should handle resource-specific events correctly', () => {
    render(
      <IlamyResourceCalendar resources={mockResources} events={mockEvents} />
    )

    // Should render without errors when events have resourceId and resourceIds
    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should handle cross-resource events', () => {
    const crossResourceEvent: ResourceCalendarEvent = {
      id: 'cross-resource-event',
      title: 'All Hands Meeting',
      start: dayjs('2025-08-04T16:00:00.000Z'),
      end: dayjs('2025-08-04T17:00:00.000Z'),
      uid: 'cross-resource-event@ilamy.calendar',
      resourceIds: ['resource-1', 'resource-2', 'resource-3'], // Spans all resources
    }

    render(
      <IlamyResourceCalendar
        resources={mockResources}
        events={[...mockEvents, crossResourceEvent]}
      />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should handle empty resources gracefully', () => {
    render(<IlamyResourceCalendar resources={[]} events={mockEvents} />)

    // Should still render even with no resources
    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should handle events without resource assignments', () => {
    const eventWithoutResource: ResourceCalendarEvent = {
      id: 'no-resource-event',
      title: 'Floating Event',
      start: dayjs('2025-08-04T12:00:00.000Z'),
      end: dayjs('2025-08-04T13:00:00.000Z'),
      uid: 'no-resource-event@ilamy.calendar',
      // No resourceId or resourceIds
    }

    render(
      <IlamyResourceCalendar
        resources={mockResources}
        events={[...mockEvents, eventWithoutResource]}
      />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should support custom renderEvent function', () => {
    render(
      <IlamyResourceCalendar
        resources={mockResources}
        events={mockEvents}
        renderEvent={customRenderEvent}
      />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })

  it('should handle view changes between different resource views', () => {
    const { rerender } = render(
      <IlamyResourceCalendar
        initialView="month"
        resources={mockResources}
        events={mockEvents}
      />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()

    // Test switching to week view
    rerender(
      <IlamyResourceCalendar
        initialView="week"
        resources={mockResources}
        events={mockEvents}
      />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()

    // Test switching to day view
    rerender(
      <IlamyResourceCalendar
        initialView="day"
        resources={mockResources}
        events={mockEvents}
      />
    )

    expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
  })
})
