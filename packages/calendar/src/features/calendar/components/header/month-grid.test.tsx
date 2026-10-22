import { afterEach, describe, expect, it, mock } from 'bun:test'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import { MonthGrid } from './month-grid'

const NEW_YORK = 'America/New_York'

/**
 * The grid hands over the first of the picked month at the clock time of the
 * date it started from. `.month()` keeps the receiver's UTC offset, so a month
 * picked across a clock change used to be an hour off as an instant, or in the
 * previous month (a 00:30 date picked into January read 31 December).
 */
const pickMonth = (selected: Dayjs, label: string): Dayjs => {
	const onSelect = mock((_date: Dayjs) => {})
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
	return onSelect.mock.calls.at(0)?.at(0) as Dayjs
}

describe('MonthGrid', () => {
	afterEach(() => {
		cleanup()
		dayjs.tz.setDefault()
	})

	it('keeps the 12:00 clock face when the picked month has another offset', () => {
		dayjs.tz.setDefault(NEW_YORK)
		const picked = pickMonth(dayjs('2025-01-15T17:00:00.000Z'), 'Jun')

		expect(picked.toISOString()).toBe('2025-06-01T16:00:00.000Z')
	})

	it('stays in the picked month when the date is just after midnight', () => {
		dayjs.tz.setDefault(NEW_YORK)
		const picked = pickMonth(dayjs('2025-06-01T04:30:00.000Z'), 'Jan')

		expect(picked.toISOString()).toBe('2025-01-01T05:30:00.000Z')
	})
})
