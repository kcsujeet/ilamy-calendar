import type { Dayjs } from './dayjs'

/**
 * Structural shape of anything with a start/end instant. Typed structurally on
 * purpose: this package depends only on `dayjs`, so it must not import
 * `@ilamy/types` just to name `CalendarEvent`. `CalendarEvent` satisfies this,
 * so the core and the plugin packages can both use these helpers without a new
 * dependency edge.
 */
export interface EventTimes {
	start: Dayjs
	end: Dayjs
}

/** An event's interval as epoch milliseconds. */
export interface EventBoundsMs {
	readonly startMs: number
	readonly endMs: number
}

/**
 * Identity-keyed cache of event bounds.
 *
 * WHY A WeakMap KEYED ON THE EVENT OBJECT — this is load-bearing, not incidental.
 *
 * Comparing `Dayjs` instances costs ~1.2us per comparison (the timezone-aware
 * instance this ecosystem configures makes it worse), while `.valueOf()` costs
 * ~5ns and a numeric compare ~4ns. Caching the two numbers is therefore worth
 * two to three orders of magnitude in every per-day and per-cell loop.
 *
 * The cache must be keyed on OBJECT IDENTITY rather than stored on the event or
 * keyed on `event.id`:
 *
 *   - Storing `startMs`/`endMs` as fields on the event is unsafe because ~15
 *     sites in this monorepo spread event objects, e.g.
 *     `{ ...event, start: occurrenceDate, end: newEndTime }` in the recurrence
 *     plugin's `generateRecurringEvents`. A spread copies the cached numbers
 *     while replacing `start`/`end`, so the cache would silently describe the
 *     parent's instant — wrong-day rendering with no error.
 *   - Keying on `event.id` has the same failure mode and worse: recurrence
 *     instance ids are derived per expansion and are not stable.
 *
 * With identity keys, every spread copy is a fresh object, so it MISSES and
 * recomputes from its own `start`/`end`. The staleness class of bug is
 * structurally impossible rather than merely avoided by discipline. Do not
 * "simplify" this to a Map keyed on id.
 *
 * Weak keys also mean removed events are collected, so there is no leak and no
 * eviction policy to maintain.
 */
const boundsCache = new WeakMap<object, EventBoundsMs>()

/** Epoch-millisecond bounds for an event, computed once per event object. */
export function getEventBoundsMs<T extends EventTimes>(
	event: T
): EventBoundsMs {
	const cached = boundsCache.get(event)
	if (cached !== undefined) {
		return cached
	}
	const bounds: EventBoundsMs = {
		startMs: event.start.valueOf(),
		endMs: event.end.valueOf(),
	}
	boundsCache.set(event, bounds)
	return bounds
}

/**
 * Numeric equivalent of the calendar's inclusive range-overlap predicate.
 *
 * Deliberately mirrors the original three-clause structure (starts inside /
 * ends inside / fully spans) rather than the shorter `startMs <= endMs &&
 * endMs >= startMs` form. The two agree for every well-formed event, but differ
 * when an event's end precedes its start: for start=7, end=3 against range
 * [6, 8] the three-clause form returns true and the short form false. Keeping
 * the original shape preserves behaviour exactly for malformed input too.
 */
export function overlapsRangeMs(
	bounds: EventBoundsMs,
	rangeStartMs: number,
	rangeEndMs: number
): boolean {
	const startsInRange =
		bounds.startMs >= rangeStartMs && bounds.startMs <= rangeEndMs
	const endsInRange = bounds.endMs >= rangeStartMs && bounds.endMs <= rangeEndMs
	const spansRange = bounds.startMs < rangeStartMs && bounds.endMs > rangeEndMs
	return startsInRange || endsInRange || spansRange
}

/**
 * Precomputed day boundaries for a contiguous run of days.
 *
 * `dayStarts[i]` is the epoch millisecond start of day `i`; `gridEnd` is the
 * last millisecond of the final day.
 */
export interface DayIndex {
	readonly dayStarts: readonly number[]
	readonly gridEnd: number
}

/**
 * Builds a day index from the grid's own day list.
 *
 * Calls `startOf('day')` once per day — d calls, not d x n. That matters a lot:
 * with a default timezone configured, the ecosystem's `startOf`/`endOf` patch
 * re-derives the UTC offset on every call, so a per-day boundary computed inside
 * an event loop is one of the most expensive things the library can do.
 *
 * The boundaries are stored as real per-day values rather than derived from a
 * fixed 86_400_000ms stride, because local days are 23 or 25 hours long around a
 * DST transition and fixed-stride arithmetic misassigns events across one.
 */
export function buildDayIndex(days: readonly Dayjs[]): DayIndex {
	const dayStarts: number[] = []
	for (const day of days) {
		dayStarts.push(day.startOf('day').valueOf())
	}
	const lastDay = days.at(-1)
	return {
		dayStarts,
		gridEnd:
			lastDay === undefined ? Number.NaN : lastDay.endOf('day').valueOf(),
	}
}

/**
 * Index of the day containing `timestampMs`, or -1 when it precedes the grid.
 * Timestamps after the grid return the last day's index, so callers clamp with
 * `Math.min`. Binary search: O(log d).
 */
export function dayIndexOf(index: DayIndex, timestampMs: number): number {
	const { dayStarts } = index
	const first = dayStarts.at(0)
	if (first === undefined || timestampMs < first) {
		return -1
	}
	let low = 0
	let high = dayStarts.length - 1
	while (low < high) {
		const mid = (low + high + 1) >> 1
		if ((dayStarts.at(mid) ?? Number.NaN) <= timestampMs) {
			low = mid
		} else {
			high = mid - 1
		}
	}
	return low
}

/**
 * Assigns each event to every day it appears on, in one pass.
 *
 * Replaces the `days.map(day => events.filter(overlaps))` shape, turning
 * O(n x d) inclusive-overlap tests into O(n log d) index lookups. Returns one
 * bucket per day, preserving the input order of events within each bucket so
 * downstream rendering order is unchanged.
 *
 * Membership is identical to testing `eventOverlapsRange` against each day,
 * including for malformed events whose end precedes their start: those match the
 * day containing their start and the day containing their end, but not the days
 * between (the original predicate's spans-range clause cannot fire for them).
 */
export function bucketEventsByDay<T extends EventTimes>(
	events: readonly T[],
	index: DayIndex
): T[][] {
	const dayCount = index.dayStarts.length
	const buckets: T[][] = Array.from({ length: dayCount }, () => [])
	if (dayCount === 0) {
		return buckets
	}
	const gridStart = index.dayStarts.at(0) ?? Number.NaN
	const lastIndex = dayCount - 1

	for (const event of events) {
		const { startMs, endMs } = getEventBoundsMs(event)

		if (endMs < startMs) {
			// Malformed: mirror the original predicate's two independent matches.
			const startDay = dayIndexOf(index, startMs)
			if (startDay >= 0 && startMs <= index.gridEnd) {
				buckets[startDay]?.push(event)
			}
			const endDay = dayIndexOf(index, endMs)
			if (endDay >= 0 && endDay !== startDay && endMs <= index.gridEnd) {
				buckets[endDay]?.push(event)
			}
			continue
		}

		if (endMs < gridStart || startMs > index.gridEnd) {
			continue
		}
		const low = Math.max(0, dayIndexOf(index, startMs))
		const high = Math.min(lastIndex, dayIndexOf(index, endMs))
		for (let day = low; day <= high; day++) {
			buckets[day]?.push(event)
		}
	}
	return buckets
}
