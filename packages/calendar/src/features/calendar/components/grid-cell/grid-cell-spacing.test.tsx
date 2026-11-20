import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import {
	add,
	isSameDay,
	parseDate,
	toOffsetIso,
	withTime,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EVENT_BAR_HEIGHT } from '@/config/constants'
import { useProcessedWeekEvents } from '@/features/calendar/hooks/use-processed-week-events'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { GridCell } from './grid-cell'

const atUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const initialDate = atUtc('2025-01-01T00:00:00.000Z')
const initialDateIso = toOffsetIso(initialDate)

const mkEvent = (id: string): CalendarEvent => ({
	id,
	title: `Event ${id}`,
	start: initialDateIso,
	end: toOffsetIso(add(initialDate, 1, 'hour')),
})

const twoEvents = [mkEvent('1'), mkEvent('2')]
const threeEvents = [mkEvent('1'), mkEvent('2'), mkEvent('3')]

type RenderGridCellOptions = {
	dayMaxEvents?: number
	eventSpacing?: number
	eventHeight?: number
	events?: CalendarEvent[]
	onMoreEventsClick?: (day: string, events: CalendarEvent[]) => void
}

const EventCell = () => {
	const { columnLayouts } = useProcessedWeekEvents({ days: [initialDate] })
	const layout = columnLayouts.get(initialDate)
	return (
		<GridCell day={initialDate} precomputedLayout={layout} shouldRenderEvents />
	)
}

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
			initialDate={initialDateIso}
			onMoreEventsClick={onMoreEventsClick}
			timezone="UTC"
		>
			<EventCell />
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
		expect(placeholders.at(0)?.style.height).toBe(`${EVENT_BAR_HEIGHT}px`)
		expect(placeholders.at(1)?.style.height).toBe(`${EVENT_BAR_HEIGHT}px`)
	})

	test('event placeholders should use custom eventHeight when provided', () => {
		const customHeight = 48
		renderGridCell({ eventHeight: customHeight })
		const placeholders = screen.queryAllByTestId(/Event/i)

		expect(placeholders.length).toBe(2)
		expect(placeholders.at(0)?.style.height).toBe(`${customHeight}px`)
		expect(placeholders.at(1)?.style.height).toBe(`${customHeight}px`)
	})
})

describe('GridCell "+N more" overflow handling', () => {
	beforeEach(() => {
		cleanup()
	})

	const renderOverflowCell = (
		onMoreEventsClick?: (day: string, events: CalendarEvent[]) => void
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

	test('calls onMoreEventsClick with ISO date string and events, and does NOT open the dialog', () => {
		const onMoreEventsClick = mock<
			(day: string, events: CalendarEvent[]) => void
		>(() => {})
		renderOverflowCell(onMoreEventsClick)

		fireEvent.click(screen.getByText(/more/i))

		expect(onMoreEventsClick).toHaveBeenCalledTimes(1)
		const call = onMoreEventsClick.mock.calls.at(0)
		const day = call?.at(0) as string
		const events = call?.at(1) as CalendarEvent[]
		expect(isSameDay(atUtc(day), initialDate)).toBe(true)
		expect(events).toHaveLength(3)

		expect(screen.queryByRole('dialog')).toBeNull()
	})
})

describe('GridCell droppable ID uniqueness', () => {
	beforeEach(() => {
		cleanup()
	})

	test('all-day cell and midnight time cell for the same date render as separate droppable elements', () => {
		const midnightDate = atUtc('2025-01-13T00:00:00.000Z')
		render(
			<CalendarProvider
				dayMaxEvents={3}
				initialDate={toOffsetIso(midnightDate)}
				timezone="UTC"
			>
				<GridCell allDay day={midnightDate} gridType="day" />
				<GridCell
					day={midnightDate}
					gridType="hour"
					hour={0}
					shouldRenderEvents={false}
				/>
			</CalendarProvider>
		)

		expect(screen.getByTestId('day-cell-2025-01-13')).toBeInTheDocument()
		expect(screen.getByTestId('day-cell-2025-01-13-00-00')).toBeInTheDocument()

		const allDayDroppable = screen
			.getByTestId('day-cell-2025-01-13')
			.closest('.droppable-cell')
		const timeDroppable = screen
			.getByTestId('day-cell-2025-01-13-00-00')
			.closest('.droppable-cell')
		expect(allDayDroppable).not.toBe(timeDroppable)
	})

	test('time cells for different hours on the same day render as separate droppable elements', () => {
		const date = atUtc('2025-01-13T00:00:00.000Z')
		render(
			<CalendarProvider
				dayMaxEvents={3}
				initialDate={toOffsetIso(date)}
				timezone="UTC"
			>
				<GridCell
					day={withTime(date, { hour: 9 })}
					gridType="hour"
					hour={9}
					shouldRenderEvents={false}
				/>
				<GridCell
					day={withTime(date, { hour: 10 })}
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
