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
