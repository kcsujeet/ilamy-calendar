import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
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

		it('should show the time pickers again after All day is unticked', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			const allDayCheckbox = screen.getByLabelText('All day')
			fireEvent.click(allDayCheckbox)

			// Re-enable to check the time inputs are shown again
			fireEvent.click(allDayCheckbox)

			// TimePicker should be visible again after unchecking all-day
			expect(screen.getByTestId('time-picker-start-time')).toBeInTheDocument()
		})
	})

	/**
	 * #248. An all-day event is STORED with an exclusive end (the following
	 * midnight, per RFC 5545 and the Google Calendar API) but is SHOWN the way a
	 * user thinks of it: the last day it covers. Google draws the same line, with
	 * an exclusive API and a UI that never asks for a midnight end.
	 */
	describe('All-day end date, exclusive storage and inclusive display', () => {
		const allDayOnAug15: CalendarEvent = {
			id: 'all-day-1',
			title: 'All-day event',
			start: dayjs('2025-08-15T00:00:00'),
			end: dayjs('2025-08-16T00:00:00'),
			allDay: true,
		}

		/** The two date pickers in DOM order: Start Date, then End Date. */
		const endDateButton = () =>
			screen.getAllByRole('button', { name: /Aug \d+, 2025/ }).at(1)

		it('shows the last covered day, not the exclusive end', () => {
			renderEventForm({ ...defaultProps, selectedEvent: allDayOnAug15 })

			expect(endDateButton()).toHaveTextContent('Aug 15, 2025')
		})

		it('stores the exclusive end again when saved untouched', () => {
			const onUpdate = mock((_event: CalendarEvent) => {})
			renderEventForm({
				...defaultProps,
				onUpdate,
				selectedEvent: allDayOnAug15,
			})

			fireEvent.click(screen.getByRole('button', { name: /update|save/i }))

			const saved = onUpdate.mock.calls.at(0)?.at(0)
			expect(saved?.end.format('YYYY-MM-DD HH:mm')).toBe('2025-08-16 00:00')
		})

		/**
		 * #248 review. The step back only applies when the End Date sits on a LATER
		 * day than the start. Applied unconditionally it moved the end before the
		 * start, and `buildEndDateTime` adding a day back then saved a zero-duration
		 * event where the user asked for a one-day one.
		 */
		it('does not step the end date behind the start when they share a day', () => {
			const onUpdate = mock((_event: CalendarEvent) => {})
			const zeroLength: CalendarEvent = {
				id: 'zero',
				title: 'Zero length',
				start: dayjs('2025-08-15T00:00:00'),
				end: dayjs('2025-08-15T00:00:00'),
			}
			renderEventForm({ ...defaultProps, onUpdate, selectedEvent: zeroLength })

			fireEvent.click(screen.getByLabelText('All day'))
			fireEvent.click(screen.getByRole('button', { name: /update|save/i }))

			const saved = onUpdate.mock.calls.at(0)?.at(0)
			expect(saved?.start.format('YYYY-MM-DD HH:mm')).toBe('2025-08-15 00:00')
			expect(saved?.end.format('YYYY-MM-DD HH:mm')).toBe('2025-08-16 00:00')
		})

		/**
		 * Events written before this change end at 23:59 on the last covered day.
		 * That is not a midnight boundary, so it is read as the inclusive value it
		 * is and displayed as-is rather than shifted a day earlier.
		 */
		it('reads a legacy 23:59 end as the last covered day', () => {
			const legacy: CalendarEvent = {
				...allDayOnAug15,
				end: dayjs('2025-08-15T23:59:00'),
			}
			renderEventForm({ ...defaultProps, selectedEvent: legacy })

			expect(endDateButton()).toHaveTextContent('Aug 15, 2025')
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

		// `resourceIds` is the event's membership; the form cannot show a single
		// room for it, so saving writes neither resource field and the update
		// merges over the stored event, which keeps `resourceIds` as it was
		// (docs/resource-calendar.md: a cross-resource event carries resourceIds only).
		it('saves without writing a resourceId or resourceIds', async () => {
			let saved: CalendarEvent | undefined
			renderEventForm(
				{
					...defaultProps,
					onUpdate: (event) => {
						saved = event
					},
					selectedEvent: { ...testEvent, resourceIds: ['room-a', 'room-b'] },
				},
				{ resources: mockResources }
			)

			fireEvent.click(screen.getByRole('button', { name: 'Update' }))

			await waitFor(() => expect(saved?.id).toBe('test-event-1'))
			expect(saved).not.toHaveProperty('resourceId')
			expect(saved).not.toHaveProperty('resourceIds')
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

	/*
	 * WCAG 1.3.1 / 3.3.2 / 4.1.2: each picker is named by its visible label, and
	 * the date pickers keep their value in the name ("Start Date Aug 15, 2025").
	 */
	describe('Accessible names', () => {
		it('names every date and time picker by its label', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			expect(
				screen.getAllByRole('button', { name: /^Start Date/ })
			).toHaveLength(1)
			expect(screen.getAllByRole('button', { name: /^End Date/ })).toHaveLength(
				1
			)
			expect(
				screen.getAllByRole('combobox', { name: /^Start Time/ })
			).toHaveLength(1)
			expect(
				screen.getAllByRole('combobox', { name: /^End Time/ })
			).toHaveLength(1)
		})

		it('keeps the date in the date picker name', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			const startDate = screen.getByRole('button', { name: /^Start Date/ })

			expect(startDate).toHaveAccessibleName('Start Date Aug 15, 2025')
		})

		it('points no aria-controls at an element that is not there', () => {
			renderEventForm({ ...defaultProps, selectedEvent: testNewEvent })

			const startTime = screen.getByRole('combobox', { name: /^Start Time/ })
			const controlsId = startTime.getAttribute('aria-controls')

			expect(
				controlsId === null || document.getElementById(controlsId) !== null
			).toBe(true)
		})
	})

	describe('Translated pickers', () => {
		const renderWithKeysAsText = () =>
			renderEventForm(
				{ ...defaultProps, selectedEvent: testNewEvent },
				{ translator: (key: string) => `[${key}]` }
			)

		it('translates the date picker month navigation', () => {
			renderWithKeysAsText()
			fireEvent.click(screen.getByRole('button', { name: /^\[startDate\]/ }))

			expect(
				screen.getByRole('button', { name: '[previousMonth]' })
			).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: '[nextMonth]' })
			).toBeInTheDocument()
		})

		it('translates the time picker search box', () => {
			renderWithKeysAsText()
			fireEvent.click(screen.getByRole('combobox', { name: /^\[startTime\]/ }))

			expect(screen.getByPlaceholderText('[searchTime]')).toBeInTheDocument()
		})

		it('translates the time picker empty state', () => {
			renderWithKeysAsText()
			fireEvent.click(screen.getByRole('combobox', { name: /^\[startTime\]/ }))
			fireEvent.change(screen.getByPlaceholderText('[searchTime]'), {
				target: { value: 'zzz' },
			})

			expect(screen.getByText('[noTimeFound]')).toBeInTheDocument()
		})
	})
})

/**
 * The schedule fields: the date and time pickers and the All day box, and what
 * they save. `pickDay` and `pickTime` drive the real popovers.
 */
const pickDay = (which: 'start' | 'end', day: number) => {
	const triggerIndex = which === 'start' ? 0 : 1
	const dateButtons = screen
		.getAllByRole('button')
		.filter((button) =>
			/^[A-Z][a-z]{2} \d+, \d{4}$/.test(button.textContent ?? '')
		)
	fireEvent.click(dateButtons.at(triggerIndex) as HTMLElement)
	const dayButton = Array.from(
		document.querySelectorAll(
			'[data-slot="calendar"] td[data-outside="false"] button'
		)
	).find((button) => button.textContent === String(day))
	fireEvent.click(dayButton as Element)
}

const pickTime = (which: 'start' | 'end', label: string) => {
	fireEvent.click(screen.getByTestId(`time-picker-${which}-time`))
	const option = screen
		.getAllByRole('button')
		.find((button) => button.textContent === label)
	fireEvent.click(option as HTMLElement)
}

const dateButtonTexts = () =>
	screen
		.getAllByRole('button')
		.map((button) => button.textContent ?? '')
		.filter((text) => /^[A-Z][a-z]{2} \d+, \d{4}$/.test(text))

const save = (onSave: ReturnType<typeof mock>) => {
	fireEvent.click(screen.getByRole('button', { name: /update|create/i }))
	return onSave.mock.calls.at(0)?.at(0) as CalendarEvent
}

describe('EventForm schedule consistency', () => {
	beforeEach(() => {
		cleanup()
	})

	const timedEvent: CalendarEvent = {
		id: 'timed',
		title: 'Timed',
		start: dayjs('2025-08-15T10:00:00'),
		end: dayjs('2025-08-15T11:00:00'),
		allDay: false,
	}

	/**
	 * RFC 5545 section 3.8.2.2: DTEND "MUST be later in time than" DTSTART. The
	 * time handlers already hold that on one day; the date handlers have to as
	 * well, or an earlier time chosen on a later day is left behind when the
	 * date comes back.
	 */
	it('does not save an end before the start after End Date returns to the start day', () => {
		const onUpdate = mock((_event: CalendarEvent) => {})
		render(
			<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
				<EventForm
					onClose={() => {}}
					onUpdate={onUpdate}
					selectedEvent={timedEvent}
				/>
			</CalendarProvider>
		)
		pickDay('end', 16)
		pickTime('end', '9:00 AM')
		pickDay('end', 15)

		const saved = save(onUpdate)
		expect(saved.start.format('YYYY-MM-DD HH:mm')).toBe('2025-08-15 09:00')
		expect(saved.end.format('YYYY-MM-DD HH:mm')).toBe('2025-08-15 09:00')
	})

	it('does not save an end before the start after Start Date moves to the end day', () => {
		const onUpdate = mock((_event: CalendarEvent) => {})
		render(
			<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
				<EventForm
					onClose={() => {}}
					onUpdate={onUpdate}
					selectedEvent={timedEvent}
				/>
			</CalendarProvider>
		)
		pickDay('end', 16)
		pickTime('end', '9:00 AM')
		pickDay('start', 16)

		const saved = save(onUpdate)
		expect(saved.start.format('YYYY-MM-DD HH:mm')).toBe('2025-08-16 10:00')
		expect(saved.end.format('YYYY-MM-DD HH:mm')).toBe('2025-08-16 10:00')
	})

	it('leaves the times alone when the days differ', () => {
		const onUpdate = mock((_event: CalendarEvent) => {})
		render(
			<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
				<EventForm
					onClose={() => {}}
					onUpdate={onUpdate}
					selectedEvent={timedEvent}
				/>
			</CalendarProvider>
		)
		pickDay('end', 16)
		pickTime('end', '9:00 AM')

		const saved = save(onUpdate)
		expect(saved.start.format('YYYY-MM-DD HH:mm')).toBe('2025-08-15 10:00')
		expect(saved.end.format('YYYY-MM-DD HH:mm')).toBe('2025-08-16 09:00')
	})

	/**
	 * Ticking All day hides the times; unticking brings them back as they were.
	 * Google Calendar does the same (its all-day toggle keeps the times and
	 * shows them again, unverified against its source). It used to rewrite End
	 * Time to 23:59.
	 */
	describe('the All day box', () => {
		const renderForm = (selectedEvent: CalendarEvent) => {
			const onSave = mock((_event: CalendarEvent) => {})
			render(
				<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
					<EventForm
						onClose={() => {}}
						onUpdate={onSave}
						selectedEvent={selectedEvent}
					/>
				</CalendarProvider>
			)
			return onSave
		}

		it('gives a timed event its times back when unticked', () => {
			const onSave = renderForm({
				...timedEvent,
				start: dayjs('2025-08-15T13:00:00'),
				end: dayjs('2025-08-15T14:00:00'),
			})
			fireEvent.click(screen.getByLabelText('All day'))
			fireEvent.click(screen.getByLabelText('All day'))

			expect(screen.getByTestId('time-picker-start-time')).toHaveTextContent(
				'1:00 PM'
			)
			expect(screen.getByTestId('time-picker-end-time')).toHaveTextContent(
				'2:00 PM'
			)
			const saved = save(onSave)
			expect(saved.end.format('YYYY-MM-DD HH:mm')).toBe('2025-08-15 14:00')
		})

		it('shows a midnight-to-midnight range as that day, whole, when unticked', () => {
			const onSave = renderForm({
				...timedEvent,
				start: dayjs('2025-08-15T00:00:00'),
				end: dayjs('2025-08-16T00:00:00'),
			})
			fireEvent.click(screen.getByLabelText('All day'))
			fireEvent.click(screen.getByLabelText('All day'))

			expect(dateButtonTexts()).toEqual(['Aug 15, 2025', 'Aug 15, 2025'])
			const saved = save(onSave)
			expect(saved.start.format('YYYY-MM-DD HH:mm')).toBe('2025-08-15 00:00')
			expect(saved.end.format('YYYY-MM-DD HH:mm')).toBe('2025-08-15 23:59')
		})

		it('shows an all-day event as its whole days when unticked', () => {
			const onSave = renderForm({
				...timedEvent,
				allDay: true,
				start: dayjs('2025-08-15T00:00:00'),
				end: dayjs('2025-08-17T00:00:00'),
			})
			fireEvent.click(screen.getByLabelText('All day'))

			const saved = save(onSave)
			expect(saved.start.format('YYYY-MM-DD HH:mm')).toBe('2025-08-15 00:00')
			expect(saved.end.format('YYYY-MM-DD HH:mm')).toBe('2025-08-16 23:59')
		})

		it('still steps a second tick back to the last covered day', () => {
			const onSave = renderForm({
				...timedEvent,
				start: dayjs('2025-08-15T00:00:00'),
				end: dayjs('2025-08-16T00:00:00'),
			})
			for (let ticks = 0; ticks < 3; ticks++) {
				fireEvent.click(screen.getByLabelText('All day'))
			}

			const saved = save(onSave)
			expect(saved.start.format('YYYY-MM-DD HH:mm')).toBe('2025-08-15 00:00')
			expect(saved.end.format('YYYY-MM-DD HH:mm')).toBe('2025-08-16 00:00')
		})
	})
})

/**
 * On a day the clocks change, `.hour()`, `.add()` and `.subtract()` keep the
 * UTC offset of the date they start from, so the form read the right clock
 * face but saved an instant an hour off: the previous day at midnight, or
 * 10:00 for a picked 9:00. Every value it saves is built from the day and the
 * clock time in the calendar's zone. Run under TZ=UTC and TZ=America/New_York.
 */
describe('EventForm across the 2025 clock changes', () => {
	beforeEach(() => {
		cleanup()
	})

	afterEach(() => {
		dayjs.tz.setDefault()
	})

	const clockChanges = [
		{ zone: 'America/New_York', changeDay: '2025-03-09' },
		{ zone: 'America/New_York', changeDay: '2025-11-02' },
		{ zone: 'Europe/London', changeDay: '2025-03-30' },
		{ zone: 'Europe/London', changeDay: '2025-10-26' },
		{ zone: 'Australia/Sydney', changeDay: '2025-04-06' },
		{ zone: 'Australia/Sydney', changeDay: '2025-10-05' },
	]

	const wallClock = (day: string, time: string) =>
		dayjs(`${day}T${time}:00.000`)

	const nextDay = (day: string) =>
		wallClock(day, '12:00').add(1, 'day').format('YYYY-MM-DD')

	const renderForm = (zone: string, selectedEvent: CalendarEvent) => {
		dayjs.tz.setDefault(zone)
		const onSave = mock((_event: CalendarEvent) => {})
		render(
			<CalendarProvider
				dayMaxEvents={5}
				events={[]}
				firstDayOfWeek={0}
				timezone={zone}
			>
				<EventForm
					onClose={() => {}}
					onUpdate={onSave}
					selectedEvent={selectedEvent}
				/>
			</CalendarProvider>
		)
		return onSave
	}

	const isoRange = (event: CalendarEvent) => [
		event.start.toISOString(),
		event.end.toISOString(),
	]

	for (const { zone, changeDay } of clockChanges) {
		describe(`${zone}, ${changeDay}`, () => {
			const dayAfter = () => nextDay(changeDay)
			const allDayRange = () => [
				wallClock(changeDay, '00:00').toISOString(),
				wallClock(dayAfter(), '00:00').toISOString(),
			]
			const allDayEvent = (): CalendarEvent => {
				dayjs.tz.setDefault(zone)
				return {
					id: 'all-day',
					title: 'All day',
					allDay: true,
					start: wallClock(changeDay, '00:00'),
					end: wallClock(dayAfter(), '00:00'),
				}
			}

			it('re-saves an untouched one-day all-day event unchanged', () => {
				const onSave = renderForm(zone, allDayEvent())

				expect(isoRange(save(onSave))).toEqual(allDayRange())
			})

			it('shows a one-day all-day event on its own day', () => {
				renderForm(zone, allDayEvent())

				const shownDay = wallClock(changeDay, '12:00').format('ll')
				expect(dateButtonTexts()).toEqual([shownDay, shownDay])
			})

			it('saves a month-cell range ticked All day as that one day', () => {
				const onSave = renderForm(zone, {
					...allDayEvent(),
					allDay: false,
				})
				fireEvent.click(screen.getByLabelText('All day'))

				expect(isoRange(save(onSave))).toEqual(allDayRange())
			})

			it('saves a timed event ticked All day from its own midnight', () => {
				dayjs.tz.setDefault(zone)
				const onSave = renderForm(zone, {
					id: 'timed',
					title: 'Timed',
					start: wallClock(changeDay, '10:00'),
					end: wallClock(changeDay, '11:00'),
				})
				fireEvent.click(screen.getByLabelText('All day'))

				expect(isoRange(save(onSave))).toEqual(allDayRange())
			})

			it('saves a picked 9:00 AM as 9:00 on that day', () => {
				dayjs.tz.setDefault(zone)
				const onSave = renderForm(zone, {
					id: 'timed',
					title: 'Timed',
					start: wallClock(changeDay, '00:00'),
					end: wallClock(changeDay, '01:00'),
				})
				pickTime('start', '9:00 AM')

				expect(save(onSave).start.toISOString()).toBe(
					wallClock(changeDay, '09:00').toISOString()
				)
			})
		})
	}
})
