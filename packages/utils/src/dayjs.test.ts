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

/**
 * Unitless comparison is a question about INSTANTS, and dayjs documents it as
 * such: "default milliseconds"
 * (https://day.js.org/docs/en/query/is-before, .../is-same, .../is-same-or-after).
 *
 * Upstream does not honour that for timezone-aware instances. Every comparator
 * routes through `startOf`, dayjs-timezone overrides `startOf` with a
 * format -> reparse -> `.tz(zone, true)` round-trip, and that re-anchor MOVES an
 * instance whose UTC offset is stale. Two instants an hour apart then compare
 * equal. Separately it costs 45-135µs per call, which is what made the per-day
 * hot paths collapse (#245).
 *
 * So the comparators are overridden to answer by instant whenever no unit is
 * given and the operand is already a Dayjs. These cases pin BOTH halves of that
 * contract: the instant answers, and the untouched fallbacks.
 */
describe('comparators answer by instant', () => {
	const TZ = 'America/New_York'

	afterEach(() => {
		dayjs.tz.setDefault(undefined)
	})

	/**
	 * `add` holds the wall clock but carries the previous offset across a DST
	 * transition, so this is 2025-03-10 00:00 -05:00 (05:00Z) where true local
	 * midnight is 04:00Z. A real drifted instance, not a contrived one.
	 */
	const staleAndTrueMidnight = () => {
		dayjs.tz.setDefault(TZ)
		const stale = dayjs
			.tz('2025-03-08T00:00:00', TZ)
			.startOf('day')
			.add(2, 'day')
		const trueMidnight = dayjs.tz('2025-03-10T00:00:00', TZ)
		return { stale, trueMidnight }
	}

	it('treats two instants an hour apart as different', () => {
		const { stale, trueMidnight } = staleAndTrueMidnight()
		expect(stale.valueOf() - trueMidnight.valueOf()).toBe(3_600_000)
		expect(stale.isSame(trueMidnight)).toBe(false)
	})

	it('orders a stale-offset instance by its real instant', () => {
		const { stale, trueMidnight } = staleAndTrueMidnight()
		expect(stale.isAfter(trueMidnight)).toBe(true)
		expect(stale.isBefore(trueMidnight)).toBe(false)
		expect(stale.isSameOrAfter(trueMidnight)).toBe(true)
		expect(stale.isSameOrBefore(trueMidnight)).toBe(false)
	})

	it('agrees with valueOf for ordinary instances', () => {
		dayjs.tz.setDefault(TZ)
		const earlier = dayjs.tz('2025-07-15T09:30:00', TZ)
		const later = earlier.add(2, 'hour')
		expect(earlier.isBefore(later)).toBe(true)
		expect(later.isAfter(earlier)).toBe(true)
		expect(earlier.isSame(earlier)).toBe(true)
		expect(earlier.isSameOrBefore(earlier)).toBe(true)
		expect(earlier.isSameOrAfter(earlier)).toBe(true)
	})

	it('leaves unit-ed comparison to dayjs', () => {
		dayjs.tz.setDefault(TZ)
		const morning = dayjs.tz('2025-07-15T09:00:00', TZ)
		const night = dayjs.tz('2025-07-15T23:00:00', TZ)
		expect(morning.isSame(night, 'day')).toBe(true)
		expect(morning.isSame(night, 'hour')).toBe(false)
		expect(morning.isBefore(night, 'day')).toBe(false)
	})

	it('still accepts operands that are not Dayjs', () => {
		dayjs.tz.setDefault(TZ)
		const instance = dayjs.tz('2025-07-15T09:00:00', TZ)
		expect(instance.isAfter('2020-01-01T00:00:00.000Z')).toBe(true)
		expect(instance.isBefore(new Date('2030-01-01T00:00:00.000Z'))).toBe(true)
		expect(instance.isSame(instance.valueOf())).toBe(true)
	})
})
