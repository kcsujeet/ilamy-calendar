import type {
  Resource,
  ResourceCalendarEvent,
} from '@/features/resource-calendar/types'
import type dayjs from '@/lib/configs/dayjs-config'
import { createContext, useContext } from 'react'
import type {
  CalendarContextType,
  UseIlamyCalendarContextReturn,
} from '@/features/calendar/contexts/calendar-context/context'

export interface ResourceCalendarContextType extends CalendarContextType {
  // Resource-specific state
  resources: Resource[]
  visibleResources: Set<string | number>

  // Resource utilities
  getEventsForResource: (resourceId: string | number) => ResourceCalendarEvent[]
  getEventsForResources: (
    resourceIds: (string | number)[]
  ) => ResourceCalendarEvent[]
  getResourceById: (resourceId: string | number) => Resource | undefined
  getVisibleResources: () => Resource[]

  // Cross-resource event utilities
  isEventCrossResource: (event: ResourceCalendarEvent) => boolean
  getEventResourceIds: (event: ResourceCalendarEvent) => (string | number)[]

  // Additional properties from calendar context
  onEventClick: (event: ResourceCalendarEvent) => void
  onCellClick: (
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
    resourceId?: string | number
  ) => void
  renderResource?: (resource: Resource) => React.ReactNode
}

export const ResourceCalendarContext: React.Context<
  ResourceCalendarContextType | undefined
> = createContext<ResourceCalendarContextType | undefined>(undefined)

export const useResourceCalendarContext = (): ResourceCalendarContextType => {
  const context = useContext(ResourceCalendarContext)
  if (context === undefined) {
    throw new Error(
      'useResourceCalendarContext must be used within a ResourceCalendarProvider'
    )
  }
  return context
}

/**
 * Simplified resource calendar context type for external use
 */
export interface UseIlamyResourceCalendarContextReturn
  extends UseIlamyCalendarContextReturn {
  readonly events: ResourceCalendarEvent[]
  readonly resources: Resource[]
  readonly getEventsForResource: (
    resourceId: string | number
  ) => ResourceCalendarEvent[]
}

export const useIlamyResourceCalendarContext =
  (): UseIlamyResourceCalendarContextReturn => {
    const context = useContext(ResourceCalendarContext)
    if (context === undefined) {
      throw new Error(
        'useIlamyResourceCalendarContext must be used within a ResourceCalendarProvider'
      )
    }
    return {
      currentDate: context.currentDate,
      view: context.view,
      events: context.events,
      resources: context.resources,
      isEventFormOpen: context.isEventFormOpen,
      selectedEvent: context.selectedEvent,
      selectedDate: context.selectedDate,
      firstDayOfWeek: context.firstDayOfWeek,
      setCurrentDate: context.setCurrentDate,
      selectDate: context.selectDate,
      setView: context.setView,
      nextPeriod: context.nextPeriod,
      prevPeriod: context.prevPeriod,
      today: context.today,
      addEvent: context.addEvent,
      updateEvent: context.updateEvent,
      deleteEvent: context.deleteEvent,
      openEventForm: context.openEventForm,
      closeEventForm: context.closeEventForm,
      getEventsForResource: context.getEventsForResource,
    } as const
  }
