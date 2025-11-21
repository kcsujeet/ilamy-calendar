import dayjs from '@/lib/configs/dayjs-config'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CalendarEvent, BusinessHours } from '@/components/types'
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
import { getWeekDays, getMonthWeeks } from '@/lib/utils/date-utils'

export interface CalendarEngineConfig {
  events: CalendarEvent[]
  firstDayOfWeek: number
  initialView?: CalendarView
  initialDate?: dayjs.Dayjs
  businessHours?: BusinessHours
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
  businessHours?: BusinessHours
  setCurrentDate: (date: dayjs.Dayjs) => void
  selectDate: (date: dayjs.Dayjs) => void
  setView: (view: CalendarView) => void
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
  setSelectedEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>
  setIsEventFormOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSelectedDate: React.Dispatch<React.SetStateAction<dayjs.Dayjs | null>>
  getEventsForDateRange: (
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs
  ) => CalendarEvent[]
  findParentRecurringEvent: (event: CalendarEvent) => CalendarEvent | null
  t: (key: keyof Translations) => string
}

const VIEW_UNITS: Record<CalendarView, dayjs.ManipulateType> = {
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'year',
}

export const useCalendarEngine = (
  config: CalendarEngineConfig
): CalendarEngineReturn => {
  const {
    events = [],
    firstDayOfWeek = 0,
    initialView = 'month',
    initialDate = dayjs(),
    businessHours,
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

  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(initialDate)
  const [view, setView] = useState<CalendarView>(initialView)
  const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>(events)
  const [isEventFormOpen, setIsEventFormOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null)
  const [currentLocale, setCurrentLocale] = useState(locale || 'en')

  const t = useMemo(() => {
    if (translator) {
      return translator
    }
    if (translations) {
      return (key: keyof Translations) => translations[key] || key
    }
    return (key: keyof Translations) => defaultTranslations[key] || key
  }, [translations, translator])

  const getEventsForDateRange = useCallback(
    (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): CalendarEvent[] => {
      const allEvents: CalendarEvent[] = []

      for (const event of currentEvents) {
        if (event.rrule) {
          allEvents.push(
            ...generateRecurringEvents({
              event,
              currentEvents,
              startDate,
              endDate,
            })
          )
        } else {
          const startsInRange =
            event.start.isSameOrAfter(startDate) &&
            event.start.isSameOrBefore(endDate)
          const endsInRange =
            event.end.isSameOrAfter(startDate) &&
            event.end.isSameOrBefore(endDate)
          const spansRange =
            event.start.isBefore(startDate) && event.end.isAfter(endDate)
          if (startsInRange || endsInRange || spansRange) {
            allEvents.push(event)
          }
        }
      }
      return allEvents
    },
    [currentEvents]
  )

  const getCurrentViewRange = useCallback(() => {
    if (view === 'day') {
      return {
        start: currentDate.startOf('day'),
        end: currentDate.endOf('day'),
      }
    }
    if (view === 'year') {
      return {
        start: currentDate.startOf('year'),
        end: currentDate.endOf('year'),
      }
    }
    if (view === 'week') {
      const weekDays = getWeekDays(currentDate, firstDayOfWeek)
      return {
        start: weekDays[0].startOf('day'),
        end: weekDays[6].endOf('day'),
      }
    }
    // month view
    const weeks = getMonthWeeks(currentDate, firstDayOfWeek)
    return { start: weeks[0][0].startOf('day'), end: weeks[5][6].endOf('day') }
  }, [currentDate, view, firstDayOfWeek])

  const processedEvents = useMemo(() => {
    const { start, end } = getCurrentViewRange()
    return getEventsForDateRange(start, end)
  }, [getEventsForDateRange, getCurrentViewRange])

  useEffect(() => {
    if (events) {
      setCurrentEvents(events)
    }
  }, [events])
  useEffect(() => {
    if (locale) {
      setCurrentLocale(locale)
      dayjs.locale(locale)
      setCurrentDate((prevDate) => prevDate.locale(locale))
    }
  }, [locale])
  useEffect(() => {
    if (timezone) {
      dayjs.tz.setDefault(timezone)
    }
  }, [timezone])

  const selectDate = useCallback(
    (date: dayjs.Dayjs) => {
      setCurrentDate(date)
      onDateChange?.(date)
    },
    [onDateChange]
  )

  const navigatePeriod = useCallback(
    (direction: 1 | -1) => {
      setCurrentDate((prev) => {
        const newDate =
          direction === 1
            ? prev.add(1, VIEW_UNITS[view])
            : prev.subtract(1, VIEW_UNITS[view])
        onDateChange?.(newDate)
        return newDate
      })
    },
    [view, onDateChange]
  )

  const nextPeriod = useCallback(() => navigatePeriod(1), [navigatePeriod])
  const prevPeriod = useCallback(() => navigatePeriod(-1), [navigatePeriod])

  const today = useCallback(() => {
    const newDate = dayjs()
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }, [onDateChange])

  const addEvent = useCallback(
    (event: CalendarEvent) => {
      setCurrentEvents((prev) => [...prev, event])
      onEventAdd?.(event)
    },
    [onEventAdd]
  )

  const updateEvent = useCallback(
    (eventId: string | number, updates: Partial<CalendarEvent>) => {
      setCurrentEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) {
            return event
          }
          const newEvent = { ...event, ...updates }
          onEventUpdate?.(newEvent)
          return newEvent
        })
      )
    },
    [onEventUpdate]
  )

  const updateRecurringEvent = useCallback(
    (
      event: CalendarEvent,
      updates: Partial<CalendarEvent>,
      options: RecurrenceEditOptions
    ) => {
      onEventUpdate?.({ ...event, ...updates })
      setCurrentEvents(
        updateRecurringEventImpl({
          targetEvent: event,
          updates,
          currentEvents,
          scope: options.scope,
        })
      )
    },
    [currentEvents, onEventUpdate]
  )

  const deleteRecurringEvent = useCallback(
    (event: CalendarEvent, options: RecurrenceEditOptions) => {
      onEventDelete?.(event)
      setCurrentEvents(
        deleteRecurringEventImpl({
          targetEvent: event,
          currentEvents,
          scope: options.scope,
        })
      )
    },
    [currentEvents, onEventDelete]
  )

  const deleteEvent = useCallback(
    (eventId: string | number) => {
      setCurrentEvents((prev) => {
        const eventToDelete = prev.find((e) => e.id === eventId)
        if (eventToDelete) {
          onEventDelete?.(eventToDelete)
        }
        return prev.filter((e) => e.id !== eventId)
      })
    },
    [onEventDelete]
  )

  const openEventForm = useCallback(
    (date?: dayjs.Dayjs) => {
      if (date) {
        setSelectedDate(date)
      }
      setSelectedEvent({
        title: t('newEvent'),
        start: date ?? currentDate,
        end: (date ?? currentDate).add(1, 'hour'),
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

  const handleViewChange = useCallback(
    (newView: CalendarView) => {
      setView(newView)
      onViewChange?.(newView)
    },
    [onViewChange]
  )

  const findParentRecurringEvent = useCallback(
    (event: CalendarEvent): CalendarEvent | null => {
      const targetUID = event.uid
      return (
        currentEvents.find(
          (e) => (e.uid || `${e.id}@ilamy.calendar`) === targetUID && e.rrule
        ) || null
      )
    },
    [currentEvents]
  )

  return {
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
    businessHours,
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
    openEventForm,
    closeEventForm,
    setSelectedEvent,
    setIsEventFormOpen,
    setSelectedDate,
    getEventsForDateRange,
    findParentRecurringEvent,
    t,
  }
}
