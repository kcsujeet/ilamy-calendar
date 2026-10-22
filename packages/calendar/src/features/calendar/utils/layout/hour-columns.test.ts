import { afterEach, describe, expect, it } from 'bun:test'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { wallClockDiff } from '@ilamy/utils/helpers'
import { getDayHours } from '@/utils/date-utils'
import { createHourColumnSpanner } from './hour-columns'

const zones = ['UTC', 'America/New_York', 'America/Vancouver']

afterEach(() => {
	dayjs.tz.setDefault()
})

/** A day's 24 hour columns, built as the week view builds them. */
const hourColumnsOf = (zone: string, dayISO: string): Dayjs[] => {
	dayjs.tz.setDefault(zone)
	return getDayHours({ referenceDate: dayjs.tz(dayISO, zone) })
}

/** A wall-clock time in the zone: `at('2025-01-13', 9, 30)` is 09:30 there. */
const wallClock = (zone: string, dayISO: string, hour: number, minute = 0) =>
	dayjs.tz(dayISO, zone).add(hour * 60 + minute, 'minute')

describe.each(zones)('createHourColumnSpanner in %s', (zone) => {
	const day = '2025-01-13T00:00:00.000'
	const columns = hourColumnsOf(zone, day)
	const spanOf = createHourColumnSpanner(columns)
	const at = (hour: number, minute = 0) => wallClock(zone, day, hour, minute)
	const cols = (start: Dayjs, end: Dayjs) => {
		const span = spanOf({ start, end })
		return span ? [span.startCol, span.endCol] : null
	}

	it('puts an event inside one column in that column', () => {
		expect(cols(at(9, 15), at(9, 45))).toEqual([9, 9])
	})

	it('ends exclusively: an event ending on a column start leaves that column out', () => {
		expect(cols(at(9), at(10))).toEqual([9, 9])
		expect(cols(at(9), at(10).add(1, 'millisecond'))).toEqual([9, 10])
	})

	it('starts inclusively: an event starting on a column start is in that column', () => {
		expect(cols(at(9), at(9, 30))).toEqual([9, 9])
	})

	it('draws nothing for an event that only touches the first column from before', () => {
		expect(cols(at(0).subtract(3, 'hour'), at(0))).toBeNull()
		expect(
			cols(at(0).subtract(3, 'hour'), at(0).add(1, 'millisecond'))
		).toEqual([0, 0])
	})

	it('keeps an instant event in the column holding it, even on a column edge', () => {
		expect(cols(at(10), at(10))).toEqual([10, 10])
		expect(cols(at(9, 59), at(9, 59))).toEqual([9, 9])
	})

	it('draws nothing for an instant event outside every column', () => {
		const before = at(0).subtract(1, 'millisecond')
		const after = at(24)
		expect(cols(before, before)).toBeNull()
		expect(cols(after, after)).toBeNull()
	})

	it('draws nothing for an event wholly outside the columns', () => {
		expect(cols(at(24), at(26))).toBeNull()
		expect(cols(at(-5), at(-1))).toBeNull()
	})

	it('flags an event that starts before the first column as truncated at the start', () => {
		const span = spanOf({ start: at(-2), end: at(3) })
		expect(span?.isTruncatedStart).toBe(true)
		expect(span?.startCol).toBe(0)
	})

	it('flags an end past the last column as truncated only once it passes the column', () => {
		const endsWithLastColumn = spanOf({ start: at(22), end: at(24) })
		const endsPastLastColumn = spanOf({
			start: at(22),
			end: at(24).add(1, 'millisecond'),
		})
		expect(endsWithLastColumn?.isTruncatedEnd).toBe(false)
		expect(endsPastLastColumn?.isTruncatedEnd).toBe(true)
	})

	it('spans several units only when the last occupied instant leaves the first hour', () => {
		const spans = (start: Dayjs, end: Dayjs) =>
			spanOf({ start, end })?.spansMultipleUnits
		expect(spans(at(9), at(10))).toBe(false)
		expect(spans(at(9, 30), at(10, 15))).toBe(true)
		expect(spans(at(9, 30), at(10))).toBe(false)
		expect(spans(at(10), at(10))).toBe(false)
	})

	it('flags an event that starts before its first column as spanning several units', () => {
		expect(spanOf({ start: at(-2), end: at(3) })?.spansMultipleUnits).toBe(true)
	})
})

describe('createHourColumnSpanner with gaps between days', () => {
	const zone = 'America/New_York'
	// Two days of 09:00-17:00 only: columns 0-7 are Monday, 8-15 are Tuesday.
	const monday = '2025-01-13T00:00:00.000'
	const tuesday = '2025-01-14T00:00:00.000'
	const workHours = (dayISO: string) =>
		hourColumnsOf(zone, dayISO).filter((c) => {
			const hour = Number(c.format('H'))
			return hour >= 9 && hour < 17
		})
	const columns = [...workHours(monday), ...workHours(tuesday)]
	const spanOf = createHourColumnSpanner(columns)

	it('draws nothing for an event that sits entirely in the overnight gap', () => {
		const start = wallClock(zone, monday, 18)
		const end = wallClock(zone, tuesday, 8)
		expect(spanOf({ start, end })).toBeNull()
	})

	it('puts an event crossing the gap in the columns on either side of it', () => {
		const start = wallClock(zone, monday, 16, 30)
		const end = wallClock(zone, tuesday, 9, 30)
		const span = spanOf({ start, end })
		expect(span?.startCol).toBe(7)
		expect(span?.endCol).toBe(8)
		expect(span?.isTruncatedStart).toBe(false)
		expect(span?.isTruncatedEnd).toBe(false)
	})

	it('truncates an event starting in the gap before the first column', () => {
		const start = wallClock(zone, monday, 7)
		const end = wallClock(zone, monday, 10)
		const span = spanOf({ start, end })
		expect(span?.startCol).toBe(0)
		expect(span?.isTruncatedStart).toBe(true)
		expect(span?.spansMultipleUnits).toBe(true)
	})
})

describe('createHourColumnSpanner on a day the clocks change', () => {
	const zone = 'America/New_York'
	// 9 March 2025: 02:00 never happens, so the "2" and "3" rows share an instant.
	const springForward = '2025-03-09T00:00:00.000'
	const columns = hourColumnsOf(zone, springForward)
	const spanOf = createHourColumnSpanner(columns)
	const at = (hour: number, minute = 0) =>
		wallClock(zone, springForward, hour, minute)

	it('has two columns for the same instant', () => {
		expect(columns.at(2)?.valueOf()).toBe(columns.at(3)?.valueOf())
	})

	it('puts an event in the later of the two columns sharing an hour', () => {
		const span = spanOf({ start: at(3, 15), end: at(3, 45) })
		expect([span?.startCol, span?.endCol]).toEqual([3, 3])
	})

	it('starts a span on the later column and runs on from it', () => {
		const span = spanOf({ start: at(3, 15), end: at(5, 30) })
		expect([span?.startCol, span?.endCol]).toEqual([3, 5])
	})

	it('places 09:00 in the 9 AM column, as the clock reads it', () => {
		const span = spanOf({ start: at(9), end: at(10) })
		expect([span?.startCol, span?.endCol]).toEqual([9, 9])
	})

	it('spans several units for an event running across the change', () => {
		// 01:30 EST to 03:30 EDT. (Ending exactly at 03:00 EDT is not pinned: that
		// answer still depends on the machine's zone, docs/timezones.md.)
		const endsAnHourIn = dayjs.tz('2025-03-09T03:30:00.000', zone)
		const span = spanOf({ start: at(1, 30), end: endsAnHourIn })
		expect(span?.spansMultipleUnits).toBe(true)
	})

	it('puts an instant event in the later duplicate column too', () => {
		const span = spanOf({ start: at(3), end: at(3) })
		expect([span?.startCol, span?.endCol]).toEqual([3, 3])
	})
})

describe('createHourColumnSpanner on a day with a missing midnight', () => {
	// Havana's clocks go forward at 00:00 on 9 March 2025, so the "00:00" column
	// shares an instant with 23:00 the evening before and is labelled an hour
	// past it. The later column of the pair counts, and nothing is left on the
	// 23:00 event, as before.
	// Built from the instant and the two offsets rather than by `getDayHours`,
	// whose answer for a nonexistent time depends on the machine's own zone.
	const zone = 'America/Havana'
	const eleven = dayjs.tz('2025-03-08T22:00:00.000', zone).add(1, 'hour')
	const columns = [
		dayjs.tz('2025-03-08T22:00:00.000', zone),
		eleven,
		dayjs.utc(eleven.valueOf()).utcOffset(-240),
		dayjs.utc(eleven.valueOf()).add(1, 'hour').utcOffset(-240),
	]
	const spanOf = createHourColumnSpanner(columns)

	it('shares an instant between the 23:00 and "00:00" columns', () => {
		expect(columns.at(1)?.valueOf()).toBe(columns.at(2)?.valueOf())
		expect(columns.at(1)?.format('HH')).toBe('23')
		expect(columns.at(2)?.format('HH')).toBe('00')
	})

	it('draws nothing for an event the later column of the pair does not hold', () => {
		const start = dayjs.tz('2025-03-08T23:00:00.000', zone)
		const end = dayjs.tz('2025-03-08T23:45:00.000', zone)
		expect(spanOf({ start, end })).toBeNull()
	})

	it('still places an event on the evening before', () => {
		const start = dayjs.tz('2025-03-08T22:00:00.000', zone)
		const end = dayjs.tz('2025-03-08T22:45:00.000', zone)
		const span = spanOf({ start, end })
		expect([span?.startCol, span?.endCol]).toEqual([0, 0])
	})
})

describe.each(zones)(
	'createHourColumnSpanner agrees with scanning every column in %s',
	(zone) => {
		// The definition the binary search replaces: test each column in turn.
		const scanColumns = (
			columns: Dayjs[],
			start: Dayjs,
			end: Dayjs
		): number[] => {
			const isInstant = end.isSame(start)
			return columns.flatMap((column, index) => {
				const isShadowed = columns.at(index + 1)?.isSame(column) ?? false
				const hoursAtStart = wallClockDiff(start, column, 'hour')
				const hoursAtEnd = wallClockDiff(end, column, 'hour')
				const startsInside = hoursAtStart >= 0 && hoursAtStart < 1
				const reaches = hoursAtStart < 1 && hoursAtEnd > 0
				const overlaps = isInstant ? startsInside : reaches
				return overlaps && !isShadowed ? [index] : []
			})
		}

		it.each([
			'2025-03-09T00:00:00.000',
			'2025-11-02T00:00:00.000',
			'2025-01-13T00:00:00.000',
		])('on %s', (dayISO) => {
			const columns = hourColumnsOf(zone, dayISO)
			const spanOf = createHourColumnSpanner(columns)
			const first = dayjs.tz(dayISO, zone).subtract(3, 'hour')
			const lengthsInMinutes = [0, 1, 30, 60, 61, 90, 180, 1500]
			const mismatches: string[] = []
			for (let offset = 0; offset < 32 * 4; offset++) {
				for (const length of lengthsInMinutes) {
					const start = first.add(offset * 15, 'minute')
					const end = start.add(length, 'minute')
					const expected = scanColumns(columns, start, end)
					const span = spanOf({ start, end })
					const actual = span ? [span.startCol, span.endCol] : []
					const expectedEdges = [expected.at(0), expected.at(-1)].filter(
						(edge) => edge !== undefined
					)
					if (actual.join() !== expectedEdges.join()) {
						mismatches.push(`${start.format()} +${length}m`)
					}
				}
			}
			expect(mismatches).toEqual([])
		})
	}
)
