import { describe, expect, it } from 'bun:test'
import { type CalendarEvent, SLOT_TOOLBAR } from '@ilamy/calendar'
import { exportToICalendar, icalPlugin } from './index'

const noCollect = (): unknown[] => []

const createEvent = (
	overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id: 'test-event',
	title: 'Test Event',
	start: '2025-08-04T09:00:00.000Z',
	end: '2025-08-04T10:00:00.000Z',
	...overrides,
})

const extractVEvent = (ical: string, index = 0): string => {
	const matches = ical.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)
	return matches?.at(index) ?? ''
}

const utf8Length = (text: string): number =>
	new TextEncoder().encode(text).length

const unfold = (ical: string): string => ical.replaceAll('\r\n ', '')

describe('iCalendar Export (RFC 5545)', () => {
	it('generates valid VCALENDAR header, footer, CRLF endings, and UTC VTIMEZONE', () => {
		const ical = exportToICalendar([createEvent()], noCollect)

		expect(ical).toMatch(/^BEGIN:VCALENDAR\r\n/)
		expect(ical).toContain('VERSION:2.0')
		expect(ical).toContain('PRODID:-//ilamy//ilamy Calendar//EN')
		expect(ical).toContain('CALSCALE:GREGORIAN')
		expect(ical).toContain('METHOD:PUBLISH')
		expect(ical).toContain('BEGIN:VTIMEZONE')
		expect(ical).toContain('TZID:UTC')
		expect(ical).toContain('END:VTIMEZONE')
		expect(ical.endsWith('END:VCALENDAR\r\n')).toBe(true)
		expect(ical.endsWith('\r\n\r\n')).toBe(false)
	})

	it('exports simple UTC timed events and optional fields', () => {
		const ical = exportToICalendar(
			[
				createEvent({
					id: 'simple-1',
					title: 'Simple Meeting',
					description: 'A simple test meeting',
					location: 'Conference Room A',
					uid: 'simple-1@ilamy.calendar',
				}),
			],
			noCollect
		)
		const vevent = extractVEvent(ical)

		expect(vevent).toContain('UID:simple-1@ilamy.calendar')
		expect(vevent).toContain('SUMMARY:Simple Meeting')
		expect(vevent).toContain('DESCRIPTION:A simple test meeting')
		expect(vevent).toContain('LOCATION:Conference Room A')
		expect(vevent).toContain('DTSTART:20250804T090000Z')
		expect(vevent).toContain('DTEND:20250804T100000Z')
		expect(vevent).toContain('STATUS:CONFIRMED')
		expect(vevent).toContain('TRANSP:OPAQUE')
	})

	it('exports all-day events with exclusive DTEND VALUE=DATE (#248)', () => {
		const ical = exportToICalendar(
			[
				createEvent({
					id: 'all-day-1',
					title: 'Company Holiday',
					start: '2025-12-25T00:00:00.000Z',
					end: '2025-12-26T00:00:00.000Z',
					allDay: true,
				}),
			],
			noCollect
		)

		expect(ical).toContain('DTSTART;VALUE=DATE:20251225')
		expect(ical).toContain('DTEND;VALUE=DATE:20251226')
	})

	it('preserves the local calendar day of an offset all-day event even east of UTC', () => {
		const ical = exportToICalendar(
			[
				createEvent({
					id: 'tokyo-holiday',
					title: 'Tokyo Holiday',
					start: '2025-12-25T00:00:00+09:00',
					end: '2025-12-26T00:00:00+09:00',
					allDay: true,
				}),
			],
			noCollect
		)

		expect(ical).toContain('DTSTART;VALUE=DATE:20251225')
		expect(ical).toContain('DTEND;VALUE=DATE:20251226')
	})

	it('collects plugin-contributed VEVENT properties (e.g. RRULE / EXDATE)', () => {
		const collect = (point: string) => {
			if (point === 'ical:vevent-properties') {
				return [
					'RRULE:FREQ=WEEKLY;BYDAY=MO;INTERVAL=1',
					'EXDATE:20250811T090000Z',
				]
			}
			return []
		}
		const ical = exportToICalendar([createEvent()], collect)

		expect(ical).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO;INTERVAL=1')
		expect(ical).toContain('EXDATE:20250811T090000Z')
	})

	it('escapes special characters per RFC 5545 §3.3.11', () => {
		const ical = exportToICalendar(
			[
				createEvent({
					title: 'Path\\A; B, C',
					description: 'Line 1\r\nLine 2\nLine 3',
					location: 'Room A; Floor 2, Building',
				}),
			],
			noCollect,
			'Work; Personal, Events'
		)

		expect(ical).toContain('X-WR-CALNAME:Work\\; Personal\\, Events')
		expect(ical).toContain('SUMMARY:Path\\\\A\\; B\\, C')
		expect(ical).toContain('DESCRIPTION:Line 1\\nLine 2\\nLine 3')
		expect(ical).toContain('LOCATION:Room A\\; Floor 2\\, Building')
	})

	it('folds lines longer than 75 octets without splitting UTF-8 characters (§3.1)', () => {
		const title = 'é€😀'.repeat(60)
		const ical = exportToICalendar([createEvent({ title })], noCollect)
		const lines = ical.split('\r\n')

		expect(lines.map(utf8Length).filter((len) => len > 75)).toEqual([])
		expect(unfold(ical)).toContain(`SUMMARY:${title}`)
		expect(lines.every((line) => line.isWellFormed())).toBe(true)
	})
})

describe('RFC 5545 §3.6.5 VTIMEZONE and TZID export', () => {
	it('emits DTSTART;TZID= and DST VTIMEZONE for America/New_York events', () => {
		const ical = exportToICalendar(
			[
				createEvent({
					id: 'ny-meeting',
					title: 'NYC Standup',
					start: '2025-08-04T09:00:00-04:00',
					end: '2025-08-04T10:00:00-04:00',
					timezone: 'America/New_York',
				}),
			],
			noCollect
		)

		expect(ical).toContain('BEGIN:VTIMEZONE')
		expect(ical).toContain('TZID:America/New_York')
		expect(ical).toContain('BEGIN:DAYLIGHT')
		expect(ical).toContain('BEGIN:STANDARD')
		expect(ical).toContain('TZOFFSETFROM:-0500')
		expect(ical).toContain('TZOFFSETTO:-0400')
		expect(ical).toContain('DTSTART;TZID=America/New_York:20250804T090000')
		expect(ical).toContain('DTEND;TZID=America/New_York:20250804T100000')
	})

	it('emits fixed-offset VTIMEZONE for non-DST zones (Asia/Tokyo and #314 America/Whitehorse)', () => {
		const ical = exportToICalendar(
			[
				createEvent({
					id: 'tokyo-1',
					title: 'Tokyo Sync',
					start: '2025-08-04T09:00:00+09:00',
					end: '2025-08-04T10:00:00+09:00',
					timezone: 'Asia/Tokyo',
				}),
				createEvent({
					id: 'yukon-314',
					title: 'Yukon Future Event',
					start: '2025-11-15T09:00:00-07:00',
					end: '2025-11-15T10:00:00-07:00',
					timezone: 'America/Whitehorse',
				}),
			],
			noCollect
		)

		expect(ical).toContain('TZID:Asia/Tokyo')
		expect(ical).toContain('TZOFFSETTO:+0900')
		expect(ical).toContain('DTSTART;TZID=Asia/Tokyo:20250804T090000')
		expect(ical).toContain('TZID:America/Whitehorse')
		expect(ical).toContain('TZOFFSETTO:-0700')
		expect(ical).toContain('DTSTART;TZID=America/Whitehorse:20251115T090000')
	})

	it('uses calendar timezone option when event.timezone is omitted', () => {
		const ical = exportToICalendar(
			[
				createEvent({
					start: '2025-08-04T13:00:00.000Z',
					end: '2025-08-04T14:00:00.000Z',
				}),
			],
			noCollect,
			{ calendarName: 'Team Cal', timezone: 'America/New_York' }
		)

		expect(ical).toContain('X-WR-CALNAME:Team Cal')
		expect(ical).toContain('DTSTART;TZID=America/New_York:20250804T090000')
		expect(ical).toContain('DTEND;TZID=America/New_York:20250804T100000')
	})
})

describe('icalPlugin', () => {
	it('mounts toolbar slot by default and omits when showToolbarButton is false', () => {
		const defaultPlugin = icalPlugin()
		expect(defaultPlugin.name).toBe('ical')
		expect(
			defaultPlugin.renderSlot?.(SLOT_TOOLBAR, { placement: 'desktop' })
		).toBeTruthy()
		expect(defaultPlugin.renderSlot?.('other-slot', {})).toBeNull()

		const headlessPlugin = icalPlugin({ showToolbarButton: false })
		expect(
			headlessPlugin.renderSlot?.(SLOT_TOOLBAR, { placement: 'desktop' })
		).toBeNull()
	})
})
