import { describe, expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import {
	add,
	dayKey,
	diffDayAndTime,
	elapsedDiff,
	endOf,
	formatDate,
	formatDateRange,
	fromFields,
	getFields,
	getOffsetString,
	getTransition,
	getWeekNumber,
	isAfter,
	isBefore,
	isSameDay,
	isSameInstant,
	isSameOrAfter,
	isSameOrBefore,
	isValidTimeZone,
	maxDate,
	minDate,
	now,
	offsetMinutes,
	overlapsRange,
	parseDate,
	resolveZone,
	startOf,
	subtract,
	toDate,
	toEpochMs,
	toOffsetIso,
	toUtcIso,
	wallClockDiff,
	withTime,
	withZone,
} from './temporal'

const MUST_PARSE = (
	input: Parameters<typeof parseDate>[0],
	timezone?: string
) => {
	const parsed = parseDate(input, timezone)
	if (!parsed) {
		throw new Error(`Expected valid date for ${String(input)}`)
	}
	return parsed
}

describe('temporal date core', () => {
	describe('parseDate & zone anchoring', () => {
		it('keeps the instant of an ISO string with Z and displays in the configured zone', () => {
			const parsed = MUST_PARSE('2026-08-17T22:00:00.000Z', 'Europe/Vienna')

			expect(toUtcIso(parsed)).toBe('2026-08-17T22:00:00.000Z')
			expect(dayKey(parsed)).toBe('2026-08-18')
			expect(parsed.hour).toBe(0)
			expect(parsed.minute).toBe(0)
			expect(parsed.timeZoneId).toBe('Europe/Vienna')
		})

		it('keeps the instant of an ISO string with a numeric offset (+HH:MM and +HHMM)', () => {
			const colon = MUST_PARSE('2026-08-18T00:00:00+02:00', 'Asia/Tokyo')
			const compact = MUST_PARSE('2026-08-18T00:00:00+0200', 'Asia/Tokyo')

			expect(toUtcIso(colon)).toBe('2026-08-17T22:00:00.000Z')
			expect(colon.hour).toBe(7)
			expect(toEpochMs(compact)).toBe(toEpochMs(colon))
		})

		it('anchors an offset-less date or datetime string in the configured zone', () => {
			const dateOnly = MUST_PARSE('2026-03-02', 'Asia/Tokyo')
			expect(toUtcIso(dateOnly)).toBe('2026-03-01T15:00:00.000Z')
			expect(dayKey(dateOnly)).toBe('2026-03-02')
			expect(dateOnly.hour).toBe(0)

			const dateTime = MUST_PARSE('2026-03-02T09:30', 'Asia/Tokyo')
			expect(toUtcIso(dateTime)).toBe('2026-03-02T00:30:00.000Z')
			expect(dateTime.hour).toBe(9)
			expect(dateTime.minute).toBe(30)

			const spaceSep = MUST_PARSE('2026-03-02 09:30:15', 'Asia/Tokyo')
			expect(toUtcIso(spaceSep)).toBe('2026-03-02T00:30:15.000Z')
		})

		it('reads Date, epoch ms, and ZonedDate as instants and converts to target zone', () => {
			const iso = '2026-08-17T22:00:00.000Z'
			const jsDate = new Date(iso)
			const fromJsDate = MUST_PARSE(jsDate, 'Asia/Tokyo')
			const fromMs = MUST_PARSE(jsDate.getTime(), 'Asia/Tokyo')
			const fromZoned = MUST_PARSE(fromJsDate, 'America/New_York')

			expect(toUtcIso(fromJsDate)).toBe(iso)
			expect(fromJsDate.hour).toBe(7)
			expect(toEpochMs(fromMs)).toBe(jsDate.getTime())
			expect(toUtcIso(fromZoned)).toBe(iso)
			expect(fromZoned.hour).toBe(18)
			expect(fromZoned.timeZoneId).toBe('America/New_York')
		})

		it('returns undefined for missing or unparseable input without throwing', () => {
			expect(parseDate(undefined, 'UTC')).toBeUndefined()
			expect(parseDate('', 'UTC')).toBeUndefined()
			expect(parseDate('not-a-date', 'UTC')).toBeUndefined()
			expect(parseDate(Number.NaN, 'UTC')).toBeUndefined()
			expect(parseDate(new Date(Number.NaN), 'UTC')).toBeUndefined()
		})

		it('supports multiple timezones simultaneously with zero global state leakage', () => {
			const ny = MUST_PARSE('2026-03-09T09:00', 'America/New_York')
			const tokyo = MUST_PARSE('2026-03-09T09:00', 'Asia/Tokyo')
			const london = MUST_PARSE('2026-03-09T09:00', 'Europe/London')

			expect(ny.timeZoneId).toBe('America/New_York')
			expect(tokyo.timeZoneId).toBe('Asia/Tokyo')
			expect(london.timeZoneId).toBe('Europe/London')
			expect(toUtcIso(ny)).toBe('2026-03-09T13:00:00.000Z')
			expect(toUtcIso(tokyo)).toBe('2026-03-09T00:00:00.000Z')
			expect(toUtcIso(london)).toBe('2026-03-09T09:00:00.000Z')
		})
	})

	describe('DST disambiguation (RFC 5545 §3.3.5)', () => {
		it('resolves a repeated autumn hour to its first occurrence', () => {
			// America/New_York falls back on 2025-11-02 at 02:00 EDT -> 01:00 EST
			const repeated = MUST_PARSE('2025-11-02T01:30', 'America/New_York')

			expect(toUtcIso(repeated)).toBe('2025-11-02T05:30:00.000Z')
			expect(offsetMinutes(repeated)).toBe(-240)
		})

		it('shifts a skipped spring-forward time forward by the gap', () => {
			// America/New_York springs forward on 2025-03-09 at 02:00 EST -> 03:00 EDT
			const skipped = MUST_PARSE('2025-03-09T02:30', 'America/New_York')

			expect(skipped.hour).toBe(3)
			expect(skipped.minute).toBe(30)
			expect(toUtcIso(skipped)).toBe('2025-03-09T07:30:00.000Z')
		})

		it('handles zones whose clocks change at midnight (America/Havana)', () => {
			// Havana springs forward on 2025-03-09 at 00:00 CST -> 01:00 CDT
			const springDay = MUST_PARSE('2025-03-09', 'America/Havana')
			const dayStart = startOf(springDay, 'day')

			expect(dayStart.hour).toBe(1)
			expect(dayStart.minute).toBe(0)
			expect(toUtcIso(dayStart)).toBe('2025-03-09T05:00:00.000Z')
		})
	})

	describe('boundaries (startOf / endOf)', () => {
		it('computes startOf and endOf for year, month, day, hour, minute', () => {
			const sample = MUST_PARSE('2026-02-15T14:37:45.123Z', 'UTC')

			expect(toUtcIso(startOf(sample, 'year'))).toBe('2026-01-01T00:00:00.000Z')
			expect(toUtcIso(endOf(sample, 'year'))).toBe('2026-12-31T23:59:59.999Z')
			expect(toUtcIso(startOf(sample, 'month'))).toBe(
				'2026-02-01T00:00:00.000Z'
			)
			expect(toUtcIso(endOf(sample, 'month'))).toBe('2026-02-28T23:59:59.999Z')
			expect(toUtcIso(startOf(sample, 'day'))).toBe('2026-02-15T00:00:00.000Z')
			expect(toUtcIso(endOf(sample, 'day'))).toBe('2026-02-15T23:59:59.999Z')
			expect(toUtcIso(startOf(sample, 'hour'))).toBe('2026-02-15T14:00:00.000Z')
			expect(toUtcIso(endOf(sample, 'hour'))).toBe('2026-02-15T14:59:59.999Z')
			expect(toUtcIso(startOf(sample, 'minute'))).toBe(
				'2026-02-15T14:37:00.000Z'
			)
			expect(toUtcIso(endOf(sample, 'minute'))).toBe('2026-02-15T14:37:59.999Z')
		})

		it('computes startOf/endOf week respecting weekStart (0=Sun, 1=Mon, 6=Sat)', () => {
			// 2026-03-04 is Wednesday (dayOfWeek = 3)
			const wed = MUST_PARSE('2026-03-04T12:00:00.000Z', 'UTC')

			expect(dayKey(startOf(wed, 'week', 0))).toBe('2026-03-01')
			expect(dayKey(endOf(wed, 'week', 0))).toBe('2026-03-07')

			expect(dayKey(startOf(wed, 'week', 1))).toBe('2026-03-02')
			expect(dayKey(endOf(wed, 'week', 1))).toBe('2026-03-08')

			expect(dayKey(startOf(wed, 'week', 6))).toBe('2026-02-28')
			expect(dayKey(endOf(wed, 'week', 6))).toBe('2026-03-06')
		})
	})

	describe('arithmetic, fields, and conversions', () => {
		it('adds and subtracts across DST keeping wall-clock time for day units', () => {
			// 2025-03-08 09:00 EST + 1 day = 2025-03-09 09:00 EDT (23 elapsed hours)
			const beforeDst = MUST_PARSE('2025-03-08T09:00', 'America/New_York')
			const nextDay = add(beforeDst, 1, 'day')

			expect(dayKey(nextDay)).toBe('2025-03-09')
			expect(nextDay.hour).toBe(9)
			expect(elapsedDiff(nextDay, beforeDst, 'hour')).toBe(23)
			expect(wallClockDiff(nextDay, beforeDst, 'hour')).toBe(24)

			const back = subtract(nextDay, 1, 'day')
			expect(isSameInstant(back, beforeDst)).toBe(true)
		})

		it('supports withTime, withZone, fromFields, getFields, toDate, toOffsetIso', () => {
			const built = fromFields(
				{ year: 2026, month: 6, day: 15, hour: 10, minute: 30 },
				'America/New_York'
			)
			const shiftedTime = withTime(built, { hour: 16, minute: 0 })
			const inTokyo = withZone(shiftedTime, 'Asia/Tokyo')
			const fields = getFields(built)

			expect(fields).toEqual({
				year: 2026,
				month: 6,
				day: 15,
				hour: 10,
				minute: 30,
				second: 0,
				millisecond: 0,
				dayOfWeek: 1, // Monday
				daysInMonth: 30,
			})
			expect(shiftedTime.hour).toBe(16)
			expect(toOffsetIso(shiftedTime)).toBe('2026-06-15T16:00:00-04:00')
			expect(inTokyo.timeZoneId).toBe('Asia/Tokyo')
			expect(toDate(built).toISOString()).toBe('2026-06-15T14:30:00.000Z')
			expect(resolveZone('Europe/Paris')).toBe('Europe/Paris')
			expect(now('UTC').timeZoneId).toBe('UTC')
		})

		it('reads Date.now() in now() so fake test clocks control the calendar clock', () => {
			const originalNow = Date.now
			Date.now = () => Date.parse('2026-10-25T10:00:00.000Z')
			try {
				expect(toOffsetIso(now('UTC'))).toBe('2026-10-25T10:00:00+00:00')
				expect(toOffsetIso(now('America/New_York'))).toBe(
					'2026-10-25T06:00:00-04:00'
				)
			} finally {
				Date.now = originalNow
			}
		})
	})

	describe('comparisons, overlapsRange, and formatting', () => {
		it('compares instants accurately and computes min/max', () => {
			const a = MUST_PARSE('2026-03-02T09:00:00Z', 'UTC')
			const b = MUST_PARSE('2026-03-02T10:00:00Z', 'UTC')
			const sameAsA = withZone(a, 'Asia/Tokyo')

			expect(isBefore(a, b)).toBe(true)
			expect(isAfter(b, a)).toBe(true)
			expect(isSameInstant(a, sameAsA)).toBe(true)
			expect(isSameOrBefore(a, sameAsA)).toBe(true)
			expect(isSameOrAfter(a, sameAsA)).toBe(true)
			expect(isSameDay(a, b)).toBe(true)
			expect(minDate(a, b)).toBe(a)
			expect(maxDate(a, b)).toBe(b)
		})

		it('treats end as exclusive in overlapsRange (RFC 5545 DTEND)', () => {
			const rangeStart = MUST_PARSE('2026-03-02T09:00:00Z', 'UTC')
			const rangeEnd = MUST_PARSE('2026-03-02T17:00:00Z', 'UTC')

			// Ends right at rangeStart -> no overlap
			expect(
				overlapsRange(
					{
						start: MUST_PARSE('2026-03-02T08:00:00Z', 'UTC'),
						end: rangeStart,
					},
					rangeStart,
					rangeEnd
				)
			).toBe(false)

			// Zero-duration event at rangeStart -> overlaps
			expect(
				overlapsRange(
					{ start: rangeStart, end: rangeStart },
					rangeStart,
					rangeEnd
				)
			).toBe(true)

			// Spans entire range -> overlaps
			expect(
				overlapsRange(
					{
						start: MUST_PARSE('2026-03-01T00:00:00Z', 'UTC'),
						end: MUST_PARSE('2026-03-03T00:00:00Z', 'UTC'),
					},
					rangeStart,
					rangeEnd
				)
			).toBe(true)
		})

		it('formats using Intl in the date own timezone regardless of machine zone', () => {
			const instant = MUST_PARSE('2026-08-17T22:00:00.000Z', 'Asia/Tokyo')
			const formatted = formatDate(
				instant,
				{
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
				},
				'en-US'
			)

			expect(formatted).toContain('Aug 18, 2026')
			expect(formatted).toContain('07:00')
		})

		it('formats a date range using Intl.DateTimeFormat.formatRange in the date zone', () => {
			const start = MUST_PARSE('2026-03-02T00:00:00Z', 'UTC')
			const end = MUST_PARSE('2026-03-08T00:00:00Z', 'UTC')
			const range = formatDateRange(
				start,
				end,
				{ month: 'short', day: 'numeric', year: 'numeric' },
				'en-US'
			)

			expect(range).toContain('Mar 2')
			expect(range).toContain('8, 2026')
		})

		it('computes ISO and locale week numbers accurately', () => {
			// 2025-01-01 is Wednesday -> ISO week 1, US week 1
			const jan1 = MUST_PARSE('2025-01-01T12:00:00Z', 'Europe/London')
			expect(getWeekNumber(jan1, 'ISO')).toBe(1)
			expect(getWeekNumber(jan1, 'local', 'en-US')).toBe(1)
			expect(getWeekNumber(jan1, 'local', 'de-DE')).toBe(1)

			// 2023-01-01 is Sunday -> ISO week 52 of 2022, US week 1 of 2023
			const sun2023 = MUST_PARSE('2023-01-01T12:00:00Z', 'America/New_York')
			expect(getWeekNumber(sun2023, 'ISO')).toBe(52)
			expect(getWeekNumber(sun2023, 'local', 'en-US')).toBe(1)
			expect(getWeekNumber(sun2023, 'local', 'de-DE')).toBe(52)
		})

		it('computes diffDayAndTime on wall clock across DST transitions', () => {
			const before = MUST_PARSE('2025-03-08T09:00', 'America/New_York')
			const after = MUST_PARSE('2025-03-09T10:30', 'America/New_York')

			expect(diffDayAndTime(before, after)).toEqual({
				days: 1,
				milliseconds: 90 * 60_000,
			})
		})

		it('exposes timezone transitions, offset strings, and zone validation', () => {
			const winter = MUST_PARSE('2025-01-15T12:00', 'America/New_York')
			const spring = getTransition(winter, 'next')

			expect(spring).not.toBeNull()
			if (spring) {
				expect(dayKey(spring)).toBe('2025-03-09')
				expect(getOffsetString(spring)).toBe('-04:00')
			}
			expect(getOffsetString(winter)).toBe('-05:00')
			expect(
				getTransition(MUST_PARSE('2025-01-15T12:00Z', 'UTC'), 'next')
			).toBeNull()
			expect(isValidTimeZone('America/New_York')).toBe(true)
			expect(isValidTimeZone('Not/A_Zone')).toBe(false)
		})
	})

	describe('machine-zone independence acceptance check (docs/timezones.md)', () => {
		/**
		 * Runs the Intl-only reference matrix across 14 awkward calendar zones in
		 * child processes with different machine TZ settings so the test cannot
		 * be fooled by a UTC-only runner.
		 */
		it('matches an Intl-only reference across 14 awkward zones on multiple machine TZs', () => {
			const probeScript = `
import { parseDate, startOf, add, getFields } from './src/utils/temporal.ts'

const calendarZones = [
  'America/New_York',
  'America/Vancouver',
  'America/Havana',
  'America/Sao_Paulo',
  'America/St_Johns',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Berlin',
  'Asia/Beirut',
  'Asia/Kathmandu',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Australia/Lord_Howe',
  'Pacific/Chatham',
]

// Sample dates covering northern & southern spring/autumn clock changes
const probeDates = [
  '2025-03-09',
  '2025-03-30',
  '2025-04-06',
  '2025-10-05',
  '2025-10-26',
  '2025-11-02',
]

const intlParts = (epochMs, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(epochMs))
  const get = (t) => Number(parts.find((p) => p.type === t)?.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

const mismatches = []
for (const zone of calendarZones) {
  for (const dateStr of probeDates) {
    const parsed = parseDate(dateStr, zone)
    if (!parsed) {
      mismatches.push(\`unparsed: \${zone} \${dateStr}\`)
      continue
    }
    const dayStart = startOf(parsed, 'day')
    const nextDay = startOf(add(dayStart, 1, 'day'), 'day')
    const noon = add(dayStart, 12, 'hour')

    for (const [label, zdt] of [['start', dayStart], ['next', nextDay], ['noon', noon]]) {
      const f = getFields(zdt)
      const ref = intlParts(zdt.epochMilliseconds, zone)
      if (
        f.year !== ref.year ||
        f.month !== ref.month ||
        f.day !== ref.day ||
        f.hour !== ref.hour ||
        f.minute !== ref.minute
      ) {
        mismatches.push(\`\${zone} \${dateStr} \${label}: got \${JSON.stringify(f)} vs Intl \${JSON.stringify(ref)}\`)
      }
    }
  }
}

if (mismatches.length > 0) {
  console.error(mismatches.join('\\n'))
  process.exit(1)
}
`
			const machineZones = [
				'UTC',
				'America/Vancouver',
				'Europe/London',
				'America/Havana',
				'Pacific/Auckland',
			]

			for (const tz of machineZones) {
				const result = spawnSync('bun', ['-e', probeScript], {
					cwd: import.meta.dir.replace(/\/src\/utils$/, ''),
					env: { ...process.env, TZ: tz },
					encoding: 'utf8',
				})
				expect(result.stderr).toBe('')
				expect(result.status).toBe(0)
			}
		})
	})
})
