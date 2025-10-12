import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'bun:test'
import { ResourceEventGrid } from './resource-event-grid'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import type {
  Resource,
  ResourceCalendarEvent,
} from '@/features/resource-calendar/types'

const mockResources: Resource[] = [
  {
    id: 'res-1',
    title: 'Room A',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  {
    id: 'res-2',
    title: 'Room B',
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
]

const mockEvents: ResourceCalendarEvent[] = [
  {
    id: 'event-1',
    title: 'Meeting',
    start: dayjs('2025-01-13T10:00:00'),
    end: dayjs('2025-01-13T11:00:00'),
    resourceId: 'res-1',
  },
]

const mockDays = [dayjs('2025-01-13'), dayjs('2025-01-14'), dayjs('2025-01-15')]

const renderWithProvider = (
  ui: React.ReactElement,
  {
    resources = mockResources,
    events = mockEvents,
    ...props
  }: {
    resources?: Resource[]
    events?: ResourceCalendarEvent[]
    [key: string]: unknown
  } = {}
) => {
  return render(
    <ResourceCalendarProvider
      resources={resources}
      events={events}
      firstDayOfWeek={0}
      dayMaxEvents={4}
      {...props}
    >
      {ui}
    </ResourceCalendarProvider>
  )
}

describe('ResourceEventGrid', () => {
  it('renders visible resources as rows', () => {
    renderWithProvider(<ResourceEventGrid days={mockDays} />)

    expect(screen.getByText('Room A')).toBeInTheDocument()
    expect(screen.getByText('Room B')).toBeInTheDocument()
  })

  it('passes resourceId to GridCell components', () => {
    renderWithProvider(<ResourceEventGrid days={mockDays} gridType="day" />, {
      resources: [mockResources[0]],
    })

    const cells = screen.getAllByTestId(/^day-cell-/)
    expect(cells.length).toBe(3)
  })

  it('passes gridType prop to child components', () => {
    renderWithProvider(<ResourceEventGrid days={mockDays} gridType="hour" />, {
      resources: [mockResources[0]],
    })

    const cells = screen.getAllByTestId(/^day-cell-/)
    expect(cells.length).toBeGreaterThan(0)
  })

  it('creates correct number of grid cells per resource', () => {
    renderWithProvider(<ResourceEventGrid days={mockDays} />, {
      resources: [mockResources[0]],
    })

    const cells = screen.getAllByTestId(/^day-cell-/)
    expect(cells).toHaveLength(3)
  })

  it('renders all visible resources', () => {
    renderWithProvider(<ResourceEventGrid days={mockDays} />)

    expect(screen.getByText('Room A')).toBeInTheDocument()
    expect(screen.getByText('Room B')).toBeInTheDocument()
  })

  it('renders default resource label when no custom renderer', () => {
    renderWithProvider(<ResourceEventGrid days={mockDays} />, {
      resources: [mockResources[0]],
    })

    expect(screen.getByText('Room A')).toBeInTheDocument()
  })

  it('applies resource color styles to resource label', () => {
    const { container } = renderWithProvider(
      <ResourceEventGrid days={mockDays} />,
      {
        resources: [mockResources[0]],
      }
    )

    const resourceLabel = container.querySelector('[style*="#3B82F6"]')
    expect(resourceLabel).toBeInTheDocument()
  })

  it('renders children as header', () => {
    renderWithProvider(
      <ResourceEventGrid days={mockDays}>
        <div data-testid="custom-header">Header Content</div>
      </ResourceEventGrid>,
      { resources: [] }
    )

    expect(screen.getByTestId('custom-header')).toBeInTheDocument()
  })

  it('defaults gridType to day when not provided', () => {
    renderWithProvider(<ResourceEventGrid days={mockDays} />, {
      resources: [mockResources[0]],
    })

    const cells = screen.getAllByTestId(/^day-cell-/)
    expect(cells.length).toBe(3)
  })
})
