import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { EVENT_BAR_HEIGHT } from '@/lib/constants'
import { GridCell } from './grid-cell'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')

const mkEvent = (id: string): CalendarEvent => ({
	id,
	title: `Event ${id}`,
	start: initialDate,
	end: initialDate.add(1, 'hour'),
})

const twoEvents = [mkEvent('1'), mkEvent('2')]
const threeEvents = [mkEvent('1'), mkEvent('2'), mkEvent('3')]

type RenderGridCellOptions = {
	dayMaxEvents?: number
	eventSpacing?: number
	eventHeight?: number
	events?: CalendarEvent[]
	onMoreEventsClick?: (day: Dayjs, events: CalendarEvent[]) => void
}

// Shared harness for GridCell. Each suite varies only the CalendarProvider props
// it cares about; everything else falls back to sensible defaults.
const renderGridCell = ({
	dayMaxEvents = 3,
	eventSpacing,
	eventHeight,
	events = twoEvents,
	onMoreEventsClick,
}: RenderGridCellOptions = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={dayMaxEvents}
			eventHeight={eventHeight}
			eventSpacing={eventSpacing}
			events={events}
			initialDate={initialDate}
			onMoreEventsClick={onMoreEventsClick}
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
		renderGridCell({ eventSpacing: spacing })
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

	test('event placeholders should use custom eventHeight when provided', () => {
		const customHeight = 48
		renderGridCell({ eventHeight: customHeight })
		const placeholders = screen.queryAllByTestId(/Event/i)

		expect(placeholders.length).toBe(2)
		expect(placeholders[0].style.height).toBe(`${customHeight}px`)
		expect(placeholders[1].style.height).toBe(`${customHeight}px`)
	})
})

describe('GridCell "+N more" overflow handling', () => {
	beforeEach(() => {
		cleanup()
	})

	// Three events with dayMaxEvents=1 → two are hidden, so the "+N more"
	// overflow indicator is rendered.
	const renderOverflowCell = (
		onMoreEventsClick?: (day: Dayjs, events: CalendarEvent[]) => void
	) =>
		renderGridCell({ dayMaxEvents: 1, events: threeEvents, onMoreEventsClick })

	test('renders the "+N more" indicator when events exceed dayMaxEvents', () => {
		renderOverflowCell()
		expect(screen.getByText(/more/i)).toBeInTheDocument()
	})

	test('opens the built-in dialog when onMoreEventsClick is not provided', () => {
		renderOverflowCell()
		expect(screen.queryByRole('dialog')).toBeNull()

		fireEvent.click(screen.getByText(/more/i))

		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	test('calls onMoreEventsClick with the day and events, and does NOT open the dialog', () => {
		const onMoreEventsClick = mock<
			(day: Dayjs, events: CalendarEvent[]) => void
		>(() => {})
		renderOverflowCell(onMoreEventsClick)

		fireEvent.click(screen.getByText(/more/i))

		expect(onMoreEventsClick).toHaveBeenCalledTimes(1)
		const [day, events] = onMoreEventsClick.mock.calls[0]
		expect(day.isSame(initialDate, 'day')).toBe(true)
		expect(events).toHaveLength(3)

		// The built-in dialog must be bypassed when the callback is provided.
		expect(screen.queryByRole('dialog')).toBeNull()
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
