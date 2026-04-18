import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import type { CalendarEvent } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ResourceWeekVertical } from './resource-week-vertical'

const mockResources: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]

const mockEvents: CalendarEvent[] = []
const initialDate = dayjs('2025-01-01T00:00:00.000Z')

const renderResourceWeekVertical = (props = {}) => {
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={mockEvents}
			initialDate={initialDate}
			orientation="vertical"
			resources={mockResources}
			{...props}
		>
			<CalendarDndContext>
				<ResourceWeekVertical />
			</CalendarDndContext>
		</ResourceCalendarProvider>
	)
}

describe('ResourceWeekVertical', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders vertical resource week view structure', () => {
		renderResourceWeekVertical()

		// Should render resource headers
		expect(screen.getByText('Resource 1')).toBeInTheDocument()
		expect(screen.getByText('Resource 2')).toBeInTheDocument()

		// Should render All Day row label (case insensitive)
		expect(screen.getByText(/All day/i)).toBeInTheDocument()

		// Should render time column
		expect(screen.getByTestId('vertical-col-time-col')).toBeInTheDocument()
	})

	test('renders day columns for each resource', () => {
		renderResourceWeekVertical()

		// Check for some day columns
		// Format: vertical-col-day-col-{date}-resource-{id}
		const dateStr = initialDate.format('YYYY-MM-DD')
		const col1 = screen.getByTestId(
			`vertical-col-day-col-${dateStr}-resource-1`
		)
		expect(col1).toBeInTheDocument()
	})

	test('renders all-day row for each resource', () => {
		renderResourceWeekVertical()
		const allDayRows = screen.getAllByTestId('all-day-row')
		// 1 for Resource 1, 1 for Resource 2
		expect(allDayRows.length).toBe(2)
	})

	test('renders dates header row', () => {
		renderResourceWeekVertical()
		// Initial date is Wednesday Jan 1, 2025.
		// Default firstDayOfWeek is Sunday, so week starts Dec 29, 2024.
		// Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
		// Appears multiple times because of multiple resources
		expect(screen.getAllByText('Sun').length).toBeGreaterThan(0)
		expect(screen.getAllByText('Sat').length).toBeGreaterThan(0)
	})

	// hideNonBusinessHours backwards compatibility tests
	test('shows all 24 hours when hideNonBusinessHours is false (default behavior)', () => {
		cleanup()
		const businessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: 9,
			endTime: 17,
		}

		renderResourceWeekVertical({
			businessHours,
			hideNonBusinessHours: false, // Explicitly false
		})

		// All 24 hours should be present
		expect(screen.getByTestId('vertical-time-00')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-08')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-17')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-23')).toBeInTheDocument()
	})

	test('shows all 24 hours when hideNonBusinessHours is not provided (backwards compatibility)', () => {
		cleanup()
		const businessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: 9,
			endTime: 17,
		}

		renderResourceWeekVertical({
			businessHours,
			// hideNonBusinessHours is NOT provided - should default to false
		})

		// All 24 hours should be present (backwards compatible behavior)
		expect(screen.getByTestId('vertical-time-00')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-08')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-17')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-23')).toBeInTheDocument()
	})

	test('hides non-business hours when hideNonBusinessHours is true', () => {
		cleanup()
		const businessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: 9,
			endTime: 17,
		}

		renderResourceWeekVertical({
			businessHours,
			hideNonBusinessHours: true,
		})

		// Business hours should be present
		expect(screen.getByTestId('vertical-time-09')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-16')).toBeInTheDocument()

		// Non-business hours should NOT be present
		expect(screen.queryByTestId('vertical-time-08')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-17')).not.toBeInTheDocument()
		expect(screen.queryByTestId('vertical-time-23')).not.toBeInTheDocument()
	})

	// Event positioning tests - CRITICAL for hideNonBusinessHours
	test('positions event at 0% top when event starts at business hour start with hideNonBusinessHours true', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const businessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: 9,
			endTime: 17,
		}
		// Create an event that starts at 9am (business start) for resource 1
		const testEvent: CalendarEvent = {
			id: 'test-event-resource-week-9am',
			title: 'Resource Week Morning',
			start: dayjs('2025-01-06T09:00:00.000Z'),
			end: dayjs('2025-01-06T10:00:00.000Z'),
			resourceId: '1',
		}

		renderResourceWeekVertical({
			initialDate: monday,
			businessHours,
			hideNonBusinessHours: true,
			events: [testEvent],
		})

		// Event should be rendered
		const eventElement = screen.getByText('Resource Week Morning')
		expect(eventElement).toBeInTheDocument()

		// Find the event wrapper with positioning
		const eventWrapper = eventElement.closest('[style*="top"]')
		expect(eventWrapper).not.toBeNull()

		// Event starting at 9am should be at top: 0%
		const style = eventWrapper?.getAttribute('style') || ''
		expect(style).toContain('top: 0%')
	})

	test('positions event correctly when hideNonBusinessHours is false in ResourceWeekVertical', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const businessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: 9,
			endTime: 17,
		}
		// Create an event that starts at 9am
		const testEvent: CalendarEvent = {
			id: 'test-event-resource-week-9am-full',
			title: 'Resource Week Full',
			start: dayjs('2025-01-06T09:00:00.000Z'),
			end: dayjs('2025-01-06T10:00:00.000Z'),
			resourceId: '1',
		}

		renderResourceWeekVertical({
			initialDate: monday,
			businessHours,
			hideNonBusinessHours: false,
			events: [testEvent],
		})

		// Event should be rendered
		const eventElement = screen.getByText('Resource Week Full')
		expect(eventElement).toBeInTheDocument()

		// Find the event wrapper with positioning
		const eventWrapper = eventElement.closest('[style*="top"]')
		expect(eventWrapper).not.toBeNull()

		// Event starting at 9am in a 24-hour grid should NOT be at top 0%
		const style = eventWrapper?.getAttribute('style') || ''
		expect(style).not.toContain('top: 0%')
	})

	test('positions event at correct percentage when event is in middle of business hours in ResourceWeekVertical', () => {
		cleanup()
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const businessHours = {
			daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: 9,
			endTime: 17,
		}
		// Create an event that starts at 1pm (13:00), which is 4 hours after 9am
		// With 8 business hours (9-17), 1pm should be at 50% (4/8 * 100)
		const testEvent: CalendarEvent = {
			id: 'test-event-resource-week-1pm',
			title: 'Resource Week Afternoon',
			start: dayjs('2025-01-06T13:00:00.000Z'),
			end: dayjs('2025-01-06T14:00:00.000Z'),
			resourceId: '1',
		}

		renderResourceWeekVertical({
			initialDate: monday,
			businessHours,
			hideNonBusinessHours: true,
			events: [testEvent],
		})

		// Event should be rendered
		const eventElement = screen.getByText('Resource Week Afternoon')
		expect(eventElement).toBeInTheDocument()

		// Find the event wrapper with positioning
		const eventWrapper = eventElement.closest('[style*="top"]')
		expect(eventWrapper).not.toBeNull()

		// Event starting at 1pm (4 hours into 8-hour grid) should be at 50%
		const style = eventWrapper?.getAttribute('style') || ''
		expect(style).toContain('top: 50%')
	})

	describe('weekViewGranularity', () => {
		describe('default hourly mode behavior preserved', () => {
			test('renders time-col as first column when weekViewGranularity is hourly', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'hourly' })

				expect(screen.getByTestId('vertical-col-time-col')).toBeInTheDocument()
				expect(
					screen.queryByTestId('vertical-col-date-col')
				).not.toBeInTheDocument()
			})

			test('renders all-day rows for each resource in hourly mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'hourly' })

				const allDayRows = screen.getAllByTestId('all-day-row')
				expect(allDayRows).toHaveLength(2)
			})

			test('renders resource x day columns (7 days x 2 resources = 14) in hourly mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'hourly' })

				const dateStr = initialDate.format('YYYY-MM-DD')
				expect(
					screen.getByTestId(`vertical-col-day-col-${dateStr}-resource-1`)
				).toBeInTheDocument()
				expect(
					screen.getByTestId(`vertical-col-day-col-${dateStr}-resource-2`)
				).toBeInTheDocument()
			})

			test('renders the date sub-header row in hourly mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'hourly' })

				// 7 days × 2 resources = 14 sub-header cells, all with HH=00
				const subHeaders = screen.getAllByTestId('resource-week-time-label-00')
				expect(subHeaders).toHaveLength(14)
			})
		})

		describe('daily mode renders correctly', () => {
			test('renders date-col as first column in daily mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				expect(screen.getByTestId('vertical-col-date-col')).toBeInTheDocument()
				expect(
					screen.queryByTestId('vertical-col-time-col')
				).not.toBeInTheDocument()
			})

			test('does not render all-day rows in daily mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				const allDayRows = screen.queryAllByTestId('all-day-row')
				expect(allDayRows).toHaveLength(0)
			})

			test('renders one column per resource (not resource x day) in daily mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				// Daily mode: one column per resource
				expect(
					screen.getByTestId('vertical-col-week-col-resource-1')
				).toBeInTheDocument()
				expect(
					screen.getByTestId('vertical-col-week-col-resource-2')
				).toBeInTheDocument()

				// Hourly resource x day columns must be absent
				const dateStr = initialDate.format('YYYY-MM-DD')
				expect(
					screen.queryByTestId(`vertical-col-day-col-${dateStr}-resource-1`)
				).not.toBeInTheDocument()
			})

			test('does not render the date sub-header row in daily mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				const subHeaders = screen.queryAllByTestId(/resource-week-time-label-/)
				expect(subHeaders).toHaveLength(0)
			})

			test('shows week number in the header in daily mode', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				// Span renders "{t('week')} {week()}", e.g. "Week 1"
				const weekNumber = initialDate.week()
				const weekLabel = `Week ${weekNumber}`
				expect(screen.getByText(weekLabel)).toBeInTheDocument()
			})

			test('firstCol (date-col) shows day name + date for each day of the week', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				const dateCol = screen.getByTestId('vertical-col-date-col')

				// initialDate is Wed Jan 1, 2025. Default firstDayOfWeek is Sunday,
				// so the week is Sun Dec 29, 2024 → Sat Jan 4, 2025.
				const expectedDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
				for (const day of expectedDays) {
					expect(dateCol.textContent).toContain(day)
				}
			})

			test('firstCol (date-col) does not render hour labels (regression: duplicate HourLabel bug)', () => {
				// Regression test: before the fix, daily mode firstCol rendered
				// <HourLabel date={date} /> in addition to the day name + date,
				// producing "12 AM" after every day label. The fix removed the
				// stray HourLabel; this test locks in that behavior.
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				const dateCol = screen.getByTestId('vertical-col-date-col')

				// HourLabel in 12-hour format (default) renders "12 AM", "1 AM", etc.
				// If the bug returns, AM/PM text would appear in every cell.
				expect(dateCol.textContent).not.toMatch(/AM|PM/)
			})
		})

		describe('header structure differences', () => {
			test('hourly mode renders expanded header: resource row + date sub-header row', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'hourly' })

				// The expanded h-24 header is built from two rows:
				// 1. Resource name row (always rendered)
				// 2. Date sub-header row (hourly only – 7 days x 2 resources = 14 cells)
				const subHeaders = screen.getAllByTestId('resource-week-time-label-00')
				expect(subHeaders).toHaveLength(14)
				expect(screen.getAllByTestId('all-day-row')).toHaveLength(2)
			})

			test('daily mode uses a compact header (h-12 class) and no h-24 in header', () => {
				renderResourceWeekVertical({ weekViewGranularity: 'daily' })

				// Date sub-header row is absent and header height is h-12, not h-24
				const subHeaders = screen.queryAllByTestId(/resource-week-time-label-/)
				expect(subHeaders).toHaveLength(0)

				// All-day row is absent (no extra header space needed)
				expect(screen.queryAllByTestId('all-day-row')).toHaveLength(0)
			})
		})
	})
})
