import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
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
import { HorizontalGrid } from './horizontal-grid'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')
const mockDays = [initialDate, initialDate.add(1, 'day')]
const mockRows = [
	{
		id: 'res-1',
		title: 'Resource 1',
		resource: { id: 'res-1', title: 'Resource 1', color: 'blue' },
		columns: [
			{
				id: 'label-col',
				day: dayjs(),
				gridType: 'day' as const,
				renderCell: ({ resource }: { resource?: Resource }) => (
					<div data-testid={`horizontal-row-label-${resource?.id}`}>
						{resource?.title}
					</div>
				),
			},
			...mockDays.map((day) => ({
				id: `col-${day.toISOString()}`,
				day,
				gridType: 'day' as const,
			})),
		],
	},
]

const renderHorizontalGrid = (props = {}, providerProps = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			resources={[]}
			{...providerProps}
		>
			<HorizontalGrid rows={mockRows} {...props}>
				<div data-testid="grid-children">Header Content</div>
			</HorizontalGrid>
		</CalendarProvider>
	)
}

describe('HorizontalGrid', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders base structure correctly', () => {
		renderHorizontalGrid()

		expect(screen.getByTestId('horizontal-grid-scroll')).toBeInTheDocument()
		expect(screen.getByTestId('horizontal-grid-header')).toBeInTheDocument()
		expect(screen.getByTestId('horizontal-grid-body')).toBeInTheDocument()
		expect(screen.getByTestId('grid-children')).toHaveTextContent(
			'Header Content'
		)
	})

	test('renders rows and labels', () => {
		renderHorizontalGrid()
		expect(screen.getByTestId('horizontal-row-res-1')).toBeInTheDocument()
		expect(screen.getByTestId('horizontal-row-label-res-1')).toHaveTextContent(
			'Resource 1'
		)
	})

	test('renders cells in rows', () => {
		renderHorizontalGrid()

		// GridCell by default has data-testid="day-cell-{YYYY-MM-DD}"

		expect(
			screen.getByTestId(`day-cell-${mockDays[0].format('YYYY-MM-DD')}`)
		).toBeInTheDocument()

		expect(
			screen.getByTestId(`day-cell-${mockDays[1].format('YYYY-MM-DD')}`)
		).toBeInTheDocument()
	})

	test('applies custom classes', () => {
		renderHorizontalGrid({
			classes: {
				header: 'custom-header-class',
				body: 'custom-body-class',
			},
		})

		expect(screen.getByTestId('horizontal-grid-header')).toHaveClass(
			'custom-header-class'
		)
		expect(screen.getByTestId('horizontal-grid-body')).toHaveClass(
			'custom-body-class'
		)
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
		) => render(buildScrollCalendar({ orientation: 'horizontal', ...options }))

		// One row per entry, each holding the hours its business hours leave
		// visible; `asDays` puts them in one grouped column instead of one per hour.
		const buildGrid = (
			startTimes: number[],
			{ variant = 'resource', asDays = false } = {}
		) => {
			const rows = startTimes.map((startTime, index) => {
				const hours = getViewHours({
					referenceDate: dayjs(SCROLL_TEST_NOW),
					businessHours: buildBusinessHours(startTime),
					hideNonBusinessHours: true,
				})
				const groupedColumn = {
					id: 'hours',
					days: hours,
					gridType: 'hour' as const,
				}
				const hourColumns = hours.map((hour) => ({
					id: hour.toISOString(),
					day: hour,
					gridType: 'hour' as const,
				}))
				const columns = asDays ? [groupedColumn] : hourColumns
				return { id: String(index), columns }
			})
			return (
				<CalendarProvider
					initialDate={SCROLL_TEST_NOW}
					scrollTime={SCROLL_TEST_SCROLL_TIME}
					scrollToNow
					timezone="UTC"
				>
					<HorizontalGrid
						gridType="hour"
						rows={rows}
						variant={variant as 'resource' | 'regular'}
					/>
				</CalendarProvider>
			)
		}

		test('scrolls to now once the widened hours show it', () => {
			const { rerender } = renderCalendar({ startTime: 12 })
			// 09:00 is hidden, so it falls back to 07:00, clamped to the first hour.
			expect(lastScrollInHours(geometry.scrollTo)).toBe(0)

			rerender(buildScrollCalendar({ orientation: 'horizontal', startTime: 6 }))

			expect(geometry.scrollTo).toHaveBeenCalledTimes(2)
			expect(lastScrollInHours(geometry.scrollTo)).toBe(3) // 06:00 -> 09:00
		})

		test('reapplies scrollTime alone when the hours change', () => {
			const { rerender } = renderCalendar({ startTime: 12, scrollToNow: false })
			rerender(
				buildScrollCalendar({
					orientation: 'horizontal',
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
						orientation: 'horizontal',
						startTime: 6,
						hoursOn,
					})
				)

				expect(geometry.scrollTo).toHaveBeenCalledTimes(2)
			}
		)

		test('leaves the scroll alone when the hours stay equal', () => {
			const { rerender } = renderCalendar({ startTime: 6 })
			rerender(buildScrollCalendar({ orientation: 'horizontal', startTime: 6 }))

			expect(geometry.scrollTo).toHaveBeenCalledTimes(1)
		})

		test('leaves the scroll alone when a resource is added with equal hours', () => {
			const { rerender } = renderCalendar({ startTime: 6 })
			rerender(
				buildScrollCalendar({
					orientation: 'horizontal',
					startTime: 6,
					resourceCount: 2,
				})
			)

			expect(geometry.scrollTo).toHaveBeenCalledTimes(1)
		})

		test('reapplies when only a later row changes', () => {
			const { rerender } = render(buildGrid([12, 12]))
			rerender(buildGrid([12, 6]))

			expect(geometry.scrollTo).toHaveBeenCalledTimes(2)
		})

		test("reads the hours from a column's grouped days", () => {
			const { rerender } = render(buildGrid([12], { asDays: true }))
			rerender(buildGrid([6], { asDays: true }))

			expect(geometry.scrollTo).toHaveBeenCalledTimes(2)
		})

		test('never scrolls a regular grid, which does not scroll sideways', () => {
			const { rerender } = render(buildGrid([12], { variant: 'regular' }))
			rerender(buildGrid([6], { variant: 'regular' }))

			expect(geometry.scrollTo).toHaveBeenCalledTimes(0)
		})

		test('reapplies when a later day changes but the first day and week bounds stay equal', () => {
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
					orientation="horizontal"
					resources={[{ id: 'room', title: 'Room' }]}
					scrollToNow
					timezone="UTC"
				/>
			)
			const { rerender } = render(buildWeek(12))
			rerender(buildWeek(9))

			expect(geometry.scrollTo).toHaveBeenCalledTimes(2)
		})
	})

	describe('sticky insets', () => {
		// happy-dom lays nothing out, so every rect is empty. Only elements the
		// grid marks as sticky get a size, which is all the measurement reads.
		const originalRect = HTMLElement.prototype.getBoundingClientRect
		const RESOURCE_COLUMN_WIDTH = 160
		const HEADER_HEIGHT = 48

		beforeEach(() => {
			HTMLElement.prototype.getBoundingClientRect = function () {
				const side = this.getAttribute('data-sticky-inset')
				const width = side === 'left' ? RESOURCE_COLUMN_WIDTH : 0
				const height = side === 'top' ? HEADER_HEIGHT : 0
				return new DOMRect(0, 0, width, height)
			}
		})

		afterEach(() => {
			HTMLElement.prototype.getBoundingClientRect = originalRect
		})

		const published = (property: string) =>
			screen
				.getByTestId('horizontal-grid-scroll')
				.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')
				?.style.getPropertyValue(property)
		const publishedLeft = () => published('--ilamy-sticky-left')
		const publishedTop = () => published('--ilamy-sticky-top')

		test('a resource grid publishes its sticky resource column width', () => {
			renderHorizontalGrid()

			expect(publishedLeft()).toBe(`${RESOURCE_COLUMN_WIDTH}px`)
		})

		test('a regular grid has no sticky column to clear', () => {
			renderHorizontalGrid({ variant: 'regular' })

			expect(publishedLeft()).toBe('0px')
		})

		test('a resource grid publishes its sticky header height', () => {
			renderHorizontalGrid()

			expect(publishedTop()).toBe(`${HEADER_HEIGHT}px`)
		})

		test('a header that scrolls away covers nothing', () => {
			renderHorizontalGrid({}, { stickyViewHeader: false })

			expect(publishedTop()).toBe('0px')
		})
	})
})
