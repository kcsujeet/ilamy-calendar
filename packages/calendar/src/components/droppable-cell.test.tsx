import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { Resource } from '@ilamy/types'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import type { CellInfo } from '@/features/calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
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
