import { beforeEach, describe, expect, test } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
import {
	DAY_NUMBER_HEIGHT,
	EVENT_BAR_HEIGHT,
	GAP_BETWEEN_ELEMENTS,
} from '@/config/constants'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import {
	DragPreviewContext,
	type DragPreviewState,
} from '@/features/calendar/stores/drag-preview-context'
import type { SnapDuration } from '@/features/calendar/types'
import { keys } from '@/features/calendar/utils/keys'
import { mkDragPreview } from '@/testing/drag-test-fixtures'
import { HorizontalGridRow } from './horizontal-grid-row'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')

const mockResource: Resource = {
	id: 'res-1',
	title: 'Resource 1',
	color: 'blue',
}

const renderHorizontalGridRow = ({
	preview,
	snapDuration,
	...props
}: {
	preview?: DragPreviewState
	snapDuration?: SnapDuration
} & Record<string, unknown> = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			resources={[mockResource]}
			snapDuration={snapDuration}
		>
			<DragPreviewContext.Provider value={preview ?? null}>
				<HorizontalGridRow id="row-1" resource={mockResource} {...props} />
			</DragPreviewContext.Provider>
		</CalendarProvider>
	)
}

describe('HorizontalGridRow', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('basic rendering', () => {
		const defaultColumns = [
			{
				id: 'col-1',
				day: initialDate,
				gridType: 'day' as const,
			},
		]

		test('renders row with correct testid', () => {
			renderHorizontalGridRow({ columns: defaultColumns })
			expect(screen.getByTestId('horizontal-row-row-1')).toBeInTheDocument()
		})

		test('renders resource label for resource variant', () => {
			renderHorizontalGridRow({ variant: 'resource', columns: defaultColumns })
			expect(
				screen.getByTestId('horizontal-row-label-res-1')
			).toBeInTheDocument()
			expect(screen.getByText('Resource 1')).toBeInTheDocument()
		})

		test('does not render resource label for regular variant', () => {
			renderHorizontalGridRow({ variant: 'regular', columns: defaultColumns })
			expect(
				screen.queryByTestId('horizontal-row-label-res-1')
			).not.toBeInTheDocument()
		})
	})

	describe('hour columns', () => {
		const hourColumn = {
			id: 'col-9',
			day: initialDate.hour(9),
			gridType: 'hour' as const,
		}

		test('tell each cell time runs left to right and what it snaps to', () => {
			const { container } = renderHorizontalGridRow({
				columns: [hourColumn],
				gridType: 'hour',
				snapDuration: 15,
			})

			const cell = container.querySelector('[data-time-axis]')
			expect(cell).toHaveAttribute('data-time-axis', 'horizontal')
			expect(cell).toHaveAttribute('data-snap-minutes', '15')
		})

		test('leave a cell alone when nothing snaps finer than the hour', () => {
			const { container } = renderHorizontalGridRow({
				columns: [hourColumn],
				gridType: 'hour',
			})

			expect(container.querySelector('[data-snap-minutes]')).toBeNull()
		})
	})

	describe('flat columns (single day per column)', () => {
		test('renders grid cells for flat day columns', () => {
			const days = [initialDate, initialDate.add(1, 'day')]
			const columns = days.map((day) => ({
				id: `col-${day.toISOString()}`,
				day,
				gridType: 'day' as const,
			}))

			renderHorizontalGridRow({ columns })

			expect(
				screen.getByTestId(`day-cell-${days[0].format('YYYY-MM-DD')}`)
			).toBeInTheDocument()
			expect(
				screen.getByTestId(`day-cell-${days[1].format('YYYY-MM-DD')}`)
			).toBeInTheDocument()
		})

		test('draws cell separators via gap-px bg-border (no per-cell borders)', () => {
			const columns = [
				{
					id: 'col-1',
					day: initialDate,
					gridType: 'day' as const,
				},
			]

			const { container } = renderHorizontalGridRow({ columns })

			const cellsContainer = container.querySelector('.flex.w-full.min-w-0')
			expect(cellsContainer).toHaveClass('gap-px')
			expect(cellsContainer).toHaveClass('bg-border')

			const cell = screen.getByTestId(
				`day-cell-${initialDate.format('YYYY-MM-DD')}`
			)
			expect(cell).not.toHaveClass('border-b')
			expect(cell).not.toHaveClass('border-b-0')
		})

		test('uses gap-based separators instead of per-column right borders', () => {
			const days = [initialDate, initialDate.add(1, 'day')]
			const columns = days.map((day) => ({
				id: `col-${day.format('YYYY-MM-DD')}`,
				day,
				gridType: 'day' as const,
			}))

			const { container } = renderHorizontalGridRow({ columns })

			const cellsContainer = container.querySelector('.flex.w-full.min-w-0')
			expect(cellsContainer).toHaveClass('gap-px')
			expect(cellsContainer).toHaveClass('bg-border')

			const first = screen.getByTestId(
				`day-cell-${days[0].format('YYYY-MM-DD')}`
			)
			const last = screen.getByTestId(
				`day-cell-${days[1].format('YYYY-MM-DD')}`
			)
			expect(first).not.toHaveClass('border-r')
			expect(first).not.toHaveClass('border-r-0')
			expect(last).not.toHaveClass('border-r')
			expect(last).not.toHaveClass('border-r-0')
		})
	})

	describe('grouped columns (multiple days per column - week view)', () => {
		test('renders grid cells for grouped day columns', () => {
			// Each column contains multiple hours for a single day
			const day1Hours = [
				initialDate.hour(9).minute(0),
				initialDate.hour(10).minute(0),
				initialDate.hour(11).minute(0),
			]
			const day2Hours = [
				initialDate.add(1, 'day').hour(9).minute(0),
				initialDate.add(1, 'day').hour(10).minute(0),
				initialDate.add(1, 'day').hour(11).minute(0),
			]

			const columns = [
				{
					id: 'col-day-1',
					days: day1Hours,
					gridType: 'hour' as const,
				},
				{
					id: 'col-day-2',
					days: day2Hours,
					gridType: 'hour' as const,
				},
			]

			renderHorizontalGridRow({ columns, gridType: 'hour' })

			// Should render cells for each hour - testid format: day-cell-YYYY-MM-DD-HH-mm
			expect(
				screen.getByTestId('day-cell-2025-01-01-09-00')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('day-cell-2025-01-01-10-00')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('day-cell-2025-01-02-09-00')
			).toBeInTheDocument()
		})

		test('draws grouped column separators via gap-px bg-border (no per-cell borders)', () => {
			const day1Hours = [
				initialDate.hour(9).minute(0),
				initialDate.hour(10).minute(0),
			]
			const day2Hours = [
				initialDate.add(1, 'day').hour(9).minute(0),
				initialDate.add(1, 'day').hour(10).minute(0),
			]

			const columns = [
				{
					id: 'col-day-1',
					days: day1Hours,
					gridType: 'hour' as const,
					className: 'test-col-1',
				},
				{
					id: 'col-day-2',
					days: day2Hours,
					gridType: 'hour' as const,
					className: 'test-col-2',
				},
			]

			const { container } = renderHorizontalGridRow({
				columns,
				gridType: 'hour',
			})

			// The grouped column inner container draws the day separators.
			const groupedContainer = container.querySelector('.flex.w-full.gap-px')
			expect(groupedContainer).toHaveClass('bg-border')

			// Cells no longer carry a per-cell right border.
			const firstColCell = screen.getByTestId('day-cell-2025-01-01-09-00')
			expect(firstColCell).not.toHaveClass('border-r!')

			const lastColCell = screen.getByTestId('day-cell-2025-01-02-09-00')
			expect(lastColCell).not.toHaveClass('border-r!')
		})

		test('grouped column container has full width', () => {
			const dayHours = [
				initialDate.hour(9).minute(0),
				initialDate.hour(10).minute(0),
			]

			const columns = [
				{
					id: 'col-day-1',
					days: dayHours,
					gridType: 'hour' as const,
				},
			]

			const { container } = renderHorizontalGridRow({
				columns,
				gridType: 'hour',
			})

			// Find the grouped column container div
			const groupedContainer = container.querySelector('.flex.relative.w-full')
			expect(groupedContainer).toBeInTheDocument()
		})
	})

	describe('isGrouped detection', () => {
		test('detects grouped columns when days array is present', () => {
			const columns = [
				{
					id: 'col-grouped',
					days: [initialDate.hour(9).minute(0), initialDate.hour(10).minute(0)],
					gridType: 'hour' as const,
				},
			]

			renderHorizontalGridRow({ columns, gridType: 'hour' })

			// When grouped, events layer should be inside each column group
			// The non-grouped events layer should not be rendered
			const row = screen.getByTestId('horizontal-row-row-1')
			expect(row).toBeInTheDocument()
		})
	})

	describe('current time indicator gating', () => {
		// The events layer reads "now" from real-time `dayjs()` (no test-injection
		// prop), so the hour-grid case uses a 2-hour window starting at the current
		// hour to stay resilient against second-level timing drift during the test.
		test('mounts the indicator when gridType is "hour"', () => {
			const currentHour = dayjs().startOf('hour')
			const columns = [
				{
					id: 'gate-hour-cell-1',
					day: currentHour,
					gridType: 'hour' as const,
				},
				{
					id: 'gate-hour-cell-2',
					day: currentHour.add(1, 'hour'),
					gridType: 'hour' as const,
				},
			]

			renderHorizontalGridRow({ columns, gridType: 'hour' })

			expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()
		})

		test('does not mount the indicator when nowIndicator is off', () => {
			const currentHour = dayjs().startOf('hour')
			render(
				<CalendarProvider
					dayMaxEvents={3}
					events={[]}
					initialDate={initialDate}
					nowIndicator={false}
					resources={[mockResource]}
				>
					<HorizontalGridRow
						columns={[
							{
								id: 'off-hour-cell',
								day: currentHour,
								gridType: 'hour' as const,
							},
						]}
						gridType="hour"
						id="row-1"
						resource={mockResource}
					/>
				</CalendarProvider>
			)

			expect(
				screen.queryByTestId('current-time-indicator')
			).not.toBeInTheDocument()
		})

		test('does not mount the indicator when gridType is "day"', () => {
			const columns = [
				{
					id: 'gate-day-cell',
					day: initialDate,
					gridType: 'day' as const,
				},
			]

			renderHorizontalGridRow({ columns, gridType: 'day' })

			expect(
				screen.queryByTestId('current-time-indicator')
			).not.toBeInTheDocument()
		})
	})

	describe('event bar pixel placement (math owned by the events layer)', () => {
		// Hour-long event on the grid's day; ids double as titles.
		const mkEvent = (id: string, startHour: number): CalendarEvent => ({
			id,
			title: id,
			start: initialDate.hour(startHour).minute(0),
			end: initialDate.hour(startHour + 1).minute(0),
		})

		const renderRowWithEvents = ({
			events,
			dayNumberHeight,
			eventSpacing,
			eventHeight,
		}: {
			events: CalendarEvent[]
			dayNumberHeight?: number
			eventSpacing?: number
			eventHeight?: number
		}) => {
			const columns = [
				{ id: 'col-1', day: initialDate, gridType: 'day' as const },
			]
			return render(
				<CalendarProvider
					dayMaxEvents={4}
					eventHeight={eventHeight}
					eventSpacing={eventSpacing}
					events={events}
					initialDate={initialDate}
					resources={[]}
				>
					<HorizontalGridRow
						columns={columns}
						dayNumberHeight={dayNumberHeight}
						id="row-1"
						variant="regular"
					/>
				</CalendarProvider>
			)
		}

		const eventWrapper = (id: string) =>
			screen.getByTestId(`horizontal-event-${id}`)

		test('places the first row at default dayNumberHeight + spacing with default bar height', () => {
			renderRowWithEvents({ events: [mkEvent('a', 10)] })
			const expectedTop = DAY_NUMBER_HEIGHT + GAP_BETWEEN_ELEMENTS
			expect(eventWrapper('a').style.top).toBe(`${expectedTop}px`)
			expect(eventWrapper('a').style.height).toBe(`${EVENT_BAR_HEIGHT}px`)
		})

		test('uses the dayNumberHeight prop in the top calculation', () => {
			renderRowWithEvents({ events: [mkEvent('a', 10)], dayNumberHeight: 50 })
			expect(eventWrapper('a').style.top).toBe(`${50 + GAP_BETWEEN_ELEMENTS}px`)
		})

		test('sets the bar height from context eventHeight', () => {
			renderRowWithEvents({ events: [mkEvent('a', 10)], eventHeight: 40 })
			expect(eventWrapper('a').style.height).toBe('40px')
		})

		test('derives stacked row tops from eventHeight + eventSpacing', () => {
			renderRowWithEvents({
				events: [mkEvent('a', 10), mkEvent('b', 12)],
				eventHeight: 48,
			})
			const rowZeroTop = DAY_NUMBER_HEIGHT + GAP_BETWEEN_ELEMENTS
			const rowOneTop =
				DAY_NUMBER_HEIGHT +
				GAP_BETWEEN_ELEMENTS +
				1 * (48 + GAP_BETWEEN_ELEMENTS)
			expect(
				[eventWrapper('a'), eventWrapper('b')].map((el) => el.style.top)
			).toEqual([`${rowZeroTop}px`, `${rowOneTop}px`])
		})

		test('uses custom eventSpacing in stacked row tops', () => {
			renderRowWithEvents({
				events: [mkEvent('a', 10), mkEvent('b', 12)],
				eventSpacing: 4,
			})
			const rowZeroTop = DAY_NUMBER_HEIGHT + 4
			const rowOneTop = DAY_NUMBER_HEIGHT + 4 + 1 * (EVENT_BAR_HEIGHT + 4)
			expect(
				[eventWrapper('a'), eventWrapper('b')].map((el) => el.style.top)
			).toEqual([`${rowZeroTop}px`, `${rowOneTop}px`])
		})
	})

	describe('drag preview mirror rendering (FullCalendar / Google Calendar)', () => {
		const week = Array.from({ length: 7 }, (_, i) => initialDate.add(i, 'day'))
		const columns = [{ id: 'col-week', days: week, gridType: 'day' as const }]

		const mkPreview = (allDay: boolean) =>
			mkDragPreview({
				event: {
					id: 'event-preview',
					title: 'Multi-day Conference',
					start: initialDate,
					end: initialDate.add(3, 'day'),
					allDay,
				},
				start: initialDate,
				end: initialDate.add(3, 'day'),
				allDay,
			})

		test('renders the snapped mirror bar when the candidate overlaps the row', () => {
			renderHorizontalGridRow({
				columns,
				id: 'row-preview',
				preview: mkPreview(true),
			})

			expect(
				screen.getByTestId(keys.dragPreview('horizontal'))
			).toBeInTheDocument()
			expect(screen.getByText('Multi-day Conference')).toBeInTheDocument()
		})

		test('squares the mirror on whichever side the row cut it', () => {
			// The mirror is a bar like any other, so it has to admit the same thing
			// a real bar admits: this span continues past the edge of the row. A
			// mirror that stays fully rounded claims the drop ends inside the week.
			const spillsBothWays = mkDragPreview({
				event: {
					id: 'event-preview',
					title: 'Multi-day Conference',
					start: initialDate.subtract(2, 'day'),
					end: initialDate.add(10, 'day'),
					allDay: true,
				},
				start: initialDate.subtract(2, 'day'),
				end: initialDate.add(10, 'day'),
				allDay: true,
			})
			renderHorizontalGridRow({
				columns,
				id: 'row-preview',
				preview: spillsBothWays,
			})

			const mirror = screen.getByTestId(keys.dragPreview('horizontal'))

			expect(mirror.className).toContain('rounded-none')
		})

		test('rounds the mirror on both ends when the row holds the whole span', () => {
			renderHorizontalGridRow({
				columns,
				id: 'row-preview',
				preview: mkPreview(true),
			})

			const mirror = screen.getByTestId(keys.dragPreview('horizontal'))

			expect(mirror.className).toContain('rounded-md')
		})

		test('outlines the mirror so it cannot blend into the bars behind it', () => {
			// A fill-only mirror is invisible against a grid of same-hue bars: the
			// pastel it copies is the pastel it is standing on. The ring is drawn in
			// a theme token rather than the event's colour, so it contrasts whatever
			// the event is filled with.
			//
			// INSET, not an outside ring. Tailwind's `ring` is a box-shadow painted
			// outside the border box, and both events layers wrap their subtree in
			// `overflow-clip` — so an outside ring is cut away on every edge the
			// mirror sits flush against (its left at `left: 0%`, its bottom when the
			// span runs past the visible hours), leaving a partial outline round
			// two sides. An inset ring paints inside the box and cannot be clipped.
			renderHorizontalGridRow({
				columns,
				id: 'row-preview',
				preview: mkPreview(true),
			})

			const classes = screen
				.getByTestId(keys.dragPreview('horizontal'))
				.className.split(/\s+/)

			expect(classes).toContain('inset-ring-2')
			expect(classes).toContain('inset-ring-foreground')
			expect(classes).not.toContain('ring-2')
		})

		test('does not let the content layer paint over the outline', () => {
			// `event.color` may carry the whole fill, not just text: the playground
			// seeds `'bg-amber-100 text-amber-800'`. The card's inner layer is
			// `h-full w-full`, and an inset box-shadow paints BELOW child content —
			// so re-applying the fill there covers the outline exactly. The colour
			// belongs on the card, once; the content layer is layout only.
			const coloured = mkDragPreview({
				event: {
					id: 'event-preview',
					title: 'Multi-day Conference',
					start: initialDate,
					end: initialDate.add(3, 'day'),
					allDay: true,
					color: 'bg-amber-100 text-amber-800',
				},
				start: initialDate,
				end: initialDate.add(3, 'day'),
				allDay: true,
			})
			renderHorizontalGridRow({ columns, id: 'row-preview', preview: coloured })

			const mirror = screen.getByTestId(keys.dragPreview('horizontal'))
			const contentLayer = mirror.firstElementChild

			expect(contentLayer?.className).not.toContain('bg-')
		})

		test('draws no mirror in the all-day band for a timed candidate', () => {
			renderHorizontalGridRow({
				allDay: true,
				columns,
				id: 'row-preview',
				preview: mkPreview(false),
			})

			expect(
				screen.queryByTestId(keys.dragPreview('horizontal'))
			).not.toBeInTheDocument()
		})
	})
})

describe('day-axis row sizing', () => {
	beforeEach(cleanup)
	test('reserves a continuing event’s row after earlier rows end', () => {
		const days = Array.from({ length: 5 }, (_, index) =>
			dayjs('2025-03-10T00:00:00.000Z').add(index, 'day')
		)
		const [monday, tuesday, wednesday, , friday] = days
		const events: CalendarEvent[] = [
			{ id: 'a', title: 'a', start: monday, end: wednesday },
			{ id: 'b', title: 'b', start: monday, end: wednesday },
			{ id: 'c', title: 'c', start: tuesday, end: friday },
		]
		const columns = days.map((day, index) => ({
			id: String(index),
			day,
			gridType: 'day' as const,
		}))
		render(
			<CalendarProvider dayMaxEvents={3} events={events} initialDate={monday}>
				<HorizontalGridRow
					columns={columns}
					id="day-counts"
					variant="regular"
				/>
			</CalendarProvider>
		)
		const cell = screen.getByTestId('day-cell-2025-03-12')
		const content = cell.querySelector('[data-testid="grid-cell-content"]')
		expect(content?.children).toHaveLength(3)
		expect(
			screen.queryByRole('button', { name: /more/i })
		).not.toBeInTheDocument()
	})
})

describe('hourly row sizing and overflow', () => {
	const hours = Array.from({ length: 6 }, (_, index) =>
		dayjs('2026-10-28T07:00:00.000Z').add(index, 'hour')
	)
	const resource = { id: 'packing-room', title: 'Packing room' }
	const eventAt = (id: string, start: string, end: string): CalendarEvent => ({
		id,
		title: id,
		uid: `${id}@packing.test`,
		resourceId: resource.id,
		start: dayjs(`2026-10-28T${start}:00.000Z`),
		end: dayjs(`2026-10-28T${end}:00.000Z`),
	})
	const renderHours = (
		events: CalendarEvent[],
		limit: number,
		grouped = false
	) => {
		const columns = grouped
			? [{ id: 'group', days: hours, gridType: 'hour' as const }]
			: hours.map((day, index) => ({
					id: `hour-${index}`,
					day,
					gridType: 'hour' as const,
				}))
		return render(
			<CalendarProvider
				dayMaxEvents={limit}
				events={events}
				initialDate={hours[0]}
				resources={[resource]}
			>
				<HorizontalGridRow
					columns={columns}
					dayNumberHeight={0}
					gridType="hour"
					id="packing"
					resource={resource}
				/>
			</CalendarProvider>
		)
	}
	const contentAt = (hour: number) => {
		const day = hours[hour - 7]
		const cell = screen.getByTestId(keys.cell.day(day, day.format('HH'), '00'))
		const content = cell.querySelector('[data-testid="grid-cell-content"]')
		if (!content) throw new Error('Cell content missing')
		return content
	}

	test('counts a clipped event only where its visible suffix is missing', () => {
		renderHours(
			[eventAt('a', '07:00', '09:17'), eventAt('b', '09:16', '11:00')],
			1
		)
		expect(contentAt(9).textContent).toBe('+1 more')
		expect(contentAt(10).textContent).toBe('')
		expect(contentAt(10).children).toHaveLength(1)
	})

	for (const grouped of [false, true]) {
		test(`adjacent events use one placeholder and no false overflow (grouped=${grouped})`, () => {
			renderHours(
				[eventAt('a', '09:01', '09:17'), eventAt('b', '09:17', '09:59')],
				1,
				grouped
			)
			expect(screen.getAllByTestId(/^horizontal-event-/)).toHaveLength(2)
			expect(contentAt(9).children).toHaveLength(1)
			expect(
				screen.queryByRole('button', { name: /More/i })
			).not.toBeInTheDocument()
		})

		test(`counts only genuinely hidden events (grouped=${grouped})`, () => {
			renderHours(
				[
					eventAt('a', '09:01', '09:17'),
					eventAt('b', '09:17', '09:59'),
					eventAt('hidden', '09:18', '09:45'),
				],
				1,
				grouped
			)
			expect(screen.getAllByTestId(/^horizontal-event-/)).toHaveLength(2)
			expect(
				screen.getByRole('button', { name: '+1 more' })
			).toBeInTheDocument()
		})

		test(`reserves the highest occupied row even with only one event in a cell (grouped=${grouped})`, () => {
			renderHours(
				[
					eventAt('a', '07:00', '09:17'),
					eventAt('b', '07:00', '09:17'),
					eventAt('c', '08:00', '11:00'),
				],
				3,
				grouped
			)
			expect(contentAt(10).children).toHaveLength(3)
		})
	}
})
