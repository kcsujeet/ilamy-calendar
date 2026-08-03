import { afterEach, describe, expect, it } from 'bun:test'
import dayjs from './dayjs'
import { collectDaysBetween, getEventBoundsMs, overlapsRangeMs } from './events'

const at = (iso: string) => dayjs(iso)

describe('collectDaysBetween', () => {
	afterEach(() => {
		dayjs.tz.setDefault()
	})

	const keysOf = (first: string, last: string): string[] =>
		collectDaysBetween(dayjs(first), dayjs(last)).map((day) =>
			day.format('YYYY-MM-DD')
		)

	it('includes both endpoints', () => {
		expect(
			keysOf('2026-06-01T00:00:00.000Z', '2026-06-04T23:59:59.000Z')
		).toEqual(['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04'])
	})

	it('returns a single day when both endpoints are the same day', () => {
		expect(
			keysOf('2026-06-05T09:00:00.000Z', '2026-06-05T17:00:00.000Z')
		).toEqual(['2026-06-05'])
	})

	it('returns nothing when the last day precedes the first', () => {
		expect(
			keysOf('2026-06-05T00:00:00.000Z', '2026-06-01T00:00:00.000Z')
		).toEqual([])
	})

	it('normalises endpoints that are not at midnight', () => {
		expect(
			keysOf('2026-06-01T23:30:00.000Z', '2026-06-03T00:30:00.000Z')
		).toEqual(['2026-06-01', '2026-06-02', '2026-06-03'])
	})

	// `add(1, 'day')` carries the receiver's UTC offset forward, so a walk that
	// does not re-normalise sits an hour past local midnight after a spring
	// forward and ends one iteration early. That drops the range's LAST day.
	it('keeps every day of March across a spring forward in Europe/London', () => {
		dayjs.tz.setDefault('Europe/London')
		const days = keysOf('2025-03-01T00:00:00.000Z', '2025-03-31T23:59:59.000Z')
		expect(days).toHaveLength(31)
		expect(days.at(0)).toBe('2025-03-01')
		expect(days.at(-1)).toBe('2025-03-31')
	})

	it('keeps every day of March across a spring forward in Australia/Lord_Howe', () => {
		// 30-minute DST shift, so the skew is not a whole hour.
		dayjs.tz.setDefault('Australia/Lord_Howe')
		const days = keysOf('2025-10-01T00:00:00.000Z', '2025-10-31T23:59:59.000Z')
		expect(days).toHaveLength(31)
		expect(days.at(-1)).toBe('2025-10-31')
	})

	it('yields consecutive distinct days across a fall back in Europe/Berlin', () => {
		dayjs.tz.setDefault('Europe/Berlin')
		const days = keysOf('2025-10-20T00:00:00.000Z', '2025-11-05T23:59:59.000Z')
		expect(days).toHaveLength(17)
		expect(new Set(days).size).toBe(17)
		expect(days.at(-1)).toBe('2025-11-05')
	})
})

describe('getEventBoundsMs', () => {
	it('returns the epoch milliseconds of start and end', () => {
		const event = {
			start: at('2026-03-02T09:00:00.000Z'),
			end: at('2026-03-02T10:00:00.000Z'),
		}
		expect(getEventBoundsMs(event)).toEqual({
			startMs: event.start.valueOf(),
			endMs: event.end.valueOf(),
		})
	})

	it('returns a stable reference for the same event object', () => {
		const event = {
			start: at('2026-03-02T09:00:00.000Z'),
			end: at('2026-03-02T10:00:00.000Z'),
		}
		expect(getEventBoundsMs(event)).toBe(getEventBoundsMs(event))
	})

	/**
	 * The reason the cache is keyed on object identity. ~15 sites in the monorepo
	 * spread event objects while replacing start/end — most importantly the
	 * recurrence plugin's `{ ...event, start: occurrenceDate, end: newEndTime }`.
	 * If this test ever fails, the cache has been changed to something that
	 * survives a spread (a field on the event, or a Map keyed on event.id) and
	 * every recurrence instance will report its parent's instant.
	 */
	it('does not leak bounds to a spread copy that changed start/end', () => {
		const parent = {
			id: 'series',
			start: at('2026-03-02T09:00:00.000Z'),
			end: at('2026-03-02T10:00:00.000Z'),
		}
		// Populate the cache for the parent first, as a render pass would.
		const parentBounds = getEventBoundsMs(parent)

		const instance = {
			...parent,
			start: at('2026-03-09T09:00:00.000Z'),
			end: at('2026-03-09T10:00:00.000Z'),
		}
		const instanceBounds = getEventBoundsMs(instance)

		expect(instanceBounds.startMs).toBe(instance.start.valueOf())
		expect(instanceBounds.endMs).toBe(instance.end.valueOf())
		expect(instanceBounds.startMs).not.toBe(parentBounds.startMs)
	})

	it('keeps distinct bounds for two events sharing the same id', () => {
		const first = {
			id: 'same',
			start: at('2026-03-02T09:00:00.000Z'),
			end: at('2026-03-02T10:00:00.000Z'),
		}
		const second = {
			id: 'same',
			start: at('2026-04-02T09:00:00.000Z'),
			end: at('2026-04-02T10:00:00.000Z'),
		}
		expect(getEventBoundsMs(first).startMs).not.toBe(
			getEventBoundsMs(second).startMs
		)
	})
})

describe('overlapsRangeMs', () => {
	const range = { start: 1000, end: 2000 }
	const bounds = (startMs: number, endMs: number) => ({ startMs, endMs })

	it.each([
		['starts inside the range', 1500, 2500, true],
		['ends inside the range', 500, 1500, true],
		['fully inside the range', 1200, 1800, true],
		['fully spans the range', 500, 2500, true],
		['ends exactly at the range start', 500, 1000, true],
		['starts exactly at the range end', 2000, 2500, true],
		['identical to the range', 1000, 2000, true],
		['entirely before the range', 200, 900, false],
		['entirely after the range', 2100, 2500, false],
		['zero duration inside the range', 1500, 1500, true],
		['zero duration outside the range', 900, 900, false],
	] as const)('%s', (_label: string, startMs: number, endMs: number, expected: boolean) => {
		expect(
			overlapsRangeMs(bounds(startMs, endMs), range.start, range.end)
		).toBe(expected)
	})

	/**
	 * Parity guard for malformed input. The original Dayjs predicate used three
	 * clauses (starts-inside / ends-inside / spans), which agree with the shorter
	 * `startMs <= rangeEnd && endMs >= rangeStart` form for every well-formed
	 * event but NOT when end precedes start. Preserving the three-clause shape
	 * keeps behaviour identical for malformed events too.
	 */
	it('matches the original three-clause behaviour when end precedes start', () => {
		// start inside the range, end before it: the starts-inside clause fires, so
		// this is true. The shorter `startMs <= rangeEnd && endMs >= rangeStart`
		// form would return false here — that divergence is why the original shape
		// is preserved.
		expect(overlapsRangeMs(bounds(1500, 500), range.start, range.end)).toBe(
			true
		)
		// Both endpoints outside on opposite sides, neither clause fires.
		expect(overlapsRangeMs(bounds(2500, 500), range.start, range.end)).toBe(
			false
		)
		expect(overlapsRangeMs(bounds(2500, 2100), range.start, range.end)).toBe(
			false
		)
	})
})
