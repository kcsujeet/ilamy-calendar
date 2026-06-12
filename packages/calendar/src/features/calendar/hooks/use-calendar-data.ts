import type { CalendarEvent, Resource } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PluginRuntime } from '@/features/plugins/lib/types'
import {
	filterEventsForResource,
	getEventResourceIds,
} from '@/lib/events/pipeline'

export interface CalendarDataParams {
	events: CalendarEvent[]
	pluginRuntime: PluginRuntime
	getCurrentViewRange: () => { start: Dayjs; end: Dayjs }
	resources: Resource[]
	onEventAdd?: (event: CalendarEvent) => void
	onEventUpdate?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
}

export interface CalendarDataSlice {
	events: CalendarEvent[]
	rawEvents: CalendarEvent[]
	setCurrentEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
	getEventsForDateRange: (startDate: Dayjs, endDate: Dayjs) => CalendarEvent[]
	addEvent: (event: CalendarEvent) => void
	updateEvent: (eventId: string | number, event: Partial<CalendarEvent>) => void
	deleteEvent: (eventId: string | number) => void
	applyScopedEdit: (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>,
		scope: unknown
	) => void
	applyScopedDelete: (event: CalendarEvent, scope: unknown) => void
	getEventsForResource: (resourceId: string | number) => CalendarEvent[]
	getEventsForResources: (resourceIds: (string | number)[]) => CalendarEvent[]
	getResourceById: (
		resourceId: string | number | undefined
	) => Resource | undefined
	isEventCrossResource: (event: CalendarEvent) => boolean
}

/** Data slice: event store, prop sync, CRUD, and plugin-scoped mutations. */
export const useCalendarData = ({
	events,
	pluginRuntime,
	getCurrentViewRange,
	resources,
	onEventAdd,
	onEventUpdate,
	onEventDelete,
}: CalendarDataParams): CalendarDataSlice => {
	const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>(events)
	const lastEventsProp = useRef(events)

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

	useEffect(() => {
		if (events !== lastEventsProp.current) {
			setCurrentEvents(events)
			lastEventsProp.current = events
		}
	}, [events])

	const addEvent = useCallback(
		(event: CalendarEvent) => {
			setCurrentEvents((prev) => [...prev, event])
			onEventAdd?.(event)
		},
		[onEventAdd]
	)

	const updateEvent = useCallback(
		(eventId: string | number, updates: Partial<CalendarEvent>) => {
			const eventToUpdate = currentEvents.find((event) => event.id === eventId)
			if (!eventToUpdate) {
				return
			}

			const newEvent = { ...eventToUpdate, ...updates }
			setCurrentEvents((prev) =>
				prev.map((event) => (event.id === eventId ? newEvent : event))
			)
			onEventUpdate?.(newEvent)
		},
		[currentEvents, onEventUpdate]
	)

	const applyScopedEdit = useCallback(
		(event: CalendarEvent, updates: Partial<CalendarEvent>, scope: unknown) => {
			const manager = pluginRuntime.getEventManager(event)
			if (!manager?.applyEdit) {
				return
			}
			onEventUpdate?.({ ...event, ...updates })
			setCurrentEvents(
				manager.applyEdit({ event, updates, currentEvents, scope })
			)
		},
		[currentEvents, onEventUpdate, pluginRuntime]
	)

	const applyScopedDelete = useCallback(
		(event: CalendarEvent, scope: unknown) => {
			const manager = pluginRuntime.getEventManager(event)
			if (!manager?.applyDelete) {
				return
			}
			onEventDelete?.(event)
			setCurrentEvents(manager.applyDelete({ event, currentEvents, scope }))
		},
		[currentEvents, onEventDelete, pluginRuntime]
	)

	const deleteEvent = useCallback(
		(eventId: string | number) => {
			const eventToDelete = currentEvents.find((e) => e.id === eventId)
			if (!eventToDelete) {
				return
			}

			setCurrentEvents((prev) => prev.filter((e) => e.id !== eventId))
			onEventDelete?.(eventToDelete)
		},
		[currentEvents, onEventDelete]
	)

	// Resource utilities — both filters go through getEventResourceIds so single
	// and multi-resource events are handled uniformly. They filter by the
	// events' OWN resource fields, so they behave identically with or without a
	// resource axis; only getResourceById consults the `resources` array.
	const getEventsForResource = useCallback(
		(resourceId: string | number): CalendarEvent[] =>
			filterEventsForResource(processedEvents, resourceId),
		[processedEvents]
	)

	const getEventsForResources = useCallback(
		(resourceIds: (string | number)[]): CalendarEvent[] =>
			processedEvents.filter((e) =>
				getEventResourceIds(e).some((id) => resourceIds.includes(id))
			),
		[processedEvents]
	)

	const getResourceById = useCallback(
		(resourceId: string | number | undefined): Resource | undefined => {
			if (resourceId === undefined) {
				return undefined
			}
			return resources.find((resource) => resource.id === resourceId)
		},
		[resources]
	)

	const isEventCrossResource = useCallback((event: CalendarEvent): boolean => {
		return Boolean(event.resourceIds && event.resourceIds.length > 1)
	}, [])

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
