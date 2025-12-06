import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { EventFormProps } from '@/components/event-form/event-form'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { IlamyCalendar } from './ilamy-calendar'

const CustomEventForm = (props: EventFormProps) => {
	return (
		<div data-testid="custom-event-form">
			<span data-testid="form-open">{props.open ? 'open' : 'closed'}</span>
			<span data-testid="selected-event-title">
				{props.selectedEvent?.title || 'none'}
			</span>
			<span data-testid="selected-event-id">
				{props.selectedEvent?.id || 'no-id'}
			</span>
			<button
				data-testid="add-event-btn"
				onClick={() =>
					props.onAdd?.({
						id: 'new-event-1',
						title: 'New Event From Custom Form',
						start: dayjs('2025-01-15T14:00:00.000Z'),
						end: dayjs('2025-01-15T15:00:00.000Z'),
					})
				}
			>
				Add Event
			</button>
			<button
				data-testid="update-event-btn"
				onClick={() =>
					props.onUpdate?.({
						...props.selectedEvent!,
						title: 'Updated Event Title',
					})
				}
			>
				Update Event
			</button>
			<button
				data-testid="delete-event-btn"
				onClick={() => props.onDelete?.(props.selectedEvent!)}
			>
				Delete Event
			</button>
			<button data-testid="close-form-btn" onClick={props.onClose}>
				Close
			</button>
		</div>
	)
}

describe('IlamyCalendar', () => {
	describe('renderEventForm', () => {
		const createEvent = (
			overrides: Partial<CalendarEvent> = {}
		): CalendarEvent => ({
			id: `event-${Date.now()}`,
			title: 'Test Event',
			start: dayjs('2025-01-15T10:00:00.000Z'),
			end: dayjs('2025-01-15T11:00:00.000Z'),
			...overrides,
		})

		const mockOnEventAdd = mock(() => {})
		const mockOnEventUpdate = mock(() => {})
		const mockOnEventDelete = mock(() => {})

		beforeEach(() => {
			mockOnEventAdd.mockClear()
			mockOnEventUpdate.mockClear()
			mockOnEventDelete.mockClear()
		})

		describe('props passed to custom form', () => {
			it('should render custom event form when renderEventForm is provided', () => {
				render(
					<IlamyCalendar
						events={[]}
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => <CustomEventForm {...props} />}
					/>
				)

				// Custom form should always be rendered (controls visibility via open prop)
				expect(screen.getByTestId('custom-event-form')).toBeInTheDocument()
			})

			it('should pass open=false when form is not open', () => {
				render(
					<IlamyCalendar
						events={[]}
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => <CustomEventForm {...props} />}
					/>
				)

				expect(screen.getByTestId('form-open')).toHaveTextContent('closed')
			})

			it('should pass open=true and selectedEvent when cell is clicked', async () => {
				render(
					<IlamyCalendar
						events={[]}
						initialView="month"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => <CustomEventForm {...props} />}
					/>
				)

				// Click on a specific day cell using correct testid format
				const dayCell = screen.getByTestId('day-cell-2025-01-15')
				fireEvent.click(dayCell)

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				// selectedEvent should have a title (new event)
				expect(
					screen.getByTestId('selected-event-title')
				).not.toHaveTextContent('none')
			})

			it('should pass selectedEvent with event data when existing event is clicked', async () => {
				const existingEvent = createEvent({
					id: 'existing-1',
					title: 'Existing Event',
					start: dayjs('2025-01-15T10:00:00.000Z'),
					end: dayjs('2025-01-15T11:00:00.000Z'),
				})

				render(
					<IlamyCalendar
						events={[existingEvent]}
						initialView="month"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => <CustomEventForm {...props} />}
					/>
				)

				// Find and click the event
				const eventElement = screen.getByText('Existing Event')
				fireEvent.click(eventElement)

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				expect(screen.getByTestId('selected-event-title')).toHaveTextContent(
					'Existing Event'
				)
				expect(screen.getByTestId('selected-event-id')).toHaveTextContent(
					'existing-1'
				)
			})

			it('should provide onClose that closes the form', async () => {
				render(
					<IlamyCalendar
						events={[]}
						initialView="month"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => <CustomEventForm {...props} />}
					/>
				)

				// Open form by clicking a cell
				const dayCell = screen.getByTestId('day-cell-2025-01-15')
				fireEvent.click(dayCell)

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				// Close the form
				fireEvent.click(screen.getByTestId('close-form-btn'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('closed')
				})
			})
		})

		describe('onAdd', () => {
			it('should add event to calendar when onAdd is called', async () => {
				render(
					<IlamyCalendar
						events={[]}
						initialView="month"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => <CustomEventForm {...props} />}
						onEventAdd={mockOnEventAdd}
					/>
				)

				// Open form
				const dayCell = screen.getByTestId('day-cell-2025-01-15')
				fireEvent.click(dayCell)

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				// Add event using custom form
				fireEvent.click(screen.getByTestId('add-event-btn'))

				// Event should appear on calendar
				await waitFor(() => {
					expect(
						screen.getByText('New Event From Custom Form')
					).toBeInTheDocument()
				})

				// Callback should be called
				expect(mockOnEventAdd).toHaveBeenCalledTimes(1)
				expect(mockOnEventAdd).toHaveBeenCalledWith(
					expect.objectContaining({
						id: 'new-event-1',
						title: 'New Event From Custom Form',
					})
				)
			})

			it('should add multiple events', async () => {
				let addEventFn: EventFormProps['onAdd']

				render(
					<IlamyCalendar
						events={[]}
						initialView="month"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => {
							addEventFn = props.onAdd
							return <CustomEventForm {...props} />
						}}
					/>
				)

				// Open form
				const dayCell = screen.getByTestId('day-cell-2025-01-15')
				fireEvent.click(dayCell)

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				// Add first event
				addEventFn?.({
					id: 'event-1',
					title: 'First Event',
					start: dayjs('2025-01-15T10:00:00.000Z'),
					end: dayjs('2025-01-15T11:00:00.000Z'),
				})

				// Add second event
				addEventFn?.({
					id: 'event-2',
					title: 'Second Event',
					start: dayjs('2025-01-16T10:00:00.000Z'),
					end: dayjs('2025-01-16T11:00:00.000Z'),
				})

				await waitFor(() => {
					expect(screen.getByText('First Event')).toBeInTheDocument()
					expect(screen.getByText('Second Event')).toBeInTheDocument()
				})
			})
		})

		describe('onUpdate', () => {
			it('should update event in calendar when onUpdate is called', async () => {
				const existingEvent = createEvent({
					id: 'update-test-1',
					title: 'Original Title',
					start: dayjs('2025-01-15T10:00:00.000Z'),
					end: dayjs('2025-01-15T11:00:00.000Z'),
				})

				render(
					<IlamyCalendar
						events={[existingEvent]}
						initialView="month"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => <CustomEventForm {...props} />}
						onEventUpdate={mockOnEventUpdate}
					/>
				)

				// Verify original event is shown
				expect(screen.getByText('Original Title')).toBeInTheDocument()

				// Click event to open form
				fireEvent.click(screen.getByText('Original Title'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
					expect(screen.getByTestId('selected-event-id')).toHaveTextContent(
						'update-test-1'
					)
				})

				// Update event using custom form
				fireEvent.click(screen.getByTestId('update-event-btn'))

				// Event should be updated on calendar - check that new title appears
				await waitFor(() => {
					expect(screen.getByText('Updated Event Title')).toBeInTheDocument()
				})

				// Callback should be called with correct data
				expect(mockOnEventUpdate).toHaveBeenCalledTimes(1)
				expect(mockOnEventUpdate).toHaveBeenCalledWith(
					expect.objectContaining({
						id: 'update-test-1',
						title: 'Updated Event Title',
					})
				)
			})

			it('should preserve other event properties when updating', async () => {
				const existingEvent = createEvent({
					id: 'preserve-test-1',
					title: 'Event With Details',
					description: 'Important description',
					location: 'Meeting Room A',
					color: 'bg-blue-100 text-blue-800',
					start: dayjs('2025-01-15T10:00:00.000Z'),
					end: dayjs('2025-01-15T11:00:00.000Z'),
				})

				let updateFn: EventFormProps['onUpdate']

				render(
					<IlamyCalendar
						events={[existingEvent]}
						initialView="month"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => {
							updateFn = props.onUpdate
							return <CustomEventForm {...props} />
						}}
						onEventUpdate={mockOnEventUpdate}
					/>
				)

				// Click event to open form
				fireEvent.click(screen.getByText('Event With Details'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				// Update only the title
				updateFn?.({
					...existingEvent,
					title: 'New Title Only',
				})

				// Callback should have all original properties plus new title
				await waitFor(() => {
					expect(mockOnEventUpdate).toHaveBeenCalledWith(
						expect.objectContaining({
							id: 'preserve-test-1',
							title: 'New Title Only',
							description: 'Important description',
							location: 'Meeting Room A',
							color: 'bg-blue-100 text-blue-800',
						})
					)
				})
			})
		})

		describe('onDelete', () => {
			it('should call onDelete callback with event data', async () => {
				const existingEvent = createEvent({
					id: 'delete-test-1',
					title: 'Event To Delete',
					start: dayjs('2025-01-15T10:00:00.000Z'),
					end: dayjs('2025-01-15T11:00:00.000Z'),
				})

				render(
					<IlamyCalendar
						events={[existingEvent]}
						initialView="month"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => <CustomEventForm {...props} />}
						onEventDelete={mockOnEventDelete}
					/>
				)

				// Verify event is shown on calendar
				expect(screen.getByText('Event To Delete')).toBeInTheDocument()

				// Click event to open form
				fireEvent.click(screen.getByText('Event To Delete'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				// Delete event using custom form
				fireEvent.click(screen.getByTestId('delete-event-btn'))

				// Callback should be called with correct data
				expect(mockOnEventDelete).toHaveBeenCalledTimes(1)
				expect(mockOnEventDelete).toHaveBeenCalledWith(
					expect.objectContaining({
						id: 'delete-test-1',
						title: 'Event To Delete',
					})
				)
			})

			it('should remove event from DOM after delete', async () => {
				const existingEvent = createEvent({
					id: 'delete-test-2',
					title: 'DeleteMe',
					start: dayjs('2025-01-15T10:00:00.000Z'),
					end: dayjs('2025-01-15T11:00:00.000Z'),
				})

				render(
					<IlamyCalendar
						events={[existingEvent]}
						initialView="month"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => <CustomEventForm {...props} />}
					/>
				)

				// Verify event exists
				expect(screen.getByText('DeleteMe')).toBeInTheDocument()

				// Click event to open form
				fireEvent.click(screen.getByText('DeleteMe'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				// Delete event
				fireEvent.click(screen.getByTestId('delete-event-btn'))

				// Event should be removed (only custom form's selected-event-title might have it)
				// Close the form first to clear the selected event
				fireEvent.click(screen.getByTestId('close-form-btn'))

				await waitFor(() => {
					// After closing form, the event text should not appear anywhere
					const monthView = screen.getByTestId('month-view')
					expect(monthView).not.toHaveTextContent('DeleteMe')
				})
			})
		})

		describe('integration with calendar views', () => {
			it('should show added events in week view', async () => {
				let addEventFn: EventFormProps['onAdd']

				render(
					<IlamyCalendar
						events={[]}
						initialView="week"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => {
							addEventFn = props.onAdd
							return <CustomEventForm {...props} />
						}}
					/>
				)

				// Wait for week view to render
				await waitFor(() => {
					expect(screen.getByTestId('week-view')).toBeInTheDocument()
				})

				// Add event directly via captured function
				addEventFn?.({
					id: 'week-event-1',
					title: 'Week View Event',
					start: dayjs('2025-01-15T10:00:00.000Z'),
					end: dayjs('2025-01-15T11:00:00.000Z'),
				})

				await waitFor(() => {
					expect(screen.getByText('Week View Event')).toBeInTheDocument()
				})
			})

			it('should show added events in day view', async () => {
				let addEventFn: EventFormProps['onAdd']

				render(
					<IlamyCalendar
						events={[]}
						initialView="day"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => {
							addEventFn = props.onAdd
							return <CustomEventForm {...props} />
						}}
					/>
				)

				// Wait for day view to render
				await waitFor(() => {
					expect(screen.getByTestId('day-view')).toBeInTheDocument()
				})

				// Add event directly
				addEventFn?.({
					id: 'day-event-1',
					title: 'Day View Event',
					start: dayjs('2025-01-15T10:00:00.000Z'),
					end: dayjs('2025-01-15T11:00:00.000Z'),
				})

				await waitFor(() => {
					expect(screen.getByText('Day View Event')).toBeInTheDocument()
				})
			})

			it('should persist events when switching views', async () => {
				let addEventFn: EventFormProps['onAdd']

				render(
					<IlamyCalendar
						events={[]}
						initialView="month"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
						renderEventForm={(props) => {
							addEventFn = props.onAdd
							return <CustomEventForm {...props} />
						}}
					/>
				)

				// Wait for form function to be captured
				await waitFor(() => {
					expect(addEventFn).toBeDefined()
				})

				// Add event
				addEventFn?.({
					id: 'persist-event',
					title: 'Persistent Event',
					start: dayjs('2025-01-15T10:00:00.000Z'),
					end: dayjs('2025-01-15T11:00:00.000Z'),
				})

				await waitFor(() => {
					expect(screen.getByText('Persistent Event')).toBeInTheDocument()
				})

				// Get all buttons and find the exact "Week" button
				const weekButtons = screen.getAllByRole('button', { name: /^week$/i })
				fireEvent.click(weekButtons[0])

				await waitFor(() => {
					expect(screen.getByTestId('week-view')).toBeInTheDocument()
				})

				// Event should still be visible
				expect(screen.getByText('Persistent Event')).toBeInTheDocument()

				// Find exact "Day" button
				const dayButtons = screen.getAllByRole('button', { name: /^day$/i })
				fireEvent.click(dayButtons[0])

				await waitFor(() => {
					expect(screen.getByTestId('day-view')).toBeInTheDocument()
				})

				// Event should still be visible
				expect(screen.getByText('Persistent Event')).toBeInTheDocument()
			})
		})

		describe('default EventForm fallback', () => {
			it('should use default EventForm when renderEventForm is not provided', async () => {
				render(
					<IlamyCalendar
						events={[]}
						initialView="month"
						initialDate={dayjs('2025-01-15T00:00:00.000Z')}
					/>
				)

				// Custom form should not be present
				expect(
					screen.queryByTestId('custom-event-form')
				).not.toBeInTheDocument()

				// Click a cell to open form
				const dayCell = screen.getByTestId('day-cell-2025-01-15')
				fireEvent.click(dayCell)

				// Default form should appear (has "Create Event" title)
				await waitFor(() => {
					expect(screen.getByText('Create Event')).toBeInTheDocument()
				})
			})
		})
	})

	describe('custom disabled state classesOverride', () => {
		it('should apply default disabled state classes when no custom className is provided', async () => {
			render(
				<IlamyCalendar
					events={[]}
					initialView="month"
					initialDate={dayjs('2025-01-15T00:00:00.000Z')}
					businessHours={{
						daysOfWeek: [
							'monday',
							'tuesday',
							'wednesday',
							'thursday',
							'friday',
						],
						startTime: 9,
						endTime: 17,
					}}
				/>
			)

			await waitFor(() => {
				expect(screen.getByTestId('month-view')).toBeInTheDocument()
			})

			// Find a Saturday cell (non-business day) - should have default disabled styling
			const saturdayCell = screen.getByTestId('day-cell-2025-01-18')
			expect(saturdayCell).toHaveClass('bg-secondary')
			expect(saturdayCell).toHaveClass('text-muted-foreground')
		})

		it('should apply custom disabledCell className when provided', async () => {
			render(
				<IlamyCalendar
					events={[]}
					initialView="month"
					initialDate={dayjs('2025-01-15T00:00:00.000Z')}
					businessHours={{
						daysOfWeek: [
							'monday',
							'tuesday',
							'wednesday',
							'thursday',
							'friday',
						],
						startTime: 9,
						endTime: 17,
					}}
					classesOverride={{
						disabledCell: 'bg-gray-100 text-gray-400 cursor-not-allowed',
					}}
				/>
			)

			await waitFor(() => {
				expect(screen.getByTestId('month-view')).toBeInTheDocument()
			})

			// Find a Saturday cell (non-business day)
			const saturdayCell = screen.getByTestId('day-cell-2025-01-18')
			expect(saturdayCell).toHaveClass('bg-gray-100')
			expect(saturdayCell).toHaveClass('text-gray-400')
			expect(saturdayCell).toHaveClass('cursor-not-allowed')
			// Should NOT have default classes
			expect(saturdayCell).not.toHaveClass('bg-secondary')
			expect(saturdayCell).not.toHaveClass('text-muted-foreground')
		})

		it('should apply custom disabledCell className in week view', async () => {
			render(
				<IlamyCalendar
					events={[]}
					initialView="week"
					initialDate={dayjs('2025-01-15T00:00:00.000Z')}
					businessHours={{
						daysOfWeek: [
							'monday',
							'tuesday',
							'wednesday',
							'thursday',
							'friday',
						],
						startTime: 9,
						endTime: 17,
					}}
					classesOverride={{
						disabledCell: 'bg-red-50 text-red-300',
					}}
				/>
			)

			await waitFor(() => {
				expect(screen.getByTestId('week-view')).toBeInTheDocument()
			})

			// Find a time cell outside business hours (e.g., 8 AM)
			// Week view uses time cells with format: week-time-cell-{date}-{hour}
			const nonBusinessTimeCell = screen.getByTestId(
				'week-time-cell-2025-01-13-08'
			)
			expect(nonBusinessTimeCell).toHaveClass('bg-red-50')
			expect(nonBusinessTimeCell).toHaveClass('text-red-300')
			// Should NOT have default classes
			expect(nonBusinessTimeCell).not.toHaveClass('bg-secondary')
			expect(nonBusinessTimeCell).not.toHaveClass('text-muted-foreground')
		})

		it('should apply custom disabledCell className in day view', async () => {
			render(
				<IlamyCalendar
					events={[]}
					initialView="day"
					initialDate={dayjs('2025-01-15T00:00:00.000Z')}
					businessHours={{
						daysOfWeek: [
							'monday',
							'tuesday',
							'wednesday',
							'thursday',
							'friday',
						],
						startTime: 9,
						endTime: 17,
					}}
					classesOverride={{
						disabledCell: 'bg-yellow-50 text-yellow-300',
					}}
				/>
			)

			await waitFor(() => {
				expect(screen.getByTestId('day-view')).toBeInTheDocument()
			})

			// Find a time cell outside business hours (e.g., 8:00 AM)
			// Day view uses time cells with format: day-time-cell-{hour}-{minute}
			const nonBusinessTimeCell = screen.getByTestId('day-time-cell-08-00')
			expect(nonBusinessTimeCell).toHaveClass('bg-yellow-50')
			expect(nonBusinessTimeCell).toHaveClass('text-yellow-300')
			// Should NOT have default classes
			expect(nonBusinessTimeCell).not.toHaveClass('bg-secondary')
			expect(nonBusinessTimeCell).not.toHaveClass('text-muted-foreground')
		})
	})
})
