import type { CalendarEvent } from '@/components/types'
import type { RecurrenceEditOptions } from '@/features/recurrence/types'
import type dayjs from '@/lib/dayjs-config'
import { createContext, useContext } from 'react'

export interface CalendarContextType {
  currentDate: dayjs.Dayjs
  view: 'month' | 'week' | 'day' | 'year'
  events: CalendarEvent[]
  isEventFormOpen: boolean
  selectedEvent: CalendarEvent | null
  selectedDate: dayjs.Dayjs | null
  firstDayOfWeek: number // 0 for Sunday, 1 for Monday, etc.
  setCurrentDate: (date: dayjs.Dayjs) => void
  selectDate: (date: dayjs.Dayjs) => void
  setView: (view: 'month' | 'week' | 'day' | 'year') => void
  nextPeriod: () => void
  prevPeriod: () => void
  today: () => void
  addEvent: (event: CalendarEvent) => void
  updateEvent: (eventId: string | number, event: Partial<CalendarEvent>) => void
  updateRecurringEvent: (
    event: CalendarEvent,
    updates: Partial<CalendarEvent>,
    options: RecurrenceEditOptions
  ) => void
  deleteEvent: (eventId: string | number) => void
  deleteRecurringEvent: (
    event: CalendarEvent,
    options: RecurrenceEditOptions
  ) => void
  openEventForm: (date?: dayjs.Dayjs) => void
  closeEventForm: () => void
  getEventsForDate: (date: dayjs.Dayjs) => CalendarEvent[]
  getEventsForDateRange: (
    start: dayjs.Dayjs,
    end: dayjs.Dayjs
  ) => CalendarEvent[]
  renderEvent?: (event: CalendarEvent) => React.ReactNode
  onEventClick: (event: CalendarEvent) => void
  onCellClick: (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => void
  currentLocale?: string
  disableCellClick?: boolean
  disableEventClick?: boolean
  disableDragAndDrop?: boolean
  dayMaxEvents: number
  stickyViewHeader: boolean
  viewHeaderClassName: string
  headerComponent?: React.ReactNode // Optional custom header component
}

export const CalendarContext: React.Context<CalendarContextType | undefined> =
  createContext<CalendarContextType | undefined>(undefined)

export const useCalendarContext = (): CalendarContextType => {
  const context = useContext(CalendarContext)
  if (context === undefined) {
    throw new Error('useCalendarContext must be used within a CalendarProvider')
  }
  return context
}

/**
 * Simplified calendar context type for external use
 * Contains only the most commonly used calendar operations
 */
export interface UseIlamyCalendarContextReturn {
  readonly currentDate: dayjs.Dayjs
  readonly view: 'month' | 'week' | 'day' | 'year'
  readonly events: CalendarEvent[]
  readonly isEventFormOpen: boolean
  readonly selectedEvent: CalendarEvent | null
  readonly selectedDate: dayjs.Dayjs | null
  readonly firstDayOfWeek: number
  readonly setCurrentDate: (date: dayjs.Dayjs) => void
  readonly selectDate: (date: dayjs.Dayjs) => void
  readonly setView: (view: 'month' | 'week' | 'day' | 'year') => void
  readonly nextPeriod: () => void
  readonly prevPeriod: () => void
  readonly today: () => void
  readonly addEvent: (event: CalendarEvent) => void
  readonly updateEvent: (
    eventId: string | number,
    event: Partial<CalendarEvent>
  ) => void
  readonly deleteEvent: (eventId: string | number) => void
  readonly openEventForm: (date?: dayjs.Dayjs) => void
  readonly closeEventForm: () => void
}

export const useIlamyCalendarContext = (): UseIlamyCalendarContextReturn => {
  const context = useContext(CalendarContext)
  if (context === undefined) {
    throw new Error(
      'useIlamyCalendarContext must be used within a CalendarProvider'
    )
  }
  return {
    currentDate: context.currentDate,
    view: context.view,
    events: context.events,
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
  } as const
}
