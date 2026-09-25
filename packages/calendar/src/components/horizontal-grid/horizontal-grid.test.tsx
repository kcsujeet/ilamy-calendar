import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
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
