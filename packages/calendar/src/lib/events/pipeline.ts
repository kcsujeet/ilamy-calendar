import type { CalendarEvent } from '@ilamy/types'

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

/**
 * Resource-axis filter stage: keep events whose membership set contains
 * resourceId. With no resourceId (a grid without a resource axis) every event
 * is kept. Checked against `undefined`, never truthiness: 0 is a real id.
 */
export function filterEventsForResource(
	events: CalendarEvent[],
	resourceId: string | number | undefined
): CalendarEvent[] {
	if (resourceId === undefined) {
		return events
	}
	return events.filter((event) =>
		getEventResourceIds(event).includes(resourceId)
	)
}
