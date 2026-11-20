import { describe, expect, it } from 'bun:test'
import {
	formatICalAllDayDate,
	formatICalDateOnly,
	formatICalLocalDateTime,
	formatICalUtcDateTime,
	resolveICalTzid,
} from './ical-format'
import { fromFields } from './temporal'

describe('ical-format', () => {
	it('formats date-only, local date-time, and UTC date-time per RFC 5545', () => {
		const nyDate = fromFields(
			{ year: 2026, month: 3, day: 15, hour: 9, minute: 30, second: 5 },
			'America/New_York'
		)
		expect(formatICalDateOnly(nyDate)).toBe('20260315')
		expect(formatICalLocalDateTime(nyDate)).toBe('20260315T093005')
		expect(formatICalUtcDateTime(nyDate)).toBe('20260315T133005Z')
	})

	it('preserves calendar dates for all-day ISO strings and respects explicit eventZone', () => {
		expect(formatICalAllDayDate('2026-07-04T00:00:00-04:00', undefined)).toBe(
			'20260704'
		)
		expect(formatICalAllDayDate('2026-07-04T00:00:00Z', undefined)).toBe(
			'20260704'
		)
		expect(
			formatICalAllDayDate('2026-07-04T02:00:00Z', 'America/New_York')
		).toBe('20260703')
	})

	it('resolves valid non-UTC IANA TZIDs and rejects UTC or invalid zones', () => {
		expect(resolveICalTzid('America/New_York')).toBe('America/New_York')
		expect(resolveICalTzid('UTC')).toBeUndefined()
		expect(resolveICalTzid('utc')).toBeUndefined()
		expect(resolveICalTzid(undefined)).toBeUndefined()
		expect(resolveICalTzid('Not/A_Zone')).toBeUndefined()
	})
})
