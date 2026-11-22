import { afterEach, describe, expect, it, mock } from 'bun:test'
import { parseDate, toUtcIso, type ZonedDate } from '@ilamy/utils/temporal'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/app/calendar-provider'
import { MonthGrid } from './month-grid'

const NEW_YORK = 'America/New_York'

const atNy = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, NEW_YORK)
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const pickMonth = (selected: ZonedDate, label: string): ZonedDate => {
	const onSelect = mock((_date: ZonedDate) => {})
	render(
		<CalendarProvider
			dayMaxEvents={5}
			events={[]}
			firstDayOfWeek={0}
			timezone={NEW_YORK}
		>
			<MonthGrid onSelect={onSelect} selected={selected} />
		</CalendarProvider>
	)
	fireEvent.click(screen.getByRole('button', { name: label }))
	return onSelect.mock.calls.at(0)?.at(0) as ZonedDate
}

describe('MonthGrid', () => {
	afterEach(() => {
		cleanup()
	})

	it('keeps the 12:00 clock face when the picked month has another offset', () => {
		const picked = pickMonth(atNy('2025-01-15T17:00:00.000Z'), 'Jun')

		expect(toUtcIso(picked)).toBe('2025-06-01T16:00:00.000Z')
	})

	it('stays in the picked month when the date is just after midnight', () => {
		const picked = pickMonth(atNy('2025-06-01T04:30:00.000Z'), 'Jan')

		expect(toUtcIso(picked)).toBe('2025-01-01T05:30:00.000Z')
	})
})
