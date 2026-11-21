import { afterEach, describe, expect, it, mock } from 'bun:test'
import { parseDate, toUtcIso, type ZonedDate } from '@ilamy/utils/temporal'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/app/calendar-provider'
import { YearGrid } from './year-grid'

const NEW_YORK = 'America/New_York'

const atNy = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, NEW_YORK)
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const pickYear = (selected: ZonedDate, label: string): ZonedDate => {
	const onSelect = mock((_date: ZonedDate) => {})
	render(
		<CalendarProvider
			dayMaxEvents={5}
			events={[]}
			firstDayOfWeek={0}
			timezone={NEW_YORK}
		>
			<YearGrid onSelect={onSelect} selected={selected} />
		</CalendarProvider>
	)
	fireEvent.click(screen.getByRole('button', { name: label }))
	return onSelect.mock.calls.at(0)?.at(0) as ZonedDate
}

describe('YearGrid', () => {
	afterEach(() => {
		cleanup()
	})

	it('keeps the 12:00 clock face on a day whose offset differs in the picked year', () => {
		// 9 March 2025 is the day the clocks went forward; 9 March 2024 was still winter time.
		const picked = pickYear(atNy('2025-03-09T16:00:00.000Z'), '2024')

		expect(toUtcIso(picked)).toBe('2024-03-09T17:00:00.000Z')
	})
})
