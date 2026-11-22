import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import { add, dayKey, parseDate, toOffsetIso } from '@ilamy/utils/temporal'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/app/calendar-provider'
import {
	buildScrollWeek,
	getVisibleHours,
	MID_BUSINESS_START_HOUR,
	NARROW_BUSINESS_START_HOUR,
	ScrollTestProvider,
	setUpScrollGeometry,
	testScrollingWhenHoursChange,
	WIDE_BUSINESS_START_HOUR,
} from '@/testing/scroll-test-fixtures'
import { HorizontalGrid } from './horizontal-grid'

const atUtc = (iso: string) => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const initialZoned = atUtc('2025-01-01T00:00:00.000Z')
const initialDate = toOffsetIso(initialZoned)
const mockZonedDays = [initialZoned, add(initialZoned, 1, 'day')]
const mockDays = mockZonedDays.map(toOffsetIso)

const mockRows = [
	{
		id: 'res-1',
		title: 'Resource 1',
		resource: { id: 'res-1', title: 'Resource 1', color: 'blue' },
		columns: [
			{
				id: 'label-col',
				day: '2025-02-01T00:00:00+00:00',
				gridType: 'day' as const,
				renderCell: ({ resource }: { resource?: Resource }) => (
					<div data-testid={`horizontal-row-label-${resource?.id}`}>
						{resource?.title}
					</div>
				),
			},
			...mockDays.map((day) => ({
				id: `col-${day}`,
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
			timezone="UTC"
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

		expect(
			screen.getByTestId(
				`day-cell-${dayKey(mockZonedDays.at(0) ?? initialZoned)}`
			)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(
				`day-cell-${dayKey(mockZonedDays.at(1) ?? initialZoned)}`
			)
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
					id: hour,
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
			const { rerender } = render(
				buildGrid([NARROW_BUSINESS_START_HOUR, NARROW_BUSINESS_START_HOUR])
			)
			rerender(
				buildGrid([NARROW_BUSINESS_START_HOUR, WIDE_BUSINESS_START_HOUR])
			)

			expect(getScrollTo()).toHaveBeenCalledTimes(2)
		})

		test("reads the hours from a column's grouped days", () => {
			const { rerender } = render(
				buildGrid([NARROW_BUSINESS_START_HOUR], { asDays: true })
			)
			rerender(buildGrid([WIDE_BUSINESS_START_HOUR], { asDays: true }))

			expect(getScrollTo()).toHaveBeenCalledTimes(2)
		})

		test('reads a row without columns as holding no hours', () => {
			render(
				<ScrollTestProvider>
					<HorizontalGrid gridType="hour" rows={[{ id: 'bare' }]} />
				</ScrollTestProvider>
			)

			expect(getScrollTo()).toHaveBeenLastCalledWith({
				left: 0,
				behavior: 'auto',
			})
		})

		test('never scrolls a regular grid, which does not scroll sideways', () => {
			const { rerender } = render(
				buildGrid([NARROW_BUSINESS_START_HOUR], { variant: 'regular' })
			)
			rerender(buildGrid([WIDE_BUSINESS_START_HOUR], { variant: 'regular' }))

			expect(getScrollTo()).toHaveBeenCalledTimes(0)
		})

		test("reapplies when a later day's hours change", () => {
			const { rerender } = render(
				buildScrollWeek('horizontal', NARROW_BUSINESS_START_HOUR)
			)
			rerender(buildScrollWeek('horizontal', MID_BUSINESS_START_HOUR))

			expect(getScrollTo()).toHaveBeenCalledTimes(2)
		})
	})

	describe('sticky insets', () => {
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
