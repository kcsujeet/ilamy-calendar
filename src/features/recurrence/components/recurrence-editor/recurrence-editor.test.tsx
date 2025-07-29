import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { RecurrenceEditor } from './recurrence-editor'
import dayjs from '@/lib/dayjs-config'
import type { EventRecurrence } from '@/components/types'

describe('RecurrenceEditor', () => {
  const mockOnChange = mock(() => {})
  const testEventStart = dayjs('2025-07-25T10:00:00Z')

  const defaultProps = {
    onChange: mockOnChange,
    eventStart: testEventStart,
  }

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('Initial State', () => {
    it('should render with recurrence disabled by default', () => {
      render(<RecurrenceEditor {...defaultProps} />)

      expect(screen.getByText('Recurrence')).toBeInTheDocument()
      expect(screen.getByLabelText('Repeat event')).not.toBeChecked()
      // No preview shown when disabled
      expect(screen.queryByText('Preview')).not.toBeInTheDocument()
    })

    it('should not show recurrence options when disabled', () => {
      render(<RecurrenceEditor {...defaultProps} />)

      expect(screen.queryByText('Frequency')).not.toBeInTheDocument()
      expect(screen.queryByText('Repeat every')).not.toBeInTheDocument()
      expect(screen.queryByText('End')).not.toBeInTheDocument()
    })

    it('should initialize with provided recurrence value', () => {
      const existingRecurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 2,
        endType: 'never',
        daysOfWeek: ['monday', 'wednesday', 'friday'],
      }

      render(<RecurrenceEditor {...defaultProps} value={existingRecurrence} />)

      expect(screen.getByLabelText('Repeat event')).toBeChecked()
      expect(screen.getByDisplayValue('2')).toBeInTheDocument()
      expect(screen.getByLabelText('Mon')).toBeChecked()
      expect(screen.getByLabelText('Wed')).toBeChecked()
      expect(screen.getByLabelText('Fri')).toBeChecked()
    })
  })

  describe('Enable/Disable Toggle', () => {
    it('should enable recurrence when checkbox is checked', () => {
      render(<RecurrenceEditor {...defaultProps} />)

      const enableCheckbox = screen.getByLabelText('Repeat event')
      fireEvent.click(enableCheckbox)

      expect(enableCheckbox).toBeChecked()
      expect(screen.getByText('Frequency')).toBeInTheDocument()
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'daily',
          interval: 1,
          endType: 'never',
        })
      )
    })

    it('should disable recurrence when checkbox is unchecked', () => {
      const existingRecurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        endType: 'never',
      }

      render(<RecurrenceEditor {...defaultProps} value={existingRecurrence} />)

      const enableCheckbox = screen.getByLabelText('Repeat event')
      fireEvent.click(enableCheckbox)

      expect(enableCheckbox).not.toBeChecked()
      expect(screen.queryByText('Frequency')).not.toBeInTheDocument()
      expect(mockOnChange).toHaveBeenCalledWith(null)
    })
  })

  describe('Frequency Selection', () => {
    beforeEach(() => {
      render(<RecurrenceEditor {...defaultProps} />)
      fireEvent.click(screen.getByLabelText('Repeat event'))
    })

    it('should change frequency and call onChange', async () => {
      // Find the frequency select more specifically
      const frequencyLabel = screen.getByText('Frequency')
      const frequencyContainer = frequencyLabel.parentElement
      const frequencySelect =
        frequencyContainer?.querySelector('[role="combobox"]')
      expect(frequencySelect).toBeInTheDocument()

      fireEvent.click(frequencySelect!)

      await waitFor(() => {
        expect(screen.getByText('Weekly')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Weekly'))

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'weekly',
        })
      )
    })

    it('should show days of week options for weekly frequency', async () => {
      const frequencyLabel = screen.getByText('Frequency')
      const frequencyContainer = frequencyLabel.parentElement
      const frequencySelect =
        frequencyContainer?.querySelector('[role="combobox"]')

      fireEvent.click(frequencySelect!)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Weekly'))
      })

      expect(screen.getByText('Repeat on')).toBeInTheDocument()
      expect(screen.getByLabelText('Sun')).toBeInTheDocument()
      expect(screen.getByLabelText('Mon')).toBeInTheDocument()
      expect(screen.getByLabelText('Tue')).toBeInTheDocument()
      expect(screen.getByLabelText('Wed')).toBeInTheDocument()
      expect(screen.getByLabelText('Thu')).toBeInTheDocument()
      expect(screen.getByLabelText('Fri')).toBeInTheDocument()
      expect(screen.getByLabelText('Sat')).toBeInTheDocument()
    })

    it('should not show days of week for non-weekly frequencies', () => {
      expect(screen.queryByText('Repeat on')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Sun')).not.toBeInTheDocument()
    })
  })

  describe('Interval Setting', () => {
    beforeEach(() => {
      render(<RecurrenceEditor {...defaultProps} />)
      fireEvent.click(screen.getByLabelText('Repeat event'))
    })

    it('should update interval and call onChange', () => {
      const intervalInput = screen.getByDisplayValue('1')
      fireEvent.change(intervalInput, { target: { value: '3' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          interval: 3,
        })
      )
    })

    it('should show correct singular/plural labels for different intervals', () => {
      expect(screen.getByText('day')).toBeInTheDocument()

      const intervalInput = screen.getByDisplayValue('1')
      fireEvent.change(intervalInput, { target: { value: '2' } })

      expect(screen.getByText('days')).toBeInTheDocument()
    })

    it('should show correct labels for different frequencies', async () => {
      // Test weekly
      const frequencyLabel = screen.getByText('Frequency')
      const frequencyContainer = frequencyLabel.parentElement
      const frequencySelect =
        frequencyContainer?.querySelector('[role="combobox"]')
      fireEvent.click(frequencySelect!)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Weekly'))
      })

      expect(screen.getByText('week')).toBeInTheDocument()

      // Change interval to test plural
      const intervalLabel = screen.getByText('Repeat every')
      const intervalContainer = intervalLabel.parentElement
      const intervalInput = intervalContainer?.querySelector(
        'input[type="number"]'
      )
      fireEvent.change(intervalInput!, { target: { value: '2' } })

      expect(screen.getByText('weeks')).toBeInTheDocument()
    })
  })

  describe('Days of Week Selection (Weekly)', () => {
    beforeEach(async () => {
      render(<RecurrenceEditor {...defaultProps} />)
      fireEvent.click(screen.getByLabelText('Repeat event'))

      const frequencyLabel = screen.getByText('Frequency')
      const frequencyContainer = frequencyLabel.parentElement
      const frequencySelect =
        frequencyContainer?.querySelector('[role="combobox"]')
      fireEvent.click(frequencySelect!)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Weekly'))
      })
    })

    it('should toggle individual days', () => {
      const mondayCheckbox = screen.getByLabelText('Mon')
      fireEvent.click(mondayCheckbox)

      expect(mondayCheckbox).toBeChecked()
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          daysOfWeek: ['monday'],
        })
      )
    })

    it('should handle multiple days selection', () => {
      const mondayCheckbox = screen.getByLabelText('Mon')
      const wednesdayCheckbox = screen.getByLabelText('Wed')
      const fridayCheckbox = screen.getByLabelText('Fri')

      fireEvent.click(mondayCheckbox)
      fireEvent.click(wednesdayCheckbox)
      fireEvent.click(fridayCheckbox)

      expect(mockOnChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          daysOfWeek: ['monday', 'wednesday', 'friday'],
        })
      )
    })

    it('should uncheck days when clicked again', () => {
      const mondayCheckbox = screen.getByLabelText('Mon')

      // Check
      fireEvent.click(mondayCheckbox)
      expect(mondayCheckbox).toBeChecked()

      // Uncheck
      fireEvent.click(mondayCheckbox)
      expect(mondayCheckbox).not.toBeChecked()
      expect(mockOnChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          daysOfWeek: undefined,
        })
      )
    })
  })

  describe('End Type Selection', () => {
    beforeEach(() => {
      render(<RecurrenceEditor {...defaultProps} />)
      fireEvent.click(screen.getByLabelText('Repeat event'))
    })

    it('should change end type to "on" and show date picker', async () => {
      const endLabel = screen.getByText('End')
      const endContainer = endLabel.parentElement
      const endTypeSelect = endContainer?.querySelector('[role="combobox"]')
      expect(endTypeSelect).toBeInTheDocument()

      fireEvent.click(endTypeSelect!)

      await waitFor(() => {
        fireEvent.click(screen.getByText('On date'))
      })

      expect(screen.getByText('End date')).toBeInTheDocument()
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          endType: 'on',
        })
      )
    })

    it('should change end type to "after" and show count input', async () => {
      const endLabel = screen.getByText('End')
      const endContainer = endLabel.parentElement
      const endTypeSelect = endContainer?.querySelector('[role="combobox"]')

      fireEvent.click(endTypeSelect!)

      await waitFor(() => {
        fireEvent.click(screen.getByText('After occurrences'))
      })

      expect(screen.getByText('Number of occurrences')).toBeInTheDocument()
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          endType: 'after',
        })
      )
    })
  })

  describe('End Count Input', () => {
    beforeEach(async () => {
      render(<RecurrenceEditor {...defaultProps} />)
      fireEvent.click(screen.getByLabelText('Repeat event'))

      const endLabel = screen.getByText('End')
      const endContainer = endLabel.parentElement
      const endTypeSelect = endContainer?.querySelector('[role="combobox"]')
      fireEvent.click(endTypeSelect!)

      await waitFor(() => {
        fireEvent.click(screen.getByText('After occurrences'))
      })
    })

    it('should update count and call onChange', () => {
      const countLabel = screen.getByText('Number of occurrences')
      const countContainer = countLabel.parentElement
      const countInput = countContainer?.querySelector('input[type="number"]')
      expect(countInput).toBeInTheDocument()

      fireEvent.change(countInput!, { target: { value: '10' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 10,
        })
      )
    })

    it('should handle invalid count values', () => {
      const countLabel = screen.getByText('Number of occurrences')
      const countContainer = countLabel.parentElement
      const countInput = countContainer?.querySelector('input[type="number"]')

      fireEvent.change(countInput!, { target: { value: '0' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1, // Should default to 1
        })
      )
    })
  })

  describe('Exceptions Management', () => {
    beforeEach(() => {
      render(<RecurrenceEditor {...defaultProps} />)
      fireEvent.click(screen.getByLabelText('Repeat event'))
    })

    it('should add exception when Add exception button is clicked', () => {
      const addButton = screen.getByText('Add exception')
      fireEvent.click(addButton)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          exceptions: [
            expect.objectContaining({
              date: testEventStart,
              type: 'this',
              createdAt: expect.any(Object),
            }),
          ],
        })
      )
    })

    it('should not add duplicate exceptions', () => {
      const addButton = screen.getByText('Add exception')

      // Add exception twice
      fireEvent.click(addButton)
      fireEvent.click(addButton)

      // Should only be called once (second call ignored)
      expect(mockOnChange).toHaveBeenCalledTimes(2) // Once for enable, once for add
    })

    it('should display existing exceptions sorted chronologically', () => {
      const recurrenceWithExceptions: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        endType: 'never',
        exceptions: [
          {
            date: dayjs('2025-07-30'),
            type: 'this' as const,
            createdAt: dayjs('2025-07-29'),
          },
          {
            date: dayjs('2025-07-25'),
            type: 'this' as const,
            createdAt: dayjs('2025-07-29'),
          },
          {
            date: dayjs('2025-07-28'),
            type: 'this' as const,
            createdAt: dayjs('2025-07-29'),
          },
        ],
      }

      render(
        <RecurrenceEditor {...defaultProps} value={recurrenceWithExceptions} />
      )

      // Look for the formatted date text specifically (not in DatePickers)
      const exceptionTexts = screen
        .getAllByText(/Jul \d+, 2025/)
        .filter(
          (el) =>
            el.tagName === 'SPAN' &&
            el.className.includes('text-muted-foreground')
        )

      expect(exceptionTexts).toHaveLength(3)
      expect(exceptionTexts[0].textContent).toBe('Jul 25, 2025 (this)')
      expect(exceptionTexts[1].textContent).toBe('Jul 28, 2025 (this)')
      expect(exceptionTexts[2].textContent).toBe('Jul 30, 2025 (this)')
    })
  })

  describe('Description Preview', () => {
    it('should not show preview when disabled', () => {
      render(<RecurrenceEditor {...defaultProps} />)

      expect(screen.queryByText('Preview')).not.toBeInTheDocument()
    })

    it('should show correct description for daily recurrence', () => {
      render(<RecurrenceEditor {...defaultProps} />)
      fireEvent.click(screen.getByLabelText('Repeat event'))

      expect(screen.getByText('Preview')).toBeInTheDocument()
      // Check the description in the preview section
      const preview = screen.getByText('Preview').parentElement
      expect(preview?.textContent).toContain('Daily')
    })

    it('should update description when settings change', async () => {
      render(<RecurrenceEditor {...defaultProps} />)
      fireEvent.click(screen.getByLabelText('Repeat event'))

      const intervalInput = screen.getByDisplayValue('1')
      fireEvent.change(intervalInput, { target: { value: '2' } })

      expect(screen.getByText(/Every 2 days/)).toBeInTheDocument()
    })
  })

  describe('Props Integration', () => {
    it('should use eventStart for exception default date', () => {
      const customEventStart = dayjs('2025-12-25T15:30:00Z')
      render(
        <RecurrenceEditor {...defaultProps} eventStart={customEventStart} />
      )

      fireEvent.click(screen.getByLabelText('Repeat event'))
      fireEvent.click(screen.getByText('Add exception'))

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          exceptions: [
            expect.objectContaining({
              date: customEventStart,
              type: 'this',
              createdAt: expect.any(Object),
            }),
          ],
        })
      )
    })

    it('should handle missing eventStart gracefully', () => {
      render(<RecurrenceEditor onChange={mockOnChange} />)

      fireEvent.click(screen.getByLabelText('Repeat event'))
      fireEvent.click(screen.getByText('Add exception'))

      // Should still work, using current date as fallback
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          exceptions: expect.any(Array),
        })
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle null/undefined value prop', () => {
      render(<RecurrenceEditor {...defaultProps} value={null} />)

      expect(screen.getByLabelText('Repeat event')).not.toBeChecked()
      expect(screen.queryByText('Preview')).not.toBeInTheDocument()
    })

    it('should handle invalid interval values', () => {
      render(<RecurrenceEditor {...defaultProps} />)
      fireEvent.click(screen.getByLabelText('Repeat event'))

      const intervalLabel = screen.getByText('Repeat every')
      const intervalContainer = intervalLabel.parentElement
      const intervalInput = intervalContainer?.querySelector(
        'input[type="number"]'
      )

      fireEvent.change(intervalInput!, { target: { value: '' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          interval: 1, // Should default to 1
        })
      )
    })

    it('should handle malformed exceptions gracefully', () => {
      // Test with valid exceptions only
      const recurrenceWithValidExceptions = {
        frequency: 'daily' as const,
        interval: 1,
        endType: 'never' as const,
        exceptions: [
          {
            date: dayjs('2025-07-30'),
            type: 'this' as const,
            createdAt: dayjs('2025-07-29'),
          },
        ],
      }

      render(
        <RecurrenceEditor
          {...defaultProps}
          value={recurrenceWithValidExceptions}
        />
      )
      expect(screen.getByLabelText('Repeat event')).toBeChecked()
    })
  })

  describe('User Interaction Flow', () => {
    it('should complete a full recurrence setup flow', async () => {
      render(<RecurrenceEditor {...defaultProps} />)

      // Enable recurrence
      fireEvent.click(screen.getByLabelText('Repeat event'))

      // Change to weekly
      const frequencyLabel = screen.getByText('Frequency')
      const frequencyContainer = frequencyLabel.parentElement
      const frequencySelect =
        frequencyContainer?.querySelector('[role="combobox"]')
      fireEvent.click(frequencySelect!)
      await waitFor(() => {
        fireEvent.click(screen.getByText('Weekly'))
      })

      // Select Monday and Friday
      fireEvent.click(screen.getByLabelText('Mon'))
      fireEvent.click(screen.getByLabelText('Fri'))

      // Set interval to 2
      const intervalLabel = screen.getByText('Repeat every')
      const intervalContainer = intervalLabel.parentElement
      const intervalInput = intervalContainer?.querySelector(
        'input[type="number"]'
      )
      fireEvent.change(intervalInput!, { target: { value: '2' } })

      // Set end after 10 occurrences
      const endLabel = screen.getByText('End')
      const endContainer = endLabel.parentElement
      const endTypeSelect = endContainer?.querySelector('[role="combobox"]')
      fireEvent.click(endTypeSelect!)
      await waitFor(() => {
        fireEvent.click(screen.getByText('After occurrences'))
      })

      const countLabel = screen.getByText('Number of occurrences')
      const countContainer = countLabel.parentElement
      const countInput = countContainer?.querySelector('input[type="number"]')
      fireEvent.change(countInput!, { target: { value: '10' } })

      // Add exception
      fireEvent.click(screen.getByText('Add exception'))

      // Verify final state
      expect(mockOnChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          frequency: 'weekly',
          interval: 2,
          endType: 'after',
          count: 10,
          daysOfWeek: ['monday', 'friday'],
          exceptions: [
            expect.objectContaining({
              date: testEventStart,
              type: 'this',
              createdAt: expect.any(Object),
            }),
          ],
        })
      )
    })
  })
})
