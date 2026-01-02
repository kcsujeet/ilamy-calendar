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
