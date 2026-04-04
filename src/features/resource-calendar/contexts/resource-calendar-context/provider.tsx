import type React from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
	AllEventDialog,
	type AllEventsDialogHandle,
} from '@/components/all-events-dialog'
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
	renderCurrentTimeIndicator?: (
		props: RenderCurrentTimeIndicatorProps
	) => React.ReactNode
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
	hideNonBusinessHours = false,
	hiddenDays,
}) => {
	// Resource-specific state
	const [currentResources] = useState<Resource[]>(resources)
	const [visibleResources, setVisibleResources] = useState<
		Set<string | number>
	>(new Set(resources.map((r) => r.id)))

	// Use the calendar engine — destructure to get stable references for useMemo deps
	const {
		currentDate,
		view,
		events: processedEvents,
		rawEvents,
		currentLocale,
		isEventFormOpen,
		selectedEvent,
		selectedDate,
		firstDayOfWeek: engineFirstDayOfWeek,
		dayMaxEvents: engineDayMaxEvents,
		setCurrentDate,
		selectDate,
		setView,
		nextPeriod,
		prevPeriod,
		today,
		addEvent,
		updateEvent,
		updateRecurringEvent,
		deleteEvent,
		deleteRecurringEvent,
		openEventForm,
		closeEventForm,
		setSelectedEvent,
		setIsEventFormOpen,
		setSelectedDate,
		getEventsForDateRange,
		findParentRecurringEvent,
		t,
	} = useCalendarEngine({
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
	})

	// All-events dialog — ref stays internal to provider
	const allEventsDialogRef = useRef<AllEventsDialogHandle>(null)
	const openAllEventsDialog = useCallback(
		(day: Dayjs, events: CalendarEvent[]) => {
			allEventsDialogRef.current?.open(day, events)
		},
		[]
	)
	const closeAllEventsDialog = useCallback(() => {
		allEventsDialogRef.current?.close()
	}, [])

	// Resource visibility
	const toggleResourceVisibility = useCallback(
		(resourceId: string | number) => {
			setVisibleResources((prev) => {
				const newSet = new Set(prev)
				if (newSet.has(resourceId)) {
					newSet.delete(resourceId)
				} else {
					newSet.add(resourceId)
				}
				return newSet
			})
		},
		[]
	)

	const showResource = useCallback((resourceId: string | number) => {
		setVisibleResources((prev) => new Set(prev).add(resourceId))
	}, [])

	const hideResource = useCallback((resourceId: string | number) => {
		setVisibleResources((prev) => {
			const newSet = new Set(prev)
			newSet.delete(resourceId)
			return newSet
		})
	}, [])

	const showAllResources = useCallback(() => {
		setVisibleResources(new Set(currentResources.map((r) => r.id)))
	}, [currentResources])

	const hideAllResources = useCallback(() => {
		setVisibleResources(new Set())
	}, [])

	// Event utilities
	const getEventsForResource = useCallback(
		(resourceId: string | number): CalendarEvent[] => {
			return processedEvents.filter((event: CalendarEvent) => {
				if (event.resourceIds) {
					return event.resourceIds.includes(resourceId)
				}
				return event.resourceId === resourceId
			})
		},
		[processedEvents]
	)

	const getEventsForResources = useCallback(
		(resourceIds: (string | number)[]): CalendarEvent[] => {
			return processedEvents.filter((event: CalendarEvent) => {
				const eventResourceIds = getEventResourceIds(event)
				return eventResourceIds.some((id) => resourceIds.includes(id))
			})
		},
		[processedEvents]
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
			setSelectedEvent(event)
			setIsEventFormOpen(true)
		},
		[setSelectedEvent, setIsEventFormOpen]
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
					title: t('newEvent'),
					start: info.start,
					end: info.end,
					description: '',
					allDay: false,
				} as CalendarEvent

				if (info.resourceId !== undefined) {
					newEvent.resourceId = info.resourceId
				}

				setSelectedEvent(newEvent)
				setSelectedDate(info.start)
				setIsEventFormOpen(true)
			}
		},
		[
			onCellClick,
			disableCellClick,
			t,
			setSelectedEvent,
			setSelectedDate,
			setIsEventFormOpen,
		]
	)

	// Create the context value
	const contextValue = useMemo(
		() => ({
			// Engine state
			currentDate,
			view,
			events: processedEvents,
			rawEvents,
			currentLocale,
			isEventFormOpen,
			selectedEvent,
			selectedDate,
			firstDayOfWeek: engineFirstDayOfWeek,
			dayMaxEvents: engineDayMaxEvents,

			// Engine actions
			setCurrentDate,
			selectDate,
			setView,
			nextPeriod,
			prevPeriod,
			today,
			addEvent,
			updateEvent,
			updateRecurringEvent,
			deleteEvent,
			deleteRecurringEvent,
			openEventForm,
			closeEventForm,
			getEventsForDateRange,
			findParentRecurringEvent,
			t,

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

			// Cross-resource event utilities
			isEventCrossResource,
			getEventResourceIds,

			// Override handlers
			onEventClick: handleEventClick,
			onCellClick: handleDateClick,

			// Pass through header props
			headerComponent,
			headerClassName,

			// Pass through other props
			renderEvent,
			renderResource,
			renderEventForm,
			locale,
			timezone,
			disableCellClick,
			disableEventClick,
			disableDragAndDrop,
			eventSpacing,
			stickyViewHeader,
			viewHeaderClassName,
			businessHours,
			timeFormat,
			classesOverride,
			orientation,
			renderCurrentTimeIndicator,
			hideNonBusinessHours,
			hiddenDays,
			openAllEventsDialog,
			closeAllEventsDialog,
		}),
		[
			openAllEventsDialog,
			closeAllEventsDialog,
			currentDate,
			view,
			processedEvents,
			rawEvents,
			currentLocale,
			isEventFormOpen,
			selectedEvent,
			selectedDate,
			engineFirstDayOfWeek,
			engineDayMaxEvents,
			setCurrentDate,
			selectDate,
			setView,
			nextPeriod,
			prevPeriod,
			today,
			addEvent,
			updateEvent,
			updateRecurringEvent,
			deleteEvent,
			deleteRecurringEvent,
			openEventForm,
			closeEventForm,
			getEventsForDateRange,
			findParentRecurringEvent,
			t,
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
			eventSpacing,
			stickyViewHeader,
			viewHeaderClassName,
			headerComponent,
			headerClassName,
			businessHours,
			timeFormat,
			classesOverride,
			orientation,
			renderCurrentTimeIndicator,
			hideNonBusinessHours,
			hiddenDays,
		]
	)

	return (
		<ResourceCalendarContext.Provider value={contextValue}>
			{children}
			<AllEventDialog ref={allEventsDialogRef} />
		</ResourceCalendarContext.Provider>
	)
}
