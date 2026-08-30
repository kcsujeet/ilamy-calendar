import { describe, expect, it } from 'bun:test'
import dayjs from './dayjs'
import { dayKey, isSameDay, overlapsRange } from './helpers'

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

describe('dayKey and isSameDay', () => {
	it('keys a date by its calendar day', () => {
		expect(dayKey(dayjs('2025-10-13T23:59:59.999Z'))).toBe('2025-10-13')
	})

	it('ignores time of day', () => {
		const morning = dayjs('2025-10-13T08:15:30.000Z')
		const evening = dayjs('2025-10-13T22:45:00.000Z')
		expect(dayKey(morning)).toBe(dayKey(evening))
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
	 * Each operand is rendered in ITS OWN zone, so two instances anchored in
	 * different zones can disagree with dayjs's `isSame(x, 'day')` on the very
	 * same instant. Pinned because it is the contract, not an accident: callers
	 * are expected to pass operands that share a zone, which every call site in
	 * the calendar does.
	 */
	it('compares each operand in its own zone, not a single shared one', () => {
		const newYork = dayjs.tz('2025-07-15T23:00:00', 'America/New_York')
		const tokyo = dayjs.tz('2025-07-16T12:00:00', 'Asia/Tokyo')
		expect(newYork.valueOf()).toBe(tokyo.valueOf())
		expect(isSameDay(newYork, tokyo)).toBe(false)
		expect(newYork.isSame(tokyo, 'day')).toBe(true)
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
