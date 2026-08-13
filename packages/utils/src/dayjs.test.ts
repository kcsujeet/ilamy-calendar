import { afterEach, describe, expect, it } from 'bun:test'
import dayjs from './dayjs'

/**
 * The configured dayjs takes exactly one argument and resolves it in the zone
 * set through `dayjs.tz.setDefault`, falling back to the machine's zone when the
 * calendar has none. These tests pin that contract: a string that carries an
 * offset keeps the instant it denotes (#247), a string that carries none is
 * anchored in the configured zone rather than the machine's, and a second
 * argument is a compile error rather than a runtime `RangeError` (#242).
 *
 * The expectations below are absolute instants, never "whatever the machine
 * would have said", so they hold in any zone CI runs in. Note that the machine's
 * zone cannot be varied inside a test: dayjs's timezone plugin caches an
 * `Intl.DateTimeFormat` per zone, so a mid-run `process.env.TZ` change is
 * ignored once that formatter exists.
 */
describe('configured dayjs', () => {
	afterEach(() => {
		dayjs.tz.setDefault(undefined)
	})

	/** Parses `value` the way a calendar configured for `zone` would. */
	const parsedIn = (zone: string, value: string) => {
		dayjs.tz.setDefault(zone)
		return dayjs(value)
	}

	/**
	 * #242 reached runtime as `RangeError: invalid time zone: YYYY-MM-DD`, because
	 * the wrapper forwarded the format to `dayjs.tz()` as a zone name. The
	 * constructor no longer forwards a second argument at all, so the type is the
	 * only guard left: `tsc` reports an unused directive if this ever stops being
	 * an error. Parsing a format needs the CustomParseFormat plugin, which this
	 * module deliberately does not extend.
	 */
	it('ignores a second argument, which the type rejects outright', () => {
		// @ts-expect-error - the configured dayjs takes no parse format
		const parsed = dayjs('2026-03-02T00:00:00.000Z', 'YYYY-MM-DD')

		expect(parsed.toISOString()).toBe('2026-03-02T00:00:00.000Z')
	})

	/**
	 * #247. The wrapper used to hand strings to `dayjs.tz()`, which reads a string
	 * as wall-clock time in the target zone and so discarded the offset: in
	 * Europe/Vienna this instant rendered as 2026-08-17T22:00+02:00, two hours and
	 * one calendar day off, which showed an all-day event on the wrong date.
	 */
	it('keeps the instant of an ISO string with a Z offset', () => {
		const parsed = parsedIn('Europe/Vienna', '2026-08-17T22:00:00.000Z')

		expect(parsed.format('YYYY-MM-DDTHH:mm')).toBe('2026-08-18T00:00')
		expect(parsed.toISOString()).toBe('2026-08-17T22:00:00.000Z')
	})

	it('keeps the instant of an ISO string with a numeric offset', () => {
		const parsed = parsedIn('Asia/Tokyo', '2026-08-18T00:00:00+02:00')

		expect(parsed.format('YYYY-MM-DDTHH:mm')).toBe('2026-08-18T07:00')
		expect(parsed.toISOString()).toBe('2026-08-17T22:00:00.000Z')
	})

	it('reads a string and a Date for the same instant alike', () => {
		const iso = '2026-08-17T22:00:00.000Z'

		const fromString = parsedIn('Europe/Vienna', iso)
		const fromDate = dayjs(new Date(iso))

		expect(fromString.valueOf()).toBe(fromDate.valueOf())
	})

	/**
	 * An offset-less string names a wall-clock reading with no instant of its own,
	 * so the configured zone is what anchors it. Reading it in the machine's zone
	 * instead would put the same calendar on a different instant for every user,
	 * which is the whole class of bug the `timezone` prop exists to remove.
	 */
	it('anchors an offset-less string in the configured timezone', () => {
		const parsed = parsedIn('Asia/Tokyo', '2026-03-02')

		expect(parsed.toISOString()).toBe('2026-03-01T15:00:00.000Z')
		expect(parsed.format('YYYY-MM-DDTHH:mm')).toBe('2026-03-02T00:00')
	})

	it('anchors an offset-less date-time in the configured timezone', () => {
		const parsed = parsedIn('Asia/Tokyo', '2026-03-02T09:00')

		expect(parsed.toISOString()).toBe('2026-03-02T00:00:00.000Z')
	})

	/**
	 * With no `timezone` prop the calendar never calls `setDefault`, and the
	 * machine's zone is the only anchor left. Asserted against the machine's own
	 * midnight so the expectation travels between CI and a developer's laptop.
	 */
	it('falls back to the machine zone when no timezone is configured', () => {
		const machineMidnight = new Date(2026, 2, 2)

		const parsed = dayjs('2026-03-02')

		expect(parsed.valueOf()).toBe(machineMidnight.getTime())
	})

	it('stays invalid for an unparseable string', () => {
		expect(parsedIn('Asia/Tokyo', 'not-a-date').isValid()).toBe(false)
	})

	it('keeps the statics reachable through the wrapper', () => {
		const viaUnix = dayjs.unix(0).toISOString()
		const viaUtc = dayjs.utc('2026-03-02T00:00:00.000Z').toISOString()

		expect(viaUnix).toBe('1970-01-01T00:00:00.000Z')
		expect(viaUtc).toBe('2026-03-02T00:00:00.000Z')
		expect(dayjs.isDayjs(dayjs())).toBe(true)
	})
})
