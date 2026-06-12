import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'

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
 */
export function eventOverlapsRange(
	event: CalendarEvent,
	start: Dayjs,
	end: Dayjs
): boolean {
	const startsInRange =
		event.start.isSameOrAfter(start) && event.start.isSameOrBefore(end)
	const endsInRange =
		event.end.isSameOrAfter(start) && event.end.isSameOrBefore(end)
	const spansRange = event.start.isBefore(start) && event.end.isAfter(end)
	return startsInRange || endsInRange || spansRange
}
