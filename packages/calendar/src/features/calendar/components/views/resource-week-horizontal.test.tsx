import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import { now, toOffsetIso } from '@ilamy/utils/temporal'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarDndContext } from '@/features/calendar/components/drag-and-drop/calendar-dnd-context'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import {
	assertResourceWeekBusinessHourRange,
	resourceWeekInitialDate as initialDate,
	noEvents,
	twoResources,
} from '@/testing/resource-test-fixtures'
import { WeekView } from '@/testing/view-harnesses'

const renderResourceWeekHorizontal = (props = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={noEvents}
			initialDate={initialDate}
			initialView="week"
			orientation="horizontal"
			resources={twoResources}
			timezone="UTC"
			{...props}
		>
			<CalendarDndContext>
				<WeekView />
			</CalendarDndContext>
		</CalendarProvider>
	)
}

const expectTodayHeaderHighlighted = (
	props: Parameters<typeof renderResourceWeekHorizontal>[0]
) => {
	renderResourceWeekHorizontal(props)
	const dayHeaders = screen.getAllByTestId('resource-week-day-header')
	const todayHeader = dayHeaders.find((header) =>
		header.querySelector('.bg-primary.text-primary-foreground')
	)
	expect(todayHeader).toBeDefined()
}

describe('ResourceWeekHorizontal', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('basic structure', () => {
		test('renders horizontal resource week view structure', () => {
			renderResourceWeekHorizontal()

			expect(screen.getByText('Resource 1')).toBeInTheDocument()
			expect(screen.getByText('Resource 2')).toBeInTheDocument()
			expect(screen.getByText(/Resources/i)).toBeInTheDocument()
		})

		test('renders day headers for the week', () => {
			renderResourceWeekHorizontal()
			expect(screen.getAllByTestId('resource-week-day-header').length).toBe(7)
		})

		test('day headers show only the day number, not the M/D slash format (issue #157)', () => {
			renderResourceWeekHorizontal()

			expect(screen.queryAllByText(/^\d{1,2}\/\d{1,2}$/)).toHaveLength(0)

			const dayHeaders = screen.getAllByTestId('resource-week-day-header')
			const wednesday = dayHeaders.find((h) => h.textContent?.includes('Wed'))
			expect(wednesday?.textContent).toBe('Wed1')
		})

		test('renders time labels for each hour', () => {
			renderResourceWeekHorizontal()

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
			expect(screen.getAllByTestId(/resource-week-time-label-/).length).toBe(
				7 * 24
			)
		})

		test('time labels are rendered using flat().map() for nested hours', () => {
			renderResourceWeekHorizontal()
			expect(screen.getAllByTestId('resource-week-time-label-12').length).toBe(
				7
			)
		})
	})

	describe('business hours filtering', () => {
		test('shows all 24 hours when hideNonBusinessHours is false', () => {
			renderResourceWeekHorizontal({
				businessHours: {
					daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
					startTime: 9,
					endTime: 17,
				},
				hideNonBusinessHours: false,
			})

			for (const hh of ['00', '08', '17', '23']) {
				expect(
					screen.getAllByTestId(`resource-week-time-label-${hh}`).length
				).toBe(7)
			}
		})

		test('hides non-business hours when hideNonBusinessHours is true', () => {
			renderResourceWeekHorizontal({
				businessHours: {
					daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
					startTime: 9,
					endTime: 17,
				},
				hideNonBusinessHours: true,
			})

			assertResourceWeekBusinessHourRange(screen, 9, 16, 8, 17)
			expect(
				screen.queryAllByTestId('resource-week-time-label-23').length
			).toBe(0)
		})
	})

	describe('firstDayOfWeek support', () => {
		test('respects firstDayOfWeek setting', () => {
			renderResourceWeekHorizontal({ firstDayOfWeek: 1 })
			const dayHeaders = screen.getAllByTestId('resource-week-day-header')
			expect(dayHeaders.length).toBe(7)
			expect(dayHeaders.at(0)).toBeInTheDocument()
		})
	})

	describe('today highlighting', () => {
		test('highlights current day header when viewing current week', () => {
			expectTodayHeaderHighlighted({ initialDate: toOffsetIso(now('UTC')) })
		})
	})

	describe('time format', () => {
		test('uses 12-hour format when timeFormat is 12-hour', () => {
			renderResourceWeekHorizontal({ timeFormat: '12-hour' })
			expect(
				screen.getAllByTestId(/resource-week-time-label-/).length
			).toBeGreaterThan(0)
		})

		test('uses 24-hour format when timeFormat is 24-hour', () => {
			renderResourceWeekHorizontal({ timeFormat: '24-hour' })
			expect(
				screen.getAllByTestId(/resource-week-time-label-/).length
			).toBeGreaterThan(0)
		})
	})

	describe('event positioning', () => {
		test('renders event for resource in correct row', () => {
			const testEvent: CalendarEvent = {
				id: 'test-event-horizontal-1',
				title: 'Horizontal Event',
				start: '2025-01-06T10:00:00+00:00',
				end: '2025-01-06T11:00:00+00:00',
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: '2025-01-06T00:00:00Z',
				events: [testEvent],
			})

			expect(screen.getByText('Horizontal Event')).toBeInTheDocument()
		})

		test('positions event with left and width styles', () => {
			const testEvent: CalendarEvent = {
				id: 'test-event-horizontal-positioned',
				title: 'Positioned Event',
				start: '2025-01-06T10:00:00+00:00',
				end: '2025-01-06T12:00:00+00:00',
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: '2025-01-06T00:00:00Z',
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId(
				'horizontal-event-test-event-horizontal-positioned'
			)
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-left') || '')
			).toBeCloseTo(41.67, 1)
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-width') || '')
			).toBeCloseTo(8.33, 1)
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-top') || '')
			).toBe(1)
		})

		test('positions event correctly when hideNonBusinessHours is false', () => {
			const testEvent: CalendarEvent = {
				id: 'test-event-horizontal-9am-full',
				title: 'Horizontal Full',
				start: '2025-01-06T09:00:00+00:00',
				end: '2025-01-06T10:00:00+00:00',
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: '2025-01-06T00:00:00Z',
				businessHours: {
					daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
					startTime: 9,
					endTime: 17,
				},
				hideNonBusinessHours: false,
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId(
				'horizontal-event-test-event-horizontal-9am-full'
			)
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-left') || '')
			).toBeCloseTo(37.5, 1)
		})

		test('positions event at 0% left when event starts at business hour start with hideNonBusinessHours true', () => {
			const testEvent: CalendarEvent = {
				id: 'test-event-horizontal-9am',
				title: 'Horizontal Morning',
				start: '2025-01-06T09:00:00+00:00',
				end: '2025-01-06T10:00:00+00:00',
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: '2025-01-06T00:00:00Z',
				businessHours: {
					daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
					startTime: 9,
					endTime: 17,
				},
				hideNonBusinessHours: true,
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId(
				'horizontal-event-test-event-horizontal-9am'
			)
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-left') || '')
			).toBe(0)
		})

		test('positions event at correct percentage when event is in middle of business hours', () => {
			const testEvent: CalendarEvent = {
				id: 'test-event-horizontal-1pm',
				title: 'Horizontal Afternoon',
				start: '2025-01-06T13:00:00+00:00',
				end: '2025-01-06T14:00:00+00:00',
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: '2025-01-06T00:00:00Z',
				businessHours: {
					daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
					startTime: 9,
					endTime: 17,
				},
				hideNonBusinessHours: true,
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId(
				'horizontal-event-test-event-horizontal-1pm'
			)
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-left') || '')
			).toBe(50)
		})

		test('different events have different left positions', () => {
			const earlyEvent: CalendarEvent = {
				id: 'early-event',
				title: 'Early Event',
				start: '2025-01-06T08:00:00+00:00',
				end: '2025-01-06T09:00:00+00:00',
				resourceId: '1',
			}
			const lateEvent: CalendarEvent = {
				id: 'late-event',
				title: 'Late Event',
				start: '2025-01-06T16:00:00+00:00',
				end: '2025-01-06T17:00:00+00:00',
				resourceId: '2',
			}

			renderResourceWeekHorizontal({
				initialDate: '2025-01-06T00:00:00Z',
				events: [earlyEvent, lateEvent],
			})

			const earlyLeft = Number.parseFloat(
				screen
					.getByTestId('horizontal-event-early-event')
					.getAttribute('data-left') || '0'
			)
			const lateLeft = Number.parseFloat(
				screen
					.getByTestId('horizontal-event-late-event')
					.getAttribute('data-left') || '0'
			)

			expect(earlyLeft).toBeCloseTo(33.33, 1)
			expect(lateLeft).toBeCloseTo(66.67, 1)
			expect(lateLeft).toBeGreaterThan(earlyLeft)
		})

		test('event has width proportional to duration', () => {
			const testEvent: CalendarEvent = {
				id: 'multi-hour-event',
				title: 'Multi Hour Event',
				start: '2025-01-06T09:00:00+00:00',
				end: '2025-01-06T12:00:00+00:00',
				resourceId: '1',
			}

			renderResourceWeekHorizontal({
				initialDate: '2025-01-06T00:00:00Z',
				events: [testEvent],
			})

			const eventWrapper = screen.getByTestId(
				'horizontal-event-multi-hour-event'
			)
			expect(
				Number.parseFloat(eventWrapper.getAttribute('data-width') || '')
			).toBeCloseTo(12.5, 1)
		})

		test('events for different resources appear in different rows', () => {
			const event1: CalendarEvent = {
				id: 'event-res-1',
				title: 'Resource 1 Event',
				start: '2025-01-06T10:00:00+00:00',
				end: '2025-01-06T11:00:00+00:00',
				resourceId: '1',
			}
			const event2: CalendarEvent = {
				id: 'event-res-2',
				title: 'Resource 2 Event',
				start: '2025-01-06T10:00:00+00:00',
				end: '2025-01-06T11:00:00+00:00',
				resourceId: '2',
			}

			renderResourceWeekHorizontal({
				initialDate: '2025-01-06T00:00:00Z',
				events: [event1, event2],
			})

			const row1 = screen
				.getByText('Resource 1 Event')
				.closest('[data-testid^="horizontal-row-"]')
			const row2 = screen
				.getByText('Resource 2 Event')
				.closest('[data-testid^="horizontal-row-"]')

			expect(row1).not.toBeNull()
			expect(row2).not.toBeNull()
			expect(row1).not.toBe(row2)
		})
	})

	describe('weekViewGranularity', () => {
		describe('default hourly mode behavior preserved', () => {
			test('renders time header row with hour labels when weekViewGranularity is hourly', () => {
				renderResourceWeekHorizontal({ weekViewGranularity: 'hourly' })
				expect(screen.getAllByTestId(/resource-week-time-label-/)).toHaveLength(
					7 * 24
				)
			})

			test('renders 7 day headers in hourly mode', () => {
				renderResourceWeekHorizontal({ weekViewGranularity: 'hourly' })
				expect(screen.getAllByTestId('resource-week-day-header')).toHaveLength(
					7
				)
			})
		})

		describe('daily mode renders correctly', () => {
			test('does not render time header row when weekViewGranularity is daily', () => {
				renderResourceWeekHorizontal({ weekViewGranularity: 'daily' })
				expect(
					screen.queryAllByTestId(/resource-week-time-label-/)
				).toHaveLength(0)
			})

			test('still renders 7 day headers in daily mode', () => {
				renderResourceWeekHorizontal({ weekViewGranularity: 'daily' })
				expect(screen.getAllByTestId('resource-week-day-header')).toHaveLength(
					7
				)
			})

			test('day headers use full-width centering in daily mode (not sticky)', () => {
				renderResourceWeekHorizontal({ weekViewGranularity: 'daily' })
				const firstHeaderInner = screen
					.getAllByTestId('resource-week-day-header')
					.at(0)
					?.querySelector('div')

				expect(firstHeaderInner?.className).toContain('w-full text-center')
				expect(firstHeaderInner?.className).not.toContain('sticky')
			})

			test('still renders resource labels in daily mode', () => {
				renderResourceWeekHorizontal({ weekViewGranularity: 'daily' })
				expect(screen.getByText('Resource 1')).toBeInTheDocument()
				expect(screen.getByText('Resource 2')).toBeInTheDocument()
			})

			test('highlights today in the day header row in daily mode', () => {
				expectTodayHeaderHighlighted({
					initialDate: toOffsetIso(now('UTC')),
					weekViewGranularity: 'daily',
				})
			})
		})

		describe('header structure differences', () => {
			test('hourly mode produces an expanded header containing a time row', () => {
				renderResourceWeekHorizontal({ weekViewGranularity: 'hourly' })
				expect(screen.getAllByTestId(/resource-week-time-label-/).length).toBe(
					7 * 24
				)
			})

			test('daily mode produces a compact header with no time row', () => {
				renderResourceWeekHorizontal({ weekViewGranularity: 'daily' })
				expect(
					screen.queryAllByTestId(/resource-week-time-label-/).length
				).toBe(0)
				expect(screen.getAllByTestId('resource-week-day-header').length).toBe(7)
			})

			test('day header inner layout differs between daily and hourly mode', () => {
				const { unmount } = renderResourceWeekHorizontal({
					weekViewGranularity: 'hourly',
				})
				const hourlyClassName =
					screen
						.getAllByTestId('resource-week-day-header')
						.at(0)
						?.querySelector('div')?.className ?? ''

				unmount()

				renderResourceWeekHorizontal({ weekViewGranularity: 'daily' })
				const dailyClassName =
					screen
						.getAllByTestId('resource-week-day-header')
						.at(0)
						?.querySelector('div')?.className ?? ''

				expect(hourlyClassName).toContain('sticky')
				expect(dailyClassName).toContain('w-full text-center')
				expect(dailyClassName).not.toContain('sticky')
			})
		})
	})

	describe('scrollTime', () => {
		const originalScrollTo = Element.prototype.scrollTo

		afterEach(() => {
			Element.prototype.scrollTo = originalScrollTo
		})

		test('scrolls the viewport when scrollTime is set and granularity is hourly', () => {
			const scrollSpy = mock((_options?: ScrollToOptions) => {})
			Element.prototype.scrollTo = scrollSpy as unknown as Element['scrollTo']

			renderResourceWeekHorizontal({
				scrollTime: '09:00:00',
				weekViewGranularity: 'hourly',
				initialView: 'week',
			})

			expect(scrollSpy).toHaveBeenCalled()
			const scrollOptions = scrollSpy.mock.calls.at(0)?.at(0)
			expect(scrollOptions).toHaveProperty('left')
			expect(scrollOptions).not.toHaveProperty('top')
		})

		test('does not scroll on daily granularity', () => {
			const scrollSpy = mock((_options?: ScrollToOptions) => {})
			Element.prototype.scrollTo = scrollSpy as unknown as Element['scrollTo']

			renderResourceWeekHorizontal({
				scrollTime: '09:00:00',
				weekViewGranularity: 'daily',
				initialView: 'week',
			})

			expect(scrollSpy).not.toHaveBeenCalled()
		})

		test('does not scroll when scrollTime is not provided', () => {
			const scrollSpy = mock((_options?: ScrollToOptions) => {})
			Element.prototype.scrollTo = scrollSpy as unknown as Element['scrollTo']

			renderResourceWeekHorizontal({
				weekViewGranularity: 'hourly',
				initialView: 'week',
			})

			expect(scrollSpy).not.toHaveBeenCalled()
		})
	})
})
