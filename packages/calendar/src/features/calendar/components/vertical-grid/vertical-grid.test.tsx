import {
	afterEach,
	beforeEach,
	describe,
	expect,
	setSystemTime,
	spyOn,
	test,
} from 'bun:test'
import type { BusinessHours, Resource, WeekDays } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { act, cleanup, render, screen } from '@testing-library/react'
import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { VerticalGrid } from './vertical-grid'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')
const mockColumns = [
	{
		id: 'col-1',
		day: initialDate,
		days: [initialDate.hour(9), initialDate.hour(10)],
	},
]

const renderVerticalGrid = (props = {}, providerProps = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			initialDate={initialDate}
			{...providerProps}
		>
			<VerticalGrid columns={mockColumns} {...props}>
				<div data-testid="grid-children">Header Content</div>
			</VerticalGrid>
		</CalendarProvider>
	)
}

describe('VerticalGrid', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders base structure correctly', () => {
		renderVerticalGrid()

		expect(screen.getByTestId('vertical-grid-scroll')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-grid-header')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
		expect(screen.getByTestId('grid-children')).toHaveTextContent(
			'Header Content'
		)
	})

	test('renders columns', () => {
		renderVerticalGrid()
		expect(screen.getByTestId('vertical-col-col-1')).toBeInTheDocument()
	})

	test('renders all-day row when provided', () => {
		renderVerticalGrid({
			allDayRow: <div data-testid="mock-all-day">All Day Row</div>,
		})

		expect(screen.getByTestId('vertical-grid-all-day')).toBeInTheDocument()
		expect(screen.getByTestId('mock-all-day')).toHaveTextContent('All Day Row')
	})

	test('applies custom classes', () => {
		renderVerticalGrid({
			classes: {
				header: 'custom-header-class',
				body: 'custom-body-class',
				allDay: 'custom-allday-class',
			},
			allDayRow: <div>All Day</div>,
		})

		expect(screen.getByTestId('vertical-grid-header')).toHaveClass(
			'custom-header-class'
		)
		expect(screen.getByTestId('vertical-grid-body')).toHaveClass(
			'custom-body-class'
		)
		expect(screen.getByTestId('vertical-grid-all-day')).toHaveClass(
			'custom-allday-class'
		)
	})

	test('container uses flex column layout for scroll containment', () => {
		renderVerticalGrid()

		const container = screen.getByTestId('vertical-grid-container')
		expect(container.className).toContain('flex')
		expect(container.className).toContain('flex-col')
	})

	test('scroll area is present for regular variant', () => {
		renderVerticalGrid({ variant: 'regular' })

		const scrollArea = screen.getByTestId('vertical-grid-scroll')
		expect(scrollArea).toBeInTheDocument()
	})

	test('all-day row container has minimum height', () => {
		renderVerticalGrid({
			allDayRow: <div data-testid="mock-all-day">All Day</div>,
		})

		const allDayContainer = screen.getByTestId('vertical-grid-all-day')
		expect(allDayContainer.className).toContain('min-h-12')
	})

	describe('scrolling when rendered hours change (#320)', () => {
		const date = '2025-03-12T09:00:00.000Z'
		const events: [] = []
		const hours = (
			startTime: number,
			daysOfWeek: WeekDays[] = [
				'sunday',
				'monday',
				'tuesday',
				'wednesday',
				'thursday',
				'friday',
				'saturday',
			]
		): BusinessHours => ({
			daysOfWeek,
			startTime,
			endTime: 17,
		})
		const resources: Resource[] = [{ id: 'room', title: 'Room' }]
		let scrollSpy: ReturnType<typeof spyOn<HTMLElement, 'scrollTo'>>

		beforeEach(() => {
			setSystemTime(new Date(date))
			scrollSpy = spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(
				() => {}
			)
			scrollSpy.mockClear()
		})
		afterEach(() => {
			cleanup()
			scrollSpy.mockRestore()
			setSystemTime()
		})

		const buildCalendar = (
			startTime: number,
			resourceHours = false,
			view: 'day' | 'week' = 'day',
			scrollToNow = true
		) => {
			const businessHours = hours(startTime)
			const calendarResources = resourceHours
				? [{ id: 'room', title: 'Room', businessHours }]
				: resources
			const globalHours = resourceHours ? undefined : businessHours
			return (
				<IlamyCalendar
					businessHours={globalHours}
					events={events}
					hideNonBusinessHours
					initialDate={date}
					initialView={view}
					orientation="vertical"
					resources={calendarResources}
					scrollTime="09:00"
					scrollToNow={scrollToNow}
					timezone="UTC"
				/>
			)
		}

		test('reapplies when only a later column spec changes', () => {
			const buildGrid = (startTime: number) => {
				const columns = [12, startTime].map((start, index) => {
					const days = getViewHours({
						referenceDate: dayjs(date),
						businessHours: hours(start),
						hideNonBusinessHours: true,
					})
					return {
						id: String(index),
						day: dayjs(date),
						days,
						gridType: 'hour' as const,
					}
				})
				return (
					<CalendarProvider initialDate={date} scrollToNow timezone="UTC">
						<VerticalGrid columns={columns} gridType="hour" />
					</CalendarProvider>
				)
			}

			const { rerender } = render(buildGrid(12))
			expect(scrollSpy).toHaveBeenCalledTimes(1)
			rerender(buildGrid(6))
			expect(scrollSpy).toHaveBeenCalledTimes(2)
		})

		test('preserves manual scroll on a rerender with equal rendered hours', () => {
			const { rerender } = render(buildCalendar(6))
			expect(scrollSpy).toHaveBeenCalledTimes(1)
			const viewport = screen
				.getByTestId('vertical-grid-scroll')
				.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')
			if (!viewport) throw new Error('missing viewport')
			viewport.scrollTop = 123
			rerender(buildCalendar(6))
			expect(scrollSpy).toHaveBeenCalledTimes(1)
			expect(viewport.scrollTop).toBe(123)
		})

		test.each([false, true])(
			'reapplies scrolling after global/resource hours change (resource=%s)',
			(resourceHours) => {
				const { rerender } = render(buildCalendar(12, resourceHours))
				expect(scrollSpy).toHaveBeenCalledTimes(1)
				rerender(buildCalendar(6, resourceHours))
				expect(scrollSpy).toHaveBeenCalledTimes(2)
			}
		)

		test('reapplies scrollTime alone and preserves manual scroll when hours stay equal', () => {
			const { rerender } = render(buildCalendar(12, false, 'day', false))
			expect(scrollSpy).toHaveBeenCalledTimes(1)
			rerender(buildCalendar(6, false, 'day', false))
			expect(scrollSpy).toHaveBeenCalledTimes(2)
			const viewport = screen
				.getByTestId('vertical-grid-scroll')
				.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')
			if (!viewport) throw new Error('missing viewport')
			viewport.scrollTop = 123
			rerender(buildCalendar(6, false, 'day', false))
			expect(scrollSpy).toHaveBeenCalledTimes(2)
			expect(viewport.scrollTop).toBe(123)
		})
	})

	describe('sticky insets', () => {
		// happy-dom lays nothing out, so every rect is empty. The layout the
		// measurement reads is faked here: the sticky header sits at the window's
		// top, and the scroll viewport wherever a test puts it.
		const originalRect = HTMLElement.prototype.getBoundingClientRect
		const OriginalResizeObserver = globalThis.ResizeObserver
		const HEADER_HEIGHT = 97
		let headerHeight = HEADER_HEIGHT
		let viewportTop = 0

		beforeEach(() => {
			headerHeight = HEADER_HEIGHT
			viewportTop = 0
			HTMLElement.prototype.getBoundingClientRect = function () {
				if (this.hasAttribute('data-radix-scroll-area-viewport')) {
					return new DOMRect(0, viewportTop, 0, 0)
				}
				const isStickyHeader = this.getAttribute('data-sticky-inset') === 'top'
				return new DOMRect(0, 0, 0, isStickyHeader ? headerHeight : 0)
			}
		})

		afterEach(() => {
			HTMLElement.prototype.getBoundingClientRect = originalRect
			globalThis.ResizeObserver = OriginalResizeObserver
		})

		const publishedTop = () =>
			screen
				.getByTestId('vertical-grid-scroll')
				.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')
				?.style.getPropertyValue('--ilamy-sticky-top')

		test('a resource grid publishes its sticky header height', () => {
			renderVerticalGrid({ allDayRow: <div>All Day</div> })

			expect(publishedTop()).toBe(`${HEADER_HEIGHT}px`)
		})

		test('a header that scrolls away covers nothing', () => {
			renderVerticalGrid(
				{ allDayRow: <div>All Day</div> },
				{ stickyViewHeader: false }
			)

			expect(publishedTop()).toBe('0px')
		})

		test('a header that grows after mount is re-measured', () => {
			// happy-dom never resizes anything, so the observer is captured and
			// fired by hand, the way a browser would once the all-day row grows.
			const resizeCallbacks: ResizeObserverCallback[] = []
			globalThis.ResizeObserver = class {
				constructor(callback: ResizeObserverCallback) {
					resizeCallbacks.push(callback)
				}
				observe() {}
				unobserve() {}
				disconnect() {}
			}
			renderVerticalGrid({ allDayRow: <div>All Day</div> })

			headerHeight = 145
			act(() => {
				for (const callback of resizeCallbacks) {
					callback([], {} as ResizeObserver)
				}
			})

			expect(publishedTop()).toBe('145px')
		})

		test('without ResizeObserver the insets are still published once', () => {
			// @ts-expect-error: an environment that predates ResizeObserver
			globalThis.ResizeObserver = undefined
			renderVerticalGrid({ allDayRow: <div>All Day</div> })

			expect(publishedTop()).toBe(`${HEADER_HEIGHT}px`)
		})

		test('a regular grid keeps its header outside the scroller', () => {
			// The viewport starts where the header above it ends. The header is
			// measured by position now, not size, so it covers none of it.
			viewportTop = HEADER_HEIGHT
			renderVerticalGrid({ variant: 'regular', allDayRow: <div>All Day</div> })

			expect(publishedTop()).toBe('0px')
		})

		test('a page scrolled under a header stuck to the window', () => {
			// The page is scrolled 200px past the grid's top while the header
			// stays pinned at the window's: it reaches 297px into the viewport.
			viewportTop = -200
			renderVerticalGrid({ variant: 'regular', allDayRow: <div>All Day</div> })

			expect(publishedTop()).toBe(`${200 + HEADER_HEIGHT}px`)
		})

		test('a page scrolled past the grid with no sticky header', () => {
			// Nothing covers the grid, but the window's own top hides 200px of it.
			viewportTop = -200
			renderVerticalGrid(
				{ variant: 'regular', allDayRow: <div>All Day</div> },
				{ stickyViewHeader: false }
			)

			expect(publishedTop()).toBe('200px')
		})
	})
})
