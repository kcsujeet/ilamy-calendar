import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
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
