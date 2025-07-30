import dayjs from '@/lib/dayjs-config'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CalendarContext } from './context'
import type { CalendarEvent } from '@/components/types'
import { RecurrenceHandler } from '@/lib/recurrence-handler/recurrence-handler'
import type { RecurrenceEditOptions } from '@/features/recurrence/types'

interface CalendarProviderProps {
  children: ReactNode
  events?: CalendarEvent[]
  firstDayOfWeek?: number // 0 for Sunday, 1 for Monday, etc.
  renderEvent?: (event: CalendarEvent) => ReactNode
  onEventClick?: (event: CalendarEvent) => void
  onCellClick?: (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => void
  onViewChange?: (view: 'month' | 'week' | 'day' | 'year') => void
  locale?: string
  timezone?: string
  disableCellClick?: boolean
  disableEventClick?: boolean
  disableDragAndDrop?: boolean
  dayMaxEvents: number
  stickyViewHeader?: boolean
  viewHeaderClassName?: string
  headerComponent?: ReactNode // Optional custom header component
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
  events = [],
  firstDayOfWeek = 0, // Default to Sunday,
  renderEvent,
  onEventClick,
  onCellClick,
  onViewChange,
  locale,
  timezone,
  disableCellClick,
  disableEventClick,
  disableDragAndDrop,
  dayMaxEvents,
  stickyViewHeader = true,
  viewHeaderClassName = '',
  headerComponent,
}) => {
  // State
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs())
  const [view, setView] = useState<'month' | 'week' | 'day' | 'year'>('month')
  const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>(events)
  const [isEventFormOpen, setIsEventFormOpen] = useState<boolean>(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null)
  const [currentLocale, setCurrentLocale] = useState<string>(locale || 'en')
  const [currentTimezone, setCurrentTimezone] = useState<string>(timezone || '')

  // Helper function to get events for a specific date range (on-demand generation)
  const getEventsForDateRange = useCallback(
    (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): CalendarEvent[] => {
      const allEvents: CalendarEvent[] = []

      for (const event of currentEvents) {
        if (event.recurrence) {
          // Check if the entire series is excluded by 'all' type exceptions
          const hasAllException = event.recurrence.exceptions?.some(
            (exception) => exception.type === 'all'
          )

          if (!hasAllException) {
            // Generate recurring instances for the specific range
            const recurringEvents = RecurrenceHandler.generateRecurringEvents(
              event,
              startDate,
              endDate
            )
            allEvents.push(...recurringEvents)
          }
        } else {
          // Add non-recurring events with comprehensive range checking
          const eventStartsInRange =
            event.start.isSameOrAfter(startDate) &&
            event.start.isSameOrBefore(endDate)

          const eventEndsInRange =
            event.end.isSameOrAfter(startDate) &&
            event.end.isSameOrBefore(endDate)

          const eventSpansRange =
            event.start.isBefore(startDate) && event.end.isAfter(endDate)

          if (eventStartsInRange || eventEndsInRange || eventSpansRange) {
            allEvents.push(event)
          }
        }
      }

      return allEvents
    },
    [currentEvents]
  )

  // Get the current view's date range for on-demand event generation
  const getCurrentViewRange = useCallback(() => {
    switch (view) {
      case 'day':
        return {
          start: currentDate.startOf('day'),
          end: currentDate.endOf('day'),
        }
      case 'week':
        return {
          start: currentDate
            .startOf('week')
            .subtract(firstDayOfWeek === 1 ? 1 : 0, 'day'),
          end: currentDate
            .endOf('week')
            .add(firstDayOfWeek === 1 ? 1 : 0, 'day'),
        }
      case 'month':
        return {
          start: currentDate
            .startOf('month')
            .startOf('week')
            .subtract(firstDayOfWeek === 1 ? 1 : 0, 'day'),
          end: currentDate
            .endOf('month')
            .endOf('week')
            .add(firstDayOfWeek === 1 ? 1 : 0, 'day'),
        }
      case 'year':
        return {
          start: currentDate.startOf('year'),
          end: currentDate.endOf('year'),
        }
      default:
        return {
          start: currentDate.startOf('month'),
          end: currentDate.endOf('month'),
        }
    }
  }, [currentDate, view, firstDayOfWeek])

  // Get processed events for the current view (on-demand)
  const processedEvents = useMemo(() => {
    const { start, end } = getCurrentViewRange()
    return getEventsForDateRange(start, end)
  }, [getEventsForDateRange, getCurrentViewRange])

  // Update events when events prop changes
  useEffect(() => {
    if (events) {
      setCurrentEvents(events)
    }
  }, [events])

  // Configure locale when locale prop changes
  useEffect(() => {
    if (locale) {
      setCurrentLocale(locale)
      dayjs.locale(locale)
    }
  }, [locale])

  // Configure timezone for currentDate when timezone prop changes
  useEffect(() => {
    if (timezone) {
      setCurrentTimezone(timezone)
      dayjs.tz.setDefault(timezone)
    }
  }, [timezone])

  // Handlers
  const selectDate = useCallback((date: dayjs.Dayjs) => {
    setCurrentDate(date)
  }, [])

  const nextPeriod = useCallback(() => {
    switch (view) {
      case 'month':
        setCurrentDate((currentDate) => currentDate.add(1, 'month'))
        break
      case 'week':
        setCurrentDate((currentDate) => currentDate.add(1, 'week'))
        break
      case 'day':
        setCurrentDate((currentDate) => currentDate.add(1, 'day'))
        break
      case 'year':
        setCurrentDate((currentDate) => currentDate.add(1, 'year'))
        break
    }
  }, [view])

  const prevPeriod = useCallback(() => {
    switch (view) {
      case 'month':
        setCurrentDate((currentDate) => currentDate.subtract(1, 'month'))
        break
      case 'week':
        setCurrentDate((currentDate) => currentDate.subtract(1, 'week'))
        break
      case 'day':
        setCurrentDate((currentDate) => currentDate.subtract(1, 'day'))
        break
      case 'year':
        setCurrentDate((currentDate) => currentDate.subtract(1, 'year'))
        break
    }
  }, [view])

  const today = useCallback(() => {
    setCurrentDate(dayjs())
  }, [])

  const addEvent = useCallback((event: CalendarEvent) => {
    setCurrentEvents((prevEvents) => [...prevEvents, event])
  }, [])

  const updateEvent = useCallback(
    (eventId: string, updatedEvent: Partial<CalendarEvent>) => {
      setCurrentEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventId ? { ...event, ...updatedEvent } : event
        )
      )
    },
    []
  )

  const updateRecurringEvent = useCallback(
    (
      event: CalendarEvent,
      updates: Partial<CalendarEvent>,
      options: RecurrenceEditOptions
    ) => {
      setCurrentEvents((prevEvents) =>
        RecurrenceHandler.updateRecurringEvent(
          prevEvents,
          event,
          updates,
          options
        )
      )
    },
    []
  )

  const deleteRecurringEvent = useCallback(
    (event: CalendarEvent, options: RecurrenceEditOptions) => {
      setCurrentEvents((prevEvents) =>
        RecurrenceHandler.deleteRecurringEventWithExceptions(
          prevEvents,
          event,
          options
        )
      )
    },
    []
  )

  const deleteEvent = useCallback((eventId: string) => {
    setCurrentEvents((prevEvents) =>
      prevEvents.filter((event) => event.id !== eventId)
    )
  }, [])

  const editEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsEventFormOpen(true)
  }, [])

  const closeEventForm = useCallback(() => {
    setSelectedDate(null)
    setSelectedEvent(null)
    setIsEventFormOpen(false)
  }, [])

  // Custom handlers that call external callbacks
  const handleViewChange = useCallback(
    (newView: 'month' | 'week' | 'day' | 'year') => {
      setView(newView)
      onViewChange?.(newView)
    },
    [onViewChange]
  )

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      if (disableCellClick) {
        return
      }
      if (onEventClick) {
        onEventClick(event)
      } else {
        editEvent(event)
      }
    },
    [disableCellClick, onEventClick, editEvent]
  )

  const handleDateClick = useCallback(
    (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => {
      if (disableCellClick) {
        return
      }

      if (onCellClick) {
        onCellClick(startDate, endDate)
      } else {
        setSelectedDate(startDate)
        setSelectedEvent({
          title: `New Event`,
          start: startDate,
          end: endDate,
          description: '',
          allDay: false,
          isRecurring: false,
          recurrence: null,
          parentEventId: null,
        } as CalendarEvent)
        setIsEventFormOpen(true)
      }
    },
    [onCellClick, disableCellClick]
  )

  const handleOpenEventForm = useCallback(
    (date?: dayjs.Dayjs) => {
      if (date) {
        setSelectedDate(date)
      }
      setSelectedEvent({
        title: `New Event`,
        start: date ?? currentDate,
        end: date ?? currentDate.add(1, 'hour'),
        description: '',
        allDay: false,
        isRecurring: false,
        recurrence: null,
        parentEventId: null,
      } as CalendarEvent)
      setIsEventFormOpen(true)
    },
    [currentDate]
  )

  // Create the context value
  const contextValue = useMemo(
    () => ({
      currentDate,
      view,
      events: processedEvents,
      currentLocale,
      isEventFormOpen,
      selectedEvent,
      selectedDate,
      firstDayOfWeek,
      setCurrentDate,
      selectDate,
      setView: handleViewChange,
      nextPeriod,
      prevPeriod,
      today,
      addEvent,
      updateEvent,
      updateRecurringEvent,
      deleteEvent,
      deleteRecurringEvent,
      openEventForm: handleOpenEventForm,
      closeEventForm,
      getEventsForDateRange,
      renderEvent,
      onEventClick: handleEventClick,
      onCellClick: handleDateClick,
      locale,
      timezone: currentTimezone,
      disableCellClick,
      disableEventClick,
      disableDragAndDrop,
      dayMaxEvents,
      stickyViewHeader,
      viewHeaderClassName,
      headerComponent,
    }),
    [
      currentDate,
      view,
      processedEvents,
      currentLocale,
      isEventFormOpen,
      selectedEvent,
      selectedDate,
      firstDayOfWeek,
      selectDate,
      handleViewChange,
      nextPeriod,
      handleOpenEventForm,
      prevPeriod,
      today,
      addEvent,
      updateEvent,
      updateRecurringEvent,
      deleteEvent,
      deleteRecurringEvent,
      closeEventForm,
      getEventsForDateRange,
      renderEvent,
      handleEventClick,
      handleDateClick,
      locale,
      currentTimezone,
      disableCellClick,
      disableEventClick,
      disableDragAndDrop,
      dayMaxEvents,
      stickyViewHeader,
      viewHeaderClassName,
      headerComponent,
    ]
  )

  return (
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  )
}
