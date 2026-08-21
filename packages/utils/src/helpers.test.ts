import { describe, expect, it } from 'bun:test'
import dayjs from './dayjs'
import {
	dayKey,
	isAfter,
	isBefore,
	isBetweenInclusive,
	isSame,
	isSameDay,
	isSameOrAfter,
	isSameOrBefore,
	overlapsRange,
} from './helpers'

/**
 * An interval is `[start, end)`: the start is inclusive, the end exclusive
 * (RFC 5545 calls DTEND "the non-inclusive end of the event", and the Google
 * Calendar API documents `end` the same way). These cases moved here with the
 * predicate, when the core and two plugins stopped keeping private copies of it.
 */
const interval = (_id: string, startISO: string, endISO: string) => ({
	start: dayjs(startISO),
	end: dayjs(endISO),
})

describe('overlapsRange', () => {
	const start = dayjs('2025-01-05T00:00:00.000Z')
	const end = dayjs('2025-01-05T23:59:59.999Z')

	it('returns true when the event starts within the range', () => {
		const event = interval(
			'a',
			'2025-01-05T10:00:00.000Z',
			'2025-01-06T02:00:00.000Z'
		)
		expect(overlapsRange(event, start, end)).toBe(true)
	})

	it('returns true when the event ends within the range', () => {
		const event = interval(
			'b',
			'2025-01-04T22:00:00.000Z',
			'2025-01-05T01:00:00.000Z'
		)
		expect(overlapsRange(event, start, end)).toBe(true)
	})

	it('returns true when the event fully spans the range', () => {
		const event = interval(
			'c',
			'2025-01-04T10:00:00.000Z',
			'2025-01-06T10:00:00.000Z'
		)
		expect(overlapsRange(event, start, end)).toBe(true)
	})

	it('returns false when the event is entirely before the range', () => {
		const event = interval(
			'd',
			'2025-01-04T00:00:00.000Z',
			'2025-01-04T12:00:00.000Z'
		)
		expect(overlapsRange(event, start, end)).toBe(false)
	})

	it('returns false when the event is entirely after the range', () => {
		const event = interval(
			'e',
			'2025-01-06T12:00:00.000Z',
			'2025-01-06T15:00:00.000Z'
		)
		expect(overlapsRange(event, start, end)).toBe(false)
	})

	/**
	 * Boundary contract: an event's `end` is EXCLUSIVE (#248), so one ending at
	 * the range's first instant occupies none of the range and must not match. An
	 * event's `start` is inclusive, so one beginning at the range's last instant
	 * still does.
	 */
	it('returns false when the event ends exactly at the range start', () => {
		const event = interval(
			'f',
			'2025-01-04T22:00:00.000Z',
			'2025-01-05T00:00:00.000Z'
		)
		expect(overlapsRange(event, start, end)).toBe(false)
	})

	/**
	 * A zero-duration event is placed by its START; its end proves nothing, since
	 * an exclusive end equal to the start is behind every instant of the range.
	 * The agenda plugin and the recurrence plugin both mirror this predicate, so
	 * this is the case that keeps all three agreeing.
	 */
	it('returns true for a zero-duration event inside the range', () => {
		const event = interval(
			'h',
			'2025-01-05T00:00:00.000Z',
			'2025-01-05T00:00:00.000Z'
		)
		expect(overlapsRange(event, start, end)).toBe(true)
	})

	it('returns true when the event starts exactly at the range end', () => {
		const event = interval(
			'g',
			'2025-01-05T23:59:59.999Z',
			'2025-01-06T02:00:00.000Z'
		)
		expect(overlapsRange(event, start, end)).toBe(true)
	})

	/**
	 * A malformed interval whose end precedes its start still matches through
	 * `startsInRange` alone. Pinned because the three clauses are NOT equivalent
	 * to `start <= rangeEnd && end >= rangeStart`: that simplification answers
	 * false here. Anything rewriting this predicate has to keep all three.
	 */
	it('returns true for an inverted interval whose start is in the range', () => {
		const event = interval(
			'i',
			'2025-01-05T07:00:00.000Z',
			'2025-01-05T03:00:00.000Z'
		)
		expect(overlapsRange(event, start, end)).toBe(true)
	})

	it('returns false for an inverted interval sitting entirely after the range', () => {
		const event = interval(
			'j',
			'2025-01-07T07:00:00.000Z',
			'2025-01-06T03:00:00.000Z'
		)
		expect(overlapsRange(event, start, end)).toBe(false)
	})
})

/**
 * These replace dayjs's own comparators on hot paths. They must answer
 * IDENTICALLY, so each case is stated against the boundary rather than a
 * comfortable interior value: equality is where a `>=` and a `>` diverge.
 */
describe('instant comparators', () => {
	const earlier = dayjs('2025-01-05T10:00:00.000Z')
	const later = dayjs('2025-01-05T11:00:00.000Z')
	const sameAsEarlier = dayjs('2025-01-05T10:00:00.000Z')

	it('isSameOrAfter is true at the boundary and after it', () => {
		expect(isSameOrAfter(later, earlier)).toBe(true)
		expect(isSameOrAfter(sameAsEarlier, earlier)).toBe(true)
		expect(isSameOrAfter(earlier, later)).toBe(false)
	})

	it('isSameOrBefore is true at the boundary and before it', () => {
		expect(isSameOrBefore(earlier, later)).toBe(true)
		expect(isSameOrBefore(sameAsEarlier, earlier)).toBe(true)
		expect(isSameOrBefore(later, earlier)).toBe(false)
	})

	it('isBefore excludes the boundary', () => {
		expect(isBefore(earlier, later)).toBe(true)
		expect(isBefore(sameAsEarlier, earlier)).toBe(false)
	})

	it('isAfter excludes the boundary', () => {
		expect(isAfter(later, earlier)).toBe(true)
		expect(isAfter(sameAsEarlier, earlier)).toBe(false)
	})

	it('isSame compares to the millisecond', () => {
		expect(isSame(earlier, sameAsEarlier)).toBe(true)
		expect(isSame(earlier, earlier.add(1, 'millisecond'))).toBe(false)
	})

	it('isBetweenInclusive includes both ends', () => {
		expect(isBetweenInclusive(earlier, earlier, later)).toBe(true)
		expect(isBetweenInclusive(later, earlier, later)).toBe(true)
		expect(
			isBetweenInclusive(earlier.subtract(1, 'millisecond'), earlier, later)
		).toBe(false)
		expect(
			isBetweenInclusive(later.add(1, 'millisecond'), earlier, later)
		).toBe(false)
	})

	it('answers the same as dayjs for the same pair', () => {
		expect(isSameOrAfter(later, earlier)).toBe(later.isSameOrAfter(earlier))
		expect(isSameOrBefore(later, earlier)).toBe(later.isSameOrBefore(earlier))
		expect(isBefore(later, earlier)).toBe(later.isBefore(earlier))
		expect(isAfter(later, earlier)).toBe(later.isAfter(earlier))
	})
})

describe('dayKey and isSameDay', () => {
	it('keys a date by its calendar day', () => {
		expect(dayKey(dayjs('2025-10-13T23:59:59.999Z'))).toBe('2025-10-13')
	})

	it('is true for two instants on the same calendar day', () => {
		const morning = dayjs('2025-10-13T00:00:00.000Z')
		const night = dayjs('2025-10-13T23:59:59.999Z')
		expect(isSameDay(morning, night)).toBe(true)
	})

	it('is false one millisecond into the next day', () => {
		const night = dayjs('2025-10-13T23:59:59.999Z')
		expect(isSameDay(night, night.add(1, 'millisecond'))).toBe(false)
	})

	/**
	 * The day is the one in the CONFIGURED zone, not the machine's, which is the
	 * whole reason this compares rendered keys rather than epoch millis.
	 */
	it('resolves the calendar day in the configured timezone', () => {
		dayjs.tz.setDefault('Asia/Tokyo')
		// 22:00 UTC is already the next day in Tokyo (+09:00).
		const evening = dayjs('2025-10-13T22:00:00.000Z')
		const nextMorning = dayjs('2025-10-14T01:00:00.000Z')
		expect(isSameDay(evening, nextMorning)).toBe(true)
		expect(dayKey(evening)).toBe('2025-10-14')
		dayjs.tz.setDefault()
	})
})
