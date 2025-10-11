import React, { useCallback, useMemo, useState } from 'react'
import { ResourceCalendarContext } from './context'
import type {
  Resource,
  ResourceCalendarEvent,
} from '@/features/resource-calendar/types'
import { useCalendarEngine } from '@/hooks/use-calendar-engine'
import type dayjs from '@/lib/configs/dayjs-config'
import type { CalendarProviderProps } from '@/features/calendar/contexts/calendar-context/provider'

const getEventResourceIds = (
  event: ResourceCalendarEvent
): (string | number)[] => {
  if (event.resourceIds) {
    return event.resourceIds
  }
  if (event.resourceId !== undefined) {
    return [event.resourceId]
  }
  return []
}

interface ResourceCalendarProviderProps extends CalendarProviderProps {
  events?: ResourceCalendarEvent[]
  resources?: Resource[]
  onCellClick?: (
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
    resourceId?: string | number
  ) => void
}

export const ResourceCalendarProvider: React.FC<
  ResourceCalendarProviderProps
> = ({
  children,
  events = [],
  resources = [],
  firstDayOfWeek = 0,
  initialView = 'month',
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
  stickyViewHeader = true,
  viewHeaderClassName = '',
  headerComponent,
  headerClassName,
  translations,
  translator,
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
    (resourceId: string | number): ResourceCalendarEvent[] => {
      return calendarEngine.events.filter((event: ResourceCalendarEvent) => {
        if (event.resourceIds) {
          return event.resourceIds.includes(resourceId)
        }
        return event.resourceId === resourceId
      })
    },
    [calendarEngine.events]
  )

  const getEventsForResources = useCallback(
    (resourceIds: (string | number)[]): ResourceCalendarEvent[] => {
      return calendarEngine.events.filter((event: ResourceCalendarEvent) => {
        const eventResourceIds = getEventResourceIds(event)
        return eventResourceIds.some((id) => resourceIds.includes(id))
      })
    },
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
  const isEventCrossResource = useCallback(
    (event: ResourceCalendarEvent): boolean => {
      return Boolean(event.resourceIds && event.resourceIds.length > 1)
    },
    []
  )

  // Custom handlers
  const editEvent = useCallback(
    (event: ResourceCalendarEvent) => {
      calendarEngine.setSelectedEvent(event)
      calendarEngine.setIsEventFormOpen(true)
    },
    [calendarEngine]
  )

  const handleEventClick = useCallback(
    (event: ResourceCalendarEvent) => {
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
    (
      startDate: dayjs.Dayjs,
      endDate: dayjs.Dayjs,
      resourceId?: string | number
    ) => {
      if (disableCellClick) {
        return
      }

      if (onCellClick) {
        onCellClick(startDate, endDate, resourceId)
      } else {
        const newEvent: ResourceCalendarEvent = {
          title: calendarEngine.t('newEvent'),
          start: startDate,
          end: endDate,
          description: '',
          allDay: false,
        } as ResourceCalendarEvent

        if (resourceId !== undefined) {
          newEvent.resourceId = resourceId
        }

        calendarEngine.setSelectedEvent(newEvent)
        calendarEngine.setSelectedDate(startDate)
        calendarEngine.setIsEventFormOpen(true)
      }
    },
    [onCellClick, disableCellClick, calendarEngine]
  )

  // Create the context value
  const contextValue = useMemo(
    () => ({
      ...calendarEngine,
      view: calendarEngine.view,
      setView: calendarEngine.setView,
      events: calendarEngine.events,
      rawEvents: calendarEngine.rawEvents,

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
      locale,
      timezone,
      disableCellClick,
      disableEventClick,
      disableDragAndDrop,
      dayMaxEvents,
      stickyViewHeader,
      viewHeaderClassName,
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
      locale,
      timezone,
      disableCellClick,
      disableEventClick,
      disableDragAndDrop,
      dayMaxEvents,
      stickyViewHeader,
      viewHeaderClassName,
      headerComponent,
      headerClassName,
    ]
  )

  return (
    <ResourceCalendarContext.Provider value={contextValue}>
      {children}
    </ResourceCalendarContext.Provider>
  )
}
