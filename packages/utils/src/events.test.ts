import { describe, expect, it } from 'bun:test'
import dayjs from './dayjs'
import { getEventBoundsMs, overlapsRangeMs } from './events'

const at = (iso: string) => dayjs(iso)

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
