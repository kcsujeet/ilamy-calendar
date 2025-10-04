import type dayjs from '@/lib/dayjs-config'
import React, { useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { CalendarContext } from './context'
import type { CalendarEvent } from '@/components/types'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import { useCalendarEngine } from '@/lib/calendar-engine/use-calendar-engine'

export interface CalendarProviderProps {
  children: ReactNode
  events?: CalendarEvent[]
  firstDayOfWeek?: number // 0 for Sunday, 1 for Monday, etc.
  initialView?: 'month' | 'week' | 'day' | 'year'
  renderEvent?: (event: CalendarEvent) => ReactNode
  onEventClick?: (event: CalendarEvent) => void
  onCellClick?: (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => void
  onViewChange?: (view: 'month' | 'week' | 'day' | 'year') => void
  onEventAdd?: (event: CalendarEvent) => void
  onEventUpdate?: (event: CalendarEvent) => void
  onEventDelete?: (event: CalendarEvent) => void
  onDateChange?: (date: dayjs.Dayjs) => void
  locale?: string
  timezone?: string
  disableCellClick?: boolean
  disableEventClick?: boolean
  disableDragAndDrop?: boolean
  dayMaxEvents: number
  stickyViewHeader?: boolean
  viewHeaderClassName?: string
  headerComponent?: ReactNode // Optional custom header component
  headerClassName?: string // Optional custom header class
  // Translation options - provide either translations object OR translator function
  translations?: Translations
  translator?: TranslatorFunction
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
  events = [],
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
  // Use the calendar engine
  const calendarEngine = useCalendarEngine({
    events,
    firstDayOfWeek,
    initialView,
    onEventAdd,
    onEventUpdate,
    onEventDelete,
    onDateChange,
    onViewChange,
    locale,
    timezone,
    translations,
    translator,
  })

  const editEvent = useCallback(
    (event: CalendarEvent) => {
      calendarEngine.setSelectedEvent(event)
      calendarEngine.setIsEventFormOpen(true)
    },
    [calendarEngine]
  )

  // Custom handlers that call external callbacks
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
    (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => {
      if (disableCellClick) {
        return
      }

      if (onCellClick) {
        onCellClick(startDate, endDate)
      } else {
        calendarEngine.openEventForm(startDate)
      }
    },
    [onCellClick, disableCellClick, calendarEngine]
  )

  // Create the context value
  const contextValue = useMemo(
    () => ({
      currentDate: calendarEngine.currentDate,
      view: calendarEngine.view,
      events: calendarEngine.events,
      rawEvents: calendarEngine.rawEvents,
      currentLocale: calendarEngine.currentLocale,
      isEventFormOpen: calendarEngine.isEventFormOpen,
      selectedEvent: calendarEngine.selectedEvent,
      selectedDate: calendarEngine.selectedDate,
      firstDayOfWeek: calendarEngine.firstDayOfWeek,
      setCurrentDate: calendarEngine.setCurrentDate,
      selectDate: calendarEngine.selectDate,
      setView: calendarEngine.setView,
      nextPeriod: calendarEngine.nextPeriod,
      prevPeriod: calendarEngine.prevPeriod,
      today: calendarEngine.today,
      addEvent: calendarEngine.addEvent,
      updateEvent: calendarEngine.updateEvent,
      updateRecurringEvent: calendarEngine.updateRecurringEvent,
      deleteEvent: calendarEngine.deleteEvent,
      deleteRecurringEvent: calendarEngine.deleteRecurringEvent,
      openEventForm: calendarEngine.openEventForm,
      closeEventForm: calendarEngine.closeEventForm,
      getEventsForDateRange: calendarEngine.getEventsForDateRange,
      findParentRecurringEvent: calendarEngine.findParentRecurringEvent,
      renderEvent,
      onEventClick: handleEventClick,
      onCellClick: handleDateClick,
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
      t: calendarEngine.t,
    }),
    [
      calendarEngine,
      renderEvent,
      handleEventClick,
      handleDateClick,
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
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  )
}
