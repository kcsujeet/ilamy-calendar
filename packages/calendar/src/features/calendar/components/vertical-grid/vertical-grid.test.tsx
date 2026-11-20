import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import {
	buildScrollWeek,
	getVisibleHours,
	MID_BUSINESS_START_HOUR,
	NARROW_BUSINESS_START_HOUR,
	SCROLL_TEST_NOW,
	ScrollTestProvider,
	setUpScrollGeometry,
	testScrollingWhenHoursChange,
	WIDE_BUSINESS_START_HOUR,
} from '@/testing/scroll-test-fixtures'
import { VerticalGrid } from './vertical-grid'

const initialDate = '2025-01-01T00:00:00+00:00'
const mockColumns = [
	{
		id: 'col-1',
		day: initialDate,
		days: ['2025-01-01T09:00:00+00:00', '2025-01-01T10:00:00+00:00'],
	},
]

const renderVerticalGrid = (props = {}, providerProps = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			initialDate={initialDate}
			timezone="UTC"
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
		const getScrollTo = setUpScrollGeometry()

		testScrollingWhenHoursChange('vertical', getScrollTo)

		const buildGrid = (startTimes: Array<number | null>) => {
			const columns = startTimes.map((startTime, index) => {
				const hours = startTime === null ? [] : getVisibleHours(startTime)
				return {
					id: String(index),
					day: SCROLL_TEST_NOW,
					days: hours,
					gridType: 'hour' as const,
				}
			})
			return (
				<ScrollTestProvider>
					<VerticalGrid columns={columns} gridType="hour" />
				</ScrollTestProvider>
			)
		}

		test('reapplies when only a later column changes', () => {
			const { rerender } = render(
				buildGrid([NARROW_BUSINESS_START_HOUR, NARROW_BUSINESS_START_HOUR])
			)
			rerender(
				buildGrid([NARROW_BUSINESS_START_HOUR, WIDE_BUSINESS_START_HOUR])
			)

			expect(getScrollTo()).toHaveBeenCalledTimes(2)
		})

		test('never scrolls a grid whose columns hold no hours', () => {
			const { rerender } = render(buildGrid([null, null]))
			rerender(buildGrid([null, null]))

			expect(getScrollTo()).toHaveBeenCalledTimes(0)
		})

		test("leaves the scroll alone when a day's hours change inside the week's shared rows", () => {
			const { rerender } = render(
				buildScrollWeek('vertical', NARROW_BUSINESS_START_HOUR)
			)
			rerender(buildScrollWeek('vertical', MID_BUSINESS_START_HOUR))

			expect(getScrollTo()).toHaveBeenCalledTimes(1)
		})
	})

	describe('sticky insets', () => {
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
			viewportTop = HEADER_HEIGHT
			renderVerticalGrid({ variant: 'regular', allDayRow: <div>All Day</div> })

			expect(publishedTop()).toBe('0px')
		})

		test('a page scrolled under a header stuck to the window', () => {
			viewportTop = -200
			renderVerticalGrid({ variant: 'regular', allDayRow: <div>All Day</div> })

			expect(publishedTop()).toBe(`${200 + HEADER_HEIGHT}px`)
		})

		test('a page scrolled past the grid with no sticky header', () => {
			viewportTop = -200
			renderVerticalGrid(
				{ variant: 'regular', allDayRow: <div>All Day</div> },
				{ stickyViewHeader: false }
			)

			expect(publishedTop()).toBe('200px')
		})
	})
})
