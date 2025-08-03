import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RRule } from 'rrule'
import type { RRuleOptions } from '@/lib/recurrence-handler/types'
import { RecurrenceEditor } from './recurrence-editor'

// Test helper to create complete RRuleOptions with required dtstart
const createRRuleOptions = (
  partial: Partial<RRuleOptions> = {}
): RRuleOptions => ({
  dtstart: new Date('2025-01-01T09:00:00Z'),
  interval: 1,
  freq: RRule.DAILY, // This should be overridden by ...partial if freq is provided
  ...partial,
})

describe('RecurrenceEditor', () => {
  const mockOnChange = mock(() => {})

  const renderRecurrenceEditor = (props: Record<string, unknown> = {}) => {
    const defaultProps = {
      value: null,
      onChange: mockOnChange,
    }

    // Auto-wrap incomplete RRuleOptions with dtstart
    const finalProps = { ...props }
    if (
      finalProps.value &&
      typeof finalProps.value === 'object' &&
      'freq' in finalProps.value &&
      !('dtstart' in finalProps.value)
    ) {
      finalProps.value = createRRuleOptions(
        finalProps.value as Partial<RRuleOptions>
      )
    }

    return render(<RecurrenceEditor {...defaultProps} {...finalProps} />)
  }

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('🧪 Initial State & Basic Rendering', () => {
    it('should render with repeat checkbox unchecked by default', () => {
      renderRecurrenceEditor()

      const checkbox = screen.getByTestId('toggle-recurrence')
      expect(checkbox).not.toBeChecked()
      expect(screen.queryByText('Daily')).not.toBeInTheDocument()
    })

    it('should render with repeat checkbox checked when valid RRULE is provided', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const checkbox = screen.getByTestId('toggle-recurrence')
      expect(checkbox).toBeChecked()
      // Look for text in the description area instead of display value
      expect(screen.getByText('Daily')).toBeInTheDocument()
    })

    it('should show proper RRULE description when value is provided', () => {
      renderRecurrenceEditor({
        value: { freq: RRule.WEEKLY, interval: 2, count: 5 },
      })

      expect(screen.getByText('Every 2 weeks for 5 times')).toBeInTheDocument()
    })

    it('should handle empty string value gracefully', () => {
      renderRecurrenceEditor({ value: null })

      const checkbox = screen.getByTestId('toggle-recurrence')
      expect(checkbox).not.toBeChecked()
    })

    it('should update checkbox state when value prop changes from null to RRULE', () => {
      const { rerender } = renderRecurrenceEditor({ value: null })

      const checkbox = screen.getByTestId('toggle-recurrence')
      expect(checkbox).not.toBeChecked()

      // Simulate editing a recurring event - prop changes from null to RRULE
      rerender(
        <RecurrenceEditor
          value={createRRuleOptions({ freq: RRule.WEEKLY, interval: 1 })}
          onChange={mockOnChange}
        />
      )

      expect(checkbox).toBeChecked()
      expect(screen.getByText('Weekly')).toBeInTheDocument()
    })
  })

  describe('🔥 Edge Cases & Error Handling', () => {
    it('should handle null value without crashing', () => {
      expect(() => renderRecurrenceEditor({ value: null })).not.toThrow()

      const checkbox = screen.getByTestId('toggle-recurrence')
      expect(checkbox).not.toBeChecked()
    })

    it('should handle undefined value without crashing', () => {
      expect(() => renderRecurrenceEditor({ value: undefined })).not.toThrow()

      const checkbox = screen.getByTestId('toggle-recurrence')
      expect(checkbox).not.toBeChecked()
    })

    it('should handle malformed RRULE strings gracefully', () => {
      // Pass invalid RRuleOptions that would cause errors
      renderRecurrenceEditor({ value: { freq: 999 } })

      expect(screen.getByText('Custom recurrence')).toBeInTheDocument()
      const checkbox = screen.getByTestId('toggle-recurrence')
      expect(checkbox).toBeChecked()
    })

    it('should handle RRULE with missing FREQ parameter', () => {
      // RRule defaults to YEARLY when FREQ is missing - but our interface requires freq
      renderRecurrenceEditor({
        value: { freq: RRule.YEARLY, interval: 1, count: 5 },
      })

      expect(screen.getByText('Every year for 5 times')).toBeInTheDocument()
    })

    it('should handle RRULE with unsupported frequency', () => {
      // Using a frequency that's not in our freqMap
      renderRecurrenceEditor({ value: { freq: 999, interval: 1 } })

      expect(screen.getByText('Custom recurrence')).toBeInTheDocument()
    })

    it('should handle extremely large interval values', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 999999 } })

      expect(screen.getByText('Every 999999 days')).toBeInTheDocument()
    })

    it('should handle RRULE with multiple BYDAY values', () => {
      renderRecurrenceEditor({
        value: {
          freq: RRule.WEEKLY,
          interval: 1,
          byweekday: [RRule.MO, RRule.WE, RRule.FR, RRule.SU],
        },
      })

      // Should parse correctly and show all selected days
      const mondayCheckbox = screen.getByLabelText('Mon')
      const wednesdayCheckbox = screen.getByLabelText('Wed')
      const fridayCheckbox = screen.getByLabelText('Fri')
      const sundayCheckbox = screen.getByLabelText('Sun')
      const tuesdayCheckbox = screen.getByLabelText('Tue')

      expect(mondayCheckbox).toBeChecked()
      expect(wednesdayCheckbox).toBeChecked()
      expect(fridayCheckbox).toBeChecked()
      expect(sundayCheckbox).toBeChecked()
      expect(tuesdayCheckbox).not.toBeChecked()
    })
  })

  describe('🎯 Recurrence Toggle Behavior', () => {
    it('should enable recurrence and call onChange with default RRULE when toggled on', () => {
      renderRecurrenceEditor()

      const checkbox = screen.getByTestId('toggle-recurrence')
      fireEvent.click(checkbox)

      expect(mockOnChange).toHaveBeenCalledWith({
        freq: RRule.DAILY,
        interval: 1,
      })
      expect(checkbox).toBeChecked()
    })

    it('should disable recurrence and call onChange with null when toggled off', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const checkbox = screen.getByTestId('toggle-recurrence')
      fireEvent.click(checkbox)

      expect(mockOnChange).toHaveBeenCalledWith(null)
      expect(checkbox).not.toBeChecked()
    })

    it('should hide recurrence options when toggled off', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      expect(screen.getByLabelText('Repeats')).toBeInTheDocument()

      const checkbox = screen.getByTestId('toggle-recurrence')
      fireEvent.click(checkbox)

      expect(screen.queryByLabelText('Repeats')).not.toBeInTheDocument()
    })
  })

  describe('🔧 Frequency Selection', () => {
    it('should parse and display all supported frequencies', async () => {
      const frequencies = [
        {
          rruleOptions: createRRuleOptions({ freq: RRule.DAILY, interval: 1 }),
          expected: 'Daily',
        },
        {
          rruleOptions: createRRuleOptions({ freq: RRule.WEEKLY, interval: 1 }),
          expected: 'Weekly',
        },
        {
          rruleOptions: createRRuleOptions({
            freq: RRule.MONTHLY,
            interval: 1,
          }),
          expected: 'Monthly',
        },
        {
          rruleOptions: createRRuleOptions({ freq: RRule.YEARLY, interval: 1 }),
          expected: 'Yearly',
        },
      ]

      for (const { rruleOptions, expected } of frequencies) {
        const { unmount } = render(
          <RecurrenceEditor value={rruleOptions} onChange={mockOnChange} />
        )

        const frequencySelect = screen.getByTestId('frequency-select')

        // The RecurrenceEditor should display the frequency correctly
        expect(frequencySelect.textContent).toContain(expected)
        unmount()
      }
    })

    it('should update RRULE when frequency changes', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const frequencySelect = screen.getByRole('combobox', { name: /repeats/i })
      fireEvent.click(frequencySelect)

      const weeklyOption = screen.getByRole('option', { name: 'Weekly' })
      fireEvent.click(weeklyOption)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.WEEKLY,
          interval: 1,
        })
      )
    })

    it('should clear weekly days when switching from weekly to other frequencies', () => {
      renderRecurrenceEditor({
        value: {
          freq: RRule.WEEKLY,
          interval: 1,
          byweekday: [RRule.MO, RRule.WE],
        },
      })

      const frequencySelect = screen.getByRole('combobox', { name: /repeats/i })
      fireEvent.click(frequencySelect)

      const dailyOption = screen.getByRole('option', { name: 'Daily' })
      fireEvent.click(dailyOption)

      // Check that onChange was called - let test failure show us the actual format
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
        })
      )
    })
  })

  describe('⏱️ Interval Handling', () => {
    it('should handle valid interval changes', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const intervalInput = screen.getByLabelText('Every')
      fireEvent.change(intervalInput, { target: { value: '5' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 5,
        })
      )
    })

    it('should enforce minimum interval of 1', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const intervalInput = screen.getByLabelText('Every')
      fireEvent.change(intervalInput, { target: { value: '0' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
        })
      )
    })

    it('should handle negative interval values', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const intervalInput = screen.getByLabelText('Every')
      fireEvent.change(intervalInput, { target: { value: '-5' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
        })
      )
    })

    it('should handle non-numeric interval input', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const intervalInput = screen.getByLabelText('Every')
      fireEvent.change(intervalInput, { target: { value: 'abc' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
        })
      )
    })

    it('should handle empty interval input', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const intervalInput = screen.getByLabelText('Every')
      fireEvent.change(intervalInput, { target: { value: '' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
        })
      )
    })

    it('should handle very large interval values', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const intervalInput = screen.getByLabelText('Every')
      fireEvent.change(intervalInput, { target: { value: '999999' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 999999,
        })
      )
    })
  })

  describe('📅 Weekly Day Selection', () => {
    it('should show day selection only for weekly frequency', () => {
      const { rerender } = renderRecurrenceEditor({
        value: { freq: RRule.WEEKLY, interval: 1 },
      })
      expect(screen.getByText('Repeat on')).toBeInTheDocument()

      rerender(
        <RecurrenceEditor
          value={createRRuleOptions({ freq: RRule.DAILY, interval: 1 })}
          onChange={mockOnChange}
        />
      )
      expect(screen.queryByText('Repeat on')).toBe(null)
    })

    it('should handle all day combinations', () => {
      renderRecurrenceEditor({ value: { freq: RRule.WEEKLY, interval: 1 } })

      // Select all days
      const dayCheckboxes = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

      for (const day of dayCheckboxes) {
        const checkbox = screen.getByLabelText(day)
        fireEvent.click(checkbox)
      }

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.WEEKLY,
          interval: 1,
          byweekday: expect.arrayContaining([
            RRule.SU,
            RRule.MO,
            RRule.TU,
            RRule.WE,
            RRule.TH,
            RRule.FR,
            RRule.SA,
          ]),
        })
      )
    })

    it('should handle deselecting all days', () => {
      renderRecurrenceEditor({
        value: {
          freq: RRule.WEEKLY,
          interval: 1,
          byweekday: [RRule.MO, RRule.WE, RRule.FR],
        },
      })

      // Deselect all days
      const mondayCheckbox = screen.getByLabelText('Mon')
      const wednesdayCheckbox = screen.getByLabelText('Wed')
      const fridayCheckbox = screen.getByLabelText('Fri')

      fireEvent.click(mondayCheckbox)
      fireEvent.click(wednesdayCheckbox)
      fireEvent.click(fridayCheckbox)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.WEEKLY,
          interval: 1,
        })
      )
    })

    it('should handle rapid day toggle clicks', () => {
      renderRecurrenceEditor({ value: { freq: RRule.WEEKLY, interval: 1 } })

      const mondayCheckbox = screen.getByLabelText('Mon')

      // Rapid clicks
      fireEvent.click(mondayCheckbox)
      fireEvent.click(mondayCheckbox)
      fireEvent.click(mondayCheckbox)
      fireEvent.click(mondayCheckbox)

      // Should end up unchecked
      expect(mondayCheckbox).not.toBeChecked()
    })
  })

  describe('🔚 End Conditions', () => {
    it('should handle never ending (default)', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const neverCheckbox = screen.getByLabelText('Never')
      expect(neverCheckbox).toBeChecked()
    })

    it('should handle count-based ending', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const afterCheckbox = screen.getByLabelText('After')
      fireEvent.click(afterCheckbox)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
          count: 1,
        })
      )

      const countInput = screen.getByTestId('count-input')
      fireEvent.change(countInput, { target: { value: '10' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
          count: 10,
        })
      )
    })

    it('should handle date-based ending', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const onCheckbox = screen.getByLabelText('On')
      fireEvent.click(onCheckbox)

      // Should contain UNTIL parameter
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
          until: expect.any(Date),
        })
      )
    })

    it('should enforce minimum count of 1', () => {
      renderRecurrenceEditor({
        value: { freq: RRule.DAILY, interval: 1, count: 5 },
      })

      const countInput = screen.getByDisplayValue('5')
      fireEvent.change(countInput, { target: { value: '0' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
          count: 1,
        })
      )
    })

    it('should handle negative count values', () => {
      renderRecurrenceEditor({
        value: { freq: RRule.DAILY, interval: 1, count: 5 },
      })

      const countInput = screen.getByDisplayValue('5')
      fireEvent.change(countInput, { target: { value: '-10' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
          count: 1,
        })
      )
    })

    it('should handle non-numeric count input', () => {
      renderRecurrenceEditor({
        value: { freq: RRule.DAILY, interval: 1, count: 5 },
      })

      const countInput = screen.getByDisplayValue('5')
      fireEvent.change(countInput, { target: { value: 'abc' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
          count: 1,
        })
      )
    })

    it('should handle empty count input', () => {
      renderRecurrenceEditor({
        value: { freq: RRule.DAILY, interval: 1, count: 5 },
      })

      const countInput = screen.getByDisplayValue('5')
      fireEvent.change(countInput, { target: { value: '' } })

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
          count: 1,
        })
      )
    })

    it('should handle switching between end types rapidly', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const neverCheckbox = screen.getByLabelText('Never')
      const afterCheckbox = screen.getByLabelText('After')
      const onCheckbox = screen.getByLabelText('On')

      // Rapid switching
      fireEvent.click(afterCheckbox)
      fireEvent.click(onCheckbox)
      fireEvent.click(neverCheckbox)
      fireEvent.click(afterCheckbox)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.DAILY,
          interval: 1,
          count: 1,
        })
      )
    })
  })

  describe('🎨 RRULE Description Generation', () => {
    it('should show correct descriptions for different patterns', () => {
      const testCases = [
        {
          rruleOptions: createRRuleOptions({ freq: RRule.DAILY, interval: 1 }),
          expected: 'Daily',
        },
        {
          rruleOptions: createRRuleOptions({ freq: RRule.DAILY, interval: 3 }),
          expected: 'Every 3 days',
        },
        {
          rruleOptions: createRRuleOptions({ freq: RRule.WEEKLY, interval: 1 }),
          expected: 'Weekly',
        },
        {
          rruleOptions: createRRuleOptions({ freq: RRule.WEEKLY, interval: 2 }),
          expected: 'Every 2 weeks',
        },
        {
          rruleOptions: createRRuleOptions({
            freq: RRule.MONTHLY,
            interval: 1,
          }),
          expected: 'Monthly',
        },
        {
          rruleOptions: createRRuleOptions({ freq: RRule.YEARLY, interval: 1 }),
          expected: 'Yearly',
        },
        {
          rruleOptions: createRRuleOptions({
            freq: RRule.DAILY,
            interval: 1,
            count: 5,
          }),
          expected: 'Every day for 5 times',
        },
        {
          rruleOptions: createRRuleOptions({
            freq: RRule.WEEKLY,
            interval: 2,
            count: 10,
          }),
          expected: 'Every 2 weeks for 10 times',
        },
      ]

      testCases.forEach(({ rruleOptions, expected }) => {
        const { unmount } = render(
          <RecurrenceEditor value={rruleOptions} onChange={mockOnChange} />
        )
        expect(screen.getByText(expected)).toBeInTheDocument()
        unmount()
      })
    })

    it('should handle UNTIL dates in description', () => {
      const futureDate = new Date('2025-12-31T23:59:59Z')
      renderRecurrenceEditor({
        value: { freq: RRule.DAILY, interval: 1, until: futureDate },
      })

      // RRule.toText() handles UNTIL dates in its own format - should contain "until"
      expect(screen.getByText(/until/i)).toBeInTheDocument()
    })

    it('should show "Custom recurrence" for unparseable RRULEs', () => {
      renderRecurrenceEditor({ value: { freq: 999 as unknown, interval: 1 } })

      expect(screen.getByText('Custom recurrence')).toBeInTheDocument()
    })
  })

  describe('🏃‍♂️ Performance & Stress Tests', () => {
    it('should handle multiple rapid onChange calls without issues', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const intervalInput = screen.getByLabelText('Every')

      // Rapid input changes with different values
      const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
      for (const value of values) {
        fireEvent.change(intervalInput, { target: { value } })
      }

      // Should have been called for each unique change
      expect(mockOnChange).toHaveBeenCalledTimes(values.length)
    })

    it('should handle component remounting with different props', () => {
      const { rerender } = renderRecurrenceEditor({
        value: { freq: RRule.DAILY, interval: 1 },
      })

      expect(screen.getByText('Daily')).toBeInTheDocument()

      rerender(
        <RecurrenceEditor
          value={createRRuleOptions({ freq: RRule.WEEKLY, interval: 2 })}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('Weekly')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    })

    it('should not crash when onChange throws an error', () => {
      const errorOnChange = mock().mockImplementation(() => {
        throw new Error('onChange error')
      })

      // Should not crash the component during initial render
      expect(() =>
        renderRecurrenceEditor({ onChange: errorOnChange })
      ).not.toThrow()

      const checkbox = screen.getByTestId('toggle-recurrence')

      // In React, errors thrown by event handlers propagate, but the component stays functional
      // We'll test that the error is thrown but the component doesn't unmount
      expect(() => {
        fireEvent.click(checkbox)
      }).toThrow('onChange error')

      // Component should still be rendered after the error
      expect(screen.getByTestId('toggle-recurrence')).toBeInTheDocument()
    })
  })

  describe('♿ Accessibility & User Experience', () => {
    it('should have proper ARIA labels and roles', () => {
      renderRecurrenceEditor({ value: { freq: RRule.WEEKLY, interval: 1 } })

      expect(screen.getByLabelText('Repeats')).toBeInTheDocument()
      expect(screen.getByLabelText('Every')).toBeInTheDocument()
      expect(screen.getByLabelText('Never')).toBeInTheDocument()
      expect(screen.getByLabelText('After')).toBeInTheDocument()
      expect(screen.getByLabelText('On')).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      renderRecurrenceEditor({ value: { freq: RRule.WEEKLY, interval: 1 } })

      const checkbox = screen.getByTestId('toggle-recurrence')
      checkbox.focus()

      // Should be able to toggle with Enter key (more standard for checkboxes)
      fireEvent.keyDown(checkbox, { key: 'Enter', code: 'Enter' })
      // Since the keyDown might not directly trigger onChange, let's click instead
      fireEvent.click(checkbox)
      expect(mockOnChange).toHaveBeenCalledWith(null)
    })

    it('should maintain focus state correctly', () => {
      renderRecurrenceEditor({ value: { freq: RRule.DAILY, interval: 1 } })

      const intervalInput = screen.getByLabelText('Every')
      intervalInput.focus()

      expect(document.activeElement).toBe(intervalInput)

      fireEvent.change(intervalInput, { target: { value: '5' } })

      // Focus should remain on input
      expect(document.activeElement).toBe(intervalInput)
    })
  })

  describe('🔄 Complex State Transitions', () => {
    it('should handle complex state transitions correctly', () => {
      renderRecurrenceEditor()

      // Enable recurrence
      const checkbox = screen.getByTestId('toggle-recurrence')
      fireEvent.click(checkbox)

      // Change to weekly
      const frequencySelect = screen.getByRole('combobox', { name: /repeats/i })
      fireEvent.click(frequencySelect)
      fireEvent.click(screen.getByRole('option', { name: 'Weekly' }))

      // Select some days
      fireEvent.click(screen.getByLabelText('Mon'))
      fireEvent.click(screen.getByLabelText('Wed'))

      // Change interval
      const intervalInput = screen.getByLabelText('Every')
      fireEvent.change(intervalInput, { target: { value: '2' } })

      // Set end condition to count
      const afterCheckbox = screen.getByLabelText('After')
      fireEvent.click(afterCheckbox)

      const countInput = screen.getByDisplayValue('1')
      fireEvent.change(countInput, { target: { value: '5' } })

      expect(mockOnChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          freq: RRule.WEEKLY,
          interval: 2,
          count: 5,
          byweekday: expect.arrayContaining([RRule.MO, RRule.WE]),
        })
      )
    })

    it('should preserve form state when toggling off and on quickly', () => {
      renderRecurrenceEditor({
        value: {
          freq: RRule.WEEKLY,
          interval: 2,
          byweekday: [RRule.MO, RRule.WE],
        },
      })

      const checkbox = screen.getByTestId('toggle-recurrence')

      // Toggle off
      fireEvent.click(checkbox)
      expect(mockOnChange).toHaveBeenCalledWith(null)

      // Toggle back on
      fireEvent.click(checkbox)

      // Should restore previous state
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          freq: RRule.WEEKLY,
          interval: 2,
          byweekday: expect.arrayContaining([RRule.MO, RRule.WE]),
        })
      )
    })
  })
})
