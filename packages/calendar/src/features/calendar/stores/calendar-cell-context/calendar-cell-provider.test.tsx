import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { render } from '@testing-library/react'
import { useCalendarCellContext } from '@/features/calendar/hooks/use-calendar-cell-context'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'

const mkEvent = (id: string): CalendarEvent => ({
	id,
	title: id,
	start: dayjs('2025-07-01T09:00:00.000Z'),
	end: dayjs('2025-07-01T10:00:00.000Z'),
})

/** Renders a cell-context reader under CalendarProvider, which mounts CalendarCellProvider. */
const renderCellContextReader = () => {
	const seenCellContexts: unknown[] = []
	const CaptureCellContext = () => {
		seenCellContexts.push(useCalendarCellContext())
		return null
	}
	const buildCalendar = (events: CalendarEvent[]) => (
		<CalendarProvider events={events}>
			<CaptureCellContext />
		</CalendarProvider>
	)
	return { seenCellContexts, buildCalendar }
}

describe('CalendarCellProvider', () => {
	// A time grid has thousands of cells reading this context, so an event
	// changing must not hand them a new value.
	it('keeps the cell context when the events change', () => {
		const { seenCellContexts, buildCalendar } = renderCellContextReader()

		const { rerender } = render(buildCalendar([mkEvent('a')]))
		rerender(buildCalendar([mkEvent('a'), mkEvent('b')]))

		expect(seenCellContexts).toHaveLength(2)
		expect(new Set(seenCellContexts).size).toBe(1)
	})
})
