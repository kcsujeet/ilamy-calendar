import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import type { CalendarEvent } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ResourceWeekHorizontal } from './resource-week-horizontal'

const mockResources: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]

const mockEvents: CalendarEvent[] = []
const initialDate = dayjs('2025-01-01T00:00:00.000Z')

const renderResourceWeekHorizontal = (props = {}) => {
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={mockEvents}
			initialDate={initialDate}
			orientation="horizontal"
			resources={mockResources}
			{...props}
		>
			<CalendarDndContext>
				<ResourceWeekHorizontal />
			</CalendarDndContext>
		</ResourceCalendarProvider>
	)
}

describe('ResourceWeekHorizontal', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('basic structure', () => {
		test('renders horizontal resource week view structure', () => {
			renderResourceWeekHorizontal()

			// Should render resource labels
			expect(screen.getByText('Resource 1')).toBeInTheDocument()
			expect(screen.getByText('Resource 2')).toBeInTheDocument()

			// Should render resources header
			expect(screen.getByText(/Resources/i)).toBeInTheDocument()
		})

		test('renders day headers for the week', () => {
			renderResourceWeekHorizontal()

			// Should have 7 day headers
			const dayHeaders = screen.getAllByTestId('resource-week-day-header')
			expect(dayHeaders.length).toBe(7)
		})

		test('renders time labels for each hour', () => {
			renderResourceWeekHorizontal()

			// Should render time labels (24 hours * 7 days = 168 hours)
			// Check for some specific hour labels
			expect(screen.getAllByTestId('resource-week-time-label-00').length).toBe(
				7
			)
			expect(screen.getAllByTestId('resource-week-time-label-12').length).toBe(
				7
			)
			expect(screen.getAllByTestId('resource-week-time-label-23').length).toBe(
				7
			)
		})
	})

	describe('weekHours structure (array of arrays)', () => {
		test('weekHours produces 7 day groups when using map', () => {
			renderResourceWeekHorizontal()

			// Each day should have time labels
			// With 7 days and 24 hours each, flat().map() produces 168 time slots
			const allTimeLabels = screen.getAllByTestId(/resource-week-time-label-/)
			expect(allTimeLabels.length).toBe(7 * 24) // 168 total
		})

		test('time labels are rendered using flat().map() for nested hours', () => {
			renderResourceWeekHorizontal()

			// Verify that the same hour appears 7 times (once per day)
			const noonLabels = screen.getAllByTestId('resource-week-time-label-12')
			expect(noonLabels.length).toBe(7) // One per day
		})
	})

	describe('business hours filtering', () => {
		test('shows all 24 hours when hideNonBusinessHours is false', () => {
			const businessHours = {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			}

			renderResourceWeekHorizontal({
				businessHours,
				hideNonBusinessHours: false,
			})

			// All hours should be present (7 of each)
			expect(screen.getAllByTestId('resource-week-time-label-00').length).toBe(
				7
			)
			expect(screen.getAllByTestId('resource-week-time-label-08').length).toBe(
				7
			)
			expect(screen.getAllByTestId('resource-week-time-label-17').length).toBe(
				7
			)
			expect(screen.getAllByTestId('resource-week-time-label-23').length).toBe(
				7
			)
		})

		test('hides non-business hours when hideNonBusinessHours is true', () => {
			const businessHours = {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			}

			renderResourceWeekHorizontal({
				businessHours,
				hideNonBusinessHours: true,
			})

			// Business hours should be present
			expect(
				screen.getAllByTestId('resource-week-time-label-09').length
			).toBeGreaterThan(0)
			expect(
				screen.getAllByTestId('resource-week-time-label-16').length
			).toBeGreaterThan(0)

			// Non-business hours should NOT be present
			expect(
				screen.queryAllByTestId('resource-week-time-label-08').length
			).toBe(0)
			expect(
				screen.queryAllByTestId('resource-week-time-label-17').length
			).toBe(0)
			expect(
				screen.queryAllByTestId('resource-week-time-label-23').length
			).toBe(0)
		})
	})

	describe('firstDayOfWeek support', () => {
		test('respects firstDayOfWeek setting', () => {
			// Setting Monday as first day of week (1 = Monday)
			renderResourceWeekHorizontal({
				firstDayOfWeek: 1,
			})

			const dayHeaders = screen.getAllByTestId('resource-week-day-header')
			expect(dayHeaders.length).toBe(7)

			// First header should be Monday
			expect(dayHeaders[0]).toBeInTheDocument()
		})
	})

	describe('today highlighting', () => {
		test('highlights current day header when viewing current week', () => {
			// Use current date to test today highlighting
			const today = dayjs()
			renderResourceWeekHorizontal({
				initialDate: today,
			})

			// At least one day header should have the today styling
			const dayHeaders = screen.getAllByTestId('resource-week-day-header')
			const todayHeader = dayHeaders.find(
				(header) =>
					header.classList.contains('bg-blue-50') &&
					header.classList.contains('text-blue-600')
			)
			expect(todayHeader).toBeDefined()
		})
	})

	describe('time format', () => {
		test('uses 12-hour format when timeFormat is 12-hour', () => {
			renderResourceWeekHorizontal({
				timeFormat: '12-hour',
			})

			// Time labels should use 12-hour format
			// The exact text depends on locale, but should include AM/PM indicators
			const timeLabels = screen.getAllByTestId(/resource-week-time-label-/)
			expect(timeLabels.length).toBeGreaterThan(0)
		})

		test('uses 24-hour format when timeFormat is 24-hour', () => {
			renderResourceWeekHorizontal({
				timeFormat: '24-hour',
			})

			// Time labels should use 24-hour format
			const timeLabels = screen.getAllByTestId(/resource-week-time-label-/)
			expect(timeLabels.length).toBeGreaterThan(0)
		})
	})

	// Event positioning tests - CRITICAL for horizontal week view
	describe('event positioning', () => {
		test('renders event for resource in correct row', () => {
			cleanup()
			const monday = dayjs('2025-01-06T00:00:00.000Z')
			const testEvent: CalendarEvent = {
				id: 'test-event-horizontal-1',
				title: 'Horizontal Event',
				start: dayjs('2025-01-06T10:00:00.000Z'),
				end: dayjs('2025-01-06T11:00:00.000Z'),
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: monday,
				events: [testEvent],
			})

			// Event should be rendered
			const eventElement = screen.getByText('Horizontal Event')
			expect(eventElement).toBeInTheDocument()
		})

		test('positions event with left and width styles', () => {
			cleanup()
			const monday = dayjs('2025-01-06T00:00:00.000Z')
			// Create an event for resource 1
			const testEvent: CalendarEvent = {
				id: 'test-event-horizontal-positioned',
				title: 'Positioned Event',
				start: dayjs('2025-01-06T10:00:00.000Z'),
				end: dayjs('2025-01-06T12:00:00.000Z'),
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: monday,
				events: [testEvent],
			})

			// Event should be rendered
			const eventElement = screen.getByText('Positioned Event')
			expect(eventElement).toBeInTheDocument()

			// Find the event wrapper using testid
			const eventWrapper = screen.getByTestId(
				'horizontal-event-test-event-horizontal-positioned'
			)
			expect(eventWrapper).toBeInTheDocument()

			// Event should have positioning data attributes
			const left = parseFloat(eventWrapper.getAttribute('data-left') || '')
			const width = parseFloat(eventWrapper.getAttribute('data-width') || '')
			const top = parseFloat(eventWrapper.getAttribute('data-top') || '')

			// Event at 10am-12pm in 24-hour grid:
			// left = 10/24 * 100 = 41.67%, width = 2/24 * 100 = 8.33%, top = 1 (first row)
			expect(left).toBeCloseTo(41.67, 1)
			expect(width).toBeCloseTo(8.33, 1)
			expect(top).toBe(1)
		})

		test('positions event correctly when hideNonBusinessHours is false', () => {
			cleanup()
			const monday = dayjs('2025-01-06T00:00:00.000Z')
			const businessHours = {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			}
			// Create an event that starts at 9am
			const testEvent: CalendarEvent = {
				id: 'test-event-horizontal-9am-full',
				title: 'Horizontal Full',
				start: dayjs('2025-01-06T09:00:00.000Z'),
				end: dayjs('2025-01-06T10:00:00.000Z'),
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: monday,
				businessHours,
				hideNonBusinessHours: false,
				events: [testEvent],
			})

			// Event should be rendered
			const eventElement = screen.getByText('Horizontal Full')
			expect(eventElement).toBeInTheDocument()

			// Find the event wrapper using testid
			const eventWrapper = screen.getByTestId(
				'horizontal-event-test-event-horizontal-9am-full'
			)
			expect(eventWrapper).toBeInTheDocument()

			// Event starting at 9am in a 24-hour grid:
			// left = 9/24 * 100 = 37.5%
			const left = parseFloat(eventWrapper.getAttribute('data-left') || '')
			expect(left).toBeCloseTo(37.5, 1)
		})

		test('positions event at 0% left when event starts at business hour start with hideNonBusinessHours true', () => {
			cleanup()
			const monday = dayjs('2025-01-06T00:00:00.000Z')
			const businessHours = {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			}
			// Create an event that starts at 9am (business start) for resource 1
			const testEvent: CalendarEvent = {
				id: 'test-event-horizontal-9am',
				title: 'Horizontal Morning',
				start: dayjs('2025-01-06T09:00:00.000Z'),
				end: dayjs('2025-01-06T10:00:00.000Z'),
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: monday,
				businessHours,
				hideNonBusinessHours: true,
				events: [testEvent],
			})

			// Event should be rendered
			const eventElement = screen.getByText('Horizontal Morning')
			expect(eventElement).toBeInTheDocument()

			// Find the event wrapper using testid
			const eventWrapper = screen.getByTestId(
				'horizontal-event-test-event-horizontal-9am'
			)
			expect(eventWrapper).toBeInTheDocument()

			// Event starting at 9am (business hour start) should be at left 0%
			const left = parseFloat(eventWrapper.getAttribute('data-left') || '')
			expect(left).toBe(0)
		})

		test('positions event at correct percentage when event is in middle of business hours', () => {
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
				id: 'test-event-horizontal-1pm',
				title: 'Horizontal Afternoon',
				start: dayjs('2025-01-06T13:00:00.000Z'),
				end: dayjs('2025-01-06T14:00:00.000Z'),
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: monday,
				businessHours,
				hideNonBusinessHours: true,
				events: [testEvent],
			})

			// Event should be rendered
			const eventElement = screen.getByText('Horizontal Afternoon')
			expect(eventElement).toBeInTheDocument()

			// Find the event wrapper using testid
			const eventWrapper = screen.getByTestId(
				'horizontal-event-test-event-horizontal-1pm'
			)
			expect(eventWrapper).toBeInTheDocument()

			// Event starting at 1pm (4 hours into 8-hour grid) should be at 50%
			const left = parseFloat(eventWrapper.getAttribute('data-left') || '')
			expect(left).toBe(50)
		})

		test('different events have different left positions', () => {
			cleanup()
			const monday = dayjs('2025-01-06T00:00:00.000Z')
			// Create events at different times
			const earlyEvent: CalendarEvent = {
				id: 'early-event',
				title: 'Early Event',
				start: dayjs('2025-01-06T08:00:00.000Z'),
				end: dayjs('2025-01-06T09:00:00.000Z'),
				resourceId: '1',
			}
			const lateEvent: CalendarEvent = {
				id: 'late-event',
				title: 'Late Event',
				start: dayjs('2025-01-06T16:00:00.000Z'),
				end: dayjs('2025-01-06T17:00:00.000Z'),
				resourceId: '2',
			}

			renderResourceWeekHorizontal({
				initialDate: monday,
				events: [earlyEvent, lateEvent],
			})

			// Both events should be rendered
			const earlyElement = screen.getByTestId('horizontal-event-early-event')
			const lateElement = screen.getByTestId('horizontal-event-late-event')

			// Get positioning values from data attributes
			const earlyLeft = parseFloat(
				earlyElement.getAttribute('data-left') || '0'
			)
			const lateLeft = parseFloat(lateElement.getAttribute('data-left') || '0')

			// Early event at 8am: left = 8/24 * 100 = 33.33%
			// Late event at 4pm: left = 16/24 * 100 = 66.67%
			expect(earlyLeft).toBeCloseTo(33.33, 1)
			expect(lateLeft).toBeCloseTo(66.67, 1)
			expect(lateLeft).toBeGreaterThan(earlyLeft)
		})

		test('event has width proportional to duration', () => {
			cleanup()
			const monday = dayjs('2025-01-06T00:00:00.000Z')
			// Create a multi-hour event
			const testEvent: CalendarEvent = {
				id: 'multi-hour-event',
				title: 'Multi Hour Event',
				start: dayjs('2025-01-06T09:00:00.000Z'),
				end: dayjs('2025-01-06T12:00:00.000Z'), // 3 hours
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: monday,
				events: [testEvent],
			})

			// Event should be rendered
			const eventElement = screen.getByText('Multi Hour Event')
			expect(eventElement).toBeInTheDocument()

			// Find the event wrapper using testid
			const eventWrapper = screen.getByTestId(
				'horizontal-event-multi-hour-event'
			)
			expect(eventWrapper).toBeInTheDocument()

			// Event at 9am-12pm (3 hours) in 24-hour grid:
			// width = 3/24 * 100 = 12.5%
			const width = parseFloat(eventWrapper.getAttribute('data-width') || '')
			expect(width).toBeCloseTo(12.5, 1)
		})

		test('events for different resources appear in different rows', () => {
			cleanup()
			const monday = dayjs('2025-01-06T00:00:00.000Z')
			const event1: CalendarEvent = {
				id: 'event-res-1',
				title: 'Resource 1 Event',
				start: dayjs('2025-01-06T10:00:00.000Z'),
				end: dayjs('2025-01-06T11:00:00.000Z'),
				resourceId: '1',
			}
			const event2: CalendarEvent = {
				id: 'event-res-2',
				title: 'Resource 2 Event',
				start: dayjs('2025-01-06T10:00:00.000Z'),
				end: dayjs('2025-01-06T11:00:00.000Z'),
				resourceId: '2',
			}

			renderResourceWeekHorizontal({
				initialDate: monday,
				events: [event1, event2],
			})

			// Both events should be rendered
			expect(screen.getByText('Resource 1 Event')).toBeInTheDocument()
			expect(screen.getByText('Resource 2 Event')).toBeInTheDocument()

			// Events should be in different rows (different parents with horizontal-row testid)
			const event1Element = screen.getByText('Resource 1 Event')
			const event2Element = screen.getByText('Resource 2 Event')

			const row1 = event1Element.closest('[data-testid^="horizontal-row-"]')
			const row2 = event2Element.closest('[data-testid^="horizontal-row-"]')

			expect(row1).not.toBeNull()
			expect(row2).not.toBeNull()
			expect(row1).not.toBe(row2)
		})
	})
})
