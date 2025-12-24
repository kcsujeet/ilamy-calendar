import { describe, expect, it } from 'bun:test'
import { render, screen, within } from '@testing-library/react'
import type { BusinessHours, CalendarEvent, WeekDays } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context/provider'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ids } from '@/lib/utils/ids' // Add this line
import { ResourceEventGrid } from './resource-event-grid'

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

const mockEvents: CalendarEvent[] = [
	{
		id: 'event-1',
		title: 'Meeting',
		start: dayjs('2025-01-13T10:00:00.000Z'),
		end: dayjs('2025-01-13T11:00:00.000Z'),
		resourceId: 'res-1',
	},
]

const mockDays = [
	dayjs('2025-01-13T00:00:00.000Z'),
	dayjs('2025-01-14T00:00:00.000Z'),
	dayjs('2025-01-15T00:00:00.000Z'),
]

const renderWithProvider = (
	ui: React.ReactElement,
	{
		resources = mockResources,
		events = mockEvents,
		...props
	}: {
		resources?: Resource[]
		events?: CalendarEvent[]
		[key: string]: unknown
	} = {}
) => {
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={4}
			events={events}
			firstDayOfWeek={0}
			resources={resources}
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

	describe('Business Hours Styling', () => {
		const businessHours: BusinessHours = {
			daysOfWeek: [
				'monday',
				'tuesday',
				'wednesday',
				'thursday',
				'friday',
			] as WeekDays[],
			startTime: 9,
			endTime: 17,
		}

		it('applies styling correctly in day grid (Month View)', () => {
			// Monday (Business Day) and Sunday (Non-Business Day)
			const days = [
				dayjs('2025-01-13T00:00:00.000Z'), // Monday
				dayjs('2025-01-12T00:00:00.000Z'), // Sunday
			]

			renderWithProvider(<ResourceEventGrid days={days} gridType="day" />, {
				resources: [mockResources[0]],
				businessHours,
				initialDate: days[0],
			})

			const row = screen.getByTestId(ids.resourceRow('res-1'))
			const mondayCell = within(row).getByTestId(
				ids.dayCell(days[0], undefined, 'res-1')
			)
			const sundayCell = within(row).getByTestId(
				ids.dayCell(days[1], undefined, 'res-1')
			)

			// Monday is a business day -> No disabled styling
			expect(mondayCell.className).not.toContain('pointer-events-none')

			// Sunday is NOT a business day -> Disabled styling applied
			expect(sundayCell.className).toContain('bg-secondary')
			expect(sundayCell.className).toContain('text-muted-foreground')
			expect(sundayCell.className).toContain('pointer-events-none')
		})

		it('applies styling correctly in hour grid (Week/Day View)', () => {
			const monday = dayjs('2025-01-13T00:00:00.000Z') // Monday
			const sunday = dayjs('2025-01-12T00:00:00.000Z') // Sunday

			const h1 = monday.hour(10) // Monday 10am (Business Hour)
			const h2 = monday.hour(20) // Monday 8pm (Non-Business Hour)
			const h3 = sunday.hour(10) // Sunday 10am (Non-Business Day)

			renderWithProvider(
				<ResourceEventGrid days={[h1, h2, h3]} gridType="hour" />,
				{
					resources: [mockResources[0]],
					businessHours,
					initialDate: monday,
				}
			)

			const row = screen.getByTestId(ids.resourceRow('res-1'))
			const businessHourCell = within(row).getByTestId(
				ids.dayCell(h1, { hour: h1.hour(), minute: h1.minute() }, 'res-1')
			)
			const nonBusinessHourCell = within(row).getByTestId(
				ids.dayCell(h2, { hour: h2.hour(), minute: h2.minute() }, 'res-1')
			)
			const nonBusinessDayCell = within(row).getByTestId(
				ids.dayCell(h3, { hour: h3.hour(), minute: h3.minute() }, 'res-1')
			)

			// Monday 10am -> Business -> No disabled styling
			expect(businessHourCell.className).not.toContain('pointer-events-none')

			// Monday 8pm -> Non-Business Time -> Disabled styling applied
			expect(nonBusinessHourCell.className).toContain('bg-secondary')
			expect(nonBusinessHourCell.className).toContain('text-muted-foreground')
			expect(nonBusinessHourCell.className).toContain('pointer-events-none')

			// Sunday 10am -> Non-Business Day -> Disabled styling applied
			expect(nonBusinessDayCell.className).toContain('bg-secondary')
			expect(nonBusinessDayCell.className).toContain('text-muted-foreground')
			expect(nonBusinessDayCell.className).toContain('pointer-events-none')
		})
	})
})
