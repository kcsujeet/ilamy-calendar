import type React from 'react'
import { useCallback, useMemo, useState } from 'react'
import type { CalendarEvent } from '@/components/types'
import type { CalendarProviderProps } from '@/features/calendar/contexts/calendar-context/provider'
import type {
	CalendarClassesOverride,
	CellClickInfo,
	RenderCurrentTimeIndicatorProps,
} from '@/features/calendar/types'
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
	onViewChange,
	dateEventType = 'Dayjs',
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
}) => {
	// Resource-specific state
	const [currentResources] = useState<Resource[]>(resources)
	const [visibleResources, setVisibleResources] = useState<
		Set<string | number>
	>(new Set(resources.map((r) => r.id)))

	// Use the calendar engine
	const calendarEngine = useCalendarEngine({
		events,
		firstDayOfWeek,
		initialView,
		initialDate,
		businessHours,
		dateEventType,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onDateChange,
		onViewChange: onViewChange,
		locale,
		timezone,
		translations,
		translator,
	})

	// Resource visibility — all mutations go through a single updater.
	const mutateVisibility = useCallback(
		(op: 'show' | 'hide' | 'toggle', id: string | number) => {
			setVisibleResources((prev) => {
				const next = new Set(prev)
				if (op === 'show' || (op === 'toggle' && !next.has(id))) next.add(id)
				else next.delete(id)
				return next
			})
		},
		[]
	)
	const showResource = useCallback(
		(id: string | number) => mutateVisibility('show', id),
		[mutateVisibility]
	)
	const hideResource = useCallback(
		(id: string | number) => mutateVisibility('hide', id),
		[mutateVisibility]
	)
	const toggleResourceVisibility = useCallback(
		(id: string | number) => mutateVisibility('toggle', id),
		[mutateVisibility]
	)
	const showAllResources = useCallback(
		() => setVisibleResources(new Set(currentResources.map((r) => r.id))),
		[currentResources]
	)
	const hideAllResources = useCallback(() => setVisibleResources(new Set()), [])

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
		(resourceId: string | number): Resource | undefined => {
			return currentResources.find((resource) => resource.id === resourceId)
		},
		[currentResources]
	)

	const getVisibleResources = useCallback((): Resource[] => {
		return currentResources.filter((resource) =>
			visibleResources.has(resource.id)
		)
	}, [currentResources, visibleResources])

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
		(info: CellClickInfo) => {
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

				if (info.resourceId !== undefined) {
					newEvent.resourceId = info.resourceId
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
			resources: currentResources,
			visibleResources,
			toggleResourceVisibility,
			showResource,
			hideResource,
			showAllResources,
			hideAllResources,
			// Resource utilities
			getEventsForResource,
			getEventsForResources,
			getResourceById,
			getVisibleResources,
			isEventCrossResource,
			getEventResourceIds,
			// Override handlers
			onEventClick: handleEventClick,
			onCellClick: handleDateClick,
			// Pass-through props
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
		}),
		[
			calendarEngine,
			currentResources,
			visibleResources,
			toggleResourceVisibility,
			showResource,
			hideResource,
			showAllResources,
			hideAllResources,
			getEventsForResource,
			getEventsForResources,
			getResourceById,
			getVisibleResources,
			isEventCrossResource,
			handleEventClick,
			handleDateClick,
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
		]
	)

	return (
		<ResourceCalendarContext.Provider value={contextValue}>
			{children}
		</ResourceCalendarContext.Provider>
	)
}
