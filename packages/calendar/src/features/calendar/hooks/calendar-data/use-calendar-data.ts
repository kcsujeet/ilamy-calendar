import type { CalendarEvent, EventsChange, Resource } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { isSameResourceList } from '@/features/calendar/utils/resource-list'
import { useLatestHandler } from '@/hooks/use-latest-handler'
import type { PluginRuntime } from '@/lib/plugins/types'
import { type EventMutations, useEventMutations } from './use-event-mutations'
import { useEventStore } from './use-event-store'
import {
	type PluginMutations,
	usePluginMutations,
} from './use-plugin-mutations'
import { type RangeFetcher, useRangeFetcher } from './use-range-fetcher'
import {
	type ResourceLookups,
	useResourceLookups,
} from './use-resource-lookups'

interface CalendarDataParams {
	events: CalendarEvent[]
	eventsFetcher?: RangeFetcher<CalendarEvent>
	lazyFetching?: boolean
	loading?: (isLoading: boolean) => void
	onEventsError?: (error: unknown) => void
	resourcesFetcher?: RangeFetcher<Resource>
	refetchResourcesOnNavigate?: boolean
	resourcesSet?: (resources: Resource[]) => void
	onResourcesError?: (error: unknown) => void
	timezone?: string
	pluginRuntime: PluginRuntime
	getCurrentViewRange: () => { start: Dayjs; end: Dayjs }
	/** The `resources` array prop; ignored when a fetcher is set. */
	resources?: Resource[]
	onEventAdd?: (event: CalendarEvent) => void
	onEventUpdate?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
	onEventsChange?: (change: EventsChange) => void
}

// Module constant: a fresh `[]` per render would rebuild the lookups every time.
const EMPTY_RESOURCES: Resource[] = []

export interface CalendarDataSlice
	extends EventMutations,
		PluginMutations,
		ResourceLookups {
	/** The events in view, after plugins expand them. */
	events: CalendarEvent[]
	/** The stored rows, as the consumer holds them. */
	rawEvents: CalendarEvent[]
	setCurrentEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
	/** Fetches the visible range again; a no-op unless `events` is a function. */
	refetchEvents: () => void
	/**
	 * The resource axis: the array prop, or what the `resources` function last
	 * returned. `undefined` until there is one, like an absent `resources` prop.
	 */
	resources?: Resource[]
	/** Whether this is a resource calendar: it has resources, or is loading them. */
	hasResourceAxis: boolean
	/** Fetches the resources again; a no-op unless `resources` is a function. */
	refetchResources: () => void
	getEventsForDateRange: (startDate: Dayjs, endDate: Dayjs) => CalendarEvent[]
}

/**
 * Data slice: the event store and everything that reads or changes it.
 * Each part is its own hook in this folder: the store (`use-event-store`),
 * plain mutations (`use-event-mutations`), plugin-scoped mutations
 * (`use-plugin-mutations`) and resource lookups (`use-resource-lookups`).
 */
export const useCalendarData = ({
	events,
	eventsFetcher,
	lazyFetching,
	loading,
	onEventsError,
	resourcesFetcher,
	refetchResourcesOnNavigate,
	resourcesSet,
	onResourcesError,
	timezone,
	pluginRuntime,
	getCurrentViewRange,
	resources: resourcesProp,
	onEventAdd,
	onEventUpdate,
	onEventDelete,
	onEventsChange,
}: CalendarDataParams): CalendarDataSlice => {
	const store = useEventStore({ events, pluginRuntime, getCurrentViewRange })
	const {
		currentEvents,
		setCurrentEvents,
		getEventsForDateRange,
		processedEvents,
	} = store

	// One `loading` for both fetchers: true while either has a fetch in flight.
	const reportLoading = useLatestHandler(loading)
	const loadingSources = useRef({ events: false, resources: false })
	const wasLoading = useRef(false)
	const trackLoading = (source: 'events' | 'resources') => {
		return (isLoading: boolean) => {
			loadingSources.current[source] = isLoading
			const isAnyLoading =
				loadingSources.current.events || loadingSources.current.resources
			if (isAnyLoading !== wasLoading.current) {
				wasLoading.current = isAnyLoading
				reportLoading?.(isAnyLoading)
			}
		}
	}

	const { refetch: refetchEvents } = useRangeFetcher({
		name: 'events',
		fetcher: eventsFetcher,
		getCurrentViewRange,
		timezone,
		lazyFetching,
		loading: trackLoading('events'),
		onError: onEventsError,
		onResult: setCurrentEvents,
	})

	const [fetchedResources, setFetchedResources] = useState<Resource[]>()
	const { refetch: refetchResources } = useRangeFetcher({
		name: 'resources',
		fetcher: resourcesFetcher,
		followsRange: Boolean(refetchResourcesOnNavigate),
		getCurrentViewRange,
		timezone,
		loading: trackLoading('resources'),
		onError: onResourcesError,
		onResult: setFetchedResources,
	})
	const resources = resourcesFetcher ? fetchedResources : resourcesProp

	// A resource calendar from the first render, even while the first list is
	// still on its way, so the layout does not switch when it arrives.
	const hasResourceAxis =
		Boolean(resourcesFetcher) || Boolean(resources?.length)

	// Reported when the list's content changes, not its identity: an inline array
	// is new on every render, and a consumer that stores what it is told would
	// otherwise re-render the calendar forever.
	const reportResources = useLatestHandler(resourcesSet)
	const lastReported = useRef<Resource[] | undefined>(undefined)
	useEffect(() => {
		const previous = lastReported.current
		const isUnchanged = Boolean(
			resources && previous && isSameResourceList(previous, resources)
		)
		if (!resources || isUnchanged) {
			return
		}
		lastReported.current = resources
		reportResources?.(resources)
	}, [resources, reportResources])

	const callbacks = {
		setCurrentEvents,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onEventsChange,
	}
	const { addEvent, updateEvent, deleteEvent } = useEventMutations({
		currentEvents,
		...callbacks,
	})
	const { applyScopedEdit, applyScopedDelete } = usePluginMutations({
		currentEvents,
		pluginRuntime,
		...callbacks,
	})
	const {
		getEventsForResource,
		getEventsForResources,
		getResourceById,
		isEventCrossResource,
	} = useResourceLookups(processedEvents, resources ?? EMPTY_RESOURCES)

	return useMemo(
		() => ({
			events: processedEvents,
			rawEvents: currentEvents,
			setCurrentEvents,
			refetchEvents,
			resources,
			hasResourceAxis,
			refetchResources,
			getEventsForDateRange,
			addEvent,
			updateEvent,
			deleteEvent,
			applyScopedEdit,
			applyScopedDelete,
			getEventsForResource,
			getEventsForResources,
			getResourceById,
			isEventCrossResource,
		}),
		[
			processedEvents,
			currentEvents,
			setCurrentEvents,
			refetchEvents,
			resources,
			hasResourceAxis,
			refetchResources,
			getEventsForDateRange,
			addEvent,
			updateEvent,
			deleteEvent,
			applyScopedEdit,
			applyScopedDelete,
			getEventsForResource,
			getEventsForResources,
			getResourceById,
			isEventCrossResource,
		]
	)
}
