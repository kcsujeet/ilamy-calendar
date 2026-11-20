import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarDndContext } from '@/features/calendar/components/drag-and-drop/calendar-dnd-context'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { DayView } from '@/testing/view-harnesses'

const mockResources: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]

const initialDate = '2025-01-01T00:00:00.500Z'

const renderResourceDayHorizontal = (props: Record<string, unknown> = {}) => {
	const { events = [], ...rest } = props
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={events as CalendarEvent[]}
			initialDate={initialDate}
			initialView="day"
			orientation="horizontal"
			resources={mockResources}
			timezone="UTC"
			{...rest}
		>
			<CalendarDndContext>
				<DayView />
			</CalendarDndContext>
		</CalendarProvider>
	)
}

describe('ResourceDayHorizontal', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('basic structure', () => {
		test('renders horizontal resource day view structure', () => {
			renderResourceDayHorizontal()

			expect(screen.getByText('Resource 1')).toBeInTheDocument()
			expect(screen.getByText('Resource 2')).toBeInTheDocument()
			expect(screen.getByText(/Resources/i)).toBeInTheDocument()
		})

		test('renders time labels for each hour', () => {
			renderResourceDayHorizontal()

			const timeLabels = screen.getAllByTestId(/resource-day-time-label-/)
			expect(timeLabels.length).toBe(24)
		})
	})

	describe('business hours filtering', () => {
		test('shows all 24 hours when hideNonBusinessHours is false', () => {
			renderResourceDayHorizontal({
				businessHours: {
					daysOfWeek: ['wednesday'],
					startTime: 9,
					endTime: 17,
				},
				hideNonBusinessHours: false,
			})

			for (const hh of ['00', '08', '09', '17', '23']) {
				expect(
					screen.getByTestId(`resource-day-time-label-${hh}`)
				).toBeInTheDocument()
			}
		})

		test('hides non-business hours when hideNonBusinessHours is true', () => {
			renderResourceDayHorizontal({
				businessHours: {
					daysOfWeek: ['wednesday'],
					startTime: 9,
					endTime: 17,
				},
				hideNonBusinessHours: true,
			})

			expect(
				screen.getByTestId('resource-day-time-label-09')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('resource-day-time-label-16')
			).toBeInTheDocument()
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
				start: '2025-01-01T10:00:00+00:00',
				end: '2025-01-01T11:00:00+00:00',
				resourceId: '1',
			}

			renderResourceDayHorizontal({ events: [testEvent] })

			expect(screen.getByText('Horizontal Day Event')).toBeInTheDocument()
		})

		test('positions event with left and width styles', () => {
			const testEvent: CalendarEvent = {
				id: 'test-event-positioned',
				title: 'Positioned Event',
				start: '2025-01-01T10:00:00+00:00',
				end: '2025-01-01T12:00:00+00:00',
				resourceId: '1',
			}

			renderResourceDayHorizontal({ events: [testEvent] })

			const eventWrapper = screen.getByTestId(
				'horizontal-event-test-event-positioned'
			)
			const left = Number.parseFloat(
				eventWrapper.getAttribute('data-left') || ''
			)
			const width = Number.parseFloat(
				eventWrapper.getAttribute('data-width') || ''
			)

			expect(left).toBeCloseTo(41.67, 1)
			expect(width).toBeCloseTo(8.33, 1)
		})

		test('positions event correctly when hideNonBusinessHours is true', () => {
			const testEvent: CalendarEvent = {
				id: 'test-event-9am',
				title: '9AM Event',
				start: '2025-01-01T09:00:00+00:00',
				end: '2025-01-01T10:00:00+00:00',
				resourceId: '1',
			}

			renderResourceDayHorizontal({
				businessHours: {
					daysOfWeek: ['wednesday'],
					startTime: 9,
					endTime: 17,
				},
				hideNonBusinessHours: true,
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId('horizontal-event-test-event-9am')
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-left') || '')
			).toBe(0)
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-width') || '')
			).toBe(12.5)
		})

		test('positions event at 50% left when starting halfway through business day', () => {
			const testEvent: CalendarEvent = {
				id: 'test-event-1pm',
				title: '1PM Event',
				start: '2025-01-01T13:00:00+00:00',
				end: '2025-01-01T14:00:00+00:00',
				resourceId: '1',
			}

			renderResourceDayHorizontal({
				businessHours: {
					daysOfWeek: ['wednesday'],
					startTime: 9,
					endTime: 17,
				},
				hideNonBusinessHours: true,
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId('horizontal-event-test-event-1pm')
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-left') || '')
			).toBe(50)
		})

		test('events for different resources appear in different rows', () => {
			const event1: CalendarEvent = {
				id: 'res-1-event',
				title: 'Res 1 Event',
				start: '2025-01-01T10:00:00+00:00',
				end: '2025-01-01T11:00:00+00:00',
				resourceId: '1',
			}
			const event2: CalendarEvent = {
				id: 'res-2-event',
				title: 'Res 2 Event',
				start: '2025-01-01T10:00:00+00:00',
				end: '2025-01-01T11:00:00+00:00',
				resourceId: '2',
			}

			renderResourceDayHorizontal({ events: [event1, event2] })

			const row1 = screen
				.getByText('Res 1 Event')
				.closest('[data-testid^="horizontal-row-"]')
			const row2 = screen
				.getByText('Res 2 Event')
				.closest('[data-testid^="horizontal-row-"]')

			expect(row1?.getAttribute('data-testid')).toBe('horizontal-row-1')
			expect(row2?.getAttribute('data-testid')).toBe('horizontal-row-2')
		})

		test('multi-day events are rendered on each day (as single-day block in day view)', () => {
			const testEvent: CalendarEvent = {
				id: 'multi-day-event',
				title: 'Multi-Day Event',
				start: '2025-01-01T10:00:00+00:00',
				end: '2025-01-02T12:00:00+00:00',
				resourceId: '1',
			}

			renderResourceDayHorizontal({ events: [testEvent] })

			const eventWrapper = screen.getByTestId(
				'horizontal-event-multi-day-event'
			)
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-left') || '')
			).toBeCloseTo(41.67, 1)
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-width') || '')
			).toBeCloseTo(58.33, 1)
		})

		test('positions 10am event precisely at 10/24 percentage (index 10)', () => {
			const testEvent: CalendarEvent = {
				id: 'precise-10am',
				title: '10AM Event',
				start: '2025-01-01T10:00:00+00:00',
				end: '2025-01-01T11:00:00+00:00',
				resourceId: '1',
			}

			renderResourceDayHorizontal({ events: [testEvent] })

			const eventWrapper = screen.getByTestId('horizontal-event-precise-10am')
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-left') || '')
			).toBeCloseTo(41.67, 1)
		})

		test('positions 10:15am event correctly (not snapping to 9am)', () => {
			const testEvent: CalendarEvent = {
				id: 'precise-1015am',
				title: '10:15AM Event',
				start: '2025-01-01T10:15:00+00:00',
				end: '2025-01-01T11:00:00+00:00',
				resourceId: '1',
			}

			renderResourceDayHorizontal({ events: [testEvent] })

			const eventWrapper = screen.getByTestId('horizontal-event-precise-1015am')
			const left = Number.parseFloat(
				eventWrapper.getAttribute('data-left') || ''
			)
			expect(left).toBeCloseTo((10.25 / 24) * 100, 2)
			expect(left).not.toBeCloseTo(37.5, 1)
		})
	})

	describe('scrollTime', () => {
		const originalScrollTo = Element.prototype.scrollTo

		afterEach(() => {
			Element.prototype.scrollTo = originalScrollTo
		})

		test('scrolls the viewport when scrollTime is set', () => {
			const scrollSpy = mock((_options?: ScrollToOptions) => {})
			Element.prototype.scrollTo = scrollSpy as unknown as Element['scrollTo']

			renderResourceDayHorizontal({ scrollTime: '08:00:00' })

			expect(scrollSpy).toHaveBeenCalled()
		})

		test('scrolls along the horizontal axis (uses `left`, not `top`)', () => {
			const scrollSpy = mock((_options?: ScrollToOptions) => {})
			Element.prototype.scrollTo = scrollSpy as unknown as Element['scrollTo']

			renderResourceDayHorizontal({ scrollTime: '09:00' })

			const scrollOptions = scrollSpy.mock.calls.at(0)?.at(0)
			expect(scrollOptions).toHaveProperty('left')
			expect(scrollOptions).not.toHaveProperty('top')
		})

		test('does not scroll when scrollTime is not provided', () => {
			const scrollSpy = mock((_options?: ScrollToOptions) => {})
			Element.prototype.scrollTo = scrollSpy as unknown as Element['scrollTo']

			renderResourceDayHorizontal()

			expect(scrollSpy).not.toHaveBeenCalled()
		})
	})

	describe('overflow indicator per hour cell', () => {
		const hourlyEvents: CalendarEvent[] = [9, 11, 13, 15, 17, 19, 21].map(
			(hour, index) => ({
				id: String(index),
				title: `Course ${index + 1}`,
				start: `2025-01-01T${String(hour).padStart(2, '0')}:00:00+00:00`,
				end: `2025-01-01T${String(hour + 1).padStart(2, '0')}:00:00+00:00`,
				resourceId: '1',
			})
		)

		test('shows no overflow when no hour holds more than dayMaxEvents', () => {
			renderResourceDayHorizontal({ events: hourlyEvents })
			expect(screen.queryAllByText(/\+\d+ more/)).toHaveLength(0)
		})

		test('shows overflow only on the hour that actually overflows', () => {
			const crowded: CalendarEvent[] = Array.from({ length: 6 }, (_, i) => ({
				id: `crowded-${i}`,
				title: `Crowded ${i}`,
				start: '2025-01-01T10:00:00+00:00',
				end: '2025-01-01T11:00:00+00:00',
				resourceId: '1',
			}))
			renderResourceDayHorizontal({
				dayMaxEvents: 4,
				events: [...hourlyEvents, ...crowded],
			})

			const indicators = screen.queryAllByText(/\+\d+ more/)
			expect(indicators).toHaveLength(1)
			expect(indicators.at(0)).toHaveTextContent('+2 more')
		})
	})

	test('is a resource calendar with no lanes while a resources function is pending', () => {
		const neverResolves = () => new Promise<Resource[]>(() => undefined)
		cleanup()
		render(
			<CalendarProvider
				events={[]}
				initialDate={initialDate}
				initialView="day"
				orientation="horizontal"
				resourcesFetcher={neverResolves}
				timezone="UTC"
			>
				<CalendarDndContext>
					<DayView />
				</CalendarDndContext>
			</CalendarProvider>
		)

		expect(screen.getByText('Resources')).toBeInTheDocument()
		expect(screen.queryByTestId('day-view-header')).toBeNull()
	})
})
