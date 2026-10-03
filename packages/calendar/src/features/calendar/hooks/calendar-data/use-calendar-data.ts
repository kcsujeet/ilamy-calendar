import type { CalendarEvent, EventsChange, Resource } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { useMemo } from 'react'
import type { PluginRuntime } from '@/features/plugins/lib/types'
import { type EventMutations, useEventMutations } from './use-event-mutations'
import { useEventStore } from './use-event-store'
import {
	type PluginMutations,
	usePluginMutations,
} from './use-plugin-mutations'
import {
	type ResourceLookups,
	useResourceLookups,
} from './use-resource-lookups'

interface CalendarDataParams {
	events: CalendarEvent[]
	pluginRuntime: PluginRuntime
	getCurrentViewRange: () => { start: Dayjs; end: Dayjs }
	resources: Resource[]
	onEventAdd?: (event: CalendarEvent) => void
	onEventUpdate?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
	onEventsChange?: (change: EventsChange) => void
}

export interface CalendarDataSlice
	extends EventMutations,
		PluginMutations,
		ResourceLookups {
	/** The events in view, after plugins expand them. */
	events: CalendarEvent[]
	/** The stored rows, as the consumer holds them. */
	rawEvents: CalendarEvent[]
	setCurrentEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
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
	pluginRuntime,
	getCurrentViewRange,
	resources,
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
	} = useResourceLookups(processedEvents, resources)

	return useMemo(
		() => ({
			events: processedEvents,
			rawEvents: currentEvents,
			setCurrentEvents,
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
