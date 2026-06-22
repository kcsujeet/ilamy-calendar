import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import type { CellInfo } from '@/features/calendar/types'
import type { CalendarView } from '@/types'
import { DroppableCell } from './droppable-cell'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')

const renderDroppableCellWithView = (view: CalendarView) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			initialDate={initialDate}
			initialView={view}
		>
			<DroppableCell
				data-testid="test-droppable-cell"
				date={initialDate}
				id="test-cell"
				type="day-cell"
			/>
		</CalendarProvider>
	)
}

describe('DroppableCell data-view attribute', () => {
	beforeEach(() => {
		cleanup()
	})

	const views: CalendarView[] = ['month', 'week', 'day', 'year']

	test.each(
		views
	)('should render data-view="%s" attribute from context', (view) => {
		renderDroppableCellWithView(view)

		const cell = screen.getByTestId('test-droppable-cell')
		expect(cell.getAttribute('data-view')).toBe(view)
	})
})

describe('DroppableCell isCellDisabled (issue #79)', () => {
	beforeEach(() => {
		cleanup()
	})

	const renderCell = (opts: {
		isCellDisabled?: (info: CellInfo) => boolean
		onCellClick?: (info: CellInfo) => void
	}) => {
		return render(
			<CalendarProvider
				dayMaxEvents={3}
				initialDate={initialDate}
				initialView="month"
				isCellDisabled={opts.isCellDisabled}
				onCellClick={opts.onCellClick}
			>
				<DroppableCell
					data-testid="cell"
					date={initialDate}
					id="test-cell"
					type="day-cell"
				/>
			</CalendarProvider>
		)
	}

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

		// Month day-cell spans the full day.
		expect(received?.start.toISOString()).toBe('2025-01-01T00:00:00.000Z')
		expect(received?.end.hour()).toBe(23)
		expect(received?.end.minute()).toBe(59)
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

		render(
			<CalendarProvider
				dayMaxEvents={3}
				initialDate={initialDate}
				initialView="month"
				isCellDisabled={(info) => {
					received = info
					return false
				}}
				resources={[room]}
			>
				<DroppableCell
					data-testid="cell"
					date={initialDate}
					id="test-cell"
					resourceId="room-a"
					type="day-cell"
				/>
			</CalendarProvider>
		)

		expect(received?.resource).toEqual(room)
		expect(received?.resource?.id).toBe('room-a')
	})
})

describe('DroppableCell self-describing attributes (drag-create)', () => {
	beforeEach(() => {
		cleanup()
	})

	const renderCell = (
		props: {
			hour?: number
			minute?: number
			resourceId?: string | number
			allDay?: boolean
		} = {}
	) =>
		render(
			<CalendarProvider
				dayMaxEvents={3}
				initialDate={initialDate}
				initialView="week"
			>
				<DroppableCell
					allDay={props.allDay}
					data-testid="cell"
					date={initialDate}
					hour={props.hour}
					id="test-cell"
					minute={props.minute}
					resourceId={props.resourceId}
					type="day-cell"
				/>
			</CalendarProvider>
		)

	test('exposes a full-day range on a day cell (no hour)', () => {
		renderCell()

		const cell = screen.getByTestId('cell')
		expect(cell.getAttribute('data-start')).toBe(
			initialDate.hour(0).minute(0).toISOString()
		)
		expect(cell.getAttribute('data-end')).toBe(
			initialDate.hour(23).minute(59).toISOString()
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

	const renderCell = (opts: {
		getCellClassName?: (info: CellInfo) => string
		onCellClick?: (info: CellInfo) => void
	}) => {
		return render(
			<CalendarProvider
				dayMaxEvents={3}
				getCellClassName={opts.getCellClassName}
				initialDate={initialDate}
				initialView="month"
				onCellClick={opts.onCellClick}
			>
				<DroppableCell
					data-testid="cell"
					date={initialDate}
					id="test-cell"
					type="day-cell"
				/>
			</CalendarProvider>
		)
	}

	test('applies the class returned by getCellClassName', () => {
		renderCell({
			getCellClassName: () => 'bg-amber-100',
		})

		expect(screen.getByTestId('cell')).toHaveClass('bg-amber-100')
	})

	test('does not block onCellClick when only getCellClassName marks a cell', () => {
		const onCellClick = mock()
		renderCell({
			getCellClassName: () => 'bg-amber-100',
			onCellClick,
		})

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
		expect(received?.end.hour()).toBe(23)
		expect(received?.end.minute()).toBe(59)
	})
})
