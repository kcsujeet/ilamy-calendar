import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { getEventResourceIds } from '@/features/calendar/utils/event-pipeline'

/** The span of one column (a day or an hour), read once per column instance. */
export interface ColumnBounds {
	start: Dayjs
	end: Dayjs
	startMs: number
	endMs: number
	/** The default zone the bounds were read under (see `getColumnBounds`). */
	defaultZone: string | undefined
}

export type ColumnUnit = 'day' | 'hour'

interface ZonedDayjs {
	$x?: { $timezone?: string }
}

/**
 * The zone `dayjs.tz.setDefault` last set, which `startOf`/`endOf` read for an
 * instance that carries no zone of its own. dayjs has no getter, so it is
 * read off an instance made with the default; that costs a zone conversion,
 * so read it once per row, not once per column.
 */
export const getDefaultZone = (): string | undefined =>
	(dayjs.tz() as ZonedDayjs).$x?.$timezone

const boundsByUnit: Record<ColumnUnit, WeakMap<Dayjs, ColumnBounds>> = {
	day: new WeakMap(),
	hour: new WeakMap(),
}

/**
 * `startOf`/`endOf` cost a zone conversion each. Every resource row draws the
 * same column instances, so the bounds are keyed on the instance and computed
 * once however many rows ask. An instance with no zone of its own is bounded
 * in the default zone, so bounds read under another default are read again.
 */
export const getColumnBounds = (
	day: Dayjs,
	unit: ColumnUnit,
	defaultZone: string | undefined
): ColumnBounds => {
	const cache = boundsByUnit[unit]
	const cached = cache.get(day)
	if (cached && cached.defaultZone === defaultZone) {
		return cached
	}
	const start = day.startOf(unit)
	const end = day.endOf(unit)
	const bounds = {
		start,
		end,
		startMs: start.valueOf(),
		endMs: end.valueOf(),
		defaultZone,
	}
	cache.set(day, bounds)
	return bounds
}

/**
 * Lists shared between readers (one range's events, one resource's bucket)
 * are frozen in a development build, so a consumer that sorts or pushes into
 * one throws where it happens instead of corrupting every other reader. A
 * production build pays nothing: it returns the list as it is. The copy keeps
 * the freeze off a list the consumer owns, which a plugin may return as is.
 */
export const shareInDevBuild = <T>(list: T[]): T[] => {
	const isDevBuild =
		typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
	if (!isDevBuild) {
		return list
	}
	const copy = [...list]
	Object.freeze(copy)
	return copy
}

const bucketsByEvents = new WeakMap<
	CalendarEvent[],
	Map<string | number, CalendarEvent[]>
>()

/**
 * One pass over the events, grouped by each resource that lists them (the
 * membership rule of `filterEventsForResource`). Keyed on the array, so every
 * row reading the same range's events shares one pass instead of filtering
 * the whole list itself.
 */
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

/** The events one resource shows; with no resource axis, all of them. */
export const getResourceEvents = (
	events: CalendarEvent[],
	resourceId: string | number | undefined
): CalendarEvent[] => {
	if (resourceId === undefined) {
		return events
	}
	return bucketEventsByResource(events).get(resourceId) ?? NO_EVENTS
}

/**
 * Events per column, by the same test as `overlapsRange` run on instants:
 * starts inside the column, ends inside it (after its start), or spans it.
 */
export const bucketEventsByColumn = (
	columns: ColumnBounds[],
	events: CalendarEvent[]
): CalendarEvent[][] => {
	const spans = events.map((event) => ({
		event,
		startMs: event.start.valueOf(),
		endMs: event.end.valueOf(),
	}))
	return columns.map((column) => {
		const columnEvents: CalendarEvent[] = []
		for (const { event, startMs, endMs } of spans) {
			const startsInColumn =
				startMs >= column.startMs && startMs <= column.endMs
			const endsInColumn = endMs > column.startMs && endMs <= column.endMs
			const spansColumn = startMs < column.startMs && endMs > column.endMs
			if (startsInColumn || endsInColumn || spansColumn) {
				columnEvents.push(event)
			}
		}
		return columnEvents
	})
}
