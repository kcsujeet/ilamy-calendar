import type { CalendarEvent } from '../core-calendar.types'

interface ProcessEnvGlobal {
	process?: { env?: { NODE_ENV?: string } }
}

/** Freezes shared lists in dev builds to catch accidental mutation by callers. */
export const shareInDevBuild = <T>(list: T[]): T[] => {
	const nodeEnv = (globalThis as ProcessEnvGlobal).process?.env?.NODE_ENV
	const isDevBuild = nodeEnv !== undefined && nodeEnv !== 'production'
	if (!isDevBuild) {
		return list
	}
	const copy = [...list]
	Object.freeze(copy)
	return copy
}

/**
 * Membership rule for the resource axis: `resourceIds` takes precedence over
 * `resourceId` when present.
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

/** Filters events belonging to `resourceId` (or returns all when unset). */
export const filterEventsForResource = (
	events: CalendarEvent[],
	resourceId: string | number | undefined
): CalendarEvent[] => {
	if (resourceId === undefined) {
		return events
	}
	return events.filter((event) =>
		getEventResourceIds(event).includes(resourceId)
	)
}

const bucketsByEvents = new WeakMap<
	CalendarEvent[],
	Map<string | number, CalendarEvent[]>
>()

/** Groups events by resource id once per events array instance. */
export const bucketEventsByResource = (
	events: CalendarEvent[]
): Map<string | number, CalendarEvent[]> => {
	const cached = bucketsByEvents.get(events)
	if (cached) {
		return cached
	}
	const buckets = new Map<string | number, CalendarEvent[]>()
	for (const event of events) {
		for (const resourceId of new Set(getEventResourceIds(event))) {
			const bucket = buckets.get(resourceId)
			if (bucket) {
				bucket.push(event)
			} else {
				buckets.set(resourceId, [event])
			}
		}
	}
	for (const [resourceId, bucket] of buckets) {
		buckets.set(resourceId, shareInDevBuild(bucket))
	}
	bucketsByEvents.set(events, buckets)
	return buckets
}

const NO_EVENTS: CalendarEvent[] = shareInDevBuild([])

/** Returns events assigned to `resourceId`, or all events when unset. */
export const getResourceEvents = (
	events: CalendarEvent[],
	resourceId: string | number | undefined
): CalendarEvent[] => {
	if (resourceId === undefined) {
		return events
	}
	return bucketEventsByResource(events).get(resourceId) ?? NO_EVENTS
}
