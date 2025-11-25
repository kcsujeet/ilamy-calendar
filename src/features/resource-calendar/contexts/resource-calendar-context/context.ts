import type { Resource } from '@/features/resource-calendar/types'
import type { CellClickInfo } from '@/features/calendar/types'
import { createContext, useContext } from 'react'
import type {
  CalendarContextType,
  UseIlamyCalendarContextReturn,
} from '@/features/calendar/contexts/calendar-context/context'
import type { CalendarEvent } from '@/components/types'

export interface ResourceCalendarContextType extends CalendarContextType {
  // Resource-specific state
  resources: Resource[]
  visibleResources: Set<string | number>

  // Resource utilities
  getEventsForResource: (resourceId: string | number) => CalendarEvent[]
  getEventsForResources: (resourceIds: (string | number)[]) => CalendarEvent[]
  getResourceById: (resourceId: string | number) => Resource | undefined
  getVisibleResources: () => Resource[]

  // Cross-resource event utilities
  isEventCrossResource: (event: CalendarEvent) => boolean
  getEventResourceIds: (event: CalendarEvent) => (string | number)[]

  // Additional properties from calendar context
  onEventClick: (event: CalendarEvent) => void
  onCellClick: (info: CellClickInfo) => void
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
  readonly events: CalendarEvent[]
  readonly resources: Resource[]
  readonly getEventsForResource: (
    resourceId: string | number
  ) => CalendarEvent[]
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
      businessHours: context.businessHours,
    } as const
  }
