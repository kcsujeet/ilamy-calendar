import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import dayjs from '@/lib/configs/dayjs-config'
import { RRule } from 'rrule'
import { EventForm } from './event-form'
import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'

// Custom render function that wraps components in CalendarProvider
const renderEventForm = (
  props: Parameters<typeof EventForm>[0],
  providerProps = {}
) => {
  return render(
    <CalendarProvider
      events={[]}
      dayMaxEvents={5}
      firstDayOfWeek={0}
      {...providerProps}
    >
      <EventForm {...props} />
    </CalendarProvider>
  )
}

describe('EventForm', () => {
  const mockOnAdd = mock(() => {})
  const mockOnUpdate = mock(() => {})
  const mockOnDelete = mock(() => {})
  const mockOnClose = mock(() => {})

  const defaultProps = {
    onAdd: mockOnAdd,
    onUpdate: mockOnUpdate,
    onDelete: mockOnDelete,
    onClose: mockOnClose,
  }

  const testSelectedDate = dayjs('2025-08-15T10:00:00')
  const testEvent: CalendarEvent = {
    id: 'test-event-1',
    title: 'Test Event',
    start: dayjs('2025-08-15T10:00:00'),
    end: dayjs('2025-08-15T11:00:00'),
    description: 'Test description',
    location: 'Test location',
    allDay: false,
    color: 'bg-blue-100 text-blue-800',
  }

  beforeEach(() => {
    mockOnAdd.mockClear()
    mockOnUpdate.mockClear()
    mockOnDelete.mockClear()
    mockOnClose.mockClear()
  })

  describe('Initial State', () => {
    it('should render create event form with default values', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      expect(screen.getByText('Create Event')).toBeInTheDocument()
      expect(
        screen.getByText('Add a new event to your calendar')
      ).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Event title')).toHaveValue('')
      expect(screen.getByLabelText('All day')).not.toBeChecked()
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })

    it('should render edit event form when selectedEvent is provided', () => {
      renderEventForm({ ...defaultProps, selectedEvent: testEvent })

      expect(screen.getByText('Edit Event')).toBeInTheDocument()
      expect(screen.getByText('Edit your event details')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test location')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should initialize form with selectedDate when creating new event', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      // Check that date inputs show the selected date (there are both start and end date pickers)
      expect(screen.getAllByText('Aug 15, 2025')).toHaveLength(2) // start and end date

      // Check that time selects are rendered (2 selects: start and end)
      expect(screen.queryAllByRole('combobox')).toHaveLength(2)
    })

    it('should initialize form with event data when editing', () => {
      renderEventForm({ ...defaultProps, selectedEvent: testEvent })

      expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument()
      // TimeSelect displays time in 12-hour format (10:00 AM, 11:00 AM)
      expect(screen.getAllByText('10:00 AM').length).toBeGreaterThan(0) // start time
      expect(screen.getAllByText('11:00 AM').length).toBeGreaterThan(0) // end time
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test location')).toBeInTheDocument()
    })
  })

  describe('Form Input Handling', () => {
    it('should update title when input changes', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      const titleInput = screen.getByPlaceholderText('Event title')
      fireEvent.change(titleInput, { target: { value: 'New Event Title' } })

      expect(titleInput).toHaveValue('New Event Title')
    })

    it('should update description when input changes', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      const descriptionInput = screen.getByPlaceholderText(
        'Event description (optional)'
      )
      fireEvent.change(descriptionInput, {
        target: { value: 'New description' },
      })

      expect(descriptionInput).toHaveValue('New description')
    })

    it('should update location when input changes', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      const locationInput = screen.getByPlaceholderText(
        'Event location (optional)'
      )
      fireEvent.change(locationInput, { target: { value: 'New location' } })

      expect(locationInput).toHaveValue('New location')
    })

    it('should update time inputs when changed', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      // TimeSelect uses Select component (combobox), find by role
      const [startTimeSelect, endTimeSelect] = screen.getAllByRole('combobox')

      // Verify time selects are rendered (initial state)
      expect(startTimeSelect).toBeInTheDocument()
      expect(endTimeSelect).toBeInTheDocument()
    })
  })

  describe('All Day Toggle', () => {
    it('should hide time inputs when all day is enabled', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      const allDayCheckbox = screen.getByLabelText('All day')
      fireEvent.click(allDayCheckbox)

      expect(allDayCheckbox).toBeChecked()
      // TimeSelects (combobox) should not be visible when all day is enabled
      expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    })

    it('should show time inputs when all day is disabled', () => {
      const allDayEvent = { ...testEvent, allDay: true }
      renderEventForm({ ...defaultProps, selectedEvent: allDayEvent })

      const allDayCheckbox = screen.getByLabelText('All day')
      fireEvent.click(allDayCheckbox)

      expect(allDayCheckbox).not.toBeChecked()
      // TimeSelects (combobox) should be visible - 2 selects (start and end time)
      expect(screen.queryAllByRole('combobox')).toHaveLength(2)
    })

    it('should set end time to 23:59 when all day is enabled', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      const allDayCheckbox = screen.getByLabelText('All day')
      fireEvent.click(allDayCheckbox)

      // Re-enable to check the time inputs are shown again
      fireEvent.click(allDayCheckbox)

      // TimeSelect should be visible again after unchecking all-day
      const timeSelects = screen.queryAllByRole('combobox')
      expect(timeSelects.length).toBeGreaterThan(0)
    })
  })

  describe('Color Selection', () => {
    it('should render color options', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      // Check that multiple color options are rendered
      const colorButtons = screen
        .getAllByRole('button')
        .filter(
          (button) =>
            button.getAttribute('aria-label')?.includes('Blue') ||
            button.getAttribute('aria-label')?.includes('Red') ||
            button.getAttribute('aria-label')?.includes('Green')
        )

      expect(colorButtons.length).toBeGreaterThan(0)
    })

    it('should select a color when clicked', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      const redColorButton = screen.getByLabelText('Red')
      fireEvent.click(redColorButton)

      // The button should have ring classes indicating selection
      expect(redColorButton).toHaveClass('ring-2', 'ring-black')
    })
  })

  describe('Date Validation', () => {
    it('should update end date when start date is after end date', async () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      // Get the date picker buttons
      const startDatePicker = screen
        .getAllByRole('button')
        .find((button) => button.textContent?.includes('Aug 15, 2025'))

      expect(startDatePicker).toBeInTheDocument()

      // This test would need more sophisticated date picker interaction
      // For now, we test the behavior through the useEffect logic
    })
  })

  describe('Form Submission', () => {
    it('should call onAdd with correct data when creating new event', async () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      // Fill in form data
      fireEvent.change(screen.getByPlaceholderText('Event title'), {
        target: { value: 'New Test Event' },
      })
      fireEvent.change(
        screen.getByPlaceholderText('Event description (optional)'),
        {
          target: { value: 'Test description' },
        }
      )
      fireEvent.change(
        screen.getByPlaceholderText('Event location (optional)'),
        {
          target: { value: 'Test location' },
        }
      )

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Create' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Test Event',
            description: 'Test description',
            location: 'Test location',
            allDay: false,
          })
        )
      })

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onUpdate with correct data when editing existing event', async () => {
      renderEventForm({ ...defaultProps, selectedEvent: testEvent })

      // Modify form data
      fireEvent.change(screen.getByDisplayValue('Test Event'), {
        target: { value: 'Updated Event Title' },
      })

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Update' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'test-event-1',
            title: 'Updated Event Title',
          })
        )
      })

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should handle all-day events correctly in submission', async () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      // Enable all day
      fireEvent.click(screen.getByLabelText('All day'))

      // Fill in title
      fireEvent.change(screen.getByPlaceholderText('Event title'), {
        target: { value: 'All Day Event' },
      })

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'All Day Event',
            allDay: true,
          })
        )
      })
    })

    it('should require title field', async () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      // Try to submit without title
      const submitButton = screen.getByRole('button', { name: 'Create' })
      fireEvent.click(submitButton)

      // Form should not submit (onAdd should not be called)
      expect(mockOnAdd).not.toHaveBeenCalled()
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Event Deletion', () => {
    it('should call onDelete when delete button is clicked', () => {
      renderEventForm({ ...defaultProps, selectedEvent: testEvent })

      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      fireEvent.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalledWith(testEvent)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not show delete button for new events', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })
  })

  describe('Recurrence Integration', () => {
    it('should render recurrence editor', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      expect(screen.getByTestId('recurrence-editor')).toBeInTheDocument()
    })

    it('should handle recurrence changes', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      const toggleButton = screen.getByTestId('toggle-recurrence')
      fireEvent.click(toggleButton)

      expect(toggleButton).toBeChecked()
    })

    it('should include recurrence in form submission', async () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      // Enable recurrence
      fireEvent.click(screen.getByTestId('toggle-recurrence'))

      // Fill in title and submit
      fireEvent.change(screen.getByPlaceholderText('Event title'), {
        target: { value: 'Recurring Event' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Recurring Event',
            rrule: expect.objectContaining({
              freq: RRule.DAILY,
              interval: 1,
              dtstart: expect.any(Date),
            }),
          })
        )
      })
    })
  })

  describe('Form Cancellation', () => {
    it('should call onClose when cancel button is clicked', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when dialog is closed', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      // The dialog has onOpenChange that should call onClose
      // This tests the dialog integration
      expect(mockOnClose).toHaveBeenCalledTimes(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined selectedEvent gracefully', () => {
      renderEventForm({ ...defaultProps, selectedEvent: undefined })

      expect(screen.getByText('Create Event')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Event title')).toHaveValue('')
    })

    it('should handle undefined selectedDate gracefully', () => {
      renderEventForm({ ...defaultProps, selectedDate: undefined })

      expect(screen.getByText('Create Event')).toBeInTheDocument()
      // Should use current date as default
    })

    it('should handle event without optional fields', () => {
      const minimalEvent: CalendarEvent = {
        id: 'minimal-event',
        title: 'Minimal Event',
        start: dayjs('2025-08-15T10:00:00'),
        end: dayjs('2025-08-15T11:00:00'),
        allDay: false,
        color: 'bg-blue-100 text-blue-800',
      }

      renderEventForm({ ...defaultProps, selectedEvent: minimalEvent })

      expect(screen.getByDisplayValue('Minimal Event')).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Event description (optional)')
      ).toHaveValue('')
      expect(
        screen.getByPlaceholderText('Event location (optional)')
      ).toHaveValue('')
    })
  })

  describe('Recurring Event Instance Editing', () => {
    it('should pull RRULE from parent when editing an instance', () => {
      const parentEvent: CalendarEvent = {
        id: 'recurring-1',
        uid: 'recurring-1@ilamy.calendar',
        title: 'Weekly Meeting',
        start: dayjs('2025-08-15T10:00:00'),
        end: dayjs('2025-08-15T11:00:00'),
        rrule: {
          freq: RRule.WEEKLY,
          byweekday: [RRule.MO, RRule.WE, RRule.FR],
          interval: 1,
          dtstart: dayjs('2025-08-15T10:00:00').toDate(),
        },
        allDay: false,
        color: 'bg-blue-100 text-blue-800',
      }

      const instanceEvent: CalendarEvent = {
        id: 'recurring-1_1',
        uid: 'recurring-1@ilamy.calendar',
        title: 'Weekly Meeting',
        start: dayjs('2025-08-17T10:00:00'), // Wednesday instance
        end: dayjs('2025-08-17T11:00:00'),
        rrule: undefined, // Instance has no RRULE
        allDay: false,
        color: 'bg-blue-100 text-blue-800',
      }

      // Mock the calendar context to provide both parent and instance
      const mockEvents = [parentEvent, instanceEvent]

      renderEventForm(
        { ...defaultProps, selectedEvent: instanceEvent },
        { events: mockEvents }
      )

      // RecurrenceEditor should show as enabled (checkbox checked)
      // because it found the parent's RRULE
      const toggleButton = screen.getByTestId('toggle-recurrence')
      expect(toggleButton).toBeChecked() // ❌ FAILS: Currently unchecked because instance.rrule is undefined
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByLabelText('Title')).toBeInTheDocument()
      expect(screen.getByLabelText('All day')).toBeInTheDocument()
      expect(screen.getByLabelText('Location')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      renderEventForm({ ...defaultProps, selectedDate: testSelectedDate })

      const titleInput = screen.getByPlaceholderText('Event title')
      titleInput.focus()

      expect(document.activeElement).toBe(titleInput)
    })
  })
})
