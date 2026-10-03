import type { CalendarEvent, Resource } from '@ilamy/types'
import { useCallback } from 'react'
import {
	filterEventsForResource,
	getEventResourceIds,
} from '@/lib/events/pipeline'

export interface ResourceLookups {
	getEventsForResource: (resourceId: string | number) => CalendarEvent[]
	getEventsForResources: (resourceIds: (string | number)[]) => CalendarEvent[]
	getResourceById: (
		resourceId: string | number | undefined
	) => Resource | undefined
	isEventCrossResource: (event: CalendarEvent) => boolean
}

/**
 * Resource questions about the events in view. Both filters go through
 * getEventResourceIds so single and multi-resource events are handled
 * uniformly. They filter by the events' OWN resource fields, so they behave
 * identically with or without a resource axis; only getResourceById consults
 * the `resources` array.
 */
export const useResourceLookups = (
	processedEvents: CalendarEvent[],
	resources: Resource[]
): ResourceLookups => {
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

	return {
		getEventsForResource,
		getEventsForResources,
		getResourceById,
		isEventCrossResource,
	}
}
