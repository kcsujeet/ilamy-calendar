import type { CalendarEngineReturn } from '@/lib/calendar-engine/use-calendar-engine'
import type {
  Resource,
  ResourceCalendarEvent,
  ResourceView,
} from '@/components/ilamy-resource-calendar/types'
import type dayjs from '@/lib/dayjs-config'
import { createContext, useContext } from 'react'

export interface ResourceCalendarContextType
  extends Omit<
    CalendarEngineReturn,
    'view' | 'setView' | 'events' | 'rawEvents'
  > {
  // Override view types to exclude year
  view: ResourceView
  setView: (view: ResourceView) => void

  // Override events to use resource events
  events: ResourceCalendarEvent[]
  rawEvents: ResourceCalendarEvent[]

  // Resource-specific state
  resources: Resource[]
  visibleResources: Set<string | number>

  // Resource actions
  addResource: (resource: Resource) => void
  updateResource: (
    resourceId: string | number,
    resource: Partial<Resource>
  ) => void
  deleteResource: (resourceId: string | number) => void
  toggleResourceVisibility: (resourceId: string | number) => void
  showResource: (resourceId: string | number) => void
  hideResource: (resourceId: string | number) => void
  showAllResources: () => void
  hideAllResources: () => void

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
  headerComponent?: React.ReactNode
  headerClassName?: string
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
export interface UseIlamyResourceCalendarContextReturn {
  readonly currentDate: dayjs.Dayjs
  readonly view: ResourceView
  readonly events: ResourceCalendarEvent[]
  readonly resources: Resource[]
  readonly isEventFormOpen: boolean
  readonly selectedEvent: ResourceCalendarEvent | null
  readonly selectedDate: dayjs.Dayjs | null
  readonly firstDayOfWeek: number
  readonly dayMaxEvents: number
  readonly setCurrentDate: (date: dayjs.Dayjs) => void
  readonly selectDate: (date: dayjs.Dayjs) => void
  readonly setView: (view: ResourceView) => void
  readonly nextPeriod: () => void
  readonly prevPeriod: () => void
  readonly today: () => void
  readonly addEvent: (event: ResourceCalendarEvent) => void
  readonly updateEvent: (
    eventId: string | number,
    event: Partial<ResourceCalendarEvent>
  ) => void
  readonly deleteEvent: (eventId: string | number) => void
  readonly addResource: (resource: Resource) => void
  readonly updateResource: (
    resourceId: string | number,
    resource: Partial<Resource>
  ) => void
  readonly deleteResource: (resourceId: string | number) => void
  readonly openEventForm: (date?: dayjs.Dayjs) => void
  readonly closeEventForm: () => void
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
      dayMaxEvents: context.dayMaxEvents,
      setCurrentDate: context.setCurrentDate,
      selectDate: context.selectDate,
      setView: context.setView,
      nextPeriod: context.nextPeriod,
      prevPeriod: context.prevPeriod,
      today: context.today,
      addEvent: context.addEvent,
      updateEvent: context.updateEvent,
      deleteEvent: context.deleteEvent,
      addResource: context.addResource,
      updateResource: context.updateResource,
      deleteResource: context.deleteResource,
      openEventForm: context.openEventForm,
      closeEventForm: context.closeEventForm,
      getEventsForResource: context.getEventsForResource,
    } as const
  }
