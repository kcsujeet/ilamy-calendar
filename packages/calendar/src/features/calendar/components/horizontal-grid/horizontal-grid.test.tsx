import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import {
	buildScrollWeek,
	getVisibleHours,
	NARROW_START,
	ScrollTestProvider,
	setUpScrollGeometry,
	testScrollingWhenHoursChange,
	WIDE_START,
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
		const getScrollTo = setUpScrollGeometry()

		testScrollingWhenHoursChange('horizontal', getScrollTo)

		// One row per entry, holding the hours it opens at; `asDays` puts them in
		// one grouped column instead of one column per hour.
		const buildGrid = (
			startTimes: number[],
			{
				variant = 'resource',
				asDays = false,
			}: { variant?: 'resource' | 'regular'; asDays?: boolean } = {}
		) => {
			const rows = startTimes.map((startTime, index) => {
				const hours = getVisibleHours(startTime)
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
				<ScrollTestProvider>
					<HorizontalGrid gridType="hour" rows={rows} variant={variant} />
				</ScrollTestProvider>
			)
		}

		test('reapplies when only a later row changes', () => {
			const { rerender } = render(buildGrid([NARROW_START, NARROW_START]))
			rerender(buildGrid([NARROW_START, WIDE_START]))

			expect(getScrollTo()).toHaveBeenCalledTimes(2)
		})

		test("reads the hours from a column's grouped days", () => {
			const { rerender } = render(buildGrid([NARROW_START], { asDays: true }))
			rerender(buildGrid([WIDE_START], { asDays: true }))

			expect(getScrollTo()).toHaveBeenCalledTimes(2)
		})

		test('never scrolls a regular grid, which does not scroll sideways', () => {
			const { rerender } = render(
				buildGrid([NARROW_START], { variant: 'regular' })
			)
			rerender(buildGrid([WIDE_START], { variant: 'regular' }))

			expect(getScrollTo()).toHaveBeenCalledTimes(0)
		})

		// A horizontal week lays each day's own hours out side by side, so
		// Wednesday opening earlier adds columns even though Sunday already
		// opens at six.
		test("reapplies when a later day's hours change", () => {
			const { rerender } = render(buildScrollWeek('horizontal', NARROW_START))
			rerender(buildScrollWeek('horizontal', 9))

			expect(getScrollTo()).toHaveBeenCalledTimes(2)
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
