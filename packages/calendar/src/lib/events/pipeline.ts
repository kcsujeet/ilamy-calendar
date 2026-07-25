import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { getEventBoundsMs, overlapsRangeMs } from '@ilamy/utils/events'

/**
 * Membership rule for the resource axis: when `resourceIds` is present,
 * `resourceId` is ignored unless listed. A cross-resource event renders once
 * per matching resource (no spanning rendering exists).
 */
export const getEventResourceIds = (
	event: CalendarEvent
): (string | number)[] => {
	if (event.resourceIds) {
		return event.resourceIds
	}
	if (event.resourceId !== undefined) {
		return [event.resourceId]
	}
	return []
}

/** Resource-axis filter stage: keep events whose membership set contains resourceId. */
export function filterEventsForResource(
	events: CalendarEvent[],
	resourceId: string | number
): CalendarEvent[] {
	return events.filter((event) =>
		getEventResourceIds(event).includes(resourceId)
	)
}

/**
 * Whether an event's interval overlaps with the `[start, end]` range
 * (inclusive). Covers the three cases: starts inside the range, ends inside
 * the range, or fully spans the range.
 *
 * Compares epoch milliseconds rather than `Dayjs` instances. A `Dayjs`
 * comparison costs ~1.2us against ~4ns for a numeric one, and this predicate
 * runs once per event per day in every grid, so the constant dominates every
 * view's cost. `getEventBoundsMs` caches each event's bounds by object identity
 * (see `@ilamy/utils/events` for why identity keying is required).
 */
export function eventOverlapsRange(
	event: CalendarEvent,
	start: Dayjs,
	end: Dayjs
): boolean {
	return overlapsRangeMs(
		getEventBoundsMs(event),
		start.valueOf(),
		end.valueOf()
	)
}
