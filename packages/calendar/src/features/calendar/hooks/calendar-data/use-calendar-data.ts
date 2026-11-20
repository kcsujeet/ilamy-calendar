import type {
	CalendarEvent,
	DateRange,
	EventsChange,
	PublicDateInput,
	Resource,
} from '@ilamy/types'
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
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

export interface CalendarDataOptions {
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
	resources?: Resource[]
	onEventAdd?: (event: CalendarEvent) => void
	onEventUpdate?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
	onEventsChange?: (change: EventsChange) => void
}

interface CalendarDataParams extends CalendarDataOptions {
	pluginRuntime: PluginRuntime
	getCurrentViewRange: () => DateRange
}

const EMPTY_RESOURCES: Resource[] = []

export interface CalendarDataSlice
	extends EventMutations,
		PluginMutations,
		ResourceLookups {
	events: CalendarEvent[]
	rawEvents: CalendarEvent[]
	setCurrentEvents: Dispatch<SetStateAction<CalendarEvent[]>>
	refetchEvents: () => void
	resources?: Resource[]
	hasResourceAxis: boolean
	refetchResources: () => void
	getEventsForDateRange: (
		startDate: PublicDateInput,
		endDate: PublicDateInput
	) => CalendarEvent[]
}

const useCombinedLoading = (loading?: (isLoading: boolean) => void) => {
	const reportLoading = useLatestHandler(loading)
	const loadingSources = useRef({ events: false, resources: false })
	const wasLoading = useRef(false)
	return (source: 'events' | 'resources') => {
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
}

const useReportResources = (
	resources: Resource[] | undefined,
	resourcesSet?: (resources: Resource[]) => void
) => {
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
}

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
	const store = useEventStore({
		events,
		pluginRuntime,
		getCurrentViewRange,
		timezone,
	})
	const {
		currentEvents,
		setCurrentEvents,
		getEventsForDateRange,
		processedEvents,
	} = store

	const trackLoading = useCombinedLoading(loading)

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

	const hasResourceAxis =
		Boolean(resourcesFetcher) || Boolean(resources?.length)

	useReportResources(resources, resourcesSet)

	const callbacks = {
		setCurrentEvents,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onEventsChange,
		timezone,
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
