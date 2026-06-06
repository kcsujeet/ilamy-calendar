import type React from 'react'
import { useCallback, useMemo } from 'react'
import type { CalendarEvent } from '@/components/types'
import type { CalendarProviderProps } from '@/features/calendar/contexts/calendar-context/provider'
import type {
	CalendarClassesOverride,
	CellInfo,
	RenderCurrentTimeIndicatorProps,
	SlotDuration,
} from '@/features/calendar/types'
import { composePluginProviders } from '@/features/plugins/lib/compose-plugin-providers'
import type { Resource } from '@/features/resource-calendar/types'
import { useCalendarEngine } from '@/hooks/use-calendar-engine'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { EVENT_BAR_HEIGHT } from '@/lib/constants'
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
	events?: CalendarEvent[]
	resources?: Resource[]
	renderResource?: (resource: Resource) => React.ReactNode
	classesOverride?: CalendarClassesOverride
	orientation?: 'horizontal' | 'vertical'
	weekViewGranularity?: 'hourly' | 'daily'
	renderCurrentTimeIndicator?: (
		props: RenderCurrentTimeIndicatorProps
	) => React.ReactNode
	renderHour?: (date: Dayjs) => React.ReactNode
	hideNonBusinessHours?: boolean
	slotDuration?: SlotDuration
	scrollTime?: string
}

export const ResourceCalendarProvider: React.FC<
	ResourceCalendarProviderProps
> = ({
	children,
	events = [],
	resources = [],
	firstDayOfWeek = 0,
	initialView = 'month',
	initialDate,
	renderEvent,
	onEventClick,
	onCellClick,
	isCellDisabled,
	onViewChange,
	onEventAdd,
	onEventUpdate,
	onEventDelete,
	onDateChange,
	locale,
	timezone,
	disableCellClick,
	disableEventClick,
	disableDragAndDrop,
	dayMaxEvents,
	eventSpacing = 1,
	eventHeight = EVENT_BAR_HEIGHT,
	stickyViewHeader = true,
	viewHeaderClassName = '',
	headerComponent,
	headerClassName,
	translations,
	translator,
	renderResource,
	renderEventForm,
	businessHours,
	timeFormat = '12-hour',
	classesOverride,
	orientation = 'horizontal',
	renderCurrentTimeIndicator,
	renderHour,
	hideNonBusinessHours = false,
	hideExportButton = false,
	hiddenDays,
	weekViewGranularity = 'hourly',
	slotDuration = 60,
	scrollTime,
	plugins,
}) => {
	// Use the calendar engine
	const calendarEngine = useCalendarEngine({
		events,
		firstDayOfWeek,
		initialView,
		initialDate,
		businessHours,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onDateChange,
		onViewChange: onViewChange,
		locale,
		timezone,
		translations,
		translator,
		plugins,
	})

	// Event utilities — both filters go through getEventResourceIds so single
	// and multi-resource events are handled uniformly.
	const getEventsForResource = useCallback(
		(resourceId: string | number): CalendarEvent[] =>
			calendarEngine.events.filter((e) =>
				getEventResourceIds(e).includes(resourceId)
			),
		[calendarEngine.events]
	)

	const getEventsForResources = useCallback(
		(resourceIds: (string | number)[]): CalendarEvent[] =>
			calendarEngine.events.filter((e) =>
				getEventResourceIds(e).some((id) => resourceIds.includes(id))
			),
		[calendarEngine.events]
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

	// Cross-resource event utilities
	const isEventCrossResource = useCallback((event: CalendarEvent): boolean => {
		return Boolean(event.resourceIds && event.resourceIds.length > 1)
	}, [])

	// Custom handlers
	const editEvent = useCallback(
		(event: CalendarEvent) => {
			calendarEngine.setSelectedEvent(event)
			calendarEngine.setIsEventFormOpen(true)
		},
		[calendarEngine]
	)

	const handleEventClick = useCallback(
		(event: CalendarEvent) => {
			if (disableEventClick) {
				return
			}
			if (onEventClick) {
				onEventClick(event)
			} else {
				editEvent(event)
			}
		},
		[disableEventClick, onEventClick, editEvent]
	)

	const handleDateClick = useCallback(
		(info: CellInfo) => {
			if (disableCellClick) {
				return
			}

			if (onCellClick) {
				onCellClick(info)
			} else {
				const newEvent: CalendarEvent = {
					title: calendarEngine.t('newEvent'),
					start: info.start,
					end: info.end,
					description: '',
					allDay: false,
				} as CalendarEvent

				if (info.resource !== undefined) {
					newEvent.resourceId = info.resource.id
				}

				calendarEngine.setSelectedEvent(newEvent)
				calendarEngine.setSelectedDate(info.start)
				calendarEngine.setIsEventFormOpen(true)
			}
		},
		[onCellClick, disableCellClick, calendarEngine]
	)

	// Create the context value
	const contextValue = useMemo(
		() => ({
			...calendarEngine,
			// Resource-specific state
			resources,
			// Resource utilities
			getEventsForResource,
			getEventsForResources,
			getResourceById,
			isEventCrossResource,
			getEventResourceIds,
			// Override handlers
			onEventClick: handleEventClick,
			onCellClick: handleDateClick,
			// Pass-through props
			isCellDisabled,
			renderEvent,
			renderResource,
			renderEventForm,
			headerComponent,
			headerClassName,
			locale,
			timezone,
			disableCellClick,
			disableEventClick,
			disableDragAndDrop,
			dayMaxEvents,
			eventSpacing,
			eventHeight,
			stickyViewHeader,
			viewHeaderClassName,
			businessHours,
			timeFormat,
			classesOverride,
			orientation,
			renderCurrentTimeIndicator,
			renderHour,
			hideNonBusinessHours,
			hideExportButton,
			hiddenDays,
			weekViewGranularity,
			slotDuration,
			scrollTime,
		}),
		[
			calendarEngine,
			resources,
			getEventsForResource,
			getEventsForResources,
			getResourceById,
			isEventCrossResource,
			handleEventClick,
			handleDateClick,
			isCellDisabled,
			renderEvent,
			renderResource,
			renderEventForm,
			locale,
			timezone,
			disableCellClick,
			disableEventClick,
			disableDragAndDrop,
			dayMaxEvents,
			eventSpacing,
			eventHeight,
			stickyViewHeader,
			viewHeaderClassName,
			headerComponent,
			headerClassName,
			businessHours,
			timeFormat,
			classesOverride,
			orientation,
			renderCurrentTimeIndicator,
			renderHour,
			hideNonBusinessHours,
			hideExportButton,
			hiddenDays,
			weekViewGranularity,
			slotDuration,
			scrollTime,
		]
	)

	const wrappedChildren = composePluginProviders(
		calendarEngine.getProviders(),
		children
	)

	return (
		<ResourceCalendarContext.Provider value={contextValue}>
			{wrappedChildren}
		</ResourceCalendarContext.Provider>
	)
}
