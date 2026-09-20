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

	const mkPreview = (
		overrides: Partial<DragPreviewState> = {}
	): DragPreviewState => ({
		event: {
			id: 'event-1',
			title: 'Team Sync',
			start: initialDate.hour(10),
			end: initialDate.hour(12),
		},
		start: initialDate.hour(10),
		end: initialDate.hour(12),
		allDay: false,
		...overrides,
	})

	test('highlights a cell the candidate covers', () => {
		renderCell({ preview: mkPreview(), hour: 10, minute: 30, view: 'week' })

		expect(screen.getByTestId('cell')).toHaveAttribute(
			'data-drop-target',
			'true'
		)
	})

	test("tints the target in FullCalendar's own highlight colour", () => {
		// CONTRACT MOVED, deliberately. This cell first painted the DRAGGED
		// EVENT's colour at 0.75, which was the same hue and nearly the same
		// weight as the mirror standing on it and flooded every cell of a
		// multi-day span; that was removed and the cell painted nothing at all.
		// It now paints what FullCalendar paints: ONE fixed pale cyan, low alpha.
		// v6 ships `--fc-highlight-color:rgba(188,232,241,.3)` with
		// `.fc .fc-highlight{background:var(--fc-highlight-color)}`; v4's
		// `core/main.css` spells the same colour `#bce8f1` at `opacity: .3`.
		//
		// Being a fixed literal rather than a theme token is the point: it is the
		// one shade that cannot collide with the dragged event's fill, and it
		// cannot land on the same axis as the disabled and hover greys in a
		// monochrome theme, which is what made every earlier attempt unreadable.
		renderCell({ preview: mkPreview(), hour: 10, minute: 30, view: 'week' })

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
