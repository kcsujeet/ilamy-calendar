import { beforeEach, describe, expect, test } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import {
	add,
	dayKey,
	now,
	parseDate,
	startOf,
	subtract,
	toOffsetIso,
	withTime,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/app/calendar-provider'
import {
	DAY_NUMBER_HEIGHT,
	EVENT_BAR_HEIGHT,
	GAP_BETWEEN_ELEMENTS,
} from '@/config/constants'
import {
	DragPreviewContext,
	type DragPreviewState,
} from '@/stores/drag-preview-context'
import { mkDragPreview } from '@/testing/drag-test-fixtures'
import type { SnapDuration } from '@/types/calendar.types'
import { keys } from '@/utils/keys.utils'
import { HorizontalGridRow } from './horizontal-grid-row'

const atUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const initialZoned = atUtc('2025-01-01T00:00:00.000Z')
const initialDate = toOffsetIso(initialZoned)

const mockResource: Resource = {
	id: 'res-1',
	title: 'Resource 1',
	color: 'blue',
}

const renderHorizontalGridRow = ({
	preview,
	snapDuration,
	nowIndicator,
	...props
}: {
	preview?: DragPreviewState
	snapDuration?: SnapDuration
	nowIndicator?: boolean
} & Record<string, unknown> = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			nowIndicator={nowIndicator}
			resources={[mockResource]}
			snapDuration={snapDuration}
			timezone="UTC"
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
			day: toOffsetIso(withTime(initialZoned, { hour: 9 })),
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
			const days = [initialZoned, add(initialZoned, 1, 'day')]
			const columns = days.map((day) => ({
				id: `col-${toOffsetIso(day)}`,
				day: toOffsetIso(day),
				gridType: 'day' as const,
			}))

			renderHorizontalGridRow({ columns })

			expect(screen.getByTestId('day-cell-2025-01-01')).toBeInTheDocument()
			expect(screen.getByTestId('day-cell-2025-01-02')).toBeInTheDocument()
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

			const cell = screen.getByTestId('day-cell-2025-01-01')
			expect(cell).not.toHaveClass('border-b')
			expect(cell).not.toHaveClass('border-b-0')
		})

		test('uses gap-based separators instead of per-column right borders', () => {
			const days = [initialZoned, add(initialZoned, 1, 'day')]
			const columns = days.map((day) => ({
				id: `col-${dayKey(day)}`,
				day: toOffsetIso(day),
				gridType: 'day' as const,
			}))

			const { container } = renderHorizontalGridRow({ columns })

			const cellsContainer = container.querySelector('.flex.w-full.min-w-0')
			expect(cellsContainer).toHaveClass('gap-px')
			expect(cellsContainer).toHaveClass('bg-border')

			const first = screen.getByTestId('day-cell-2025-01-01')
			const last = screen.getByTestId('day-cell-2025-01-02')
			expect(first).not.toHaveClass('border-r')
			expect(first).not.toHaveClass('border-r-0')
			expect(last).not.toHaveClass('border-r')
			expect(last).not.toHaveClass('border-r-0')
		})
	})

	describe('grouped columns (multiple days per column - week view)', () => {
		test('renders grid cells for grouped day columns', () => {
			const day1Hours = [9, 10, 11].map((hour) =>
				toOffsetIso(withTime(initialZoned, { hour, minute: 0 }))
			)
			const day2 = add(initialZoned, 1, 'day')
			const day2Hours = [9, 10, 11].map((hour) =>
				toOffsetIso(withTime(day2, { hour, minute: 0 }))
			)

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
			const day1Hours = [9, 10].map((hour) =>
				toOffsetIso(withTime(initialZoned, { hour, minute: 0 }))
			)
			const day2 = add(initialZoned, 1, 'day')
			const day2Hours = [9, 10].map((hour) =>
				toOffsetIso(withTime(day2, { hour, minute: 0 }))
			)

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

			const groupedContainer = container.querySelector('.flex.w-full.gap-px')
			expect(groupedContainer).toHaveClass('bg-border')

			const firstColCell = screen.getByTestId('day-cell-2025-01-01-09-00')
			expect(firstColCell).not.toHaveClass('border-r!')

			const lastColCell = screen.getByTestId('day-cell-2025-01-02-09-00')
			expect(lastColCell).not.toHaveClass('border-r!')
		})

		test('grouped column container has full width', () => {
			const dayHours = [9, 10].map((hour) =>
				toOffsetIso(withTime(initialZoned, { hour, minute: 0 }))
			)

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

			const groupedContainer = container.querySelector('.flex.relative.w-full')
			expect(groupedContainer).toBeInTheDocument()
		})
	})

	describe('isGrouped detection', () => {
		test('detects grouped columns when days array is present', () => {
			const columns = [
				{
					id: 'col-grouped',
					days: [9, 10].map((hour) =>
						toOffsetIso(withTime(initialZoned, { hour, minute: 0 }))
					),
					gridType: 'hour' as const,
				},
			]

			renderHorizontalGridRow({ columns, gridType: 'hour' })

			const row = screen.getByTestId('horizontal-row-row-1')
			expect(row).toBeInTheDocument()
		})
	})

	describe('current time indicator gating (D3)', () => {
		test('does not mount the indicator by default because nowIndicator defaults to false', () => {
			const currentHour = startOf(now('UTC'), 'hour')
			const columns = [
				{
					id: 'gate-hour-cell-1',
					day: toOffsetIso(currentHour),
					gridType: 'hour' as const,
				},
				{
					id: 'gate-hour-cell-2',
					day: toOffsetIso(add(currentHour, 1, 'hour')),
					gridType: 'hour' as const,
				},
			]

			renderHorizontalGridRow({ columns, gridType: 'hour' })

			expect(
				screen.queryByTestId('current-time-indicator')
			).not.toBeInTheDocument()
		})

		test('mounts the indicator when gridType is "hour" and nowIndicator is true', () => {
			const currentHour = startOf(now('UTC'), 'hour')
			const columns = [
				{
					id: 'gate-hour-cell-1',
					day: toOffsetIso(currentHour),
					gridType: 'hour' as const,
				},
				{
					id: 'gate-hour-cell-2',
					day: toOffsetIso(add(currentHour, 1, 'hour')),
					gridType: 'hour' as const,
				},
			]

			renderHorizontalGridRow({
				columns,
				gridType: 'hour',
				nowIndicator: true,
			})

			expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()
		})

		test('does not mount the indicator when nowIndicator is off', () => {
			const currentHour = startOf(now('UTC'), 'hour')
			renderHorizontalGridRow({
				columns: [
					{
						id: 'off-hour-cell',
						day: toOffsetIso(currentHour),
						gridType: 'hour' as const,
					},
				],
				gridType: 'hour',
				nowIndicator: false,
			})

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

			renderHorizontalGridRow({
				columns,
				gridType: 'day',
				nowIndicator: true,
			})

			expect(
				screen.queryByTestId('current-time-indicator')
			).not.toBeInTheDocument()
		})
	})

	describe('event bar pixel placement (math owned by the events layer)', () => {
		const mkEvent = (id: string, startHour: number): CalendarEvent => ({
			id,
			title: id,
			start: toOffsetIso(
				withTime(initialZoned, { hour: startHour, minute: 0 })
			),
			end: toOffsetIso(
				withTime(initialZoned, { hour: startHour + 1, minute: 0 })
			),
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
					timezone="UTC"
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
		const week = Array.from({ length: 7 }, (_, i) =>
			toOffsetIso(add(initialZoned, i, 'day'))
		)
		const columns = [{ id: 'col-week', days: week, gridType: 'day' as const }]

		const mkPreview = (allDay: boolean) => {
			const endZoned = add(initialZoned, 3, 'day')
			return mkDragPreview({
				event: {
					id: 'event-preview',
					title: 'Multi-day Conference',
					start: initialDate,
					end: toOffsetIso(endZoned),
					allDay,
				},
				start: initialZoned,
				end: endZoned,
				allDay,
			})
		}

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
			const startZoned = subtract(initialZoned, 2, 'day')
			const endZoned = add(initialZoned, 10, 'day')
			const spillsBothWays = mkDragPreview({
				event: {
					id: 'event-preview',
					title: 'Multi-day Conference',
					start: toOffsetIso(startZoned),
					end: toOffsetIso(endZoned),
					allDay: true,
				},
				start: startZoned,
				end: endZoned,
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
			const endZoned = add(initialZoned, 3, 'day')
			const coloured = mkDragPreview({
				event: {
					id: 'event-preview',
					title: 'Multi-day Conference',
					start: initialDate,
					end: toOffsetIso(endZoned),
					allDay: true,
					color: 'bg-amber-100 text-amber-800',
				},
				start: initialZoned,
				end: endZoned,
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
		const base = atUtc('2025-03-10T00:00:00.000Z')
		const days = Array.from({ length: 5 }, (_, index) =>
			toOffsetIso(add(base, index, 'day'))
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
			<CalendarProvider
				dayMaxEvents={3}
				events={events}
				initialDate={monday}
				timezone="UTC"
			>
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
	beforeEach(cleanup)
	const base = atUtc('2026-10-28T07:00:00.000Z')
	const hourZoned = Array.from({ length: 6 }, (_, index) =>
		add(base, index, 'hour')
	)
	const hours = hourZoned.map(toOffsetIso)
	const resource = { id: 'packing-room', title: 'Packing room' }
	const eventAt = (id: string, start: string, end: string): CalendarEvent => ({
		id,
		title: id,
		uid: `${id}@packing.test`,
		resourceId: resource.id,
		start: `2026-10-28T${start}:00+00:00`,
		end: `2026-10-28T${end}:00+00:00`,
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
				initialDate={hours.at(0)}
				resources={[resource]}
				timezone="UTC"
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
		const day = hourZoned.at(hour - 7) ?? base
		const cell = screen.getByTestId(
			keys.cell.day(day, String(day.hour).padStart(2, '0'), '00')
		)
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
				[eventAt('a', '09:01', '09:25'), eventAt('b', '09:25', '09:59')],
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
					eventAt('a', '09:01', '09:25'),
					eventAt('b', '09:25', '09:59'),
					eventAt('hidden', '09:26', '09:45'),
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
