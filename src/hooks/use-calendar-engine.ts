import dayjs from '@/lib/configs/dayjs-config'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CalendarEvent } from '@/components/types'
import {
  generateRecurringEvents,
  updateRecurringEvent as updateRecurringEventImpl,
  deleteRecurringEvent as deleteRecurringEventImpl,
} from '@/features/recurrence/utils/recurrence-handler'
import type { RecurrenceEditOptions } from '@/features/recurrence/types'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import { defaultTranslations } from '@/lib/translations/default'
import { DAY_MAX_EVENTS_DEFAULT } from '../lib/constants'
import type { CalendarView } from '@/types'

export interface CalendarEngineConfig {
  events: CalendarEvent[]
  firstDayOfWeek: number
  initialView?: CalendarView
  initialDate?: dayjs.Dayjs
  onEventAdd?: (event: CalendarEvent) => void
  onEventUpdate?: (event: CalendarEvent) => void
  onEventDelete?: (event: CalendarEvent) => void
  onDateChange?: (date: dayjs.Dayjs) => void
  onViewChange?: (view: CalendarView) => void
  locale?: string
  timezone?: string
  translations?: Translations
  translator?: TranslatorFunction
}

export interface CalendarEngineReturn {
  // State
  currentDate: dayjs.Dayjs
  view: CalendarView
  events: CalendarEvent[]
  rawEvents: CalendarEvent[]
  isEventFormOpen: boolean
  selectedEvent: CalendarEvent | null
  selectedDate: dayjs.Dayjs | null
  firstDayOfWeek: number
  dayMaxEvents: number
  currentLocale: string

  // Actions
  setCurrentDate: (date: dayjs.Dayjs) => void
  selectDate: (date: dayjs.Dayjs) => void
  setView: (view: CalendarView) => void
  nextPeriod: () => void
  prevPeriod: () => void
  today: () => void

  // Event operations
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

  // Event form
  openEventForm: (date?: dayjs.Dayjs) => void
  closeEventForm: () => void
  setSelectedEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>
  setIsEventFormOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSelectedDate: React.Dispatch<React.SetStateAction<dayjs.Dayjs | null>>

  // Utilities
  getEventsForDateRange: (
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs
  ) => CalendarEvent[]
  findParentRecurringEvent: (event: CalendarEvent) => CalendarEvent | null
  getCurrentViewRange: () => { start: dayjs.Dayjs; end: dayjs.Dayjs }

  // Translation
  t: (key: keyof Translations) => string
}

export const useCalendarEngine = (
  config: CalendarEngineConfig
): CalendarEngineReturn => {
  const {
    events = [],
    firstDayOfWeek = 0,
    initialView = 'month',
    initialDate = dayjs(),
    onEventAdd,
    onEventUpdate,
    onEventDelete,
    onDateChange,
    onViewChange,
    locale,
    timezone,
    translations,
    translator,
  } = config

  // State
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(initialDate)
  const [view, setView] = useState<CalendarView>(initialView)
  const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>(events)
  const [isEventFormOpen, setIsEventFormOpen] = useState<boolean>(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null)
  const [currentLocale, setCurrentLocale] = useState<string>(locale || 'en')

  // Create translation function
  const t = useMemo(() => {
    if (translator) {
      return translator
    }
    if (translations) {
      return (key: keyof Translations) => translations[key] || key
    }
    return (key: keyof Translations) => defaultTranslations[key] || key
  }, [translations, translator])

  // Helper function to get events for a specific date range
  const getEventsForDateRange = useCallback(
    (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): CalendarEvent[] => {
      const allEvents: CalendarEvent[] = []

      for (const event of currentEvents) {
        if (event.rrule) {
          const recurringEvents = generateRecurringEvents({
            event,
            currentEvents,
            startDate,
            endDate,
          })
          allEvents.push(...recurringEvents)
        } else {
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

  // Get the current view's date range
  const getCurrentViewRange = useCallback(() => {
    switch (view) {
      case 'day':
        return {
          start: currentDate.startOf('day'),
          end: currentDate.endOf('day'),
        }
      case 'week': {
        // Calculate the start of the week based on firstDayOfWeek setting
        const currentDay = currentDate.day()
        const diff = (currentDay - firstDayOfWeek + 7) % 7
        const weekStart = currentDate.subtract(diff, 'day').startOf('day')
        const weekEnd = weekStart.add(6, 'day').endOf('day')

        return {
          start: weekStart,
          end: weekEnd,
        }
      }
      case 'month': {
        // Calculate start: First day of month, then back to firstDayOfWeek
        const monthStart = currentDate.startOf('month')
        const monthStartDay = monthStart.day()
        const startDiff = (monthStartDay - firstDayOfWeek + 7) % 7
        const calendarStart = monthStart
          .subtract(startDiff, 'day')
          .startOf('day')

        // Calculate end: Last day of month, then forward to complete the week
        const monthEnd = currentDate.endOf('month')
        const monthEndDay = monthEnd.day()
        const endDiff = 6 - ((monthEndDay - firstDayOfWeek + 7) % 7)
        const calendarEnd = monthEnd.add(endDiff, 'day').endOf('day')

        return {
          start: calendarStart,
          end: calendarEnd,
        }
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

  // Get processed events for the current view
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

  // Configure timezone when timezone prop changes
  useEffect(() => {
    if (timezone) {
      dayjs.tz.setDefault(timezone)
    }
  }, [timezone])

  // Date navigation
  const selectDate = useCallback(
    (date: dayjs.Dayjs) => {
      setCurrentDate(date)
      onDateChange?.(date)
    },
    [onDateChange]
  )

  const nextPeriod = useCallback(() => {
    switch (view) {
      case 'month':
        setCurrentDate((currentDate) => {
          const newDate = currentDate.add(1, 'month')
          onDateChange?.(newDate)
          return newDate
        })
        break
      case 'week':
        setCurrentDate((currentDate) => {
          const newDate = currentDate.add(1, 'week')
          onDateChange?.(newDate)
          return newDate
        })
        break
      case 'day':
        setCurrentDate((currentDate) => {
          const newDate = currentDate.add(1, 'day')
          onDateChange?.(newDate)
          return newDate
        })
        break
      case 'year':
        setCurrentDate((currentDate) => {
          const newDate = currentDate.add(1, 'year')
          onDateChange?.(newDate)
          return newDate
        })
        break
    }
  }, [view, onDateChange])

  const prevPeriod = useCallback(() => {
    switch (view) {
      case 'month':
        setCurrentDate((currentDate) => {
          const newDate = currentDate.subtract(1, 'month')
          onDateChange?.(newDate)
          return newDate
        })
        break
      case 'week':
        setCurrentDate((currentDate) => {
          const newDate = currentDate.subtract(1, 'week')
          onDateChange?.(newDate)
          return newDate
        })
        break
      case 'day':
        setCurrentDate((currentDate) => {
          const newDate = currentDate.subtract(1, 'day')
          onDateChange?.(newDate)
          return newDate
        })
        break
      case 'year':
        setCurrentDate((currentDate) => {
          const newDate = currentDate.subtract(1, 'year')
          onDateChange?.(newDate)
          return newDate
        })
        break
    }
  }, [view, onDateChange])

  const today = useCallback(() => {
    const newDate = dayjs()
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }, [onDateChange])

  // Event operations
  const addEvent = useCallback(
    (event: CalendarEvent) => {
      setCurrentEvents((prevEvents) => [...prevEvents, event])
      onEventAdd?.(event)
    },
    [onEventAdd]
  )

  const updateEvent = useCallback(
    (eventId: string | number, updatedEvent: Partial<CalendarEvent>) => {
      setCurrentEvents((prevEvents) => {
        const updated = prevEvents.map((event) => {
          if (event.id === eventId) {
            const newEvent = { ...event, ...updatedEvent }
            onEventUpdate?.(newEvent)
            return newEvent
          }
          return event
        })
        return updated
      })
    },
    [onEventUpdate]
  )

  const updateRecurringEvent = useCallback(
    (
      event: CalendarEvent,
      updates: Partial<CalendarEvent>,
      options: RecurrenceEditOptions
    ) => {
      const updatedEvent = { ...event, ...updates }
      onEventUpdate?.(updatedEvent)

      const updatedEvents = updateRecurringEventImpl({
        targetEvent: event,
        updates,
        currentEvents,
        scope: options.scope,
      })

      setCurrentEvents(updatedEvents)
    },
    [currentEvents, onEventUpdate]
  )

  const deleteRecurringEvent = useCallback(
    (event: CalendarEvent, options: RecurrenceEditOptions) => {
      onEventDelete?.(event)

      const updatedEvents = deleteRecurringEventImpl({
        targetEvent: event,
        currentEvents,
        scope: options.scope,
      })

      setCurrentEvents(updatedEvents)
    },
    [currentEvents, onEventDelete]
  )

  const deleteEvent = useCallback(
    (eventId: string | number) => {
      setCurrentEvents((prevEvents) => {
        const eventToDelete = prevEvents.find((event) => event.id === eventId)
        if (eventToDelete) {
          onEventDelete?.(eventToDelete)
        }
        return prevEvents.filter((event) => event.id !== eventId)
      })
    },
    [onEventDelete]
  )

  // Event form
  const openEventForm = useCallback(
    (date?: dayjs.Dayjs) => {
      if (date) {
        setSelectedDate(date)
      }
      setSelectedEvent({
        title: t('newEvent'),
        start: date ?? currentDate,
        end: date ?? currentDate.add(1, 'hour'),
        description: '',
        allDay: false,
      } as CalendarEvent)
      setIsEventFormOpen(true)
    },
    [currentDate, t]
  )

  const closeEventForm = useCallback(() => {
    setSelectedDate(null)
    setSelectedEvent(null)
    setIsEventFormOpen(false)
  }, [])

  // View management
  const handleViewChange = useCallback(
    (newView: CalendarView) => {
      setView(newView)
      onViewChange?.(newView)
    },
    [onViewChange]
  )

  // Find parent recurring event
  const findParentRecurringEvent = useCallback(
    (event: CalendarEvent): CalendarEvent | null => {
      const targetUID = event.uid

      const parentEvent = currentEvents.find((e) => {
        const parentUID = e.uid || `${e.id}@ilamy.calendar`
        return parentUID === targetUID && e.rrule
      })

      return parentEvent || null
    },
    [currentEvents]
  )

  return {
    // State
    currentDate,
    view,
    events: processedEvents,
    rawEvents: currentEvents,
    isEventFormOpen,
    selectedEvent,
    selectedDate,
    firstDayOfWeek,
    dayMaxEvents: DAY_MAX_EVENTS_DEFAULT,
    currentLocale,

    // Actions
    setCurrentDate,
    selectDate,
    setView: handleViewChange,
    nextPeriod,
    prevPeriod,
    today,

    // Event operations
    addEvent,
    updateEvent,
    updateRecurringEvent,
    deleteEvent,
    deleteRecurringEvent,

    // Event form
    openEventForm,
    closeEventForm,
    setSelectedEvent,
    setIsEventFormOpen,
    setSelectedDate,

    // Utilities
    getEventsForDateRange,
    findParentRecurringEvent,
    getCurrentViewRange,

    // Translation
    t,
  }
}
