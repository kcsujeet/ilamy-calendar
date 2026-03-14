import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import { EVENT_BAR_HEIGHT } from '@/lib/constants'
import { GridCell } from './grid-cell'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')

const mockEvents = [
	{
		id: '1',
		title: 'Event 1',
		start: initialDate,
		end: initialDate.add(1, 'hour'),
	},
	{
		id: '2',
		title: 'Event 2',
		start: initialDate,
		end: initialDate.add(1, 'hour'),
	},
]

const renderGridCell = (eventSpacing?: number) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			eventSpacing={eventSpacing}
			events={mockEvents}
			initialDate={initialDate}
		>
			<GridCell day={initialDate} shouldRenderEvents={true} />
		</CalendarProvider>
	)
}

describe('GridCell Event Spacing', () => {
	beforeEach(() => {
		cleanup()
	})

	test('grid-cell-content should have gap matching eventSpacing', () => {
		const spacing = 8
		renderGridCell(spacing)
		const content = screen.getByTestId('grid-cell-content')

		expect(content.style.gap).toBe(`${spacing}px`)
	})

	test('event placeholders should have height matching EVENT_BAR_HEIGHT', () => {
		renderGridCell()
		const placeholders = screen.queryAllByTestId(/Event/i)

		expect(placeholders.length).toBe(2)
		expect(placeholders[0].style.height).toBe(`${EVENT_BAR_HEIGHT}px`)
		expect(placeholders[1].style.height).toBe(`${EVENT_BAR_HEIGHT}px`)
	})
})

describe('GridCell droppable ID uniqueness', () => {
	beforeEach(() => {
		cleanup()
	})

	test('all-day cell and midnight time cell for the same date render as separate droppable elements', () => {
		const midnightDate = dayjs('2025-01-13T00:00:00.000Z')
		render(
			<CalendarProvider dayMaxEvents={3} initialDate={midnightDate}>
				<GridCell allDay day={midnightDate} gridType="day" />
				<GridCell
					day={midnightDate}
					gridType="hour"
					hour={0}
					shouldRenderEvents={false}
				/>
			</CalendarProvider>
		)

		// Both cells render with distinct test IDs
		expect(screen.getByTestId('day-cell-2025-01-13')).toBeInTheDocument()
		expect(screen.getByTestId('day-cell-2025-01-13-00-00')).toBeInTheDocument()

		// They are separate droppable cell DOM nodes (not sharing the same @dnd-kit registration)
		const allDayDroppable = screen
			.getByTestId('day-cell-2025-01-13')
			.closest('.droppable-cell')
		const timeDroppable = screen
			.getByTestId('day-cell-2025-01-13-00-00')
			.closest('.droppable-cell')
		expect(allDayDroppable).not.toBe(timeDroppable)
	})

	test('time cells for different hours on the same day render as separate droppable elements', () => {
		const date = dayjs('2025-01-13T00:00:00.000Z')
		render(
			<CalendarProvider dayMaxEvents={3} initialDate={date}>
				<GridCell
					day={date.hour(9)}
					gridType="hour"
					hour={9}
					shouldRenderEvents={false}
				/>
				<GridCell
					day={date.hour(10)}
					gridType="hour"
					hour={10}
					shouldRenderEvents={false}
				/>
			</CalendarProvider>
		)

		expect(screen.getByTestId('day-cell-2025-01-13-09-00')).toBeInTheDocument()
		expect(screen.getByTestId('day-cell-2025-01-13-10-00')).toBeInTheDocument()

		const cell9 = screen
			.getByTestId('day-cell-2025-01-13-09-00')
			.closest('.droppable-cell')
		const cell10 = screen
			.getByTestId('day-cell-2025-01-13-10-00')
			.closest('.droppable-cell')
		expect(cell9).not.toBe(cell10)
	})
})
