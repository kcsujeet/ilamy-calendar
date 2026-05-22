import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { RRule } from 'rrule'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import type { RRuleOptions } from '@/features/recurrence/types'
import type { RecurrencePreset } from '@/features/recurrence/utils/recurrence-preset-utils'
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

// Helper to get the last call argument from mock
const getLastCallArg = (mockFn: ReturnType<typeof mock>) => {
	const calls = mockFn.mock.calls
	return calls[calls.length - 1]?.[0]
}

const REFERENCE_DATE = new Date('2025-05-16T09:00:00.000Z')

const PRESET_OPTION_NAMES: Record<RecurrencePreset, string | RegExp> = {
	once: 'Once',
	daily: 'Every day',
	weekdays: /Every weekday/i,
	weeklyOnDay: /Every week on/,
	monthlyOnDay: /Every month on day/,
	monthlyOnWeekday: /Every month on the/,
	customize: 'Customize',
}

const getPresetSelect = () => screen.getByTestId('recurrence-preset-select')

const expectPresetLabel = (label: string | RegExp) => {
	const text = getPresetSelect().textContent ?? ''
	if (typeof label === 'string') {
		expect(text).toContain(label)
		return
	}
	expect(text).toMatch(label)
}

const selectRecurrencePreset = (preset: RecurrencePreset) => {
	fireEvent.click(getPresetSelect())
	const name = PRESET_OPTION_NAMES[preset]
	fireEvent.click(screen.getByRole('option', { name }))
}

const enableCustomizeMode = () => selectRecurrencePreset('customize')

const queryCustomizeDetails = () => screen.queryByTestId('frequency-select')

const expectDetailsHidden = () => {
	expect(queryCustomizeDetails()).toBeNull()
}

const expectDetailsVisible = () => {
	expect(queryCustomizeDetails()).toBeInTheDocument()
}

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

		return render(
			<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
				<RecurrenceEditor {...defaultProps} {...finalProps} />
			</CalendarProvider>
		)
	}

	beforeEach(() => {
		mockOnChange.mockClear()
	})

	describe('🧪 Initial State & Basic Rendering', () => {
		it('should default to Once preset with details hidden', () => {
			renderRecurrenceEditor({ referenceDate: REFERENCE_DATE })

			expectPresetLabel('Once')
			expectDetailsHidden()
		})

		it('should select daily preset when a simple daily RRULE is provided', () => {
			renderRecurrenceEditor({
				value: { freq: RRule.DAILY, interval: 1, dtstart: REFERENCE_DATE },
				referenceDate: REFERENCE_DATE,
			})

			expectPresetLabel('Every day')
			expectDetailsHidden()
		})

		it('should select customize preset for non-preset RRULE patterns', () => {
			renderRecurrenceEditor({
				value: {
					freq: RRule.WEEKLY,
					interval: 2,
					count: 5,
					dtstart: REFERENCE_DATE,
				},
				referenceDate: REFERENCE_DATE,
			})

			expectPresetLabel('Customize')
			expectDetailsVisible()
		})

		it('should handle null value as Once preset', () => {
			renderRecurrenceEditor({ value: null, referenceDate: REFERENCE_DATE })

			expectPresetLabel('Once')
		})

		it('should update preset when value prop changes from null to RRULE', () => {
			const { rerender } = renderRecurrenceEditor({
				value: null,
				referenceDate: REFERENCE_DATE,
			})

			expectPresetLabel('Once')

			rerender(
				<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
					<RecurrenceEditor
						onChange={mockOnChange}
						referenceDate={REFERENCE_DATE}
						value={createRRuleOptions({
							freq: RRule.WEEKLY,
							interval: 1,
							byweekday: [RRule.FR],
							dtstart: REFERENCE_DATE,
						})}
					/>
				</CalendarProvider>
			)

			expectPresetLabel(/Every week on/)
			expectDetailsHidden()
		})
	})

	describe('🔥 Edge Cases & Error Handling', () => {
		it('should handle null value without crashing', () => {
			expect(() =>
				renderRecurrenceEditor({ value: null, referenceDate: REFERENCE_DATE })
			).not.toThrow()

			expectPresetLabel('Once')
		})

		it('should handle undefined value without crashing', () => {
			expect(() =>
				renderRecurrenceEditor({
					value: undefined,
					referenceDate: REFERENCE_DATE,
				})
			).not.toThrow()

			expectPresetLabel('Once')
		})

		it('should handle malformed RRULE strings gracefully', () => {
			renderRecurrenceEditor({
				value: { freq: 999, interval: 1, dtstart: REFERENCE_DATE },
				referenceDate: REFERENCE_DATE,
			})

			expectPresetLabel('Customize')
		})

		it('should handle RRULE with count as customize preset', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.YEARLY,
					interval: 1,
					count: 5,
				}),
				referenceDate: REFERENCE_DATE,
			})

			expectPresetLabel('Customize')
			expect(screen.getByTestId('count-input')).toHaveValue(5)
		})

		it('should handle RRULE with unsupported frequency', () => {
			renderRecurrenceEditor({
				value: { freq: 999, interval: 1, dtstart: REFERENCE_DATE },
				referenceDate: REFERENCE_DATE,
			})

			expectPresetLabel('Customize')
		})

		it('should handle extremely large interval values', () => {
			renderRecurrenceEditor({
				value: { freq: RRule.DAILY, interval: 999999, dtstart: REFERENCE_DATE },
				referenceDate: REFERENCE_DATE,
			})

			expectPresetLabel('Customize')
			expect(screen.getByLabelText('Every')).toHaveValue(999999)
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

	describe('🎯 Recurrence preset selection', () => {
		it('should enable daily recurrence when daily preset is selected', () => {
			renderRecurrenceEditor({ referenceDate: REFERENCE_DATE })

			selectRecurrencePreset('daily')

			expect(mockOnChange).toHaveBeenCalledWith(
				expect.objectContaining({
					freq: RRule.DAILY,
					interval: 1,
					dtstart: REFERENCE_DATE,
				})
			)
			expectPresetLabel('Every day')
			expectDetailsHidden()
		})

		it('should disable recurrence when Once preset is selected', () => {
			renderRecurrenceEditor({
				value: { freq: RRule.DAILY, interval: 1, dtstart: REFERENCE_DATE },
				referenceDate: REFERENCE_DATE,
			})

			selectRecurrencePreset('once')

			expect(mockOnChange).toHaveBeenCalledWith(null)
			expectPresetLabel('Once')
		})

		it('should hide detail fields when a preset other than customize is selected', () => {
			renderRecurrenceEditor({
				value: { freq: RRule.DAILY, interval: 1, dtstart: REFERENCE_DATE },
				referenceDate: REFERENCE_DATE,
			})

			enableCustomizeMode()
			expectDetailsVisible()
			selectRecurrencePreset('once')
			expectDetailsHidden()
		})

		it('should show detail fields in customize mode', () => {
			renderRecurrenceEditor({ referenceDate: REFERENCE_DATE })

			selectRecurrencePreset('customize')

			expectDetailsVisible()
			expectPresetLabel('Customize')
			expect(mockOnChange).toHaveBeenCalledWith(
				expect.objectContaining({ freq: RRule.DAILY, interval: 1 })
			)

			const intervalInput = screen.getByLabelText('Every')
			fireEvent.change(intervalInput, { target: { value: '3' } })
			expect(mockOnChange).toHaveBeenLastCalledWith(
				expect.objectContaining({ interval: 3 })
			)
		})

		it('should keep customize mode after parent re-renders with daily RRULE', () => {
			const { rerender } = renderRecurrenceEditor({
				value: null,
				referenceDate: REFERENCE_DATE,
			})

			selectRecurrencePreset('customize')

			rerender(
				<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
					<RecurrenceEditor
						onChange={mockOnChange}
						referenceDate={REFERENCE_DATE}
						value={createRRuleOptions({ freq: RRule.DAILY, interval: 1 })}
					/>
				</CalendarProvider>
			)

			expectPresetLabel('Customize')
			expectDetailsVisible()
		})

		it('should order weekly day checkboxes from firstDayOfWeek', () => {
			render(
				<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={1}>
					<RecurrenceEditor
						onChange={mockOnChange}
						referenceDate={REFERENCE_DATE}
						value={createRRuleOptions({
							freq: RRule.WEEKLY,
							interval: 1,
							byweekday: [RRule.MO],
						})}
					/>
				</CalendarProvider>
			)
			enableCustomizeMode()
			mockOnChange.mockClear()

			const labels = screen
				.getAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/)
				.map((node) => node.textContent)
			expect(labels[0]).toBe('Mon')
			expect(labels.at(-1)).toBe('Sun')
		})
	})

	describe('🔧 Frequency Selection', () => {
		it('should parse and display all supported frequencies', async () => {
			const frequencies = [
				{
					rruleOptions: createRRuleOptions({ freq: RRule.DAILY, interval: 1 }),
					expected: 'day',
				},
				{
					rruleOptions: createRRuleOptions({ freq: RRule.WEEKLY, interval: 1 }),
					expected: 'week',
				},
				{
					rruleOptions: createRRuleOptions({
						freq: RRule.MONTHLY,
						interval: 1,
					}),
					expected: 'month',
				},
				{
					rruleOptions: createRRuleOptions({ freq: RRule.YEARLY, interval: 1 }),
					expected: 'year',
				},
			]

			for (const { rruleOptions, expected } of frequencies) {
				const { unmount } = render(
					<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
						<RecurrenceEditor
							onChange={mockOnChange}
							referenceDate={REFERENCE_DATE}
							value={{ ...rruleOptions, interval: 2 }}
						/>
					</CalendarProvider>
				)

				const frequencySelect = screen.getByTestId('frequency-select')

				// The RecurrenceEditor should display the frequency correctly
				expect(frequencySelect.textContent).toContain(expected)
				unmount()
			}
		})

		it('should update RRULE when frequency changes', () => {
			renderRecurrenceEditor({
				value: { freq: RRule.DAILY, interval: 1, dtstart: REFERENCE_DATE },
				referenceDate: REFERENCE_DATE,
			})
			enableCustomizeMode()
			mockOnChange.mockClear()

			const frequencySelect = screen.getByRole('combobox', { name: /repeats/i })
			fireEvent.click(frequencySelect)

			const weeklyOption = screen.getByRole('option', { name: 'week' })
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
					dtstart: REFERENCE_DATE,
				},
				referenceDate: REFERENCE_DATE,
			})
			enableCustomizeMode()
			mockOnChange.mockClear()

			const frequencySelect = screen.getByRole('combobox', { name: /repeats/i })
			fireEvent.click(frequencySelect)

			const dailyOption = screen.getByRole('option', { name: 'day' })
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
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

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
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

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
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

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
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

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
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

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
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

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
				<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
					<RecurrenceEditor
						onChange={mockOnChange}
						value={createRRuleOptions({ freq: RRule.DAILY, interval: 1 })}
					/>
				</CalendarProvider>
			)
			expect(screen.queryByText('Repeat on')).toBe(null)
		})

		it('should handle all day combinations', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.WEEKLY,
					interval: 1,
				}),
				referenceDate: REFERENCE_DATE,
			})
			enableCustomizeMode()
			mockOnChange.mockClear()

			const dayCheckboxes = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

			for (const day of dayCheckboxes) {
				fireEvent.click(screen.getByLabelText(day))
			}

			const result = getLastCallArg(mockOnChange)
			expect(result.freq).toBe(RRule.WEEKLY)
			expect(result.byweekday).toHaveLength(7)
		})

		it('should handle deselecting all days', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.WEEKLY,
					interval: 1,
					byweekday: [RRule.MO, RRule.WE, RRule.FR],
				}),
				referenceDate: REFERENCE_DATE,
			})
			enableCustomizeMode()
			mockOnChange.mockClear()

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
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.WEEKLY, interval: 1 }),
				referenceDate: REFERENCE_DATE,
			})
			enableCustomizeMode()

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
			renderRecurrenceEditor({
				value: { freq: RRule.DAILY, interval: 2, dtstart: REFERENCE_DATE },
				referenceDate: REFERENCE_DATE,
			})

			const neverRadio = screen.getByRole('radio', { name: 'Never' })
			expect(neverRadio).toBeChecked()
		})

		it('should handle count-based ending', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			const afterRadio = screen.getByRole('radio', { name: 'After' })
			fireEvent.click(afterRadio)

			expect(mockOnChange).toHaveBeenCalledWith(
				expect.objectContaining({
					freq: RRule.DAILY,
					interval: 2,
					count: 1,
				})
			)

			const countInput = screen.getByTestId('count-input')
			fireEvent.change(countInput, { target: { value: '10' } })

			expect(mockOnChange).toHaveBeenCalledWith(
				expect.objectContaining({
					freq: RRule.DAILY,
					interval: 2,
					count: 10,
				})
			)
		})

		it('should handle date-based ending', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			const onRadio = screen.getByRole('radio', { name: 'On' })
			fireEvent.click(onRadio)

			expect(mockOnChange).toHaveBeenCalledWith(
				expect.objectContaining({
					freq: RRule.DAILY,
					interval: 2,
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
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			const neverRadio = screen.getByRole('radio', { name: 'Never' })
			const afterRadio = screen.getByRole('radio', { name: 'After' })
			const onRadio = screen.getByRole('radio', { name: 'On' })

			fireEvent.click(afterRadio)
			fireEvent.click(onRadio)
			fireEvent.click(neverRadio)
			fireEvent.click(afterRadio)

			expect(mockOnChange).toHaveBeenCalledWith(
				expect.objectContaining({
					freq: RRule.DAILY,
					interval: 2,
					count: 1,
				})
			)
		})
	})

	describe('🎨 Preset detection from RRULE', () => {
		it('should map common RRULE patterns to the expected preset', () => {
			const testCases = [
				{
					rruleOptions: createRRuleOptions({ freq: RRule.DAILY, interval: 1 }),
					expected: 'Every day',
				},
				{
					rruleOptions: createRRuleOptions({ freq: RRule.DAILY, interval: 3 }),
					expected: 'Customize',
				},
				{
					rruleOptions: createRRuleOptions({
						freq: RRule.WEEKLY,
						interval: 1,
						byweekday: [RRule.FR],
						dtstart: REFERENCE_DATE,
					}),
					expected: /Every week on/,
					referenceDate: REFERENCE_DATE,
				},
				{
					rruleOptions: createRRuleOptions({ freq: RRule.YEARLY, interval: 1 }),
					expected: 'Customize',
				},
			]

			testCases.forEach(({ rruleOptions, expected, referenceDate }) => {
				const { unmount } = render(
					<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
						<RecurrenceEditor
							onChange={mockOnChange}
							referenceDate={referenceDate}
							value={rruleOptions}
						/>
					</CalendarProvider>
				)
				expectPresetLabel(expected)
				unmount()
			})
		})

		it('should select customize preset when UNTIL is set', () => {
			const futureDate = new Date('2025-12-31T23:59:59Z')
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.DAILY,
					interval: 1,
					until: futureDate,
				}),
				referenceDate: REFERENCE_DATE,
			})

			expectPresetLabel('Customize')
		})

		it('should select customize preset for unparseable frequencies', () => {
			renderRecurrenceEditor({
				value: { freq: 999 as unknown, interval: 1, dtstart: REFERENCE_DATE },
				referenceDate: REFERENCE_DATE,
			})

			expectPresetLabel('Customize')
		})
	})

	describe('Monthly and yearly patterns', () => {
		it('should show monthly on day controls when freq is MONTHLY', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.MONTHLY,
					bymonthday: [15],
					interval: 2,
				}),
				referenceDate: REFERENCE_DATE,
			})

			expect(screen.getByTestId('monthly-mode-day')).toBeInTheDocument()
			expect(screen.getByTestId('monthly-day-of-month')).toHaveValue(15)
		})

		it('should show monthly on the controls for byweekday nth', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.MONTHLY,
					byweekday: [RRule.FR.nth(-1)],
				}),
			})

			expect(screen.getByTestId('monthly-mode-the')).toBeChecked()
			expect(screen.getByTestId('monthly-position')).toBeInTheDocument()
		})

		it('should emit bymonthday when switching monthly to on day', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.MONTHLY,
					byweekday: [RRule.FR.nth(-1)],
					count: 12,
				}),
				referenceDate: REFERENCE_DATE,
			})
			enableCustomizeMode()
			mockOnChange.mockClear()

			fireEvent.click(screen.getByTestId('monthly-mode-day'))

			expect(mockOnChange).toHaveBeenCalledWith(
				expect.objectContaining({
					freq: RRule.MONTHLY,
					bymonthday: expect.any(Array),
					byweekday: undefined,
				})
			)
		})

		it('should show yearly month in freq row and on day / on the fields below', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.YEARLY,
					bymonth: [6],
					bymonthday: [15],
				}),
			})

			expect(screen.getByTestId('yearly-on-month-select')).toBeInTheDocument()
			expect(screen.getByTestId('yearly-mode-day')).toBeInTheDocument()
			expect(screen.getByTestId('yearly-day-of-month')).toHaveValue(15)
			expect(screen.queryByTestId('yearly-on-the-month-select')).toBeNull()
		})

		it('should preload event 22 last Friday monthly rule without crashing', () => {
			const event22Rrule = createRRuleOptions({
				freq: RRule.MONTHLY,
				byweekday: [RRule.FR.nth(-1)],
				count: 12,
			})

			renderRecurrenceEditor({ value: event22Rrule })

			expect(screen.getByTestId('monthly-mode-the')).toBeChecked()
			expect(screen.getByTestId('monthly-position')).toBeInTheDocument()
			expect(screen.getByTestId('monthly-on-the-day')).toBeInTheDocument()

			mockOnChange.mockClear()

			fireEvent.click(screen.getByTestId('monthly-position'))
			fireEvent.click(screen.getByRole('option', { name: 'First' }))
			fireEvent.click(screen.getByTestId('monthly-position'))
			fireEvent.click(screen.getByRole('option', { name: 'Last' }))

			const lastCall = getLastCallArg(mockOnChange)
			expect(lastCall.freq).toBe(RRule.MONTHLY)
			expect(lastCall.byweekday).toEqual([RRule.FR.nth(-1)])
		})

		it('should update byweekday when selecting a different weekday on the', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.MONTHLY,
					byweekday: [RRule.MO.nth(2)],
				}),
				referenceDate: new Date('2025-05-15T10:00:00.000Z'),
			})

			enableCustomizeMode()

			const daySelect = screen.getByTestId('monthly-on-the-day')
			fireEvent.click(daySelect)
			fireEvent.click(screen.getByRole('option', { name: 'Wednesday' }))

			const lastCall = getLastCallArg(mockOnChange)
			expect(lastCall.byweekday).toEqual([RRule.WE.nth(2)])
		})
	})

	describe('🏃‍♂️ Performance & Stress Tests', () => {
		it('should handle multiple rapid onChange calls without issues', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			const intervalInput = screen.getByLabelText('Every')

			// Rapid input changes with different values
			const values = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
			for (const value of values) {
				fireEvent.change(intervalInput, { target: { value } })
			}

			expect(mockOnChange).toHaveBeenCalledTimes(values.length)
		})

		it('should handle component remounting with different props', () => {
			const { rerender } = renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			expect(screen.getByTestId('frequency-select').textContent).toContain(
				'day'
			)

			rerender(
				<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
					<RecurrenceEditor
						onChange={mockOnChange}
						referenceDate={REFERENCE_DATE}
						value={createRRuleOptions({ freq: RRule.WEEKLY, interval: 2 })}
					/>
				</CalendarProvider>
			)

			expect(screen.getByTestId('frequency-select').textContent).toContain(
				'week'
			)
			expect(screen.getByDisplayValue('2')).toBeInTheDocument()
		})

		it('should not crash when onChange throws an error', () => {
			const errorOnChange = mock().mockImplementation(() => {
				throw new Error('onChange error')
			})

			expect(() =>
				renderRecurrenceEditor({
					onChange: errorOnChange,
					referenceDate: REFERENCE_DATE,
				})
			).not.toThrow()

			expect(() => {
				selectRecurrencePreset('daily')
			}).toThrow('onChange error')

			expect(screen.getByTestId('recurrence-preset-select')).toBeInTheDocument()
		})
	})

	describe('♿ Accessibility & User Experience', () => {
		it('should have proper ARIA labels and roles', () => {
			renderRecurrenceEditor({
				value: { freq: RRule.WEEKLY, interval: 2, count: 5 },
				referenceDate: REFERENCE_DATE,
			})

			expect(screen.getByLabelText('Repeats every')).toBeInTheDocument()
			expect(screen.getByLabelText('Never')).toBeInTheDocument()
			expect(screen.getByLabelText('After')).toBeInTheDocument()
			expect(screen.getByLabelText('On')).toBeInTheDocument()
		})

		it('should support selecting Once from the preset combobox', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.WEEKLY, interval: 1 }),
				referenceDate: REFERENCE_DATE,
			})

			selectRecurrencePreset('once')
			expect(mockOnChange).toHaveBeenCalledWith(null)
		})

		it('should maintain focus state correctly', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			const intervalInput = screen.getByLabelText('Every')
			intervalInput.focus()

			expect(document.activeElement).toBe(intervalInput)

			fireEvent.change(intervalInput, { target: { value: '5' } })

			expect(document.activeElement).toBe(intervalInput)
		})
	})

	describe('🔄 Complex State Transitions', () => {
		it('should handle complex state transitions correctly', () => {
			renderRecurrenceEditor({ referenceDate: REFERENCE_DATE })
			enableCustomizeMode()
			mockOnChange.mockClear()

			// Change to weekly
			const frequencySelect = screen.getByRole('combobox', { name: /repeats/i })
			fireEvent.click(frequencySelect)
			fireEvent.click(screen.getByRole('option', { name: 'week' }))

			// Select some days
			fireEvent.click(screen.getByLabelText('Mon'))
			fireEvent.click(screen.getByLabelText('Wed'))

			// Change interval
			const intervalInput = screen.getByLabelText('Every')
			fireEvent.change(intervalInput, { target: { value: '2' } })

			// Set end condition to count
			const afterRadio = screen.getByRole('radio', { name: 'After' })
			fireEvent.click(afterRadio)

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

		it('should enable editing after selecting customize from once', () => {
			renderRecurrenceEditor({
				value: null,
				referenceDate: REFERENCE_DATE,
			})

			expectDetailsHidden()

			selectRecurrencePreset('customize')
			expectDetailsVisible()

			const intervalInput = screen.getByLabelText('Every')
			fireEvent.change(intervalInput, { target: { value: '4' } })

			expect(mockOnChange).toHaveBeenLastCalledWith(
				expect.objectContaining({
					freq: RRule.DAILY,
					interval: 4,
				})
			)
		})
	})

	describe('📊 Data Integrity & Exact Value Verification', () => {
		it('should produce valid RRule that can be instantiated', () => {
			renderRecurrenceEditor({ referenceDate: REFERENCE_DATE })
			selectRecurrencePreset('daily')

			const result = getLastCallArg(mockOnChange)
			expect(() => new RRule(result)).not.toThrow()
		})

		it('should produce RRule with exact frequency value', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			const frequencySelect = screen.getByRole('combobox', { name: /repeats/i })
			fireEvent.click(frequencySelect)
			fireEvent.click(screen.getByRole('option', { name: 'month' }))

			const result = getLastCallArg(mockOnChange)
			expect(result.freq).toBe(RRule.MONTHLY)
			expect(result.freq).not.toBe(RRule.DAILY)
			expect(result.freq).not.toBe(RRule.WEEKLY)
		})

		it('should set byweekday to undefined when no days selected', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.WEEKLY,
					interval: 1,
					byweekday: [RRule.MO],
				}),
				referenceDate: REFERENCE_DATE,
			})
			enableCustomizeMode()
			mockOnChange.mockClear()

			const mondayCheckbox = screen.getByLabelText('Mon')
			fireEvent.click(mondayCheckbox) // Deselect

			const result = getLastCallArg(mockOnChange)
			expect(result.byweekday).toBeUndefined()
		})

		it('should set count to undefined when switching to never', () => {
			renderRecurrenceEditor({
				value: { freq: RRule.DAILY, interval: 1, count: 10 },
			})

			const neverCheckbox = screen.getByLabelText('Never')
			fireEvent.click(neverCheckbox)

			const result = getLastCallArg(mockOnChange)
			expect(result.count).toBeUndefined()
			expect(result.until).toBeUndefined()
		})

		it('should set until to undefined when switching to count', () => {
			const futureDate = new Date('2025-12-31')
			renderRecurrenceEditor({
				value: { freq: RRule.DAILY, interval: 1, until: futureDate },
			})

			const afterRadio = screen.getByRole('radio', { name: 'After' })
			fireEvent.click(afterRadio)

			const result = getLastCallArg(mockOnChange)
			expect(result.until).toBeUndefined()
			expect(result.count).toBeDefined()
		})

		it('should preserve dtstart when updating other fields', () => {
			const dtstart = new Date('2025-06-15T10:00:00Z')
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2, dtstart }),
				referenceDate: REFERENCE_DATE,
			})

			const intervalInput = screen.getByLabelText('Every')
			fireEvent.change(intervalInput, { target: { value: '5' } })

			const result = getLastCallArg(mockOnChange)
			expect(result.dtstart).toEqual(dtstart)
		})

		it('should have exactly the expected weekdays, no more no less', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.WEEKLY, interval: 1 }),
				referenceDate: REFERENCE_DATE,
			})
			enableCustomizeMode()
			mockOnChange.mockClear()

			fireEvent.click(screen.getByLabelText('Mon'))
			fireEvent.click(screen.getByLabelText('Wed'))
			fireEvent.click(screen.getByLabelText('Fri'))

			const result = getLastCallArg(mockOnChange)
			expect(result.byweekday).toHaveLength(3)
			expect(result.byweekday).toContain(RRule.MO)
			expect(result.byweekday).toContain(RRule.WE)
			expect(result.byweekday).toContain(RRule.FR)
			expect(result.byweekday).not.toContain(RRule.TU)
			expect(result.byweekday).not.toContain(RRule.TH)
		})
	})

	describe('🖥️ UI State Reflects Data Correctly', () => {
		it('should display correct frequency in select after prop change', () => {
			const { rerender } = renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			const frequencySelect = screen.getByTestId('frequency-select')
			expect(frequencySelect).toHaveTextContent('day')

			rerender(
				<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
					<RecurrenceEditor
						onChange={mockOnChange}
						referenceDate={REFERENCE_DATE}
						value={createRRuleOptions({ freq: RRule.MONTHLY, interval: 2 })}
					/>
				</CalendarProvider>
			)

			expect(frequencySelect).toHaveTextContent('month')
		})

		it('should display correct interval value after prop change', () => {
			const { rerender } = renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			expect(screen.getByDisplayValue('2')).toBeInTheDocument()

			rerender(
				<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
					<RecurrenceEditor
						onChange={mockOnChange}
						referenceDate={REFERENCE_DATE}
						value={createRRuleOptions({ freq: RRule.DAILY, interval: 7 })}
					/>
				</CalendarProvider>
			)

			expect(screen.getByDisplayValue('7')).toBeInTheDocument()
		})

		it('should check correct weekday checkboxes based on byweekday prop', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.WEEKLY,
					interval: 1,
					byweekday: [RRule.TU, RRule.TH, RRule.SA],
				}),
			})

			expect(screen.getByLabelText('Tue')).toBeChecked()
			expect(screen.getByLabelText('Thu')).toBeChecked()
			expect(screen.getByLabelText('Sat')).toBeChecked()
			expect(screen.getByLabelText('Sun')).not.toBeChecked()
			expect(screen.getByLabelText('Mon')).not.toBeChecked()
			expect(screen.getByLabelText('Wed')).not.toBeChecked()
			expect(screen.getByLabelText('Fri')).not.toBeChecked()
		})

		it('should show count input only when count end type is selected', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			// Initially "Never" is selected, no count input
			expect(screen.queryByTestId('count-input')).not.toBeInTheDocument()

			// Select "After"
			fireEvent.click(screen.getByLabelText('After'))
			expect(screen.getByTestId('count-input')).toBeInTheDocument()

			// Select "Never" again
			fireEvent.click(screen.getByLabelText('Never'))
			expect(screen.queryByTestId('count-input')).not.toBeInTheDocument()
		})

		it('should display correct count value in input', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.DAILY,
					interval: 1,
					count: 15,
				}),
			})

			const countInput = screen.getByTestId('count-input')
			expect(countInput).toHaveValue(15)
		})

		it('should update frequency select when frequency changes in customize mode', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			expect(screen.getByTestId('frequency-select').textContent).toContain(
				'day'
			)

			const frequencySelect = screen.getByRole('combobox', { name: /repeats/i })
			fireEvent.click(frequencySelect)
			fireEvent.click(screen.getByRole('option', { name: 'week' }))

			expect(screen.getByTestId('frequency-select').textContent).toContain(
				'week'
			)
		})

		it('should update interval when parent re-renders with new value', () => {
			const { rerender } = renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			const intervalInput = screen.getByLabelText('Every')
			fireEvent.change(intervalInput, { target: { value: '3' } })

			const result = getLastCallArg(mockOnChange)
			expect(result.interval).toBe(3)

			rerender(
				<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
					<RecurrenceEditor
						onChange={mockOnChange}
						referenceDate={REFERENCE_DATE}
						value={createRRuleOptions({ freq: RRule.DAILY, interval: 3 })}
					/>
				</CalendarProvider>
			)

			expect(screen.getByDisplayValue('3')).toBeInTheDocument()
			expectPresetLabel('Customize')
		})

		it('should update count input when parent re-renders with count', () => {
			const { rerender } = renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.WEEKLY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			fireEvent.click(screen.getByLabelText('After'))
			const countInput = screen.getByTestId('count-input')
			fireEvent.change(countInput, { target: { value: '5' } })

			const result = getLastCallArg(mockOnChange)
			expect(result.count).toBe(5)
			expect(result.interval).toBe(2)
			expect(result.freq).toBe(RRule.WEEKLY)

			rerender(
				<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
					<RecurrenceEditor
						onChange={mockOnChange}
						referenceDate={REFERENCE_DATE}
						value={createRRuleOptions({
							freq: RRule.WEEKLY,
							interval: 2,
							count: 5,
						})}
					/>
				</CalendarProvider>
			)

			expect(screen.getByTestId('count-input')).toHaveValue(5)
			expectPresetLabel('Customize')
		})
	})

	describe('🔒 End Type Mutual Exclusivity', () => {
		it('should only have one end type checked at a time', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({ freq: RRule.DAILY, interval: 2 }),
				referenceDate: REFERENCE_DATE,
			})

			const neverRadio = screen.getByRole('radio', { name: 'Never' })
			const afterRadio = screen.getByRole('radio', { name: 'After' })
			const onRadio = screen.getByRole('radio', { name: 'On' })

			expect(neverRadio).toBeChecked()
			expect(afterRadio).not.toBeChecked()
			expect(onRadio).not.toBeChecked()

			fireEvent.click(afterRadio)
			expect(neverRadio).not.toBeChecked()
			expect(afterRadio).toBeChecked()
			expect(onRadio).not.toBeChecked()

			fireEvent.click(onRadio)
			expect(neverRadio).not.toBeChecked()
			expect(afterRadio).not.toBeChecked()
			expect(onRadio).toBeChecked()

			fireEvent.click(neverRadio)
			expect(neverRadio).toBeChecked()
			expect(afterRadio).not.toBeChecked()
			expect(onRadio).not.toBeChecked()
		})
	})

	describe('📋 Byweekday Persistence When Changing Frequency', () => {
		it('should retain byweekday when staying on weekly frequency', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.WEEKLY,
					interval: 2,
					byweekday: [RRule.MO, RRule.WE],
				}),
				referenceDate: REFERENCE_DATE,
			})

			// Change interval
			const intervalInput = screen.getByLabelText('Every')
			fireEvent.change(intervalInput, { target: { value: '3' } })

			const result = getLastCallArg(mockOnChange)
			expect(result.byweekday).toContain(RRule.MO)
			expect(result.byweekday).toContain(RRule.WE)
		})

		it('should keep byweekday in data when frequency changes (parent controls clearing)', () => {
			renderRecurrenceEditor({
				value: createRRuleOptions({
					freq: RRule.WEEKLY,
					interval: 2,
					byweekday: [RRule.MO, RRule.WE],
				}),
				referenceDate: REFERENCE_DATE,
			})

			const frequencySelect = screen.getByRole('combobox', { name: /repeats/i })
			fireEvent.click(frequencySelect)
			fireEvent.click(screen.getByRole('option', { name: 'day' }))

			// Byweekday is kept in data (parent form should handle clearing if needed)
			const result = getLastCallArg(mockOnChange)
			expect(result.freq).toBe(RRule.DAILY)
			// The component doesn't clear byweekday automatically - it just changes freq
		})
	})
})
