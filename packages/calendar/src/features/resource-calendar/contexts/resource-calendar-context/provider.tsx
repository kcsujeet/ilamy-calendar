import type React from 'react'
import { useCallback, useMemo } from 'react'
import type { CalendarEvent } from '@/components/types'
import {
	type CalendarProviderProps,
	useCalendarContextValue,
} from '@/features/calendar/contexts/calendar-context/provider'
import { composePluginProviders } from '@/features/plugins/lib/compose-plugin-providers'
import type { Resource } from '@/features/resource-calendar/types'
import { ResourceCalendarContext } from './context'

const getEventResourceIds = (event: CalendarEvent): (string | number)[] => {
	if (event.resourceIds) {
		return event.resourceIds
	}
	if (event.resourceId !== undefined) {
		return [event.resourceId]
	}
	return []
}

interface ResourceCalendarProviderProps extends CalendarProviderProps {
	resources?: Resource[]
	renderResource?: (resource: Resource) => React.ReactNode
	orientation?: 'horizontal' | 'vertical'
	weekViewGranularity?: 'hourly' | 'daily'
}

/**
 * Prop-mapping over the shared context value: everything except the resource
 * axis comes from useCalendarContextValue (the same slices the regular
 * provider composes). Phase 4 deletes this provider entirely; until then the
 * cross-feature import is the tolerated strangler seam.
 */
export const ResourceCalendarProvider: React.FC<
	ResourceCalendarProviderProps
> = ({
	children,
	resources = [],
	renderResource,
	orientation = 'horizontal',
	weekViewGranularity = 'hourly',
	...props
}) => {
	const baseValue = useCalendarContextValue(props)

	// Resource utilities — both filters go through getEventResourceIds so single
	// and multi-resource events are handled uniformly.
	const getEventsForResource = useCallback(
		(resourceId: string | number): CalendarEvent[] =>
			baseValue.events.filter((e) =>
				getEventResourceIds(e).includes(resourceId)
			),
		[baseValue.events]
	)

	const getEventsForResources = useCallback(
		(resourceIds: (string | number)[]): CalendarEvent[] =>
			baseValue.events.filter((e) =>
				getEventResourceIds(e).some((id) => resourceIds.includes(id))
			),
		[baseValue.events]
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

	const contextValue = useMemo(
		() => ({
			...baseValue,
			resources,
			getEventsForResource,
			getEventsForResources,
			getResourceById,
			isEventCrossResource,
			getEventResourceIds,
			renderResource,
			orientation,
			weekViewGranularity,
		}),
		[
			baseValue,
			resources,
			getEventsForResource,
			getEventsForResources,
			getResourceById,
			isEventCrossResource,
			renderResource,
			orientation,
			weekViewGranularity,
		]
	)

	const wrappedChildren = composePluginProviders(
		baseValue.getProviders(),
		children
	)

	return (
		<ResourceCalendarContext.Provider value={contextValue}>
			{wrappedChildren}
		</ResourceCalendarContext.Provider>
	)
}
