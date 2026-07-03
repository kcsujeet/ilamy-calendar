import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { GridCell } from './grid-cell'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')

// Three events on the same day with dayMaxEvents=1 → two are hidden, so the
// "+N more" overflow indicator is rendered.
const mockEvents: CalendarEvent[] = [
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
	{
		id: '3',
		title: 'Event 3',
		start: initialDate,
		end: initialDate.add(1, 'hour'),
	},
]

const renderGridCell = (
	onMoreEventsClick?: (day: Dayjs, events: CalendarEvent[]) => void
) => {
	return render(
		<CalendarProvider
			dayMaxEvents={1}
			events={mockEvents}
			initialDate={initialDate}
			onMoreEventsClick={onMoreEventsClick}
		>
			<GridCell day={initialDate} shouldRenderEvents={true} />
		</CalendarProvider>
	)
}

describe('GridCell "+N more" overflow handling', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders the "+N more" indicator when events exceed dayMaxEvents', () => {
		renderGridCell()
		expect(screen.getByText(/more/i)).toBeInTheDocument()
	})

	test('opens the built-in dialog when onMoreEventsClick is not provided', () => {
		renderGridCell()
		expect(screen.queryByRole('dialog')).toBeNull()

		fireEvent.click(screen.getByText(/more/i))

		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	test('calls onMoreEventsClick with the day and events, and does NOT open the dialog', () => {
		const onMoreEventsClick = mock<
			(day: Dayjs, events: CalendarEvent[]) => void
		>(() => {})
		renderGridCell(onMoreEventsClick)

		fireEvent.click(screen.getByText(/more/i))

		expect(onMoreEventsClick).toHaveBeenCalledTimes(1)
		const [day, events] = onMoreEventsClick.mock.calls[0]
		expect(day.isSame(initialDate, 'day')).toBe(true)
		expect(events).toHaveLength(3)

		// The built-in dialog must be bypassed when the callback is provided.
		expect(screen.queryByRole('dialog')).toBeNull()
	})
})
