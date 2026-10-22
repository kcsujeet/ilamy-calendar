import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { shareInDevBuild } from '@/features/calendar/utils/event-buckets'
import type { PluginRuntime } from '@/lib/plugins/types'

/** Ranges answered before the cache starts over (a view asks for a handful). */
const MAX_CACHED_RANGES = 32

interface EventStoreParams {
	events: CalendarEvent[]
	pluginRuntime: PluginRuntime
	getCurrentViewRange: () => { start: Dayjs; end: Dayjs }
}

export interface EventStore {
	/** The stored rows: series, overrides and plain events, as the consumer holds them. */
	currentEvents: CalendarEvent[]
	setCurrentEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
	/** The rows as drawn between two dates, after plugins expand them (recurrences). */
	getEventsForDateRange: (startDate: Dayjs, endDate: Dayjs) => CalendarEvent[]
	/** `getEventsForDateRange` over the current view. */
	processedEvents: CalendarEvent[]
}

/**
 * The stored rows, kept in sync with the `events` prop: a new prop replaces
 * them, so a consumer that controls `events` stays the source of truth.
 */
export const useEventStore = ({
	events,
	pluginRuntime,
	getCurrentViewRange,
}: EventStoreParams): EventStore => {
	const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>(events)
	const lastEventsProp = useRef(events)

	useEffect(() => {
		if (events !== lastEventsProp.current) {
			setCurrentEvents(events)
			lastEventsProp.current = events
		}
	}, [events])

	// Every resource row asks for the same range, and a plugin expands the whole
	// event list per ask. Answers are kept per range until the events or the
	// plugins change, so a render expands each range once. The offsets are in
	// the key because a plugin may read the range in its zone, not only its
	// instant.
	const getEventsForDateRange = useMemo(() => {
		const rangeAnswers = new Map<string, CalendarEvent[]>()
		return (startDate: Dayjs, endDate: Dayjs): CalendarEvent[] => {
			const startKey = `${startDate.valueOf()}@${startDate.utcOffset()}`
			const endKey = `${endDate.valueOf()}@${endDate.utcOffset()}`
			const rangeKey = `${startKey}-${endKey}`
			const knownAnswer = rangeAnswers.get(rangeKey)
			if (knownAnswer) {
				return knownAnswer
			}
			const answer = pluginRuntime.transformEvents(currentEvents, {
				start: startDate,
				end: endDate,
			})
			if (rangeAnswers.size >= MAX_CACHED_RANGES) {
				rangeAnswers.clear()
			}
			const sharedAnswer = shareInDevBuild(answer)
			rangeAnswers.set(rangeKey, sharedAnswer)
			return sharedAnswer
		}
	}, [currentEvents, pluginRuntime])

	const processedEvents = useMemo(() => {
		const { start, end } = getCurrentViewRange()
		return getEventsForDateRange(start, end)
	}, [getEventsForDateRange, getCurrentViewRange])

	return {
		currentEvents,
		setCurrentEvents,
		getEventsForDateRange,
		processedEvents,
	}
}
