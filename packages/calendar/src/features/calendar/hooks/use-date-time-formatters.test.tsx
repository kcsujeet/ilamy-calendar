import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import { parseDate, type ZonedDate } from '@ilamy/utils/temporal'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
	CalendarProvider,
	type CalendarProviderProps,
} from '@/features/calendar/stores/calendar-context/calendar-provider'
import { plainSpaces } from '@/testing/plain-spaces'
import { useDateTimeFormatters } from './use-date-time-formatters'

const mustParse = (iso: string, zone = 'UTC'): ZonedDate => {
	const parsed = parseDate(iso, zone)
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const renderFormatters = (props: Partial<CalendarProviderProps> = {}) => {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<CalendarProvider
			dayMaxEvents={3}
			events={[]}
			firstDayOfWeek={0}
			timezone="UTC"
			{...props}
		>
			{children}
		</CalendarProvider>
	)
	const { result } = renderHook(() => useDateTimeFormatters(), { wrapper })
	return result.current
}

const renderFormattersHook = (
	props: { locale?: string; timezone?: string } = {}
) => renderFormatters(props).formatDateRange

const mkEvent = (extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
	id: 'e1',
	title: 'Standup',
	start: '2025-03-12T09:30:00.000Z',
	end: '2025-03-12T10:30:00.000Z',
	...extra,
})

const d = (iso: string) => mustParse(iso, 'UTC')

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

		it('drops the year for a week spanning two years', () => {
			const fmt = renderFormattersHook()
			expect(fmt(d('2026-12-30'), d('2027-01-05'))).toBe('Dec 30 – Jan 5')
		})

		it('respects the calendar locale (French puts the day before the month)', () => {
			const fmt = renderFormattersHook({ locale: 'fr' })
			expect(fmt(d('2026-04-26'), d('2026-05-02'))).toBe('26 avr. – 2 mai')
		})

		it('uses the calendar timezone so dates near midnight do not shift days', () => {
			const fmt = renderFormattersHook({ timezone: 'America/Los_Angeles' })
			const start = mustParse('2026-04-26T00:30:00', 'America/Los_Angeles')
			const end = mustParse('2026-05-02T23:30:00', 'America/Los_Angeles')
			expect(fmt(start, end)).toBe('Apr 26 – May 2')
		})
	})

	describe('formatSlotHeader', () => {
		const nineAm = mustParse('2025-03-12T09:00:00.000Z', 'UTC')

		it('keeps the existing label when no format is set', () => {
			expect(renderFormatters().formatSlotHeader(nineAm)).toBe('9 AM')
			expect(
				renderFormatters({ timeFormat: '24-hour' }).formatSlotHeader(nineAm)
			).toBe('9')
		})

		it('formats with the given Intl options', () => {
			const { formatSlotHeader } = renderFormatters({
				slotHeaderFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
			})
			expect(formatSlotHeader(nineAm)).toBe('09:00')
		})

		it('fills hour12 from timeFormat when the options leave it out', () => {
			const options = { hour: 'numeric', minute: '2-digit' } as const
			const twentyFourHour = renderFormatters({
				slotHeaderFormat: options,
				timeFormat: '24-hour',
			})
			const twelveHour = renderFormatters({
				slotHeaderFormat: options,
				timeFormat: '12-hour',
			})
			expect(twentyFourHour.formatSlotHeader(nineAm)).toBe('09:00')
			expect(plainSpaces(twelveHour.formatSlotHeader(nineAm))).toBe('9:00 AM')
		})

		it('lets an explicit hour12 beat timeFormat', () => {
			const { formatSlotHeader } = renderFormatters({
				slotHeaderFormat: { hour: 'numeric', minute: '2-digit', hour12: true },
				timeFormat: '24-hour',
			})
			expect(plainSpaces(formatSlotHeader(nineAm))).toBe('9:00 AM')
		})

		it('lets the locale decide 12 or 24 hour when timeFormat was not passed', () => {
			const options = { hour: '2-digit', minute: '2-digit' } as const
			const german = renderFormatters({
				locale: 'de-DE',
				slotHeaderFormat: options,
			})
			const american = renderFormatters({ slotHeaderFormat: options })
			expect(german.formatSlotHeader(nineAm)).toBe('09:00')
			expect(plainSpaces(american.formatSlotHeader(nineAm))).toBe('09:00 AM')
		})

		it('lets an explicit timeFormat override the locale', () => {
			const { formatSlotHeader } = renderFormatters({
				locale: 'de-DE',
				slotHeaderFormat: { hour: '2-digit', minute: '2-digit' },
				timeFormat: '12-hour',
			})
			expect(plainSpaces(formatSlotHeader(nineAm))).toBe('09:00 AM')
		})

		it('writes the instant on the calendar timezone clock', () => {
			const { formatSlotHeader } = renderFormatters({
				timezone: 'Asia/Tokyo',
				slotHeaderFormat: { hour: '2-digit', minute: '2-digit' },
				timeFormat: '24-hour',
			})
			expect(formatSlotHeader(nineAm)).toBe('18:00')
		})
	})

	describe('formatDayHeader', () => {
		const wednesday = mustParse('2025-03-12T09:00:00.000Z', 'UTC')

		it('keeps the short weekday when no format is set', () => {
			expect(renderFormatters().formatDayHeader(wednesday)).toBe('Wed')
		})

		it('formats with the given Intl options', () => {
			const { formatDayHeader } = renderFormatters({
				dayHeaderFormat: { weekday: 'long' },
			})
			expect(formatDayHeader(wednesday)).toBe('Wednesday')
		})

		it('uses the calendar locale', () => {
			const { formatDayHeader } = renderFormatters({
				locale: 'de-DE',
				dayHeaderFormat: { weekday: 'long' },
			})
			expect(formatDayHeader(wednesday)).toBe('Mittwoch')
		})
	})

	describe('formatEventTime', () => {
		it('defaults to start time only in month view and start–end range in week/day views (D9)', () => {
			expect(
				plainSpaces(
					renderFormatters({ initialView: 'month' }).formatEventTime(mkEvent())
				)
			).toBe('9:30 AM')
			expect(
				plainSpaces(
					renderFormatters({ initialView: 'week' }).formatEventTime(mkEvent())
				)
			).toBe('9:30 – 10:30 AM')
		})

		it('shows the start time when displayEventTime is on', () => {
			const { formatEventTime } = renderFormatters({
				initialView: 'month',
				displayEventTime: true,
			})
			expect(plainSpaces(formatEventTime(mkEvent()))).toBe('9:30 AM')
		})

		it('shows the start time when only eventTimeFormat is given', () => {
			const { formatEventTime } = renderFormatters({
				initialView: 'month',
				eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
			})
			expect(formatEventTime(mkEvent())).toBe('09:30')
		})

		it('hides the time when displayEventTime is off, whatever the format', () => {
			const { formatEventTime } = renderFormatters({
				displayEventTime: false,
				eventTimeFormat: { hour: '2-digit', minute: '2-digit' },
			})
			expect(formatEventTime(mkEvent())).toBeUndefined()
		})

		it('never gives an all-day event a time', () => {
			const { formatEventTime } = renderFormatters({ displayEventTime: true })
			expect(formatEventTime(mkEvent({ allDay: true }))).toBeUndefined()
		})

		it('shows the end too when displayEventEnd is on', () => {
			const { formatEventTime } = renderFormatters({
				displayEventTime: true,
				displayEventEnd: true,
				eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
			})
			expect(plainSpaces(formatEventTime(mkEvent()))).toBe('09:30 – 10:30')
		})

		it('writes a same-day range the way the locale does', () => {
			const { formatEventTime } = renderFormatters({
				locale: 'de-DE',
				displayEventEnd: true,
				eventTimeFormat: { hour: '2-digit', minute: '2-digit' },
			})
			const event = mkEvent()
			const expected = new Intl.DateTimeFormat('de-DE', {
				hour: '2-digit',
				minute: '2-digit',
				timeZone: 'UTC',
			}).formatRange(new Date(event.start), new Date(event.end))
			expect(formatEventTime(event)).toBe(expected)
			expect(expected).not.toContain(' – ')
		})

		it('writes only times for an event that ends on another day', () => {
			const { formatEventTime } = renderFormatters({
				displayEventEnd: true,
				eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
			})
			const overnight = mkEvent({
				start: '2025-03-12T21:30:00.000Z',
				end: '2025-03-13T01:00:00.000Z',
			})
			expect(plainSpaces(formatEventTime(overnight))).toBe('21:30 – 01:00')
		})

		it('hides the end when displayEventEnd is off', () => {
			const { formatEventTime } = renderFormatters({
				displayEventTime: true,
				displayEventEnd: false,
				eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
			})
			expect(formatEventTime(mkEvent())).toBe('09:30')
		})

		it('lets the locale decide 12 or 24 hour when timeFormat was not passed', () => {
			const { formatEventTime } = renderFormatters({
				initialView: 'month',
				locale: 'de-DE',
				eventTimeFormat: { hour: '2-digit', minute: '2-digit' },
			})
			expect(formatEventTime(mkEvent())).toBe('09:30')
		})

		it('writes the time on the calendar timezone clock', () => {
			const { formatEventTime } = renderFormatters({
				initialView: 'month',
				timezone: 'Asia/Tokyo',
				eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
			})
			expect(formatEventTime(mkEvent())).toBe('18:30')
		})
	})

	describe('formatTitle', () => {
		const start = mustParse('2025-03-12T09:00:00.000Z', 'UTC')
		const end = mustParse('2025-03-12T09:00:00.000Z', 'UTC')

		it('is undefined when no format is set, so the built-in title stays', () => {
			expect(renderFormatters().formatTitle(start, end)).toBeUndefined()
		})

		it('formats a single date with the given Intl options', () => {
			const { formatTitle } = renderFormatters({
				titleFormat: { month: 'long', year: 'numeric' },
			})
			expect(formatTitle(start, end)).toBe('March 2025')
		})

		it('formats a range with the given Intl options', () => {
			const { formatTitle } = renderFormatters({
				titleFormat: { month: 'long', day: 'numeric' },
			})
			const rangeEnd = mustParse('2025-03-15T09:00:00.000Z', 'UTC')
			expect(plainSpaces(formatTitle(start, rangeEnd))).toBe('March 12 – 15')
		})
	})
})
