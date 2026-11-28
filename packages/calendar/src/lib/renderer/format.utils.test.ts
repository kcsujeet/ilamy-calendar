import { describe, expect, it } from 'bun:test'
import { parseDate } from '../../utils/temporal'
import {
	createCalendarFormatters,
	formatCalendarHeaderTitle,
} from './utils/format.utils'

describe('lib/renderer format.utils', () => {
	const sampleEvent = {
		id: 'ev1',
		title: 'Sync',
		start: '2026-11-19T09:15:00+00:00',
		end: '2026-11-19T10:30:00+00:00',
	}

	it('respects displayEventTime and view-dependent displayEventEnd defaults', () => {
		const monthFmt = createCalendarFormatters({
			view: 'month',
			locale: 'en-US',
			timezone: 'UTC',
			timeFormat: '24-hour',
			explicitTimeFormat: '24-hour',
		})
		expect(monthFmt.formatEventTime(sampleEvent)).toBe('09:15')

		const weekFmt = createCalendarFormatters({
			view: 'week',
			locale: 'en-US',
			timezone: 'UTC',
			timeFormat: '24-hour',
			explicitTimeFormat: '24-hour',
		})
		const weekLabel = weekFmt.formatEventTime(sampleEvent)
		expect(weekLabel).toContain('09:15')
		expect(weekLabel).toContain('10:30')

		const hiddenFmt = createCalendarFormatters({
			view: 'week',
			locale: 'en-US',
			timezone: 'UTC',
			displayEventTime: false,
		})
		expect(hiddenFmt.formatEventTime(sampleEvent)).toBeUndefined()
	})

	it('honors custom Intl format props (slotHeaderFormat, dayHeaderFormat, eventTimeFormat, titleFormat)', () => {
		const fmt = createCalendarFormatters({
			view: 'week',
			locale: 'en-US',
			timezone: 'UTC',
			slotHeaderFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
			dayHeaderFormat: { weekday: 'long' },
			eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
			titleFormat: { month: 'long', year: 'numeric' },
		})

		const noon = parseDate('2026-11-19T14:00:00Z', 'UTC')
		expect(noon).toBeDefined()
		if (!noon) return
		expect(fmt.formatSlotHeader(noon)).toBe('14:00')
		expect(fmt.formatDayHeader(noon)).toBe('Thursday')
		expect(fmt.formatEventTime(sampleEvent)).toContain('09:15')

		const headerTitle = formatCalendarHeaderTitle({
			currentDateIso: '2026-11-19T09:00:00+00:00',
			visibleRange: {
				start: '2026-11-15T00:00:00+00:00',
				end: '2026-11-22T00:00:00+00:00',
			},
			view: 'day',
			firstDayOfWeek: 0,
			hiddenDays: undefined,
			timezone: 'UTC',
			locale: 'en-US',
			formatters: fmt,
		})
		expect(headerTitle).toBe('November 2026')

		const rangeFmt = createCalendarFormatters({
			view: 'month',
			locale: 'en-US',
			timezone: 'UTC',
			titleFormat: { day: 'numeric', month: 'short', year: 'numeric' },
		})
		expect(
			formatCalendarHeaderTitle({
				currentDateIso: '2025-03-12T09:00:00+00:00',
				visibleRange: {
					start: '2025-02-23T00:00:00+00:00',
					end: '2025-04-06T00:00:00+00:00',
				},
				view: 'month',
				firstDayOfWeek: 0,
				hiddenDays: undefined,
				timezone: 'UTC',
				locale: 'en-US',
				formatters: rangeFmt,
			})
		).toContain('Mar')
	})
})
