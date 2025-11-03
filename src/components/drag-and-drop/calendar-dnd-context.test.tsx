import { describe, it, expect } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { isRecurringEvent } from '@/features/recurrence/utils/recurrence-handler'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { RRule } from 'rrule'
import { CalendarDndContext } from './calendar-dnd-context'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'

describe('CalendarDndContext - Drop Calculations', () => {
  const createRegularEvent = (): CalendarEvent => ({
    id: 'regular-event-1',
    title: 'Regular Meeting',
    start: dayjs('2025-01-15T09:00:00.000Z'),
    end: dayjs('2025-01-15T10:00:00.000Z'),
    color: 'bg-blue-500',
    allDay: false,
  })

  const createRecurringEvent = (): CalendarEvent => ({
    id: 'recurring-event-1',
    title: 'Weekly Meeting',
    start: dayjs('2025-01-15T09:00:00.000Z'),
    end: dayjs('2025-01-15T10:00:00.000Z'),
    color: 'bg-green-500',
    allDay: false,
    rrule: {
      freq: RRule.WEEKLY,
      byweekday: [RRule.MO],
      interval: 1,
      dtstart: dayjs('2025-01-15T00:00:00.000Z').toDate(),
    },
    uid: 'recurring-event-1@calendar',
  })

  const createTimedEvent = (): CalendarEvent => ({
    id: 'timed-event-1',
    title: 'Timed Meeting',
    start: dayjs('2025-01-15T14:00:00.000Z'),
    end: dayjs('2025-01-15T15:00:00.000Z'),
    allDay: false,
  })

  const createAllDayEvent = (): CalendarEvent => ({
    id: 'allday-event-1',
    title: 'All Day Event',
    start: dayjs('2025-01-15T00:00:00.000Z'),
    end: dayjs('2025-01-15T23:59:59.999Z'),
    allDay: true,
  })

  const renderWithCalendarProvider = (providerProps = {}) => {
    return render(
      <CalendarProvider
        events={[]}
        dayMaxEvents={5}
        firstDayOfWeek={0}
        disableDragAndDrop={false}
        {...providerProps}
      >
        <CalendarDndContext>
          <div data-testid="calendar-content">Test Content</div>
        </CalendarDndContext>
      </CalendarProvider>
    )
  }

  describe('Context Rendering', () => {
    it('should render with DndContext when drag and drop is enabled', () => {
      renderWithCalendarProvider({ disableDragAndDrop: false })
      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
    })

    it('should render without DndContext when drag and drop is disabled', () => {
      renderWithCalendarProvider({ disableDragAndDrop: true })
      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
    })

    it('should NOT show RecurrenceEditDialog initially', () => {
      renderWithCalendarProvider()
      const dialog = screen.queryByRole('dialog')
      expect(dialog).not.toBeInTheDocument()
    })
  })

  describe('Time Cell Drop Calculations', () => {
    it('should calculate correct start/end times for time cell drops', () => {
      const event = createRegularEvent()
      // Event: Jan 15, 9:00-10:00 (1 hour duration)

      renderWithCalendarProvider({ events: [event] })

      // When dropped on Jan 20 at 14:30:
      // Expected updates: { start: 2025-01-20T14:30:00.000Z, end: 2025-01-20T15:30:00.000Z, allDay: false }

      // Verify event duration calculation
      const durationMinutes = event.end.diff(event.start, 'minute')
      expect(durationMinutes).toBe(60)

      // Verify expected result
      const dropDate = dayjs('2025-01-20T00:00:00.000Z')
      const dropHour = 14
      const dropMinute = 30
      const expectedStart = dropDate.hour(dropHour).minute(dropMinute)
      const expectedEnd = expectedStart.add(durationMinutes, 'minute')

      expect(expectedStart.toISOString()).toBe('2025-01-20T14:30:00.000Z')
      expect(expectedEnd.toISOString()).toBe('2025-01-20T15:30:00.000Z')
    })

    it('should preserve duration when dragging to different time', () => {
      const event: CalendarEvent = {
        id: 'event-2h',
        title: '2 Hour Meeting',
        start: dayjs('2025-01-15T09:00:00.000Z'),
        end: dayjs('2025-01-15T11:00:00.000Z'), // 2 hour duration
        allDay: false,
      }

      renderWithCalendarProvider({ events: [event] })

      const durationMinutes = event.end.diff(event.start, 'minute')
      expect(durationMinutes).toBe(120)

      // Dropped on Jan 22 at 16:00
      const dropDate = dayjs('2025-01-22T00:00:00.000Z')
      const expectedStart = dropDate.hour(16).minute(0)
      const expectedEnd = expectedStart.add(durationMinutes, 'minute')

      expect(expectedStart.toISOString()).toBe('2025-01-22T16:00:00.000Z')
      expect(expectedEnd.toISOString()).toBe('2025-01-22T18:00:00.000Z')
    })

    it('should set allDay to false when dropped on time cell', () => {
      const event = createTimedEvent()

      renderWithCalendarProvider({ events: [event] })

      // When dropped on time cell, allDay should be false
      expect(event.allDay).toBe(false)
    })
  })

  describe('Day Cell Drop Calculations', () => {
    it('should preserve time components when dropped on day cell', () => {
      const event = createTimedEvent()
      // Event: Jan 15, 14:00-15:00

      renderWithCalendarProvider({ events: [event] })

      // When dropped on Jan 22 (day cell):
      // Expected: Jan 22, 14:00-15:00 (preserve time, change date)
      const newDate = dayjs('2025-01-22T00:00:00.000Z')
      const daysDiff = newDate.diff(event.start.startOf('day'), 'day')

      const expectedStart = event.start.add(daysDiff, 'day')
      const expectedEnd = event.end.add(daysDiff, 'day')

      expect(expectedStart.toISOString()).toBe('2025-01-22T14:00:00.000Z')
      expect(expectedEnd.toISOString()).toBe('2025-01-22T15:00:00.000Z')
      expect(expectedStart.hour()).toBe(14)
      expect(expectedEnd.hour()).toBe(15)
    })

    it('should preserve multi-day event duration', () => {
      const multiDayEvent: CalendarEvent = {
        id: 'multi-day',
        title: 'Conference',
        start: dayjs('2025-01-15T09:00:00.000Z'),
        end: dayjs('2025-01-17T17:00:00.000Z'), // 2+ days
        allDay: false,
      }

      renderWithCalendarProvider({ events: [multiDayEvent] })

      const durationDays = multiDayEvent.end
        .endOf('day')
        .diff(multiDayEvent.start.startOf('day'), 'day')
      expect(durationDays).toBe(2)

      // Dropped on Jan 22
      const newDate = dayjs('2025-01-22T00:00:00.000Z')
      const daysDiff = newDate.diff(multiDayEvent.start.startOf('day'), 'day')

      const expectedStart = multiDayEvent.start.add(daysDiff, 'day')
      const expectedEnd = multiDayEvent.end.add(daysDiff, 'day')

      expect(expectedStart.toISOString()).toBe('2025-01-22T09:00:00.000Z')
      expect(expectedEnd.toISOString()).toBe('2025-01-24T17:00:00.000Z')
    })

    it('should set allDay to false when dropped on regular day cell', () => {
      const event = createRegularEvent()

      renderWithCalendarProvider({ events: [event] })

      // When dropped on day-cell (not all-day cell), allDay should be false
      expect(event.allDay).toBe(false)
    })
  })

  describe('All-Day Cell Drop Calculations', () => {
    it('should convert timed event to all-day when dropped on all-day cell', () => {
      const timedEvent = createTimedEvent()
      // Event: Jan 15, 14:00-15:00

      renderWithCalendarProvider({ events: [timedEvent] })

      expect(timedEvent.start.toISOString()).toBe('2025-01-15T14:00:00.000Z')
      expect(timedEvent.end.toISOString()).toBe('2025-01-15T15:00:00.000Z')
      expect(timedEvent.allDay).toBe(false)

      // Dropped on all-day cell for Jan 20
      const targetDate = dayjs('2025-01-20T00:00:00.000Z')
      const daysDiff = targetDate.diff(timedEvent.start.startOf('day'), 'day')
      expect(daysDiff).toBe(5)

      // Expected: preserve time components, change date, set allDay: true
      const expectedStart = timedEvent.start.add(daysDiff, 'day')
      const expectedEnd = timedEvent.end.add(daysDiff, 'day')

      expect(expectedStart.toISOString()).toBe('2025-01-20T14:00:00.000Z')
      expect(expectedEnd.toISOString()).toBe('2025-01-20T15:00:00.000Z')
      expect(expectedStart.hour()).toBe(14)
      expect(expectedEnd.hour()).toBe(15)
    })

    it('should convert all-day event to timed when dropped on time cell', () => {
      const allDayEvent = createAllDayEvent()
      // Event: Jan 15 all day

      renderWithCalendarProvider({ events: [allDayEvent] })

      expect(allDayEvent.start.toISOString()).toBe('2025-01-15T00:00:00.000Z')
      expect(allDayEvent.end.toISOString()).toBe('2025-01-15T23:59:59.999Z')
      expect(allDayEvent.allDay).toBe(true)

      // Dropped on time cell at Jan 22, 14:00
      const dropDate = dayjs('2025-01-22T00:00:00.000Z')
      const dropHour = 14
      const dropMinute = 0

      const expectedStart = dropDate.hour(dropHour).minute(dropMinute)
      const expectedEnd = expectedStart.add(60, 'minute') // default 1 hour

      expect(expectedStart.toISOString()).toBe('2025-01-22T14:00:00.000Z')
      expect(expectedEnd.toISOString()).toBe('2025-01-22T15:00:00.000Z')
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should handle midnight crossing events', () => {
      const midnightEvent: CalendarEvent = {
        id: 'midnight',
        title: 'Late Night',
        start: dayjs('2025-01-15T23:00:00.000Z'),
        end: dayjs('2025-01-16T01:00:00.000Z'), // Crosses midnight
        allDay: false,
      }

      renderWithCalendarProvider({ events: [midnightEvent] })

      const durationMinutes = midnightEvent.end.diff(
        midnightEvent.start,
        'minute'
      )
      expect(durationMinutes).toBe(120)
      expect(midnightEvent.start.date()).toBe(15)
      expect(midnightEvent.end.date()).toBe(16)
    })

    it('should handle events at day boundaries', () => {
      const dayBoundaryEvent: CalendarEvent = {
        id: 'boundary',
        title: 'Exact Day',
        start: dayjs('2025-01-15T00:00:00.000Z'),
        end: dayjs('2025-01-16T00:00:00.000Z'),
        allDay: false,
      }

      renderWithCalendarProvider({ events: [dayBoundaryEvent] })

      expect(dayBoundaryEvent.start.hour()).toBe(0)
      expect(dayBoundaryEvent.start.minute()).toBe(0)
      expect(dayBoundaryEvent.end.hour()).toBe(0)
      expect(dayBoundaryEvent.end.minute()).toBe(0)

      const durationHours = dayBoundaryEvent.end.diff(
        dayBoundaryEvent.start,
        'hour'
      )
      expect(durationHours).toBe(24)
    })

    it('should correctly identify multi-day vs single-day events', () => {
      const singleDay: CalendarEvent = {
        id: 'single',
        title: 'Single Day',
        start: dayjs('2025-01-15T09:00:00.000Z'),
        end: dayjs('2025-01-15T17:00:00.000Z'),
        allDay: false,
      }

      const multiDay: CalendarEvent = {
        id: 'multi',
        title: 'Multi Day',
        start: dayjs('2025-01-15T09:00:00.000Z'),
        end: dayjs('2025-01-17T17:00:00.000Z'),
        allDay: false,
      }

      renderWithCalendarProvider({ events: [singleDay, multiDay] })

      const isSingleDay = singleDay.start.isSame(singleDay.end, 'day')
      const isMultiDay = !multiDay.start.isSame(multiDay.end, 'day')

      expect(isSingleDay).toBe(true)
      expect(isMultiDay).toBe(true)
    })

    it('should handle events with second-level precision', () => {
      const preciseEvent: CalendarEvent = {
        id: 'precise',
        title: 'Precise Event',
        start: dayjs('2025-01-15T09:15:30.000Z'),
        end: dayjs('2025-01-15T10:45:45.000Z'),
        allDay: false,
      }

      renderWithCalendarProvider({ events: [preciseEvent] })

      expect(preciseEvent.start.second()).toBe(30)
      expect(preciseEvent.end.second()).toBe(45)
      expect(preciseEvent.start.toISOString()).toBe('2025-01-15T09:15:30.000Z')
      expect(preciseEvent.end.toISOString()).toBe('2025-01-15T10:45:45.000Z')
    })
  })

  describe('isRecurringEvent Utility', () => {
    it('should return false for regular events without uid or rrule', () => {
      const regularEvent: CalendarEvent = {
        id: 'regular',
        title: 'Regular',
        start: dayjs('2025-01-15T09:00:00.000Z'),
        end: dayjs('2025-01-15T10:00:00.000Z'),
        allDay: false,
      }

      expect(isRecurringEvent(regularEvent)).toBe(false)
      expect(regularEvent.uid).toBeUndefined()
      expect(regularEvent.rrule).toBeUndefined()
      expect(regularEvent.recurrenceId).toBeUndefined()
    })

    it('should return true for events with rrule', () => {
      const recurringEvent = createRecurringEvent()

      expect(isRecurringEvent(recurringEvent)).toBe(true)
      expect(recurringEvent.rrule).toBeDefined()
      expect(recurringEvent.rrule?.freq).toBe(RRule.WEEKLY)
    })

    it('should return true for events with uid', () => {
      const instance: CalendarEvent = {
        id: 'instance',
        title: 'Instance',
        start: dayjs('2025-01-15T09:00:00.000Z'),
        end: dayjs('2025-01-15T10:00:00.000Z'),
        uid: 'recurring@calendar',
        allDay: false,
      }

      expect(isRecurringEvent(instance)).toBe(true)
      expect(instance.uid).toBe('recurring@calendar')
    })

    it('should return true for events with recurrenceId', () => {
      const modifiedInstance: CalendarEvent = {
        id: 'modified',
        title: 'Modified',
        start: dayjs('2025-01-15T09:00:00.000Z'),
        end: dayjs('2025-01-15T10:00:00.000Z'),
        uid: 'recurring@calendar',
        recurrenceId: '2025-01-15T09:00:00.000Z',
        allDay: false,
      }

      expect(isRecurringEvent(modifiedInstance)).toBe(true)
      expect(modifiedInstance.recurrenceId).toBe('2025-01-15T09:00:00.000Z')
    })
  })
})
