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
import { cleanup, render, screen } from '@testing-library/react'
import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { getViewHours } from '@/features/calendar/utils/view-hours'
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
					orientation="horizontal"
					resources={calendarResources}
					scrollTime="09:00"
					scrollToNow={scrollToNow}
					timezone="UTC"
				/>
			)
		}

		test('reapplies when only a later row spec changes', () => {
			const buildGrid = (startTime: number) => {
				const rows = [12, startTime].map((start, index) => {
					const days = getViewHours({
						referenceDate: dayjs(date),
						businessHours: hours(start),
						hideNonBusinessHours: true,
					})
					const columns = days.map((day) => ({
						id: day.toISOString(),
						day,
						gridType: 'hour' as const,
					}))
					return { id: String(index), columns }
				})
				return (
					<CalendarProvider initialDate={date} scrollToNow timezone="UTC">
						<HorizontalGrid gridType="hour" rows={rows} />
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
				.getByTestId('horizontal-grid-scroll')
				.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')
			if (!viewport) throw new Error('missing viewport')
			viewport.scrollLeft = 123
			rerender(buildCalendar(6))
			expect(scrollSpy).toHaveBeenCalledTimes(1)
			expect(viewport.scrollLeft).toBe(123)
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
				.getByTestId('horizontal-grid-scroll')
				.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')
			if (!viewport) throw new Error('missing viewport')
			viewport.scrollLeft = 123
			rerender(buildCalendar(6, false, 'day', false))
			expect(scrollSpy).toHaveBeenCalledTimes(2)
			expect(viewport.scrollLeft).toBe(123)
		})

		test('reapplies when a later day changes but the first day and week bounds stay equal', () => {
			const buildWeek = (wednesdayStart: number) => {
				const businessHours = [
					hours(6, ['sunday']),
					hours(12, ['monday', 'tuesday', 'thursday', 'friday', 'saturday']),
					hours(wednesdayStart, ['wednesday']),
				]
				return (
					<IlamyCalendar
						businessHours={businessHours}
						events={events}
						hideNonBusinessHours
						initialDate={date}
						initialView="week"
						orientation="horizontal"
						resources={resources}
						scrollToNow
						timezone="UTC"
					/>
				)
			}
			const { rerender } = render(buildWeek(12))
			expect(scrollSpy).toHaveBeenCalledTimes(1)
			rerender(buildWeek(9))
			expect(scrollSpy).toHaveBeenCalledTimes(2)
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
