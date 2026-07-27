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
 * Precomputed boundaries for a list of days, which need NOT be consecutive.
 *
 * `dayStarts[i]` and `dayEnds[i]` are the first and last epoch milliseconds of
 * day `i`. Both arrays are ascending.
 *
 * Storing the end of every day, rather than only the end of the grid, is what
 * makes gapped lists correct. `useProcessedWeekEvents` receives the
 * `hiddenDays`-filtered column list (see `week.tsx`), so "the nearest preceding
 * day start" is NOT "the day containing this timestamp" — with Wednesday hidden,
 * a Wednesday timestamp's nearest preceding start is Tuesday.
 */
export interface DayIndex {
	readonly dayStarts: readonly number[]
	readonly dayEnds: readonly number[]
}

/**
 * Builds a day index from the grid's own day list.
 *
 * Calls `startOf('day')`/`endOf('day')` once per day — d calls, not d x n. That
 * matters: with a default timezone configured the ecosystem's `startOf`/`endOf`
 * re-derives the UTC offset on every call, so a per-day boundary computed inside
 * an event loop is one of the most expensive things the library can do.
 *
 * Boundaries are real per-day values rather than a fixed 86_400_000ms stride,
 * because local days run 23 or 25 hours around a DST transition and fixed-stride
 * arithmetic misassigns events across one.
 */
export function buildDayIndex(days: readonly Dayjs[]): DayIndex {
	const dayStarts: number[] = []
	const dayEnds: number[] = []
	for (const day of days) {
		dayStarts.push(day.startOf('day').valueOf())
		dayEnds.push(day.endOf('day').valueOf())
	}
	return { dayStarts, dayEnds }
}

/** Index of the last entry in an ascending array that is <= `value`, else -1. */
const lastIndexAtOrBefore = (
	ascending: readonly number[],
	value: number
): number => {
	const first = ascending.at(0)
	if (first === undefined || value < first) {
		return -1
	}
	let low = 0
	let high = ascending.length - 1
	while (low < high) {
		const middle = (low + high + 1) >> 1
		if ((ascending.at(middle) ?? Number.NaN) <= value) {
			low = middle
		} else {
			high = middle - 1
		}
	}
	return low
}

/** Index of the first entry in an ascending array that is >= `value`, else -1. */
const firstIndexAtOrAfter = (
	ascending: readonly number[],
	value: number
): number => {
	const last = ascending.at(-1)
	if (last === undefined || value > last) {
		return -1
	}
	let low = 0
	let high = ascending.length - 1
	while (low < high) {
		const middle = (low + high) >> 1
		if ((ascending.at(middle) ?? Number.NaN) >= value) {
			high = middle
		} else {
			low = middle + 1
		}
	}
	return low
}

/**
 * Index of the day CONTAINING `timestampMs`, or -1 when no day does.
 *
 * Returning -1 for a timestamp that falls in a gap — or outside the grid — is the
 * point: callers must not clamp it into a neighbouring day.
 */
export function dayIndexOf(index: DayIndex, timestampMs: number): number {
	const candidate = lastIndexAtOrBefore(index.dayStarts, timestampMs)
	if (candidate < 0) {
		return -1
	}
	const dayEnd = index.dayEnds.at(candidate)
	if (dayEnd === undefined || timestampMs > dayEnd) {
		return -1
	}
	return candidate
}

/**
 * Inclusive range of day indices a well-formed interval overlaps, or undefined.
 *
 * Both bounds come from a binary search, and the result needs no per-day
 * re-verification: every index at or after `low` has `dayEnds[i] >= startMs`, and
 * every index at or before `high` has `dayStarts[i] <= endMs`, so each index in
 * between satisfies the inclusive overlap test. An interval that falls entirely
 * inside a gap yields `low > high` and is correctly reported as no days.
 */
export function daySpanOf(
	index: DayIndex,
	startMs: number,
	endMs: number
): { low: number; high: number } | undefined {
	const low = firstIndexAtOrAfter(index.dayEnds, startMs)
	const high = lastIndexAtOrBefore(index.dayStarts, endMs)
	if (low < 0 || high < 0 || low > high) {
		return undefined
	}
	return { low, high }
}

/**
 * Days a malformed interval (end before start) appears on.
 *
 * The original per-day predicate used three clauses (starts-inside /
 * ends-inside / spans); for these its spans clause cannot fire, so such an event
 * matches the day holding its start and the day holding its end, and none of the
 * days between. Reproduced here so behaviour is unchanged for malformed input.
 */
const malformedEventDays = (
	index: DayIndex,
	startMs: number,
	endMs: number
): number[] => {
	const startDay = dayIndexOf(index, startMs)
	const endDay = dayIndexOf(index, endMs)
	const days: number[] = []
	if (startDay >= 0) {
		days.push(startDay)
	}
	if (endDay >= 0 && endDay !== startDay) {
		days.push(endDay)
	}
	return days
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
 * including for gapped day lists and for malformed events.
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

	for (const event of events) {
		const { startMs, endMs } = getEventBoundsMs(event)

		if (endMs < startMs) {
			for (const day of malformedEventDays(index, startMs, endMs)) {
				buckets.at(day)?.push(event)
			}
			continue
		}

		const span = daySpanOf(index, startMs, endMs)
		if (!span) {
			continue
		}
		for (let day = span.low; day <= span.high; day++) {
			buckets.at(day)?.push(event)
		}
	}
	return buckets
}

/**
 * Per-day event counts over the same index, without materialising the buckets.
 *
 * The year view needs only `length` per day, so building 504 arrays and then
 * reading their sizes is pure waste.
 */
export function countEventsByDay<T extends EventTimes>(
	events: readonly T[],
	index: DayIndex
): number[] {
	const counts = new Array<number>(index.dayStarts.length).fill(0)
	for (const event of events) {
		const { startMs, endMs } = getEventBoundsMs(event)

		if (endMs < startMs) {
			for (const day of malformedEventDays(index, startMs, endMs)) {
				counts[day] = (counts.at(day) ?? 0) + 1
			}
			continue
		}

		const span = daySpanOf(index, startMs, endMs)
		if (!span) {
			continue
		}
		for (let day = span.low; day <= span.high; day++) {
			counts[day] = (counts.at(day) ?? 0) + 1
		}
	}
	return counts
}
