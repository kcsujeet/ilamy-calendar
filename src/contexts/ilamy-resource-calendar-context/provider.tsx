import React, { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ResourceCalendarContext } from './context'
import type {
  Resource,
  ResourceCalendarEvent,
  ResourceView,
} from '@/components/ilamy-resource-calendar/types'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import { useCalendarEngine } from '@/lib/calendar-engine/use-calendar-engine'
import type dayjs from '@/lib/dayjs-config'

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

interface ResourceCalendarProviderProps {
  children: ReactNode
  events?: ResourceCalendarEvent[]
  resources?: Resource[]
  firstDayOfWeek?: number
  initialView?: ResourceView
  renderEvent?: (event: ResourceCalendarEvent) => ReactNode
  onEventClick?: (event: ResourceCalendarEvent) => void
  onCellClick?: (
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
    resourceId?: string | number
  ) => void
  onViewChange?: (view: ResourceView) => void
  onEventAdd?: (event: ResourceCalendarEvent) => void
  onEventUpdate?: (event: ResourceCalendarEvent) => void
  onEventDelete?: (event: ResourceCalendarEvent) => void
  onDateChange?: (date: dayjs.Dayjs) => void
  onResourceAdd?: (resource: Resource) => void
  onResourceUpdate?: (resource: Resource) => void
  onResourceDelete?: (resource: Resource) => void
  locale?: string
  timezone?: string
  disableCellClick?: boolean
  disableEventClick?: boolean
  disableDragAndDrop?: boolean
  dayMaxEvents: number
  stickyViewHeader?: boolean
  viewHeaderClassName?: string
  headerComponent?: ReactNode
  headerClassName?: string
  translations?: Translations
  translator?: TranslatorFunction
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
  onResourceAdd,
  onResourceUpdate,
  onResourceDelete,
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
  const [currentResources, setCurrentResources] =
    useState<Resource[]>(resources)
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

  // Resource operations
  const addResource = useCallback(
    (resource: Resource) => {
      setCurrentResources((prev) => [...prev, resource])
      setVisibleResources((prev) => new Set(prev).add(resource.id))
      onResourceAdd?.(resource)
    },
    [onResourceAdd]
  )

  const updateResource = useCallback(
    (resourceId: string | number, updatedResource: Partial<Resource>) => {
      setCurrentResources((prev) =>
        prev.map((resource) => {
          if (resource.id === resourceId) {
            const newResource = { ...resource, ...updatedResource }
            onResourceUpdate?.(newResource)
            return newResource
          }
          return resource
        })
      )
    },
    [onResourceUpdate]
  )

  const deleteResource = useCallback(
    (resourceId: string | number) => {
      setCurrentResources((prev) => {
        const resourceToDelete = prev.find(
          (resource) => resource.id === resourceId
        )
        if (resourceToDelete) {
          onResourceDelete?.(resourceToDelete)
        }
        return prev.filter((resource) => resource.id !== resourceId)
      })
      setVisibleResources((prev) => {
        const newSet = new Set(prev)
        newSet.delete(resourceId)
        return newSet
      })
    },
    [onResourceDelete]
  )

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
      view: calendarEngine.view as ResourceView,
      setView: calendarEngine.setView as (view: ResourceView) => void,
      events: calendarEngine.events as ResourceCalendarEvent[],
      rawEvents: calendarEngine.rawEvents as ResourceCalendarEvent[],

      // Resource-specific state
      resources: currentResources,
      visibleResources,

      // Resource actions
      addResource,
      updateResource,
      deleteResource,
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
      addResource,
      updateResource,
      deleteResource,
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
