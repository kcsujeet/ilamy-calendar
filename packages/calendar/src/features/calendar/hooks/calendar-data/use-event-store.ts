import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PluginRuntime } from '@/features/plugins/lib/types'

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

	const getEventsForDateRange = useCallback(
		(startDate: Dayjs, endDate: Dayjs): CalendarEvent[] =>
			pluginRuntime.transformEvents(currentEvents, {
				start: startDate,
				end: endDate,
			}),
		[currentEvents, pluginRuntime]
	)

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
