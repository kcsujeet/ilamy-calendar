import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'bun:test'
import dayjs from '@/lib/configs/dayjs-config'
import { useCalendarEngine } from './use-calendar-engine'
import type { CalendarEvent } from '@/components/types'
import type { Translations } from '@/lib/translations/types'
import { RRule } from 'rrule'

const createEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  id: '1',
  title: 'Test Event',
  start: dayjs('2025-01-15T10:00:00.000Z'),
  end: dayjs('2025-01-15T11:00:00.000Z'),
  ...overrides,
})

const createRecurringEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  id: 'recurring-1',
  uid: 'recurring-1@ilamy.calendar',
  title: 'Weekly Meeting',
  start: dayjs('2025-01-06T10:00:00.000Z'),
  end: dayjs('2025-01-06T11:00:00.000Z'),
  rrule: {
    freq: RRule.WEEKLY,
    interval: 1,
    dtstart: new Date('2025-01-06T10:00:00.000Z'),
  },
  ...overrides,
})

describe('useCalendarEngine', () => {
  const defaultConfig = {
    events: [] as CalendarEvent[],
    firstDayOfWeek: 0,
  }

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useCalendarEngine(defaultConfig))

      expect(result.current.view).toBe('month')
      expect(result.current.events).toHaveLength(0)
      expect(result.current.isEventFormOpen).toBe(false)
      expect(result.current.selectedEvent).toBeNull()
      expect(result.current.selectedDate).toBeNull()
      expect(result.current.firstDayOfWeek).toBe(0)
      expect(result.current.currentLocale).toBe('en')
    })

    it('should initialize with custom initialView', () => {
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, initialView: 'week' })
      )
      expect(result.current.view).toBe('week')
    })

    it('should initialize with custom initialDate', () => {
      const customDate = dayjs('2025-06-15')
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, initialDate: customDate })
      )
      expect(result.current.currentDate.format('YYYY-MM-DD')).toBe('2025-06-15')
    })

    it('should initialize with events', () => {
      const events = [createEvent()]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events })
      )
      expect(result.current.rawEvents).toHaveLength(1)
    })

    it('should initialize with businessHours', () => {
      const businessHours = { startTime: 9, endTime: 17 }
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, businessHours })
      )
      expect(result.current.businessHours).toEqual(businessHours)
    })
  })

  describe('navigation', () => {
    it('should navigate to next month in month view', () => {
      const initialDate = dayjs('2025-01-15')
      const { result } = renderHook(() =>
        useCalendarEngine({
          ...defaultConfig,
          initialDate,
          initialView: 'month',
        })
      )

      act(() => result.current.nextPeriod())

      expect(result.current.currentDate.month()).toBe(1) // February
    })

    it('should navigate to previous month in month view', () => {
      const initialDate = dayjs('2025-02-15')
      const { result } = renderHook(() =>
        useCalendarEngine({
          ...defaultConfig,
          initialDate,
          initialView: 'month',
        })
      )

      act(() => result.current.prevPeriod())

      expect(result.current.currentDate.month()).toBe(0) // January
    })

    it('should navigate to next week in week view', () => {
      const initialDate = dayjs('2025-01-15')
      const { result } = renderHook(() =>
        useCalendarEngine({
          ...defaultConfig,
          initialDate,
          initialView: 'week',
        })
      )

      act(() => result.current.nextPeriod())

      expect(result.current.currentDate.format('YYYY-MM-DD')).toBe('2025-01-22')
    })

    it('should navigate to previous week in week view', () => {
      const initialDate = dayjs('2025-01-15')
      const { result } = renderHook(() =>
        useCalendarEngine({
          ...defaultConfig,
          initialDate,
          initialView: 'week',
        })
      )

      act(() => result.current.prevPeriod())

      expect(result.current.currentDate.format('YYYY-MM-DD')).toBe('2025-01-08')
    })

    it('should navigate to next day in day view', () => {
      const initialDate = dayjs('2025-01-15')
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, initialDate, initialView: 'day' })
      )

      act(() => result.current.nextPeriod())

      expect(result.current.currentDate.format('YYYY-MM-DD')).toBe('2025-01-16')
    })

    it('should navigate to previous day in day view', () => {
      const initialDate = dayjs('2025-01-15')
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, initialDate, initialView: 'day' })
      )

      act(() => result.current.prevPeriod())

      expect(result.current.currentDate.format('YYYY-MM-DD')).toBe('2025-01-14')
    })

    it('should navigate to next year in year view', () => {
      const initialDate = dayjs('2025-01-15')
      const { result } = renderHook(() =>
        useCalendarEngine({
          ...defaultConfig,
          initialDate,
          initialView: 'year',
        })
      )

      act(() => result.current.nextPeriod())

      expect(result.current.currentDate.year()).toBe(2026)
    })

    it('should navigate to previous year in year view', () => {
      const initialDate = dayjs('2025-01-15')
      const { result } = renderHook(() =>
        useCalendarEngine({
          ...defaultConfig,
          initialDate,
          initialView: 'year',
        })
      )

      act(() => result.current.prevPeriod())

      expect(result.current.currentDate.year()).toBe(2024)
    })

    it('should navigate to today', () => {
      const initialDate = dayjs('2020-01-15')
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, initialDate })
      )

      act(() => result.current.today())

      expect(result.current.currentDate.format('YYYY-MM-DD')).toBe(
        dayjs().format('YYYY-MM-DD')
      )
    })

    it('should call onDateChange callback when navigating', () => {
      const onDateChange = vi.fn()
      const initialDate = dayjs('2025-01-15')
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, initialDate, onDateChange })
      )

      act(() => result.current.nextPeriod())

      expect(onDateChange).toHaveBeenCalledTimes(1)
      const calledDate = onDateChange.mock.calls[0][0]
      expect(calledDate.format('YYYY-MM-DD')).toBe('2025-02-15')
    })

    it('should select a specific date', () => {
      const onDateChange = vi.fn()
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, onDateChange })
      )

      const newDate = dayjs('2025-06-20')
      act(() => result.current.selectDate(newDate))

      expect(result.current.currentDate.format('YYYY-MM-DD')).toBe('2025-06-20')
      expect(onDateChange).toHaveBeenCalledWith(newDate)
    })
  })

  describe('view management', () => {
    it('should change view', () => {
      const { result } = renderHook(() => useCalendarEngine(defaultConfig))

      act(() => result.current.setView('week'))
      expect(result.current.view).toBe('week')

      act(() => result.current.setView('day'))
      expect(result.current.view).toBe('day')

      act(() => result.current.setView('year'))
      expect(result.current.view).toBe('year')
    })

    it('should call onViewChange callback', () => {
      const onViewChange = vi.fn()
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, onViewChange })
      )

      act(() => result.current.setView('week'))

      expect(onViewChange).toHaveBeenCalledWith('week')
    })
  })

  describe('event operations', () => {
    it('should add an event', () => {
      const onEventAdd = vi.fn()
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, onEventAdd })
      )

      const newEvent = createEvent({ id: 'new-1', title: 'New Event' })
      act(() => result.current.addEvent(newEvent))

      expect(result.current.rawEvents).toHaveLength(1)
      expect(result.current.rawEvents[0].title).toBe('New Event')
      expect(onEventAdd).toHaveBeenCalledWith(newEvent)
    })

    it('should update an event', () => {
      const onEventUpdate = vi.fn()
      const events = [createEvent({ id: '1', title: 'Original' })]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events, onEventUpdate })
      )

      act(() => result.current.updateEvent('1', { title: 'Updated' }))

      expect(result.current.rawEvents[0].title).toBe('Updated')
      expect(result.current.rawEvents[0].id).toBe('1')
      expect(onEventUpdate).toHaveBeenCalledTimes(1)
      const updatedEvent = onEventUpdate.mock.calls[0][0]
      expect(updatedEvent.title).toBe('Updated')
      expect(updatedEvent.id).toBe('1')
    })

    it('should not update non-existent event', () => {
      const onEventUpdate = vi.fn()
      const events = [createEvent({ id: '1' })]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events, onEventUpdate })
      )

      act(() =>
        result.current.updateEvent('non-existent', { title: 'Updated' })
      )

      expect(result.current.rawEvents[0].title).toBe('Test Event')
      expect(onEventUpdate).not.toHaveBeenCalled()
    })

    it('should delete an event', () => {
      const onEventDelete = vi.fn()
      const events = [
        createEvent({ id: '1', title: 'First' }),
        createEvent({ id: '2', title: 'Second' }),
      ]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events, onEventDelete })
      )

      act(() => result.current.deleteEvent('1'))

      expect(result.current.rawEvents).toHaveLength(1)
      expect(result.current.rawEvents[0].id).toBe('2')
      expect(onEventDelete).toHaveBeenCalledTimes(1)
      const deletedEvent = onEventDelete.mock.calls[0][0]
      expect(deletedEvent.id).toBe('1')
      expect(deletedEvent.title).toBe('First')
    })

    it('should not call onEventDelete for non-existent event', () => {
      const onEventDelete = vi.fn()
      const events = [createEvent({ id: '1' })]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events, onEventDelete })
      )

      act(() => result.current.deleteEvent('non-existent'))

      expect(result.current.rawEvents).toHaveLength(1)
      expect(onEventDelete).not.toHaveBeenCalled()
    })
  })

  describe('event form', () => {
    it('should open event form without date', () => {
      const { result } = renderHook(() => useCalendarEngine(defaultConfig))

      act(() => result.current.openEventForm())

      expect(result.current.isEventFormOpen).toBe(true)
      expect(result.current.selectedEvent).not.toBeNull()
      expect(result.current.selectedEvent?.title).toBe('New Event')
    })

    it('should open event form with specific date', () => {
      const { result } = renderHook(() => useCalendarEngine(defaultConfig))

      const date = dayjs('2025-03-15T14:00:00.000Z')
      act(() => result.current.openEventForm({ start: date }))

      expect(result.current.isEventFormOpen).toBe(true)
      expect(result.current.selectedDate?.format('YYYY-MM-DD')).toBe(
        '2025-03-15'
      )
      expect(result.current.selectedEvent?.start.format('YYYY-MM-DD')).toBe(
        '2025-03-15'
      )
    })

    it('should close event form', () => {
      const { result } = renderHook(() => useCalendarEngine(defaultConfig))

      act(() => result.current.openEventForm())
      act(() => result.current.closeEventForm())

      expect(result.current.isEventFormOpen).toBe(false)
      expect(result.current.selectedEvent).toBeNull()
      expect(result.current.selectedDate).toBeNull()
    })
  })

  describe('getEventsForDateRange', () => {
    it('should return events that start within range', () => {
      const events = [
        createEvent({
          id: '1',
          start: dayjs('2025-01-15T10:00:00Z'),
          end: dayjs('2025-01-15T11:00:00Z'),
        }),
        createEvent({
          id: '2',
          start: dayjs('2025-01-20T10:00:00Z'),
          end: dayjs('2025-01-20T11:00:00Z'),
        }),
      ]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events })
      )

      const rangeEvents = result.current.getEventsForDateRange(
        dayjs('2025-01-14'),
        dayjs('2025-01-16')
      )

      expect(rangeEvents).toHaveLength(1)
      expect(rangeEvents[0].id).toBe('1')
    })

    it('should return events that end within range', () => {
      const events = [
        createEvent({
          id: '1',
          start: dayjs('2025-01-14T23:00:00Z'),
          end: dayjs('2025-01-15T01:00:00Z'),
        }),
      ]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events })
      )

      const rangeEvents = result.current.getEventsForDateRange(
        dayjs('2025-01-15'),
        dayjs('2025-01-16')
      )

      expect(rangeEvents).toHaveLength(1)
    })

    it('should return events that span the entire range', () => {
      const events = [
        createEvent({
          id: '1',
          start: dayjs('2025-01-10T10:00:00Z'),
          end: dayjs('2025-01-20T11:00:00Z'),
        }),
      ]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events })
      )

      const rangeEvents = result.current.getEventsForDateRange(
        dayjs('2025-01-14'),
        dayjs('2025-01-16')
      )

      expect(rangeEvents).toHaveLength(1)
    })

    it('should not return events outside of range', () => {
      const events = [
        createEvent({
          id: '1',
          start: dayjs('2025-01-10T10:00:00Z'),
          end: dayjs('2025-01-10T11:00:00Z'),
        }),
      ]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events })
      )

      const rangeEvents = result.current.getEventsForDateRange(
        dayjs('2025-01-14'),
        dayjs('2025-01-16')
      )

      expect(rangeEvents).toHaveLength(0)
    })

    it('should generate recurring event instances within range', () => {
      const events = [createRecurringEvent()]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events })
      )

      const rangeEvents = result.current.getEventsForDateRange(
        dayjs('2025-01-01'),
        dayjs('2025-01-31')
      )

      // Weekly event starting Jan 6, should have instances on Jan 6, 13, 20, 27
      expect(rangeEvents).toHaveLength(4)
      const eventDates = rangeEvents.map((e) => e.start.format('YYYY-MM-DD'))
      expect(eventDates).toContain('2025-01-06')
      expect(eventDates).toContain('2025-01-13')
      expect(eventDates).toContain('2025-01-20')
      expect(eventDates).toContain('2025-01-27')
    })
  })

  describe('recurring events', () => {
    it('should update recurring event with scope all', () => {
      const onEventUpdate = vi.fn()
      const events = [createRecurringEvent()]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events, onEventUpdate })
      )

      const eventDate = dayjs('2025-01-13T10:00:00.000Z')
      act(() =>
        result.current.updateRecurringEvent(
          events[0],
          { title: 'Updated Meeting' },
          { scope: 'all', eventDate }
        )
      )

      expect(onEventUpdate).toHaveBeenCalledTimes(1)
      const updatedEvent = onEventUpdate.mock.calls[0][0]
      expect(updatedEvent.title).toBe('Updated Meeting')
      expect(updatedEvent.id).toBe('recurring-1')
    })

    it('should delete recurring event with scope all', () => {
      const onEventDelete = vi.fn()
      const events = [createRecurringEvent()]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events, onEventDelete })
      )

      const eventDate = dayjs('2025-01-13T10:00:00.000Z')
      act(() =>
        result.current.deleteRecurringEvent(events[0], {
          scope: 'all',
          eventDate,
        })
      )

      expect(onEventDelete).toHaveBeenCalledTimes(1)
      const deletedEvent = onEventDelete.mock.calls[0][0]
      expect(deletedEvent.id).toBe('recurring-1')
      expect(result.current.rawEvents).toHaveLength(0)
    })

    it('should find parent recurring event', () => {
      const baseEvent = createRecurringEvent()
      const events = [baseEvent]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events })
      )

      const childEvent = { ...baseEvent, id: 'instance-1', rrule: undefined }
      const parent = result.current.findParentRecurringEvent(childEvent)

      expect(parent).not.toBeNull()
      expect(parent?.id).toBe('recurring-1')
    })

    it('should return null when no parent recurring event found', () => {
      const events = [createEvent()]
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, events })
      )

      const orphanEvent = createEvent({
        id: 'orphan',
        uid: 'different-uid@ilamy.calendar',
      })
      const parent = result.current.findParentRecurringEvent(orphanEvent)

      expect(parent).toBeNull()
    })
  })

  describe('translation', () => {
    it('should use default translations', () => {
      const { result } = renderHook(() => useCalendarEngine(defaultConfig))

      expect(result.current.t('today')).toBe('Today')
      expect(result.current.t('newEvent')).toBe('New Event')
    })

    it('should use custom translations', () => {
      const translations: Partial<Translations> = {
        today: 'Hoy',
        newEvent: 'Nuevo Evento',
      }
      const { result } = renderHook(() =>
        useCalendarEngine({
          ...defaultConfig,
          translations: translations as Translations,
        })
      )

      expect(result.current.t('today')).toBe('Hoy')
      expect(result.current.t('newEvent')).toBe('Nuevo Evento')
    })

    it('should use custom translator function', () => {
      const translator = vi.fn((key: string) => `translated-${key}`)
      const { result } = renderHook(() =>
        useCalendarEngine({ ...defaultConfig, translator })
      )

      expect(result.current.t('today')).toBe('translated-today')
      expect(translator).toHaveBeenCalledTimes(1)
      expect(translator).toHaveBeenCalledWith('today')
    })

    it('should prefer translator over translations', () => {
      const translations: Partial<Translations> = { today: 'Hoy' }
      const translator = vi.fn(() => 'From Translator')
      const { result } = renderHook(() =>
        useCalendarEngine({
          ...defaultConfig,
          translations: translations as Translations,
          translator,
        })
      )

      expect(result.current.t('today')).toBe('From Translator')
      expect(translator).toHaveBeenCalledTimes(1)
    })
  })

  describe('events prop sync', () => {
    it('should update currentEvents when events prop changes', () => {
      const initialEvents = [createEvent({ id: '1' })]
      const { result, rerender } = renderHook(
        ({ events }) => useCalendarEngine({ ...defaultConfig, events }),
        { initialProps: { events: initialEvents } }
      )

      expect(result.current.rawEvents).toHaveLength(1)

      const newEvents = [createEvent({ id: '1' }), createEvent({ id: '2' })]
      rerender({ events: newEvents })

      expect(result.current.rawEvents).toHaveLength(2)
    })
  })

  describe('processedEvents', () => {
    it('should return processed events for current view range', () => {
      const initialDate = dayjs('2025-01-15')
      const events = [
        createEvent({
          id: '1',
          start: dayjs('2025-01-15T10:00:00Z'),
          end: dayjs('2025-01-15T11:00:00Z'),
        }),
        createEvent({
          id: '2',
          start: dayjs('2025-03-15T10:00:00Z'),
          end: dayjs('2025-03-15T11:00:00Z'),
        }),
      ]
      const { result } = renderHook(() =>
        useCalendarEngine({
          ...defaultConfig,
          events,
          initialDate,
          initialView: 'month',
        })
      )

      // Only January event should be in processed events
      expect(result.current.events.some((e) => e.id === '1')).toBe(true)
      expect(result.current.events.some((e) => e.id === '2')).toBe(false)
    })
  })
})
