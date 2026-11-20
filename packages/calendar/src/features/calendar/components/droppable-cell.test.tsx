import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { yearPlugin } from '@ilamy/calendar-year'
import type { Resource } from '@ilamy/types'
import {
	add,
	parseDate,
	startOf,
	toOffsetIso,
	toUtcIso,
	withTime,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import {
	DragPreviewContext,
	type DragPreviewState,
} from '@/features/calendar/stores/drag-preview-context'
import type { CellInfo, SnapDuration } from '@/features/calendar/types'
import { mkDragPreview as mkPreview } from '@/testing/drag-test-fixtures'
import type { CalendarView } from '@/types'
import type { DropColumnData } from './drag-and-drop/dnd-utils'
import { DroppableCell, SlotCell } from './droppable-cell'

const at = (iso: string, zone = 'UTC'): ZonedDate => {
	const parsed = parseDate(iso, zone)
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const initialDate = at('2025-01-01T00:00:00.000Z')
const initialDateIso = toOffsetIso(initialDate)

interface RenderCellOptions {
	// Calendar (provider) props
	view?: CalendarView
	isCellDisabled?: (info: CellInfo) => boolean
	getCellClassName?: (info: CellInfo) => string
	onCellClick?: (info: CellInfo) => void
	resources?: Resource[]
	snapDuration?: SnapDuration
	/** The calendar's `timezone` prop. */
	timezone?: string
	// Cell props
	date?: ZonedDate
	hour?: number
	minute?: number
	slotDurationMinutes?: number
	axis?: 'vertical' | 'horizontal'
	resourceId?: string | number
	allDay?: boolean
	/** The in-flight drag this cell should react to, if any. */
	preview?: DragPreviewState
	isSubDivider?: boolean
	shaded?: boolean
}

const renderCell = (opts: RenderCellOptions = {}) =>
	render(
		<CalendarProvider
			dayMaxEvents={3}
			getCellClassName={opts.getCellClassName}
			initialDate={initialDateIso}
			initialView={opts.view ?? 'month'}
			isCellDisabled={opts.isCellDisabled}
			onCellClick={opts.onCellClick}
			plugins={[yearPlugin()]}
			resources={opts.resources}
			snapDuration={opts.snapDuration}
			timezone={opts.timezone ?? 'UTC'}
		>
			<DragPreviewContext.Provider value={opts.preview ?? null}>
				<DroppableCell
					allDay={opts.allDay}
					axis={opts.axis}
					data-testid="cell"
					date={opts.date ?? initialDate}
					hour={opts.hour}
					isSubDivider={opts.isSubDivider}
					minute={opts.minute}
					resourceId={opts.resourceId}
					shaded={opts.shaded}
					slotDurationMinutes={opts.slotDurationMinutes ?? 15}
					type="day-cell"
				/>
			</DragPreviewContext.Provider>
		</CalendarProvider>
	)

describe('DroppableCell data-view attribute', () => {
	beforeEach(() => {
		cleanup()
	})

	const views: CalendarView[] = ['month', 'week', 'day', 'year']

	test.each(views)(
		'should render data-view="%s" attribute from context',
		(view) => {
			renderCell({ view })

			expect(screen.getByTestId('cell').getAttribute('data-view')).toBe(view)
		}
	)
})

describe('DroppableCell sub-hour divider hook', () => {
	beforeEach(() => {
		cleanup()
	})

	test('marks a cell that draws the dashed divider', () => {
		renderCell({ isSubDivider: true })

		expect(screen.getByTestId('cell')).toHaveAttribute(
			'data-slot-divider',
			'true'
		)
	})

	test('leaves a cell that draws no divider unmarked', () => {
		renderCell()

		expect(screen.getByTestId('cell')).not.toHaveAttribute('data-slot-divider')
	})
})

describe('DroppableCell snap size', () => {
	beforeEach(() => {
		cleanup()
	})

	test('names the snap size and the time axis of a cell with a finer snap', () => {
		renderCell({
			hour: 9,
			slotDurationMinutes: 60,
			snapDuration: 15,
			axis: 'horizontal',
		})

		const cell = screen.getByTestId('cell')
		expect(cell).toHaveAttribute('data-snap-minutes', '15')
		expect(cell).toHaveAttribute('data-time-axis', 'horizontal')
	})

	test('resolves the snap against the cell: a 30-minute slot snaps to 15', () => {
		renderCell({
			hour: 9,
			minute: 30,
			slotDurationMinutes: 30,
			snapDuration: 15,
			axis: 'vertical',
		})

		expect(screen.getByTestId('cell')).toHaveAttribute(
			'data-snap-minutes',
			'15'
		)
	})

	test.each([
		['no snap is set', 60, undefined] as const,
		['the snap is as large as the cell', 30, 30] as const,
		['the snap is coarser than the cell', 15, 30] as const,
	])('says nothing about snapping when %s', (_label, slot, snapDuration) => {
		renderCell({
			hour: 9,
			minute: 0,
			slotDurationMinutes: slot,
			snapDuration,
			axis: 'vertical',
		})

		const cell = screen.getByTestId('cell')
		expect(cell).not.toHaveAttribute('data-snap-minutes')
		expect(cell).not.toHaveAttribute('data-time-axis')
	})

	test('says nothing about snapping on a day cell', () => {
		renderCell({ snapDuration: 15 })

		expect(screen.getByTestId('cell')).not.toHaveAttribute('data-snap-minutes')
	})
})

describe('DroppableCell isCellDisabled (issue #79) & shaded (4.0.5)', () => {
	beforeEach(() => {
		cleanup()
	})

	test('marks the cell disabled when isCellDisabled returns true', () => {
		renderCell({ isCellDisabled: () => true })

		expect(screen.getByTestId('cell').getAttribute('data-disabled')).toBe(
			'true'
		)
	})

	test('leaves the cell enabled when isCellDisabled returns false', () => {
		renderCell({ isCellDisabled: () => false })

		expect(screen.getByTestId('cell').getAttribute('data-disabled')).toBe(
			'false'
		)
	})

	test('shaded cells mark data-non-business="true" while remaining clickable', () => {
		const onCellClick = mock()
		renderCell({ shaded: true, onCellClick })

		const cell = screen.getByTestId('cell')
		expect(cell.getAttribute('data-non-business')).toBe('true')
		expect(cell.getAttribute('data-disabled')).toBe('false')

		fireEvent.click(cell)
		expect(onCellClick).toHaveBeenCalledTimes(1)
	})

	test('does not call onCellClick when the cell is disabled', () => {
		const onCellClick = mock()
		renderCell({ isCellDisabled: () => true, onCellClick })

		fireEvent.click(screen.getByTestId('cell'))

		expect(onCellClick).toHaveBeenCalledTimes(0)
	})

	test('calls onCellClick when the cell is not disabled', () => {
		const onCellClick = mock()
		renderCell({ isCellDisabled: () => false, onCellClick })

		fireEvent.click(screen.getByTestId('cell'))

		expect(onCellClick).toHaveBeenCalledTimes(1)
	})

	test('passes the cell start/end range and allDay=true in month view to isCellDisabled (D11)', () => {
		let received: CellInfo | undefined
		renderCell({
			isCellDisabled: (info) => {
				received = info
				return false
			},
		})

		expect(received?.start).toBe('2025-01-01T00:00:00+00:00')
		expect(received?.end).toBe('2025-01-02T00:00:00+00:00')
		expect(received?.allDay).toBe(true)
	})

	test('regular calendar leaves info.resource undefined', () => {
		let received: CellInfo | undefined
		renderCell({
			isCellDisabled: (info) => {
				received = info
				return false
			},
		})

		expect(received?.resource).toBeUndefined()
	})

	test('resource calendar resolves the full resource into info.resource', () => {
		const room: Resource = { id: 'room-a', title: 'Conference Room A' }
		let received: CellInfo | undefined

		renderCell({
			isCellDisabled: (info) => {
				received = info
				return false
			},
			resources: [room],
			resourceId: 'room-a',
		})

		expect(received?.resource).toEqual(room)
		expect(received?.resource?.id).toBe('room-a')
	})
})

describe('DroppableCell self-describing attributes (drag-create)', () => {
	beforeEach(() => {
		cleanup()
	})

	test('exposes a full-day range on a day cell (no hour)', () => {
		renderCell()

		const cell = screen.getByTestId('cell')
		expect(cell.getAttribute('data-start')).toBe(
			toUtcIso(startOf(initialDate, 'day'))
		)
		expect(cell.getAttribute('data-end')).toBe(
			toUtcIso(startOf(add(initialDate, 1, 'day'), 'day'))
		)
	})

	test('exposes a one-hour range on an hour cell', () => {
		renderCell({ hour: 9 })

		const cell = screen.getByTestId('cell')
		expect(cell.getAttribute('data-start')).toBe(
			toUtcIso(withTime(initialDate, { hour: 9, minute: 0 }))
		)
		expect(cell.getAttribute('data-end')).toBe(
			toUtcIso(withTime(initialDate, { hour: 10, minute: 0 }))
		)
	})

	test('exposes a 15-minute range on a minute cell', () => {
		renderCell({ hour: 9, minute: 15 })

		const cell = screen.getByTestId('cell')
		expect(cell.getAttribute('data-start')).toBe(
			toUtcIso(withTime(initialDate, { hour: 9, minute: 15 }))
		)
		expect(cell.getAttribute('data-end')).toBe(
			toUtcIso(withTime(initialDate, { hour: 9, minute: 30 }))
		)
	})

	test('honors slotDurationMinutes on a minute cell', () => {
		renderCell({ hour: 9, minute: 30, slotDurationMinutes: 30 })

		const cell = screen.getByTestId('cell')
		expect(cell.getAttribute('data-start')).toBe(
			toUtcIso(withTime(initialDate, { hour: 9, minute: 30 }))
		)
		expect(cell.getAttribute('data-end')).toBe(
			toUtcIso(withTime(initialDate, { hour: 10, minute: 0 }))
		)
	})

	test('exposes data-resource-id when the cell has a resourceId', () => {
		renderCell({ resourceId: 'room-a' })

		expect(screen.getByTestId('cell').getAttribute('data-resource-id')).toBe(
			'room-a'
		)
	})

	test('omits data-resource-id when the cell has no resource', () => {
		renderCell()

		expect(screen.getByTestId('cell').hasAttribute('data-resource-id')).toBe(
			false
		)
	})

	test('exposes data-all-day="true" on an all-day cell and on a month day cell (D11)', () => {
		renderCell({ allDay: true, view: 'week' })
		expect(screen.getByTestId('cell').getAttribute('data-all-day')).toBe('true')

		cleanup()
		renderCell({ view: 'month' })
		expect(screen.getByTestId('cell').getAttribute('data-all-day')).toBe('true')
	})

	test('omits data-all-day on a timed cell', () => {
		renderCell({ hour: 9, view: 'week' })

		expect(screen.getByTestId('cell').hasAttribute('data-all-day')).toBe(false)
	})
})

describe('DroppableCell all-day range across the 2025 clock changes', () => {
	beforeEach(() => {
		cleanup()
	})

	const clockChanges = [
		{ zone: 'America/New_York', changeDay: '2025-03-09' },
		{ zone: 'America/New_York', changeDay: '2025-11-02' },
		{ zone: 'Europe/London', changeDay: '2025-03-30' },
		{ zone: 'Europe/London', changeDay: '2025-10-26' },
		{ zone: 'Australia/Sydney', changeDay: '2025-04-06' },
		{ zone: 'Australia/Sydney', changeDay: '2025-10-05' },
	]

	for (const { zone, changeDay } of clockChanges) {
		test(`each day within three of ${changeDay} in ${zone} runs midnight to midnight`, () => {
			const reported: string[][] = []
			const expected: string[][] = []
			const anchorNoon = at(`${changeDay}T12:00:00`, zone)
			for (const offset of [-3, -2, -1, 0, 1, 2, 3]) {
				const dayNoon = add(anchorNoon, offset, 'day')
				const dayStart = startOf(dayNoon, 'day')
				const nextDayStart = startOf(add(dayStart, 1, 'day'), 'day')
				expected.push([toUtcIso(dayStart), toUtcIso(nextDayStart)])
				cleanup()
				renderCell({
					date: withTime(dayNoon, { hour: 12, minute: 34, second: 56 }),
					timezone: zone,
				})
				const cell = screen.getByTestId('cell')
				reported.push([
					cell.getAttribute('data-start') ?? '',
					cell.getAttribute('data-end') ?? '',
				])
			}
			expect(reported).toEqual(expected)
		})
	}
})

describe('DroppableCell getCellClassName', () => {
	beforeEach(() => {
		cleanup()
	})

	test('applies the class returned by getCellClassName', () => {
		renderCell({ getCellClassName: () => 'bg-amber-100' })

		expect(screen.getByTestId('cell')).toHaveClass('bg-amber-100')
	})

	test('does not block onCellClick when only getCellClassName marks a cell', () => {
		const onCellClick = mock()
		renderCell({ getCellClassName: () => 'bg-amber-100', onCellClick })

		fireEvent.click(screen.getByTestId('cell'))

		expect(onCellClick).toHaveBeenCalledTimes(1)
		expect(screen.getByTestId('cell').getAttribute('data-disabled')).toBe(
			'false'
		)
	})

	test('passes the cell start/end range to getCellClassName', () => {
		let received: CellInfo | undefined
		renderCell({
			getCellClassName: (info) => {
				received = info
				return ''
			},
		})

		expect(received?.start).toBe('2025-01-01T00:00:00+00:00')
		expect(received?.end).toBe('2025-01-02T00:00:00+00:00')
	})
})

describe('DroppableCell drag preview highlight (FullCalendar / Google Calendar)', () => {
	beforeEach(() => {
		cleanup()
	})

	test('highlights a cell the candidate covers', () => {
		renderCell({ preview: mkPreview(), hour: 10, minute: 30, view: 'week' })

		expect(screen.getByTestId('cell')).toHaveAttribute(
			'data-drop-target',
			'true'
		)
	})

	test("tints the target in FullCalendar's own highlight colour", () => {
		renderCell({ preview: mkPreview(), hour: 10, minute: 30, view: 'week' })

		const highlight = screen.getByTestId('cell').firstElementChild

		expect(highlight).toHaveStyle({
			backgroundColor: 'rgba(188, 232, 241, 0.3)',
		})
	})

	test('tints a disabled cell the candidate spans across', () => {
		renderCell({
			preview: mkPreview(),
			hour: 10,
			minute: 30,
			view: 'week',
			isCellDisabled: () => true,
		})

		const highlight = screen.getByTestId('cell').firstElementChild

		expect(highlight).toHaveStyle({
			backgroundColor: 'rgba(188, 232, 241, 0.3)',
		})
	})

	test('leaves a cell the candidate does not cover unpainted', () => {
		renderCell({ preview: mkPreview(), hour: 14, minute: 0, view: 'week' })

		expect(screen.getByTestId('cell').children).toHaveLength(0)
	})

	test('leaves a cell outside the candidate alone', () => {
		renderCell({ preview: mkPreview(), hour: 14, minute: 0, view: 'week' })

		expect(screen.getByTestId('cell')).not.toHaveAttribute('data-drop-target')
	})

	test('leaves the cell starting exactly at the candidate end alone', () => {
		renderCell({ preview: mkPreview(), hour: 12, minute: 0, view: 'week' })

		expect(screen.getByTestId('cell')).not.toHaveAttribute('data-drop-target')
	})

	test('leaves the cell ending exactly at the candidate start alone', () => {
		const preview = mkPreview({
			start: withTime(initialDate, { hour: 10, minute: 15 }),
			end: withTime(initialDate, { hour: 12 }),
		})
		renderCell({ preview, hour: 10, minute: 0, view: 'week' })

		expect(screen.getByTestId('cell')).not.toHaveAttribute('data-drop-target')
	})

	test('leaves cells of another resource alone', () => {
		renderCell({
			preview: mkPreview({ resourceId: 'room-a' }),
			hour: 10,
			minute: 30,
			resourceId: 'room-b',
			view: 'week',
		})

		expect(screen.getByTestId('cell')).not.toHaveAttribute('data-drop-target')
	})

	test('leaves the all-day cell alone while a timed event is dragged', () => {
		renderCell({ preview: mkPreview(), allDay: true, view: 'week' })

		expect(screen.getByTestId('cell')).not.toHaveAttribute('data-drop-target')
	})

	test('highlights the all-day cell while an all-day event is dragged', () => {
		const preview = mkPreview({
			start: startOf(initialDate, 'day'),
			end: startOf(add(initialDate, 1, 'day'), 'day'),
			allDay: true,
		})
		renderCell({ preview, allDay: true, view: 'week' })

		expect(screen.getByTestId('cell')).toHaveAttribute(
			'data-drop-target',
			'true'
		)
	})
})

describe('SlotCell (a slot of a time column)', () => {
	beforeEach(() => {
		cleanup()
	})

	const renderSlot = (dragPreview: DragPreviewState | null = null) => {
		const slots: DropColumnData['slots'] = [undefined, undefined, undefined]
		render(
			<CalendarProvider
				initialDate={initialDateIso}
				initialView="week"
				timezone="UTC"
			>
				<SlotCell
					data-testid="slot"
					date={withTime(initialDate, { hour: 10, minute: 30 })}
					dragPreview={dragPreview}
					hour={10}
					minute={30}
					slotDurationMinutes={30}
					slotIndex={2}
					slots={slots}
					type="day-cell"
				/>
			</CalendarProvider>
		)
		return slots
	}

	test('publishes what a drop reads at its place in the column', () => {
		const slots = renderSlot()

		expect(
			slots.map((slot) => slot && [slot.data.hour, slot.data.minute])
		).toEqual([undefined, undefined, [10, 30]])
	})

	test('publishes the element it is drawn as, which is where a drop finds it', () => {
		const slots = renderSlot()

		expect(slots.at(2)?.element).toBe(screen.getByTestId('slot'))
	})

	test('publishes that it refuses drops when it is disabled', () => {
		const slots: DropColumnData['slots'] = [undefined]
		render(
			<CalendarProvider
				initialDate={initialDateIso}
				initialView="week"
				isCellDisabled={() => true}
				timezone="UTC"
			>
				<SlotCell
					date={withTime(initialDate, { hour: 10 })}
					dragPreview={null}
					hour={10}
					minute={0}
					slotDurationMinutes={30}
					slotIndex={0}
					slots={slots}
					type="day-cell"
				/>
			</CalendarProvider>
		)

		expect(slots.at(0)?.data.disabled).toBe(true)
	})

	test('keeps the attributes of a droppable cell', () => {
		renderSlot()

		expect(screen.getByTestId('slot')).toHaveAttribute(
			'data-start',
			'2025-01-01T10:30:00.000Z'
		)
	})

	test('tints when the drag it is given lands on it', () => {
		renderSlot(mkPreview())

		expect(screen.getByTestId('slot')).toHaveAttribute(
			'data-drop-target',
			'true'
		)
	})

	test('is not tinted when it is given no drag', () => {
		renderSlot(null)

		expect(screen.getByTestId('slot')).not.toHaveAttribute('data-drop-target')
	})
})
