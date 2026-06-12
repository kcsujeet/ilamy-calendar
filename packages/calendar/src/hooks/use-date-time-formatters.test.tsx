import { describe, expect, it } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { useDateTimeFormatters } from './use-date-time-formatters'

const renderFormattersHook = (
	props: { locale?: string; timezone?: string } = {}
) => {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<CalendarProvider
			dayMaxEvents={3}
			events={[]}
			firstDayOfWeek={0}
			{...props}
		>
			{children}
		</CalendarProvider>
	)
	const { result } = renderHook(() => useDateTimeFormatters(), { wrapper })
	return result.current.formatDateRange
}

const d = (iso: string) => dayjs(iso)

describe('useDateTimeFormatters', () => {
	describe('formatDateRange', () => {
		it('returns a compact English range with en-dash separator and no year', () => {
			const fmt = renderFormattersHook()
			expect(fmt(d('2026-04-26'), d('2026-05-02'))).toBe('Apr 26 – May 2')
		})

		it('collapses same-month ranges to a single month label', () => {
			const fmt = renderFormattersHook()
			expect(fmt(d('2026-04-26'), d('2026-04-28'))).toBe('Apr 26 – 28')
		})

		it('respects the calendar locale (French puts the day before the month)', () => {
			const fmt = renderFormattersHook({ locale: 'fr' })
			expect(fmt(d('2026-04-26'), d('2026-05-02'))).toBe('26 avr. – 2 mai')
		})

		it('uses the calendar timezone so dates near midnight do not shift days', () => {
			const fmt = renderFormattersHook({ timezone: 'America/Los_Angeles' })
			const start = dayjs.tz('2026-04-26T00:30:00', 'America/Los_Angeles')
			const end = dayjs.tz('2026-05-02T23:30:00', 'America/Los_Angeles')
			expect(fmt(start, end)).toBe('Apr 26 – May 2')
		})
	})
})
