import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import type { CalendarEvent } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ResourceDayHorizontal } from './resource-day-horizontal'

const mockResources: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]

const initialDate = dayjs('2025-01-01T00:00:00.500Z') // Half a second into the day
// Wednesday

const renderResourceDayHorizontal = (props = {}) => {
	const { events = [], ...rest } = props as any
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={events}
			initialDate={initialDate}
			orientation="horizontal"
			resources={mockResources}
			{...rest}
		>
			<CalendarDndContext>
				<ResourceDayHorizontal />
			</CalendarDndContext>
		</ResourceCalendarProvider>
	)
}

describe('ResourceDayHorizontal', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('basic structure', () => {
		test('renders horizontal resource day view structure', () => {
			renderResourceDayHorizontal()

			// Should render resource labels
			expect(screen.getByText('Resource 1')).toBeInTheDocument()
			expect(screen.getByText('Resource 2')).toBeInTheDocument()

			// Should render resources header
			expect(screen.getByText(/Resources/i)).toBeInTheDocument()
		})

		test('renders time labels for each hour', () => {
			renderResourceDayHorizontal()

			// Should render time labels (24 hours for a single day)
			const timeLabels = screen.getAllByTestId(/resource-day-time-label-/)
			expect(timeLabels.length).toBe(24)
		})
	})

	describe('business hours filtering', () => {
		test('shows all 24 hours when hideNonBusinessHours is false', () => {
			const businessHours = {
				daysOfWeek: ['wednesday'],
				startTime: 9,
				endTime: 17,
			}

			renderResourceDayHorizontal({
				businessHours,
				hideNonBusinessHours: false,
			})

			// All hours should be present
			expect(
				screen.getByTestId('resource-day-time-label-00')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('resource-day-time-label-08')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('resource-day-time-label-09')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('resource-day-time-label-17')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('resource-day-time-label-23')
			).toBeInTheDocument()
		})

		test('hides non-business hours when hideNonBusinessHours is true', () => {
			const businessHours = {
				daysOfWeek: ['wednesday'],
				startTime: 9,
				endTime: 17,
			}

			renderResourceDayHorizontal({
				businessHours,
				hideNonBusinessHours: true,
			})

			// Business hours should be present (9:00 to 16:00, because 17:00 is end)
			expect(
				screen.getByTestId('resource-day-time-label-09')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('resource-day-time-label-16')
			).toBeInTheDocument()

			// Non-business hours should NOT be present
			expect(
				screen.queryByTestId('resource-day-time-label-08')
			).not.toBeInTheDocument()
			expect(
				screen.queryByTestId('resource-day-time-label-17')
			).not.toBeInTheDocument()
			expect(
				screen.queryByTestId('resource-day-time-label-23')
			).not.toBeInTheDocument()
		})
	})

	describe('event positioning', () => {
		test('renders event for resource in correct row', () => {
			const testEvent: CalendarEvent = {
				id: 'test-event-1',
				title: 'Horizontal Day Event',
				start: dayjs('2025-01-01T10:00:00.000Z'),
				end: dayjs('2025-01-01T11:00:00.000Z'),
				resourceId: '1',
			}

			renderResourceDayHorizontal({
				events: [testEvent],
			})

			// Event should be rendered
			expect(screen.getByText('Horizontal Day Event')).toBeInTheDocument()
		})

		test('positions event with left and width styles', () => {
			// Create an event for resource 1 from 10am to 12pm (2 hours)
			const testEvent: CalendarEvent = {
				id: 'test-event-positioned',
				title: 'Positioned Event',
				start: dayjs('2025-01-01T10:00:00.000Z'),
				end: dayjs('2025-01-01T12:00:00.000Z'),
				resourceId: '1',
			}

			renderResourceDayHorizontal({
				events: [testEvent],
			})

			// Find the event wrapper using testid
			const eventWrapper = screen.getByTestId(
				'horizontal-event-test-event-positioned'
			)
			expect(eventWrapper).toBeInTheDocument()

			// Event at 10am-12pm in 24-hour grid:
			// left = 10/24 * 100 = 41.67%, width = 2/24 * 100 = 8.33%
			const left = parseFloat(eventWrapper.getAttribute('data-left') || '')
			const width = parseFloat(eventWrapper.getAttribute('data-width') || '')

			expect(left).toBeCloseTo(41.67, 1)
			expect(width).toBeCloseTo(8.33, 1)
		})

		test('positions event correctly when hideNonBusinessHours is true', () => {
			const businessHours = {
				daysOfWeek: ['wednesday'],
				startTime: 9,
				endTime: 17,
			}
			// Event starts at 9am (business hour start)
			const testEvent: CalendarEvent = {
				id: 'test-event-9am',
				title: '9AM Event',
				start: dayjs('2025-01-01T09:00:00.000Z'),
				end: dayjs('2025-01-01T10:00:00.000Z'),
				resourceId: '1',
			}

			renderResourceDayHorizontal({
				businessHours,
				hideNonBusinessHours: true,
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId('horizontal-event-test-event-9am')

			// In an 8-hour grid (9-17), 9am should be at left 0%
			const left = parseFloat(eventWrapper.getAttribute('data-left') || '')
			expect(left).toBe(0)

			// Duration 1 hour in 8-hour grid = 1/8 * 100 = 12.5%
			const width = parseFloat(eventWrapper.getAttribute('data-width') || '')
			expect(width).toBe(12.5)
		})

		test('positions event at 50% left when starting halfway through business day', () => {
			const businessHours = {
				daysOfWeek: ['wednesday'],
				startTime: 9,
				endTime: 17,
			}
			// 1pm is 4 hours after 9am in an 8-hour day (50%)
			const testEvent: CalendarEvent = {
				id: 'test-event-1pm',
				title: '1PM Event',
				start: dayjs('2025-01-01T13:00:00.000Z'),
				end: dayjs('2025-01-01T14:00:00.000Z'),
				resourceId: '1',
			}

			renderResourceDayHorizontal({
				businessHours,
				hideNonBusinessHours: true,
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId('horizontal-event-test-event-1pm')
			const left = parseFloat(eventWrapper.getAttribute('data-left') || '')
			expect(left).toBe(50)
		})

		test('events for different resources appear in different rows', () => {
			const event1: CalendarEvent = {
				id: 'res-1-event',
				title: 'Res 1 Event',
				start: dayjs('2025-01-01T10:00:00.000Z'),
				end: dayjs('2025-01-01T11:00:00.000Z'),
				resourceId: '1',
			}
			const event2: CalendarEvent = {
				id: 'res-2-event',
				title: 'Res 2 Event',
				start: dayjs('2025-01-01T10:00:00.000Z'),
				end: dayjs('2025-01-01T11:00:00.000Z'),
				resourceId: '2',
			}

			renderResourceDayHorizontal({
				events: [event1, event2],
			})

			const el1 = screen.getByText('Res 1 Event')
			const el2 = screen.getByText('Res 2 Event')

			const row1 = el1.closest('[data-testid^="horizontal-row-"]')
			const row2 = el2.closest('[data-testid^="horizontal-row-"]')

			expect(row1).not.toBeNull()
			expect(row2).not.toBeNull()
			expect(row1).not.toBe(row2)
			expect(row1?.getAttribute('data-testid')).toBe('horizontal-row-1')
			expect(row2?.getAttribute('data-testid')).toBe('horizontal-row-2')
		})

		test('multi-day events are rendered on each day (as single-day block in day view)', () => {
			// Event spanning Wed-Thu
			const testEvent: CalendarEvent = {
				id: 'multi-day-event',
				title: 'Multi-Day Event',
				start: dayjs('2025-01-01T10:00:00.000Z'), // Wed
				end: dayjs('2025-01-02T12:00:00.000Z'), // Thu
				resourceId: '1',
			}

			// Viewing Wednesday
			renderResourceDayHorizontal({
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId(
				'horizontal-event-multi-day-event'
			)

			// In day view, we only see the part that intersects with the current day (Wednesday)
			// Which is from 10am to end of day.
			// But wait, the grid logic for 'hour' type is based on the 'days' array provided.
			// In ResourceDayHorizontal, days = [currentDate's hours]
			// So firstDay = 2025-01-01T00:00:00, lastDay = 2025-01-01T23:59:59
			// The event starts at 10am on Wed and ends Thu.
			// It should span from 10am to 24:00 on Wed.

			const left = parseFloat(eventWrapper.getAttribute('data-left') || '')
			const width = parseFloat(eventWrapper.getAttribute('data-width') || '')

			// left = 10/24 * 100 = 41.67%
			expect(left).toBeCloseTo(41.67, 1)

			// width = (24-10)/24 * 100 = 14/24 * 100 = 58.33%
			expect(width).toBeCloseTo(58.33, 1)
		})

		test('positions 10am event precisely at 10/24 percentage (index 10)', () => {
			const testEvent: CalendarEvent = {
				id: 'precise-10am',
				title: '10AM Event',
				start: dayjs('2025-01-01T10:00:00.000Z'),
				end: dayjs('2025-01-01T11:00:00.000Z'),
				resourceId: '1',
			}

			renderResourceDayHorizontal({
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId('horizontal-event-precise-10am')
			const left = parseFloat(eventWrapper.getAttribute('data-left') || '')

			// 10/24 * 100 = 41.666...
			expect(left).toBeCloseTo(41.67, 1)
		})

		test('positions 10:15am event correctly (not snapping to 9am)', () => {
			const testEvent: CalendarEvent = {
				id: 'precise-1015am',
				title: '10:15AM Event',
				start: dayjs('2025-01-01T10:15:00.000Z'),
				end: dayjs('2025-01-01T11:00:00.000Z'),
				resourceId: '1',
			}

			renderResourceDayHorizontal({
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId('horizontal-event-precise-1015am')
			const left = parseFloat(eventWrapper.getAttribute('data-left') || '')

			// 10.25/24 * 100 = 42.70833...
			// But since gridType is 'hour', startOf(gridType) is used.
			// 10:15 .startOf('hour') is 10:00.
			// So it should still be at 41.67.
			// If it's showing at 9am, left would be 9/24 * 100 = 37.5.
			expect(left).toBeCloseTo(41.67, 1)
			expect(left).not.toBeCloseTo(37.5, 1)
		})
	})
})
