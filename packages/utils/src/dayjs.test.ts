import { afterEach, describe, expect, it } from 'bun:test'
// This suite needs an UNCONFIGURED dayjs as an independent oracle: validating
// the offset memo against the configured instance would be checking it against
// itself.
// biome-ignore lint/style/noRestrictedImports: intentional unconfigured oracle
import rawDayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import dayjs from './dayjs'

// An unpatched dayjs, used as the oracle for what the offset check should
// return. The configured instance memoises that lookup; this one recomputes it
// every time, so comparing the two proves the cache cannot drift.
rawDayjs.extend(utc)
rawDayjs.extend(timezone)

const unmemoisedExpectedOffset = (
	instance: ReturnType<typeof dayjs>,
	zone: string
): number =>
	rawDayjs.tz(instance.format('YYYY-MM-DDTHH:mm:ss'), zone).utcOffset()

/**
 * The zone's true offset at a given instant, computed without the patch.
 *
 * Preferred over `unmemoisedExpectedOffset` for checking a corrected result.
 * A wall-clock string is ambiguous during a fall-back transition — 02:30 occurs
 * twice, once at +120 and once at +60 — so resolving a wall-clock string cannot
 * validate an instance that has already been normalised. An instant maps to
 * exactly one offset, so this invariant is well-defined everywhere.
 */
const trueOffsetAtInstant = (
	instance: ReturnType<typeof dayjs>,
	zone: string
): number => rawDayjs(instance.valueOf()).tz(zone).utcOffset()

afterEach(() => {
	dayjs.tz.setDefault()
})

/**
 * Transition dates for 2026. Northern-hemisphere zones spring forward in March
 * and fall back in October/November; southern-hemisphere zones do the reverse,
 * which is why Sydney and Adelaide are here. Adelaide additionally has a
 * half-hour base offset, and Kathmandu a 45-minute one with no DST at all.
 */
const zones: { zone: string; label: string; transitions: string[] }[] = [
	{
		zone: 'America/Los_Angeles',
		label: 'northern, whole-hour offset',
		transitions: ['2026-03-08', '2026-11-01'],
	},
	{
		zone: 'Europe/Berlin',
		label: 'northern, central European',
		transitions: ['2026-03-29', '2026-10-25'],
	},
	{
		zone: 'Australia/Sydney',
		label: 'southern, reversed transitions',
		transitions: ['2026-04-05', '2026-10-04'],
	},
	{
		zone: 'Australia/Adelaide',
		label: 'southern, half-hour offset',
		transitions: ['2026-04-05', '2026-10-04'],
	},
	{
		zone: 'Asia/Kathmandu',
		label: '45-minute offset, no DST',
		transitions: ['2026-03-08'],
	},
	{
		zone: 'UTC',
		label: 'no offset',
		transitions: ['2026-03-08'],
	},
]

describe('configured dayjs: startOf/endOf offset correction', () => {
	for (const { zone, label, transitions } of zones) {
		describe(`${zone} (${label})`, () => {
			for (const transition of transitions) {
				it(`keeps startOf('day') at local midnight around ${transition}`, () => {
					dayjs.tz.setDefault(zone)
					// The day before, the transition day itself, and the day after.
					for (const offset of [-1, 0, 1]) {
						const day = dayjs(`${transition}T12:00:00`).add(offset, 'day')
						const start = day.startOf('day')
						expect(start.format('HH:mm:ss')).toBe('00:00:00')
						expect(start.format('YYYY-MM-DD')).toBe(day.format('YYYY-MM-DD'))
					}
				})

				it(`keeps endOf('day') at the last local millisecond around ${transition}`, () => {
					dayjs.tz.setDefault(zone)
					for (const offset of [-1, 0, 1]) {
						const day = dayjs(`${transition}T12:00:00`).add(offset, 'day')
						const end = day.endOf('day')
						expect(end.format('HH:mm:ss.SSS')).toBe('23:59:59.999')
						expect(end.format('YYYY-MM-DD')).toBe(day.format('YYYY-MM-DD'))
					}
				})

				it(`normalises every moment on ${transition} to its own local midnight`, () => {
					dayjs.tz.setDefault(zone)
					// Sweep the whole transition day at 15-minute resolution, which
					// covers the nonexistent (spring-forward) and repeated (fall-back)
					// wall-clock hours. Every moment must resolve to midnight on the
					// calendar date it belongs to. This is the property the patch
					// provides, and it exercises a fresh cache key at each step.
					const dayStart = dayjs(`${transition}T00:00:00`).startOf('day')
					for (let quarter = 0; quarter < 96; quarter++) {
						const moment = dayStart.add(quarter * 15, 'minute')
						const start = moment.startOf('day')
						expect(start.format('HH:mm:ss.SSS')).toBe('00:00:00.000')
						expect(start.format('YYYY-MM-DD')).toBe(moment.format('YYYY-MM-DD'))
					}
				})

				it(`is idempotent and deterministic across ${transition}`, () => {
					dayjs.tz.setDefault(zone)
					const dayStart = dayjs(`${transition}T00:00:00`).startOf('day')
					for (let quarter = 0; quarter < 96; quarter++) {
						const moment = dayStart.add(quarter * 15, 'minute')
						const once = moment.startOf('day')
						// A cached offset must produce the same answer as the computation
						// that populated it: repeating the call, and re-normalising an
						// already-normalised value, must both be stable.
						expect(moment.startOf('day').valueOf()).toBe(once.valueOf())
						expect(once.startOf('day').valueOf()).toBe(once.valueOf())
						expect(once.startOf('day').utcOffset()).toBe(once.utcOffset())
					}
				})

				it(`does not share a cached offset across the ${transition} transition`, () => {
					dayjs.tz.setDefault(zone)
					const before = dayjs(`${transition}T00:30:00`).startOf('day')
					const after = dayjs(`${transition}T23:30:00`).startOf('day')
					// Both are local midnight on the same date, so they agree; the point
					// is that the day AFTER may carry a different offset and must not
					// inherit a cached value from the day before.
					const nextDay = dayjs(`${transition}T12:00:00`)
						.add(1, 'day')
						.startOf('day')
					expect(before.format('HH:mm:ss')).toBe('00:00:00')
					expect(after.format('HH:mm:ss')).toBe('00:00:00')
					expect(nextDay.format('HH:mm:ss')).toBe('00:00:00')
					expect(nextDay.utcOffset()).toBe(
						unmemoisedExpectedOffset(nextDay, zone)
					)
				})
			}

			it('reports the true instant offset for unambiguous wall-clock times', () => {
				dayjs.tz.setDefault(zone)
				// Midday is never nonexistent or repeated in any of these zones, so the
				// instant-level invariant is well-defined and must hold.
				for (const transition of transitions) {
					for (const offset of [-2, -1, 0, 1, 2]) {
						const midday = dayjs(`${transition}T12:00:00`)
							.add(offset, 'day')
							.startOf('minute')
						expect(midday.utcOffset()).toBe(trueOffsetAtInstant(midday, zone))
					}
				}
			})

			it('produces day boundaries that are exactly one day apart in wall-clock terms', () => {
				dayjs.tz.setDefault(zone)
				for (const transition of transitions) {
					const first = dayjs(`${transition}T12:00:00`)
						.subtract(1, 'day')
						.startOf('day')
					const second = dayjs(`${transition}T12:00:00`).startOf('day')
					const third = dayjs(`${transition}T12:00:00`)
						.add(1, 'day')
						.startOf('day')
					// Consecutive local midnights, so 23h/24h/25h gaps are all valid —
					// what must hold is strict ordering and distinct calendar dates.
					expect(second.valueOf()).toBeGreaterThan(first.valueOf())
					expect(third.valueOf()).toBeGreaterThan(second.valueOf())
					expect(second.format('YYYY-MM-DD')).not.toBe(
						first.format('YYYY-MM-DD')
					)
				}
			})
		})
	}

	it('leaves results untouched when no default timezone is set', () => {
		dayjs.tz.setDefault()
		const start = dayjs('2026-03-08T12:00:00').startOf('day')
		expect(start.format('HH:mm:ss')).toBe('00:00:00')
	})

	it('returns consistent results on repeated calls, exercising the cache', () => {
		dayjs.tz.setDefault('America/Los_Angeles')
		const day = dayjs('2026-03-08T12:00:00')
		const first = day.startOf('day')
		const results = Array.from({ length: 50 }, () => day.startOf('day'))
		for (const result of results) {
			expect(result.valueOf()).toBe(first.valueOf())
			expect(result.utcOffset()).toBe(first.utcOffset())
		}
	})

	it('stays correct across many distinct zones in one session', () => {
		// Interleaves zones so a cache keyed without the zone would collide: the
		// same wall minute resolves to a different offset in each.
		const seen = new Map<string, number>()
		for (const { zone } of zones) {
			dayjs.tz.setDefault(zone)
			const start = dayjs('2026-06-15T12:00:00').startOf('day')
			expect(start.format('HH:mm:ss')).toBe('00:00:00')
			expect(start.utcOffset()).toBe(unmemoisedExpectedOffset(start, zone))
			seen.set(zone, start.utcOffset())
		}
		// Re-visit each zone; a zone-blind cache would now return a neighbour's.
		for (const { zone } of zones) {
			dayjs.tz.setDefault(zone)
			const firstPass = seen.get(zone)
			expect(firstPass).toBeDefined()
			const start = dayjs('2026-06-15T12:00:00').startOf('day')
			expect(start.utcOffset()).toBe(firstPass ?? Number.NaN)
		}
	})
})

/**
 * The configured dayjs forwards every constructor argument to `dayjs.tz()`,
 * whose second parameter is a TIMEZONE rather than a parse format. These tests
 * pin both halves of that contract: the single-argument form parses in the
 * configured zone, and the two-argument form is a compile error rather than a
 * runtime `RangeError: invalid time zone` (#242).
 */
describe('configured dayjs', () => {
	afterEach(() => {
		dayjs.tz.setDefault(undefined)
	})

	it('rejects a parse format at the type level', () => {
		// A format string here would be read as a timezone name and throw at
		// runtime, so the type must not offer the overload. `tsc` reports an
		// unused directive if this ever stops being an error.
		// @ts-expect-error - the configured dayjs takes no parse format
		const parseWithFormat = () => dayjs('2026-03-02', 'YYYY-MM-DD')

		expect(parseWithFormat).toThrow('invalid time zone')
	})

	it('parses a date-only string as midnight in the configured timezone', () => {
		dayjs.tz.setDefault('Asia/Tokyo')

		const parsed = dayjs('2026-03-02')

		expect(parsed.format('YYYY-MM-DDTHH:mm')).toBe('2026-03-02T00:00')
		expect(parsed.toISOString()).toBe('2026-03-01T15:00:00.000Z')
	})

	it('keeps the statics reachable through the wrapper', () => {
		const viaUnix = dayjs.unix(0).toISOString()
		const viaUtc = dayjs.utc('2026-03-02T00:00:00.000Z').toISOString()

		expect(viaUnix).toBe('1970-01-01T00:00:00.000Z')
		expect(viaUtc).toBe('2026-03-02T00:00:00.000Z')
		expect(dayjs.isDayjs(dayjs())).toBe(true)
	})
})
