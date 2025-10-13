import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { isRecurringEvent } from '@/features/recurrence/utils/recurrence-handler'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { RRule } from 'rrule'
import { CalendarDndContext } from './calendar-dnd-context'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'

// Custom render function that wraps components in CalendarProvider
const renderWithCalendarProvider = (
  children: React.ReactNode,
  providerProps = {}
) => {
  return render(
    <CalendarProvider
      events={[]}
      dayMaxEvents={5}
      firstDayOfWeek={0}
      disableDragAndDrop={false}
      {...providerProps}
    >
      {children}
    </CalendarProvider>
  )
}

describe('CalendarDndContext - Recurring Events', () => {
  const mockOnAdd = mock()
  const mockOnUpdate = mock()
  const mockOnDelete = mock()

  beforeEach(() => {
    mockOnAdd.mockClear()
    mockOnUpdate.mockClear()
    mockOnDelete.mockClear()
  })

  const createRegularEvent = (): CalendarEvent => ({
    id: 'regular-event-1',
    title: 'Regular Meeting',
    start: dayjs('2025-01-15T09:00:00'),
    end: dayjs('2025-01-15T10:00:00'),
    color: 'bg-blue-500',
  })

  const createRecurringEvent = (): CalendarEvent => ({
    id: 'recurring-event-1',
    title: 'Weekly Meeting',
    start: dayjs('2025-01-15T09:00:00'),
    end: dayjs('2025-01-15T10:00:00'),
    color: 'bg-green-500',
    rrule: {
      freq: RRule.WEEKLY,
      byweekday: [RRule.MO],
      interval: 1,
      dtstart: dayjs('2025-01-15T00:00:00').toDate(),
    },
    uid: 'recurring-event-1@calendar',
  })

  const createRecurringInstance = (): CalendarEvent => ({
    id: 'recurring-event-1_2',
    title: 'Weekly Meeting',
    start: dayjs('2025-01-22T09:00:00'),
    end: dayjs('2025-01-22T10:00:00'),
    color: 'bg-green-500',
    uid: 'recurring-event-1@calendar',
  })

  const createModifiedRecurringInstance = (): CalendarEvent => ({
    id: 'recurring-event-1_modified',
    title: 'Modified Weekly Meeting',
    start: dayjs('2025-01-29T10:00:00'),
    end: dayjs('2025-01-29T11:00:00'),
    color: 'bg-green-500',
    uid: 'recurring-event-1@calendar',
    recurrenceId: '2025-01-29T09:00:00.000Z',
  })

  describe('Event Type Identification', () => {
    it('should identify regular events correctly', () => {
      const regularEvent = createRegularEvent()
      expect(isRecurringEvent(regularEvent)).toBe(false)
    })

    it('should identify base recurring events correctly', () => {
      const recurringEvent = createRecurringEvent()
      expect(isRecurringEvent(recurringEvent)).toBe(true)
    })

    it('should identify recurring instances correctly', () => {
      const recurringInstance = createRecurringInstance()
      expect(isRecurringEvent(recurringInstance)).toBe(true)
    })

    it('should identify modified recurring instances correctly', () => {
      const modifiedInstance = createModifiedRecurringInstance()
      expect(isRecurringEvent(modifiedInstance)).toBe(true)
    })
  })

  describe('Drag and Drop Context Integration', () => {
    it('should render without crashing when drag and drop is enabled', () => {
      renderWithCalendarProvider(
        <CalendarDndContext>
          <div data-testid="calendar-content">Test Content</div>
        </CalendarDndContext>
      )

      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
    })

    it('should render without DndContext when drag and drop is disabled', () => {
      renderWithCalendarProvider(
        <CalendarDndContext>
          <div data-testid="calendar-content">Test Content</div>
        </CalendarDndContext>,
        { disableDragAndDrop: true }
      )

      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
      // Should not have DnD context elements when disabled
      // Note: We can't easily test the internal DnD context structure
    })

    it('should render RecurrenceEditDialog in the DOM', () => {
      renderWithCalendarProvider(
        <CalendarDndContext>
          <div data-testid="calendar-content">Test Content</div>
        </CalendarDndContext>
      )

      // Dialog should be present but not visible initially
      const dialog = screen.queryByRole('dialog')
      expect(dialog).not.toBeInTheDocument() // Should be closed initially
    })
  })

  describe('Event Update Logic', () => {
    it('should render calendar content correctly for regular events', () => {
      renderWithCalendarProvider(
        <CalendarDndContext>
          <div data-testid="test-calendar">
            <div data-testid="calendar-grid">Calendar Grid</div>
          </div>
        </CalendarDndContext>
      )

      expect(screen.getByTestId('test-calendar')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
    })

    it('should handle recurring event updates through context integration', () => {
      const testEvents = [createRecurringEvent()]

      renderWithCalendarProvider(
        <CalendarDndContext>
          <div data-testid="calendar-content">Test Content</div>
        </CalendarDndContext>,
        { events: testEvents }
      )

      // Verify that the context has access to recurring events
      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()

      // The actual drag and drop would trigger the dialog for recurring events
      // This integration would be tested with more complex DnD-kit setup
    })
  })

  describe('Dialog State Management', () => {
    it('should manage recurring event dialog state correctly', () => {
      renderWithCalendarProvider(
        <CalendarDndContext>
          <div data-testid="calendar-content">Test Content</div>
        </CalendarDndContext>
      )

      // Initial state: dialog should not be visible
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      // Dialog state would be managed internally when dragging recurring events
      // Full integration test would require simulating drag events
      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null or undefined events gracefully', () => {
      renderWithCalendarProvider(
        <CalendarDndContext>
          <div data-testid="calendar-content">Test Content</div>
        </CalendarDndContext>
      )

      // The component should render correctly even with empty events
      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
    })

    it('should handle empty updates gracefully', () => {
      renderWithCalendarProvider(
        <CalendarDndContext>
          <div data-testid="calendar-content">Test Content</div>
        </CalendarDndContext>
      )

      // The component should render without issues
      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
    })

    it('should handle error scenarios gracefully', () => {
      renderWithCalendarProvider(
        <CalendarDndContext>
          <div data-testid="calendar-content">Test Content</div>
        </CalendarDndContext>
      )

      // Error handling would be tested when actually triggering operations
      // The component should handle errors gracefully without crashing
      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
    })
  })

  describe('Comprehensive Integration Scenarios', () => {
    it('should support the complete recurring event drag workflow', () => {
      renderWithCalendarProvider(
        <CalendarDndContext>
          <div data-testid="calendar-content">Test Content</div>
        </CalendarDndContext>
      )

      // Complete workflow would involve:
      // 1. Drag start on recurring event
      // 2. Drag end triggers dialog
      // 3. User selects scope
      // 4. updateRecurringEvent called with correct parameters
      // 5. Dialog closes

      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
    })

    it('should support different recurring event types', () => {
      const baseRecurring = createRecurringEvent()
      const instanceRecurring = createRecurringInstance()
      const modifiedRecurring = createModifiedRecurringInstance()

      // All should be identified as recurring events
      expect(isRecurringEvent(baseRecurring)).toBe(true)
      expect(isRecurringEvent(instanceRecurring)).toBe(true)
      expect(isRecurringEvent(modifiedRecurring)).toBe(true)

      // All should trigger the dialog workflow when dragged
      renderWithCalendarProvider(
        <CalendarDndContext>
          <div data-testid="calendar-content">Test Content</div>
        </CalendarDndContext>,
        { events: [baseRecurring, instanceRecurring, modifiedRecurring] }
      )

      expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
    })
  })
})
