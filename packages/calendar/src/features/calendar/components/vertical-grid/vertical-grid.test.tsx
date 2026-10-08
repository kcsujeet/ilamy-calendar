import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { act, cleanup, render, screen } from '@testing-library/react'
import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import {
	buildBusinessHours,
	buildScrollCalendar,
	lastScrollInHours,
	SCROLL_TEST_NOW,
	SCROLL_TEST_SCROLL_TIME,
	stubScrollGeometry,
} from '@/testing/scroll-test-fixtures'
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
		let geometry: ReturnType<typeof stubScrollGeometry>

		beforeEach(() => {
			geometry = stubScrollGeometry()
		})
		afterEach(() => {
			cleanup()
			geometry.restore()
		})

		const renderCalendar = (
			options: Omit<Parameters<typeof buildScrollCalendar>[0], 'orientation'>
		) => render(buildScrollCalendar({ orientation: 'vertical', ...options }))

		// One column per entry, each holding the hours its business hours leave
		// visible; an empty list leaves a column with no hours at all.
		const buildGrid = (startTimes: Array<number | null>) => {
			const columns = startTimes.map((startTime, index) => {
				const hasHours = startTime !== null
				const hours = hasHours
					? getViewHours({
							referenceDate: dayjs(SCROLL_TEST_NOW),
							businessHours: buildBusinessHours(startTime),
							hideNonBusinessHours: true,
						})
					: []
				return {
					id: String(index),
					day: dayjs(SCROLL_TEST_NOW),
					days: hours,
					gridType: 'hour' as const,
				}
			})
			return (
				<CalendarProvider
					initialDate={SCROLL_TEST_NOW}
					scrollTime={SCROLL_TEST_SCROLL_TIME}
					scrollToNow
					timezone="UTC"
				>
					<VerticalGrid columns={columns} gridType="hour" />
				</CalendarProvider>
			)
		}

		test('scrolls to now once the widened hours show it', () => {
			const { rerender } = renderCalendar({ startTime: 12 })
			// 09:00 is hidden, so it falls back to 07:00, clamped to the first hour.
			expect(lastScrollInHours(geometry.scrollTo)).toBe(0)

			rerender(buildScrollCalendar({ orientation: 'vertical', startTime: 6 }))

			expect(geometry.scrollTo).toHaveBeenCalledTimes(2)
			expect(lastScrollInHours(geometry.scrollTo)).toBe(3) // 06:00 -> 09:00
		})

		test('reapplies scrollTime alone when the hours change', () => {
			const { rerender } = renderCalendar({ startTime: 12, scrollToNow: false })
			rerender(
				buildScrollCalendar({
					orientation: 'vertical',
					startTime: 6,
					scrollToNow: false,
				})
			)

			expect(geometry.scrollTo).toHaveBeenCalledTimes(2)
			expect(lastScrollInHours(geometry.scrollTo)).toBe(1) // 06:00 -> 07:00
		})

		test.each(['calendar', 'resources'] as const)(
			'reapplies when the %s hours change',
			(hoursOn) => {
				const { rerender } = renderCalendar({ startTime: 12, hoursOn })
				rerender(
					buildScrollCalendar({
						orientation: 'vertical',
						startTime: 6,
						hoursOn,
					})
				)

				expect(geometry.scrollTo).toHaveBeenCalledTimes(2)
			}
		)

		test('leaves the scroll alone when the hours stay equal', () => {
			const { rerender } = renderCalendar({ startTime: 6 })
			rerender(buildScrollCalendar({ orientation: 'vertical', startTime: 6 }))

			expect(geometry.scrollTo).toHaveBeenCalledTimes(1)
		})

		test('leaves the scroll alone when a resource is added with equal hours', () => {
			const { rerender } = renderCalendar({ startTime: 6 })
			rerender(
				buildScrollCalendar({
					orientation: 'vertical',
					startTime: 6,
					resourceCount: 2,
				})
			)

			expect(geometry.scrollTo).toHaveBeenCalledTimes(1)
		})

		test('reapplies when only a later column changes', () => {
			const { rerender } = render(buildGrid([12, 12]))
			rerender(buildGrid([12, 6]))

			expect(geometry.scrollTo).toHaveBeenCalledTimes(2)
		})

		test('never scrolls a grid whose columns hold no hours', () => {
			const { rerender } = render(buildGrid([null, null]))
			rerender(buildGrid([null, null]))

			expect(geometry.scrollTo).toHaveBeenCalledTimes(0)
		})

		// A vertical week shares one column of hour rows across its days, built
		// from the whole week's hours (`weekHoursFor`), so a day's hours moving
		// inside that range leaves every row where it was.
		test("leaves the scroll alone when a day's hours change inside the week's shared rows", () => {
			const buildWeek = (wednesdayStart: number) => (
				<IlamyCalendar
					businessHours={[
						buildBusinessHours(6, ['sunday']),
						buildBusinessHours(12, [
							'monday',
							'tuesday',
							'thursday',
							'friday',
							'saturday',
						]),
						buildBusinessHours(wednesdayStart, ['wednesday']),
					]}
					events={[]}
					hideNonBusinessHours
					initialDate={SCROLL_TEST_NOW}
					initialView="week"
					orientation="vertical"
					resources={[{ id: 'room', title: 'Room' }]}
					scrollToNow
					timezone="UTC"
				/>
			)
			const { rerender } = render(buildWeek(12))
			rerender(buildWeek(9))

			expect(geometry.scrollTo).toHaveBeenCalledTimes(1)
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
