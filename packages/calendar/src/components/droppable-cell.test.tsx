import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
	DragPreviewContext,
	type DragPreviewState,
} from '@/contexts/drag-preview-context'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import type { CellInfo } from '@/features/calendar/types'
import { mkDragPreview as mkPreview } from '@/testing/drag-test-fixtures'
import type { CalendarView } from '@/types'
import { DroppableCell } from './droppable-cell'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')

interface RenderCellOptions {
	// Calendar (provider) props
	view?: CalendarView
	isCellDisabled?: (info: CellInfo) => boolean
	getCellClassName?: (info: CellInfo) => string
	onCellClick?: (info: CellInfo) => void
	resources?: Resource[]
	// Cell props
	hour?: number
	minute?: number
	slotDurationMinutes?: number
	resourceId?: string | number
	allDay?: boolean
	/** The in-flight drag this cell should react to, if any. */
	preview?: DragPreviewState
	isSubDivider?: boolean
}

// One CalendarProvider + DroppableCell setup for every test; pass only the
// calendar/cell props the case under test varies. The cell's testid is "cell".
const renderCell = (opts: RenderCellOptions = {}) =>
	render(
		<CalendarProvider
			dayMaxEvents={3}
			getCellClassName={opts.getCellClassName}
			initialDate={initialDate}
			initialView={opts.view ?? 'month'}
			isCellDisabled={opts.isCellDisabled}
			onCellClick={opts.onCellClick}
			resources={opts.resources}
		>
			<DragPreviewContext.Provider value={opts.preview ?? null}>
				<DroppableCell
					allDay={opts.allDay}
					data-testid="cell"
					date={initialDate}
					hour={opts.hour}
					id="test-cell"
					isSubDivider={opts.isSubDivider}
					minute={opts.minute}
					resourceId={opts.resourceId}
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
	test('marks a cell that draws the dashed divider', () => {
		// The library ships no CSS, so the only way to hide or restyle just the
		// sub-hour lines is a stable selector. Keyed off the SAME flag that draws
		// the border, so the last slot of each hour, which has none, is excluded.
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

describe('DroppableCell isCellDisabled (issue #79)', () => {
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

	test('passes the cell start/end range to isCellDisabled', () => {
		let received: CellInfo | undefined
		renderCell({
			isCellDisabled: (info) => {
				received = info
				return false
			},
		})

		// Month day-cell spans the full day, ending at the exclusive next midnight.
		expect(received?.start.toISOString()).toBe('2025-01-01T00:00:00.000Z')
		expect(received?.end.toISOString()).toBe('2025-01-02T00:00:00.000Z')
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

	/**
	 * The end is exclusive, the same way the hour and minute cells below already
	 * report theirs (09:00 to 10:00, 09:15 to 09:30): a day cell runs to the next
	 * midnight, not to 23:59 (#248).
	 */
	test('exposes a full-day range on a day cell (no hour)', () => {
		renderCell()

		const cell = screen.getByTestId('cell')
		expect(cell.getAttribute('data-start')).toBe(
			initialDate.startOf('day').toISOString()
		)
		expect(cell.getAttribute('data-end')).toBe(
			initialDate.add(1, 'day').startOf('day').toISOString()
		)
	})

	test('exposes a one-hour range on an hour cell', () => {
		renderCell({ hour: 9 })

		const cell = screen.getByTestId('cell')
		expect(cell.getAttribute('data-start')).toBe(
			initialDate.hour(9).minute(0).toISOString()
		)
		expect(cell.getAttribute('data-end')).toBe(
			initialDate.hour(10).minute(0).toISOString()
		)
	})

	test('exposes a 15-minute range on a minute cell', () => {
		renderCell({ hour: 9, minute: 15 })

		const cell = screen.getByTestId('cell')
		expect(cell.getAttribute('data-start')).toBe(
			initialDate.hour(9).minute(15).toISOString()
		)
		expect(cell.getAttribute('data-end')).toBe(
			initialDate.hour(9).minute(30).toISOString()
		)
	})

	test('honors slotDurationMinutes on a minute cell', () => {
		renderCell({ hour: 9, minute: 30, slotDurationMinutes: 30 })

		const cell = screen.getByTestId('cell')
		expect(cell.getAttribute('data-start')).toBe(
			initialDate.hour(9).minute(30).toISOString()
		)
		expect(cell.getAttribute('data-end')).toBe(
			initialDate.hour(10).minute(0).toISOString()
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

	test('exposes data-all-day="true" only on an all-day cell', () => {
		renderCell({ allDay: true })

		expect(screen.getByTestId('cell').getAttribute('data-all-day')).toBe('true')
	})

	test('omits data-all-day on a timed cell', () => {
		renderCell({ hour: 9 })

		expect(screen.getByTestId('cell').hasAttribute('data-all-day')).toBe(false)
	})
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

		expect(received?.start.toISOString()).toBe('2025-01-01T00:00:00.000Z')
		expect(received?.end.toISOString()).toBe('2025-01-02T00:00:00.000Z')
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
		// FullCalendar's own highlight: v6 ships
		// `--fc-highlight-color:rgba(188,232,241,.3)` behind
		// `.fc .fc-highlight{background:var(--fc-highlight-color)}`.
		//
		// A fixed literal rather than a theme token, because it is the one shade
		// that collides with neither the dragged event's own fill nor the
		// disabled and hover greys, which in a monochrome theme sit on the same
		// axis as each other.
		renderCell({ preview: mkPreview(), hour: 10, minute: 30, view: 'week' })

		const highlight = screen.getByTestId('cell').firstElementChild

		expect(highlight).toHaveStyle({
			backgroundColor: 'rgba(188, 232, 241, 0.3)',
		})
	})

	test('tints a disabled cell the candidate spans across', () => {
		// A multi-day span crosses days you cannot drop ONTO -- weekends, closed
		// days -- and the mirror is already drawn across them. Leaving those cells
		// grey makes the bar look like it is crossing unavailable ground.
		//
		// Not "you may release here": a disabled cell registers as a droppable so
		// the mirror can keep rendering over it, and the refusal is decided at
		// drop time in `getUpdatedEvent`. The tint says only that the candidate
		// spans this cell.
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
		// The cell's own `end` is exclusive (#248), so the candidate beginning at
		// that instant occupies none of this cell. Handing the exclusive end to
		// `isPreviewOnTarget`, which takes the LAST instant, lights it up wrongly.
		const preview = mkPreview({
			start: initialDate.hour(10).minute(15),
			end: initialDate.hour(12),
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
			start: initialDate.startOf('day'),
			end: initialDate.add(1, 'day').startOf('day'),
			allDay: true,
		})
		renderCell({ preview, allDay: true, view: 'week' })

		expect(screen.getByTestId('cell')).toHaveAttribute(
			'data-drop-target',
			'true'
		)
	})
})
