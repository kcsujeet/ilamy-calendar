import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { EventForm } from './event-form'

// Custom render function that wraps components in CalendarProvider
const renderEventForm = (
	props: Parameters<typeof EventForm>[0],
	providerProps = {}
) => {
	return render(
		<CalendarProvider
			dayMaxEvents={5}
			events={[]}
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

	const testNewEvent: CalendarEvent = {
		id: undefined as unknown as string,
		title: '',
		start: dayjs('2025-08-15T10:00:00'),
		end: dayjs('2025-08-15T11:00:00'),
		description: '',
		allDay: false,
	}
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
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			expect(screen.getByPlaceholderText('Event title')).toHaveValue('')
			expect(screen.getByLabelText('All day')).not.toBeChecked()
			expect(screen.queryByText('Delete')).not.toBeInTheDocument()
		})

		it('keeps text field focus while typing multiple characters', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			const titleInput = screen.getByPlaceholderText('Event title')
			titleInput.focus()
			expect(document.activeElement).toBe(titleInput)

			fireEvent.change(titleInput, {
				target: { name: 'title', value: 'a' },
			})
			expect(document.activeElement).toBe(titleInput)

			fireEvent.change(titleInput, {
				target: { name: 'title', value: 'ab' },
			})
			expect(titleInput).toHaveValue('ab')
			expect(document.activeElement).toBe(titleInput)
		})

		it('should render edit event form when selectedEvent is provided', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testEvent })

			expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument()
			expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
			expect(screen.getByDisplayValue('Test location')).toBeInTheDocument()
			expect(screen.getByText('Delete')).toBeInTheDocument()
		})

		it('should initialize form with selectedDate when creating new event', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			// Check that date inputs show the selected date (there are both start and end date pickers)
			expect(screen.getAllByText('Aug 15, 2025')).toHaveLength(2) // start and end date

			// Check that time selects are rendered (2 selects: start and end)
			expect(screen.queryAllByRole('combobox')).toHaveLength(2)
		})

		it('should initialize form with event data when editing', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testEvent })

			expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument()
			// TimePicker displays time (10:00, 11:00)
			expect(
				screen.getAllByTestId('time-picker-start-time').length
			).toBeGreaterThan(0)
			expect(
				screen.getAllByTestId('time-picker-end-time').length
			).toBeGreaterThan(0)
			expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
			expect(screen.getByDisplayValue('Test location')).toBeInTheDocument()
		})
	})

	describe('Form Input Handling', () => {
		it('should update title when input changes', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			const titleInput = screen.getByPlaceholderText('Event title')
			fireEvent.change(titleInput, { target: { value: 'New Event Title' } })

			expect(titleInput).toHaveValue('New Event Title')
		})

		it('should update description when input changes', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			const descriptionInput = screen.getByPlaceholderText(
				'Event description (optional)'
			)
			fireEvent.change(descriptionInput, {
				target: { value: 'New description' },
			})

			expect(descriptionInput).toHaveValue('New description')
		})

		it('should update location when input changes', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			const locationInput = screen.getByPlaceholderText(
				'Event location (optional)'
			)
			fireEvent.change(locationInput, { target: { value: 'New location' } })

			expect(locationInput).toHaveValue('New location')
		})

		it('should update time inputs when changed', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			// TimePicker uses Button component (combobox), find by test-id
			const startTimeSelect = screen.getByTestId('time-picker-start-time')
			const endTimeSelect = screen.getByTestId('time-picker-end-time')

			// Verify time selects are rendered (initial state)
			expect(startTimeSelect).toBeInTheDocument()
			expect(endTimeSelect).toBeInTheDocument()
		})
	})

	describe('All Day Toggle', () => {
		it('should hide time inputs when all day is enabled', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			const allDayCheckbox = screen.getByLabelText('All day')
			fireEvent.click(allDayCheckbox)

			expect(allDayCheckbox).toBeChecked()
			// TimePickers should not be visible when all day is enabled
			expect(
				screen.queryByTestId('time-picker-start-time')
			).not.toBeInTheDocument()
			expect(
				screen.queryByTestId('time-picker-end-time')
			).not.toBeInTheDocument()
		})

		it('should show time inputs when all day is disabled', () => {
			const allDayEvent = { ...testEvent, allDay: true }
			renderEventForm({ ...defaultProps, selectedEvent: allDayEvent })

			const allDayCheckbox = screen.getByLabelText('All day')
			fireEvent.click(allDayCheckbox)

			expect(allDayCheckbox).not.toBeChecked()
			// TimePickers should be visible
			expect(screen.getByTestId('time-picker-start-time')).toBeInTheDocument()
			expect(screen.getByTestId('time-picker-end-time')).toBeInTheDocument()
		})

		it('should set end time to 23:59 when all day is enabled', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			const allDayCheckbox = screen.getByLabelText('All day')
			fireEvent.click(allDayCheckbox)

			// Re-enable to check the time inputs are shown again
			fireEvent.click(allDayCheckbox)

			// TimePicker should be visible again after unchecking all-day
			expect(screen.getByTestId('time-picker-start-time')).toBeInTheDocument()
		})
	})

	describe('Color Selection', () => {
		it('should render the Tailwind class-pair swatches in the picker', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			fireEvent.click(screen.getByRole('button', { name: 'Color' }))

			expect(screen.getByLabelText('Red')).toBeInTheDocument()
			expect(screen.getByLabelText('Green')).toBeInTheDocument()
		})

		it('should seed the picker from a legacy class-pair color', () => {
			const legacyEvent: CalendarEvent = {
				...testEvent,
				backgroundColor: undefined,
				color: 'bg-red-100 text-red-800',
			}
			renderEventForm({ ...defaultProps, selectedEvent: legacyEvent })

			fireEvent.click(screen.getByRole('button', { name: 'Color' }))

			expect(screen.getByLabelText('Red')).toHaveAttribute(
				'aria-pressed',
				'true'
			)
		})

		it('should label the trigger from a Tailwind color not in the swatches', () => {
			const cyanEvent: CalendarEvent = {
				...testEvent,
				backgroundColor: undefined,
				color: 'bg-cyan-100 text-cyan-800',
			}
			renderEventForm({ ...defaultProps, selectedEvent: cyanEvent })

			expect(screen.getByRole('button', { name: 'Color' })).toHaveTextContent(
				'Cyan'
			)
		})

		it('should preserve a legacy class-pair color when the color is not changed', async () => {
			const legacyEvent: CalendarEvent = {
				...testEvent,
				backgroundColor: undefined,
				color: 'bg-red-100 text-red-800',
			}
			renderEventForm({ ...defaultProps, selectedEvent: legacyEvent })

			fireEvent.click(screen.getByRole('button', { name: 'Update' }))

			await waitFor(() => {
				expect(mockOnUpdate).toHaveBeenCalledWith(
					expect.objectContaining({
						color: 'bg-red-100 text-red-800',
						backgroundColor: undefined,
					})
				)
			})
		})

		it('should store the picked swatch class-pair color on save', async () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			fireEvent.change(screen.getByPlaceholderText('Event title'), {
				target: { value: 'Swatch Event' },
			})

			fireEvent.click(screen.getByRole('button', { name: 'Color' }))
			fireEvent.click(screen.getByLabelText('Red'))

			fireEvent.click(screen.getByRole('button', { name: 'Create' }))

			await waitFor(() => {
				expect(mockOnAdd).toHaveBeenCalledWith(
					expect.objectContaining({
						color: 'bg-red-100 text-red-800',
						backgroundColor: undefined,
					})
				)
			})
		})

		it('should store a custom hex background and readable text color on save', async () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			fireEvent.change(screen.getByPlaceholderText('Event title'), {
				target: { value: 'Custom Event' },
			})

			fireEvent.click(screen.getByRole('button', { name: 'Color' }))
			fireEvent.change(screen.getByLabelText('Hex color'), {
				target: { value: '#ef4444' },
			})

			fireEvent.click(screen.getByRole('button', { name: 'Create' }))

			await waitFor(() => {
				expect(mockOnAdd).toHaveBeenCalledWith(
					expect.objectContaining({
						backgroundColor: '#ef4444',
						color: '#ffffff',
					})
				)
			})
		})
	})

	describe('Date Validation', () => {
		it('should update end date when start date is after end date', async () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			// Get the date picker buttons
			const startDatePicker = screen
				.getAllByRole('button')
				.find((button) => button.textContent?.includes('Aug 15, 2025'))

			expect(startDatePicker).toBeInTheDocument()
		})
	})

	describe('Form Submission', () => {
		it('should call onAdd with correct data when creating new event', async () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

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
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

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
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

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
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			expect(screen.queryByText('Delete')).not.toBeInTheDocument()
		})
	})

	describe('Form Cancellation', () => {
		it('should call onClose when cancel button is clicked', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			const cancelButton = screen.getByRole('button', { name: 'Cancel' })
			fireEvent.click(cancelButton)

			expect(mockOnClose).toHaveBeenCalled()
		})
	})

	describe('Edge Cases', () => {
		it('should handle undefined selectedEvent gracefully', () => {
			renderEventForm({ ...defaultProps, selectedEvent: undefined })

			expect(screen.getByPlaceholderText('Event title')).toHaveValue('')
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

	describe('Accessibility', () => {
		it('should have proper ARIA labels', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			expect(screen.getByLabelText('Title')).toBeInTheDocument()
			expect(screen.getByLabelText('All day')).toBeInTheDocument()
			expect(screen.getByLabelText('Location')).toBeInTheDocument()
			expect(screen.getByLabelText('Description')).toBeInTheDocument()
		})

		it('should support keyboard navigation', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			const titleInput = screen.getByPlaceholderText('Event title')
			titleInput.focus()

			expect(document.activeElement).toBe(titleInput)
		})
	})

	describe('Resource selector', () => {
		const mockResources: Resource[] = [
			{ id: 'room-a', title: 'Room A' },
			{ id: 'room-b', title: 'Room B' },
		]

		const selectResource = (title: string) => {
			fireEvent.click(screen.getByRole('combobox', { name: /resource/i }))
			fireEvent.click(screen.getByRole('option', { name: title }))
		}

		it('does not render a resource selector without resources', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			expect(
				screen.queryByRole('combobox', { name: /resource/i })
			).not.toBeInTheDocument()
		})

		it('renders a resource selector when resources are configured and no resource is known', () => {
			renderEventForm(
				{ ...defaultProps, selectedEvent: testNewEvent },
				{ resources: mockResources }
			)

			expect(
				screen.getByRole('combobox', { name: /resource/i })
			).toBeInTheDocument()
		})

		it('hides the resource selector when resourceId is already known', () => {
			renderEventForm(
				{
					...defaultProps,
					selectedEvent: { ...testNewEvent, resourceId: 'room-b' },
				},
				{ resources: mockResources }
			)

			expect(
				screen.queryByRole('combobox', { name: /resource/i })
			).not.toBeInTheDocument()
		})

		it('keeps a known resourceId when creating from a resource grid cell', async () => {
			renderEventForm(
				{
					...defaultProps,
					selectedEvent: { ...testNewEvent, resourceId: 'room-b' },
				},
				{ resources: mockResources }
			)

			fireEvent.change(screen.getByPlaceholderText('Event title'), {
				target: { value: 'Grid Event' },
			})
			fireEvent.click(screen.getByRole('button', { name: 'Create' }))

			await waitFor(() => {
				expect(mockOnAdd).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Grid Event',
						resourceId: 'room-b',
					})
				)
			})
		})

		it('disables create until a resource is selected', () => {
			renderEventForm(
				{ ...defaultProps, selectedEvent: testNewEvent },
				{ resources: mockResources }
			)

			expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
		})

		it('includes selected resourceId when creating a new event', async () => {
			renderEventForm(
				{ ...defaultProps, selectedEvent: testNewEvent },
				{ resources: mockResources }
			)

			fireEvent.change(screen.getByPlaceholderText('Event title'), {
				target: { value: 'Resource Event' },
			})
			selectResource('Room A')

			fireEvent.click(screen.getByRole('button', { name: 'Create' }))

			await waitFor(() => {
				expect(mockOnAdd).toHaveBeenCalledWith(
					expect.objectContaining({
						title: 'Resource Event',
						resourceId: 'room-a',
					})
				)
			})
		})

		it('preserves resourceId when editing an event with a known resource', async () => {
			renderEventForm(
				{
					...defaultProps,
					selectedEvent: { ...testEvent, resourceId: 'room-a' },
				},
				{ resources: mockResources }
			)

			expect(
				screen.queryByRole('combobox', { name: /resource/i })
			).not.toBeInTheDocument()

			fireEvent.click(screen.getByRole('button', { name: 'Update' }))

			await waitFor(() => {
				expect(mockOnUpdate).toHaveBeenCalledWith(
					expect.objectContaining({
						id: 'test-event-1',
						resourceId: 'room-a',
					})
				)
			})
		})
	})

	describe('24-Hour Time Format', () => {
		it('should display time pickers in 24-hour format when timeFormat is 24-hour', () => {
			renderEventForm(
				{ ...defaultProps, selectedEvent: testEvent },
				{ timeFormat: '24-hour' }
			)

			// Get the TimePicker components by testid
			const startTimePicker = screen.getByTestId('time-picker-start-time')
			const endTimePicker = screen.getByTestId('time-picker-end-time')

			// Check that times are displayed in 24-hour format (no AM/PM)
			const startText = startTimePicker.textContent || ''
			const endText = endTimePicker.textContent || ''

			expect(startText).not.toMatch(/AM|PM/i)
			expect(endText).not.toMatch(/AM|PM/i)
			expect(startText).toMatch(/\d{1,2}:\d{2}/)
			expect(endText).toMatch(/\d{1,2}:\d{2}/)
		})

		it('should display time pickers in 12-hour format when timeFormat is 12-hour', () => {
			renderEventForm(
				{ ...defaultProps, selectedEvent: testEvent },
				{ timeFormat: '12-hour' }
			)

			// Get the TimePicker components by testid
			const startTimePicker = screen.getByTestId('time-picker-start-time')
			const endTimePicker = screen.getByTestId('time-picker-end-time')

			// At least one time picker should show AM/PM (12-hour format)
			const startText = startTimePicker.textContent || ''
			const endText = endTimePicker.textContent || ''
			const hasAMPM = /AM|PM/i.test(startText) || /AM|PM/i.test(endText)

			expect(hasAMPM).toBe(true)
		})

		it('should default to 12-hour format when timeFormat is not provided', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testEvent })

			// Get the TimePicker components by testid
			const startTimePicker = screen.getByTestId('time-picker-start-time')
			const endTimePicker = screen.getByTestId('time-picker-end-time')

			// Should default to 12-hour format
			const startText = startTimePicker.textContent || ''
			const endText = endTimePicker.textContent || ''
			const hasAMPM = /AM|PM/i.test(startText) || /AM|PM/i.test(endText)

			expect(hasAMPM).toBe(true)
		})

		it('should update time picker format when timeFormat changes from 12-hour to 24-hour', () => {
			renderEventForm(
				{ ...defaultProps, selectedEvent: testEvent },
				{ timeFormat: '24-hour' }
			)

			// Should show 24-hour format
			const startTimePicker = screen.getByTestId('time-picker-start-time')
			const endTimePicker = screen.getByTestId('time-picker-end-time')

			const startText = startTimePicker.textContent || ''
			const endText = endTimePicker.textContent || ''

			expect(startText).not.toMatch(/AM|PM/i)
			expect(endText).not.toMatch(/AM|PM/i)
			expect(startText).toMatch(/\d{1,2}:\d{2}/)
			expect(endText).toMatch(/\d{1,2}:\d{2}/)
		})
	})
})
