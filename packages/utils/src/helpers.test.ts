import { describe, expect, it } from 'bun:test'
import dayjs from './dayjs'
import { overlapsRange } from './helpers'

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
})
