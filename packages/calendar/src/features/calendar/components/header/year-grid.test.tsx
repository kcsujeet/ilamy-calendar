import { afterEach, describe, expect, it, mock } from 'bun:test'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { YearGrid } from './year-grid'

const NEW_YORK = 'America/New_York'

/** `.year()` keeps the receiver's UTC offset, so the same day in another year was an hour off. */
const pickYear = (selected: Dayjs, label: string): Dayjs => {
	const onSelect = mock((_date: Dayjs) => {})
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
	return onSelect.mock.calls.at(0)?.at(0) as Dayjs
}

describe('YearGrid', () => {
	afterEach(() => {
		cleanup()
		dayjs.tz.setDefault()
	})

	it('keeps the 12:00 clock face on a day whose offset differs in the picked year', () => {
		dayjs.tz.setDefault(NEW_YORK)
		// 9 March 2025 is the day the clocks went forward; 9 March 2024 was still winter time.
		const picked = pickYear(dayjs('2025-03-09T16:00:00.000Z'), '2024')

		expect(picked.toISOString()).toBe('2024-03-09T17:00:00.000Z')
	})
})
