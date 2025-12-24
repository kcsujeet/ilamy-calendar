// No mocking - test the real CalendarDndContext

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react'
import type { EventFormProps } from '@/components/event-form/event-form'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import type { Resource } from '../../types'
import { IlamyResourceCalendar } from './ilamy-resource-calendar'

const translator = (key: string) => `Translated: ${key}`
const customRenderEvent = (event: CalendarEvent) => (
	<div data-testid={`custom-event-${event.id}`}>Custom: {event.title}</div>
)

const CustomResourceEventForm = (props: EventFormProps) => {
	const event = props.selectedEvent as CalendarEvent | null
	return (
		<div data-testid="custom-event-form">
			<span data-testid="form-open">{props.open ? 'open' : 'closed'}</span>
			<span data-testid="selected-event-title">{event?.title || 'none'}</span>
			<span data-testid="selected-event-id">{event?.id || 'no-id'}</span>
			<span data-testid="selected-event-resource-id">
				{event?.resourceId || 'no-resource'}
			</span>
			<span data-testid="selected-event-resource-ids">
				{event?.resourceIds?.join(',') || 'no-resources'}
			</span>
			<button
				data-testid="add-event-btn"
				onClick={() =>
					props.onAdd?.({
						id: 'new-resource-event-1',
						title: 'New Resource Event',
						start: dayjs('2025-08-04T14:00:00.000Z'),
						end: dayjs('2025-08-04T15:00:00.000Z'),
						resourceId: 'resource-1',
					} as CalendarEvent)
				}
			>
				Add Event
			</button>
			<button
				data-testid="add-cross-resource-event-btn"
				onClick={() =>
					props.onAdd?.({
						id: 'cross-resource-event-1',
						title: 'Cross Resource Event',
						start: dayjs('2025-08-04T14:00:00.000Z'),
						end: dayjs('2025-08-04T15:00:00.000Z'),
						resourceIds: ['resource-1', 'resource-2'],
					} as CalendarEvent)
				}
			>
				Add Cross Resource Event
			</button>
			<button
				data-testid="update-event-btn"
				onClick={() =>
					props.onUpdate?.({
						...props.selectedEvent!,
						title: 'Updated Resource Event',
					})
				}
			>
				Update Event
			</button>
			<button
				data-testid="update-event-resource-btn"
				onClick={() =>
					props.onUpdate?.({
						...props.selectedEvent!,
						resourceId: 'resource-2',
					} as CalendarEvent)
				}
			>
				Move to Resource 2
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

// Mock the export function
mock.module('@/lib/export-ical', () => ({
	downloadICalendar: mock(),
}))

describe('IlamyResourceCalendar', () => {
	const mockResources: Resource[] = [
		{
			id: 'resource-1',
			title: 'Conference Room A',
			color: '#3B82F6',
			backgroundColor: '#EFF6FF',
			position: 1,
		},
		{
			id: 'resource-2',
			title: 'Conference Room B',
			color: '#EF4444',
			backgroundColor: '#FEF2F2',
			position: 2,
		},
		{
			id: 'resource-3',
			title: 'Meeting Room C',
			color: '#10B981',
			backgroundColor: '#ECFDF5',
			position: 3,
		},
	]

	const mockEvents: CalendarEvent[] = [
		{
			id: 'event-1',
			title: 'Team Meeting',
			start: dayjs('2025-08-04T09:00:00.000Z'),
			end: dayjs('2025-08-04T10:00:00.000Z'),
			uid: 'event-1@ilamy.calendar',
			resourceId: 'resource-1',
		},
		{
			id: 'event-2',
			title: 'Client Presentation',
			start: dayjs('2025-08-04T14:00:00.000Z'),
			end: dayjs('2025-08-04T15:30:00.000Z'),
			uid: 'event-2@ilamy.calendar',
			resourceIds: ['resource-1', 'resource-2'], // Cross-resource event
		},
		{
			id: 'event-3',
			title: 'Department Standup',
			start: dayjs('2025-08-05T10:00:00.000Z'),
			end: dayjs('2025-08-05T11:00:00.000Z'),
			uid: 'event-3@ilamy.calendar',
			resourceId: 'resource-3',
		},
	]

	it('should render without crashing', () => {
		render(<IlamyResourceCalendar />)

		// Should render the calendar header
		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should render with resources and events', () => {
		render(
			<IlamyResourceCalendar events={mockEvents} resources={mockResources} />
		)

		// Should render the calendar header
		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()

		// Should render header with resource controls
		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should use default props correctly', () => {
		render(<IlamyResourceCalendar />)

		// Component should render with empty resources/events arrays
		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle firstDayOfWeek prop correctly', () => {
		const { rerender } = render(
			<IlamyResourceCalendar firstDayOfWeek="monday" />
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()

		// Test sunday as well
		rerender(<IlamyResourceCalendar firstDayOfWeek="sunday" />)
		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle initialView prop', () => {
		render(
			<IlamyResourceCalendar initialView="week" resources={mockResources} />
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle initialDate prop with dayjs', () => {
		const initialDate = dayjs('2025-06-15T10:00:00.000Z')

		render(
			<IlamyResourceCalendar
				events={mockEvents}
				initialDate={initialDate}
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle initialDate prop with Date object', () => {
		const initialDate = new Date('2025-06-15T10:00:00.000Z')

		render(
			<IlamyResourceCalendar
				events={mockEvents}
				initialDate={initialDate}
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle initialDate prop with ISO string', () => {
		const initialDate = '2025-06-15T10:00:00.000Z'

		render(
			<IlamyResourceCalendar
				events={mockEvents}
				initialDate={initialDate}
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should render custom header when provided', () => {
		const customHeader = <div data-testid="custom-header">Custom Header</div>

		render(
			<IlamyResourceCalendar
				headerComponent={customHeader}
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('custom-header')).toBeInTheDocument()
		expect(screen.getByText('Custom Header')).toBeInTheDocument()
	})

	it('should handle event callbacks', async () => {
		const onEventClick = mock()
		const onCellClick = mock()
		const onEventAdd = mock()
		const onEventUpdate = mock()
		const onEventDelete = mock()
		const onViewChange = mock()
		const onDateChange = mock()

		render(
			<IlamyResourceCalendar
				events={mockEvents}
				onCellClick={onCellClick}
				onDateChange={onDateChange}
				onEventAdd={onEventAdd}
				onEventClick={onEventClick}
				onEventDelete={onEventDelete}
				onEventUpdate={onEventUpdate}
				onViewChange={onViewChange}
				resources={mockResources}
			/>
		)

		// All callbacks should be properly passed to provider
		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle disabled states', () => {
		render(
			<IlamyResourceCalendar
				disableCellClick={true}
				disableDragAndDrop={true}
				disableEventClick={true}
				events={mockEvents}
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle dayMaxEvents prop', () => {
		render(
			<IlamyResourceCalendar
				dayMaxEvents={5}
				events={mockEvents}
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle sticky view header', () => {
		render(
			<IlamyResourceCalendar
				resources={mockResources}
				stickyViewHeader={true}
				viewHeaderClassName="custom-view-header"
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle internationalization props', () => {
		render(
			<IlamyResourceCalendar
				locale="en"
				resources={mockResources}
				timezone="America/New_York"
				translator={translator}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle resource-specific events correctly', () => {
		render(
			<IlamyResourceCalendar events={mockEvents} resources={mockResources} />
		)

		// Should render without errors when events have resourceId and resourceIds
		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle cross-resource events', () => {
		const crossResourceEvent: CalendarEvent = {
			id: 'cross-resource-event',
			title: 'All Hands Meeting',
			start: dayjs('2025-08-04T16:00:00.000Z'),
			end: dayjs('2025-08-04T17:00:00.000Z'),
			uid: 'cross-resource-event@ilamy.calendar',
			resourceIds: ['resource-1', 'resource-2', 'resource-3'], // Spans all resources
		}

		render(
			<IlamyResourceCalendar
				events={[...mockEvents, crossResourceEvent]}
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle empty resources gracefully', () => {
		render(<IlamyResourceCalendar events={mockEvents} resources={[]} />)

		// Should still render even with no resources
		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle events without resource assignments', () => {
		const eventWithoutResource: CalendarEvent = {
			id: 'no-resource-event',
			title: 'Floating Event',
			start: dayjs('2025-08-04T12:00:00.000Z'),
			end: dayjs('2025-08-04T13:00:00.000Z'),
			uid: 'no-resource-event@ilamy.calendar',
			// No resourceId or resourceIds
		}

		render(
			<IlamyResourceCalendar
				events={[...mockEvents, eventWithoutResource]}
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should support custom renderEvent function', () => {
		render(
			<IlamyResourceCalendar
				events={mockEvents}
				renderEvent={customRenderEvent}
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	it('should handle view changes between different resource views', () => {
		const { rerender } = render(
			<IlamyResourceCalendar
				events={mockEvents}
				initialView="month"
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()

		// Test switching to week view
		rerender(
			<IlamyResourceCalendar
				events={mockEvents}
				initialView="week"
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()

		// Test switching to day view
		rerender(
			<IlamyResourceCalendar
				events={mockEvents}
				initialView="day"
				resources={mockResources}
			/>
		)

		expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
	})

	describe('onCellClick', () => {
		const mockOnCellClick = mock(() => {})

		beforeEach(() => {
			mockOnCellClick.mockClear()
		})

		it('should call onCellClick with correct arguments in day view', async () => {
			const initialDate = dayjs('2025-08-04T00:00:00.000Z')
			render(
				<IlamyResourceCalendar
					events={[]}
					initialDate={initialDate}
					initialView="day"
					onCellClick={mockOnCellClick}
					resources={mockResources}
				/>
			)

			const dateStr = initialDate.format('YYYY-MM-DD')
			const resourceId = 'resource-1'
			// In Resource calendar, day view actually uses HorizontalGrid with gridType='hour'
			// which renders day-cell-{date}-{hour}-{minute} inside a row
			const row = screen.getByTestId(`horizontal-row-${resourceId}`)
			const cell = within(row).getByTestId(`day-cell-${dateStr}-10-00`)
			fireEvent.click(cell)

			expect(mockOnCellClick).toHaveBeenCalledTimes(1)
			const callArgs = (mockOnCellClick.mock.calls as any)[0][0]
			expect(callArgs.start.toISOString()).toBe('2025-08-04T10:00:00.000Z')
			// Resource Horizontal day view uses 1 hour slots (minute is undefined)
			expect(callArgs.end.toISOString()).toBe('2025-08-04T11:00:00.000Z')
			expect(callArgs.allDay).toBe(false)
			expect(callArgs.resourceId).toBe(resourceId)
		})

		it('should call onCellClick with correct arguments in month view', async () => {
			const initialDate = dayjs('2025-08-04T00:00:00.000Z')
			render(
				<IlamyResourceCalendar
					events={[]}
					initialDate={initialDate}
					initialView="month"
					onCellClick={mockOnCellClick}
					resources={mockResources}
				/>
			)

			const dateStr = initialDate.format('YYYY-MM-DD')
			const resourceId = 'resource-2'
			// Resource month vertical uses day-cell-{date} and is inside a row with resourceId
			const row = screen.getByTestId(`horizontal-row-${resourceId}`)
			const cell = within(row).getByTestId(`day-cell-${dateStr}`)
			fireEvent.click(cell)

			expect(mockOnCellClick).toHaveBeenCalledTimes(1)
			const callArgs = (mockOnCellClick.mock.calls as any)[0][0]
			expect(callArgs.start.toISOString()).toBe('2025-08-04T00:00:00.000Z')
			// Month view full day (hour and minute are undefined)
			expect(callArgs.end.hour()).toBe(23)
			expect(callArgs.end.minute()).toBe(59)
			expect(callArgs.allDay).toBe(false)
			expect(callArgs.resourceId).toBe(resourceId)
		})
	})

	describe('renderEventForm', () => {
		const mockOnEventAdd = mock(() => {})
		const mockOnEventUpdate = mock(() => {})
		const mockOnEventDelete = mock(() => {})

		beforeEach(() => {
			mockOnEventAdd.mockClear()
			mockOnEventUpdate.mockClear()
			mockOnEventDelete.mockClear()
		})

		it('should render custom event form when renderEventForm is provided', () => {
			render(
				<IlamyResourceCalendar
					events={[]}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					renderEventForm={(props) => <CustomResourceEventForm {...props} />}
					resources={mockResources}
				/>
			)

			expect(screen.getByTestId('custom-event-form')).toBeInTheDocument()
			expect(screen.getByTestId('form-open')).toHaveTextContent('closed')
		})

		it('should pass selectedEvent with resourceId when resource event is clicked', async () => {
			const resourceEvent: CalendarEvent = {
				id: 'resource-event-1',
				title: 'Resource Event',
				start: dayjs('2025-08-04T10:00:00.000Z'),
				end: dayjs('2025-08-04T11:00:00.000Z'),
				uid: 'resource-event-1@test',
				resourceId: 'resource-1',
			}

			render(
				<IlamyResourceCalendar
					events={[resourceEvent]}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="month"
					renderEventForm={(props) => <CustomResourceEventForm {...props} />}
					resources={mockResources}
				/>
			)

			// Click on the event
			const eventElement = screen.getByText('Resource Event')
			fireEvent.click(eventElement)

			await waitFor(() => {
				expect(screen.getByTestId('form-open')).toHaveTextContent('open')
			})

			expect(screen.getByTestId('selected-event-title')).toHaveTextContent(
				'Resource Event'
			)
			expect(
				screen.getByTestId('selected-event-resource-id')
			).toHaveTextContent('resource-1')
		})

		it('should pass selectedEvent with resourceIds for cross-resource events', async () => {
			const crossResourceEvent: CalendarEvent = {
				id: 'cross-event-1',
				title: 'Cross Resource Meeting',
				start: dayjs('2025-08-04T10:00:00.000Z'),
				end: dayjs('2025-08-04T11:00:00.000Z'),
				uid: 'cross-event-1@test',
				resourceIds: ['resource-1', 'resource-2'],
			}

			render(
				<IlamyResourceCalendar
					events={[crossResourceEvent]}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="month"
					renderEventForm={(props) => <CustomResourceEventForm {...props} />}
					resources={mockResources}
				/>
			)

			// Cross-resource events appear in multiple places, click the first one
			const eventElements = screen.getAllByText('Cross Resource Meeting')
			fireEvent.click(eventElements[0])

			await waitFor(() => {
				expect(screen.getByTestId('form-open')).toHaveTextContent('open')
			})

			expect(
				screen.getByTestId('selected-event-resource-ids')
			).toHaveTextContent('resource-1,resource-2')
		})

		it('should add event with resourceId via onAdd callback', async () => {
			render(
				<IlamyResourceCalendar
					events={[]}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="month"
					onEventAdd={mockOnEventAdd}
					renderEventForm={(props) => <CustomResourceEventForm {...props} />}
					resources={mockResources}
				/>
			)

			// Click add event button
			fireEvent.click(screen.getByTestId('add-event-btn'))

			await waitFor(() => {
				expect(mockOnEventAdd).toHaveBeenCalledTimes(1)
			})

			expect(mockOnEventAdd).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'new-resource-event-1',
					title: 'New Resource Event',
					resourceId: 'resource-1',
				})
			)

			// Event should appear on calendar
			await waitFor(() => {
				expect(screen.getByText('New Resource Event')).toBeInTheDocument()
			})
		})

		it('should add cross-resource event with resourceIds via onAdd callback', async () => {
			render(
				<IlamyResourceCalendar
					events={[]}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="month"
					onEventAdd={mockOnEventAdd}
					renderEventForm={(props) => <CustomResourceEventForm {...props} />}
					resources={mockResources}
				/>
			)

			// Click add cross-resource event button
			fireEvent.click(screen.getByTestId('add-cross-resource-event-btn'))

			await waitFor(() => {
				expect(mockOnEventAdd).toHaveBeenCalledTimes(1)
			})

			expect(mockOnEventAdd).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'cross-resource-event-1',
					title: 'Cross Resource Event',
					resourceIds: ['resource-1', 'resource-2'],
				})
			)
		})

		it('should update event and preserve resourceId via onUpdate callback', async () => {
			const resourceEvent: CalendarEvent = {
				id: 'update-event-1',
				title: 'Event to Update',
				start: dayjs('2025-08-04T10:00:00.000Z'),
				end: dayjs('2025-08-04T11:00:00.000Z'),
				uid: 'update-event-1@test',
				resourceId: 'resource-1',
			}

			render(
				<IlamyResourceCalendar
					events={[resourceEvent]}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="month"
					onEventUpdate={mockOnEventUpdate}
					renderEventForm={(props) => <CustomResourceEventForm {...props} />}
					resources={mockResources}
				/>
			)

			// Click event to open form
			fireEvent.click(screen.getByText('Event to Update'))

			await waitFor(() => {
				expect(screen.getByTestId('form-open')).toHaveTextContent('open')
			})

			// Update event title
			fireEvent.click(screen.getByTestId('update-event-btn'))

			await waitFor(() => {
				expect(mockOnEventUpdate).toHaveBeenCalledTimes(1)
			})

			// Should preserve resourceId while updating title
			expect(mockOnEventUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'update-event-1',
					title: 'Updated Resource Event',
					resourceId: 'resource-1',
				})
			)
		})

		it('should move event to different resource via onUpdate callback', async () => {
			const resourceEvent: CalendarEvent = {
				id: 'move-event-1',
				title: 'Event to Move',
				start: dayjs('2025-08-04T10:00:00.000Z'),
				end: dayjs('2025-08-04T11:00:00.000Z'),
				uid: 'move-event-1@test',
				resourceId: 'resource-1',
			}

			render(
				<IlamyResourceCalendar
					events={[resourceEvent]}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="month"
					onEventUpdate={mockOnEventUpdate}
					renderEventForm={(props) => <CustomResourceEventForm {...props} />}
					resources={mockResources}
				/>
			)

			// Click event to open form
			fireEvent.click(screen.getByText('Event to Move'))

			await waitFor(() => {
				expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				expect(
					screen.getByTestId('selected-event-resource-id')
				).toHaveTextContent('resource-1')
			})

			// Move to different resource
			fireEvent.click(screen.getByTestId('update-event-resource-btn'))

			await waitFor(() => {
				expect(mockOnEventUpdate).toHaveBeenCalledTimes(1)
			})

			// Should have new resourceId
			expect(mockOnEventUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'move-event-1',
					resourceId: 'resource-2',
				})
			)
		})

		it('should delete resource event via onDelete callback', async () => {
			const resourceEvent: CalendarEvent = {
				id: 'delete-event-1',
				title: 'Event to Delete',
				start: dayjs('2025-08-04T10:00:00.000Z'),
				end: dayjs('2025-08-04T11:00:00.000Z'),
				uid: 'delete-event-1@test',
				resourceId: 'resource-1',
			}

			render(
				<IlamyResourceCalendar
					events={[resourceEvent]}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="month"
					onEventDelete={mockOnEventDelete}
					renderEventForm={(props) => <CustomResourceEventForm {...props} />}
					resources={mockResources}
				/>
			)

			// Event should be visible
			expect(screen.getByText('Event to Delete')).toBeInTheDocument()

			// Click event to open form
			fireEvent.click(screen.getByText('Event to Delete'))

			await waitFor(() => {
				expect(screen.getByTestId('form-open')).toHaveTextContent('open')
			})

			// Delete event
			fireEvent.click(screen.getByTestId('delete-event-btn'))

			await waitFor(() => {
				expect(mockOnEventDelete).toHaveBeenCalledTimes(1)
			})

			expect(mockOnEventDelete).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'delete-event-1',
					title: 'Event to Delete',
					resourceId: 'resource-1',
				})
			)
		})

		it('should use default EventForm when renderEventForm is not provided', async () => {
			render(
				<IlamyResourceCalendar
					events={mockEvents}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="month"
					resources={mockResources}
				/>
			)

			// Custom form should not be present
			expect(screen.queryByTestId('custom-event-form')).not.toBeInTheDocument()

			// Click on an event to open default form
			fireEvent.click(screen.getByText('Team Meeting'))

			// Default form should appear
			await waitFor(() => {
				expect(screen.getByText('Edit Event')).toBeInTheDocument()
			})
		})

		it('should display time in 24-hour format in day view when timeFormat is 24-hour', () => {
			render(
				<IlamyResourceCalendar
					events={mockEvents}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="day"
					resources={mockResources}
					timeFormat="24-hour"
				/>
			)

			// Find time labels in day view using data-testid
			const timeLabels = screen.getAllByTestId(/^resource-day-time-label-/)

			// Should have time labels (24 hours)
			expect(timeLabels.length).toBeGreaterThan(0)

			// All time labels should not contain AM/PM in 24-hour format
			timeLabels.forEach((label) => {
				const text = label.textContent || ''
				expect(text).not.toMatch(/AM|PM/i)
				// Should contain time format (with or without :00 for on-the-hour)
				expect(text).toMatch(/\d{1,2}(?::\d{2})?/)
			})
		})

		it('should display time in 12-hour format in day view when timeFormat is 12-hour', () => {
			render(
				<IlamyResourceCalendar
					events={mockEvents}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="day"
					resources={mockResources}
					timeFormat="12-hour"
				/>
			)

			// Find time labels in day view using data-testid
			const timeLabels = screen.getAllByTestId(/^resource-day-time-label-/)

			// Should have time labels (24 hours)
			expect(timeLabels.length).toBeGreaterThan(0)

			// At least some time labels should contain AM/PM in 12-hour format
			const hasAMPM = timeLabels.some((label) => {
				const text = label.textContent || ''
				return /AM|PM/i.test(text)
			})
			expect(hasAMPM).toBe(true)
		})

		it('should display time in 24-hour format in week view when timeFormat is 24-hour', () => {
			render(
				<IlamyResourceCalendar
					events={mockEvents}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="week"
					resources={mockResources}
					timeFormat="24-hour"
				/>
			)

			// Find time labels in week view using data-testid
			const timeLabels = screen.getAllByTestId(/^resource-week-time-label-/)

			// Should have time labels (24 hours * 7 days = 168)
			expect(timeLabels.length).toBeGreaterThan(0)

			// All time labels should not contain AM/PM in 24-hour format
			timeLabels.forEach((label) => {
				const text = label.textContent || ''
				expect(text).not.toMatch(/AM|PM/i)
				// Should contain time format (with or without :00 for on-the-hour)
				expect(text).toMatch(/\d{1,2}(?::\d{2})?/)
			})
		})

		it('should display time in 12-hour format in week view when timeFormat is 12-hour', () => {
			render(
				<IlamyResourceCalendar
					events={mockEvents}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="week"
					resources={mockResources}
					timeFormat="12-hour"
				/>
			)

			// Find time labels in week view using data-testid
			const timeLabels = screen.getAllByTestId(/^resource-week-time-label-/)

			// Should have time labels (24 hours * 7 days = 168)
			expect(timeLabels.length).toBeGreaterThan(0)

			// At least some time labels should contain AM/PM in 12-hour format
			const hasAMPM = timeLabels.some((label) => {
				const text = label.textContent || ''
				return /AM|PM/i.test(text)
			})
			expect(hasAMPM).toBe(true)
		})

		it('should default to 12-hour format when timeFormat is not provided', () => {
			render(
				<IlamyResourceCalendar
					events={mockEvents}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="day"
					resources={mockResources}
				/>
			)

			// Find time labels using data-testid
			const timeLabels = screen.getAllByTestId(/^resource-day-time-label-/)

			// Should have time labels
			expect(timeLabels.length).toBeGreaterThan(0)

			// Should default to 12-hour format
			const hasAMPM = timeLabels.some((label) => {
				const text = label.textContent || ''
				return /AM|PM/i.test(text)
			})
			expect(hasAMPM).toBe(true)
		})

		it('should update time format when timeFormat changes', () => {
			const { rerender } = render(
				<IlamyResourceCalendar
					events={mockEvents}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="day"
					resources={mockResources}
					timeFormat="12-hour"
				/>
			)

			// Initially should show 12-hour format
			let timeLabels = Array.from(document.querySelectorAll('.text-xs')).filter(
				(el) => {
					const text = el.textContent || ''
					return /\d{1,2}(?::\d{2})?/.test(text)
				}
			)

			const hasAMPM = timeLabels.some((label) => {
				const text = label.textContent || ''
				return /AM|PM/i.test(text)
			})
			expect(hasAMPM).toBe(true)

			// Rerender with 24-hour format
			rerender(
				<IlamyResourceCalendar
					events={mockEvents}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="day"
					resources={mockResources}
					timeFormat="24-hour"
				/>
			)

			// Now should show 24-hour format
			timeLabels = Array.from(document.querySelectorAll('.text-xs')).filter(
				(el) => {
					const text = el.textContent || ''
					return /\d{1,2}(?::\d{2})?/.test(text)
				}
			)

			timeLabels.forEach((label) => {
				const text = label.textContent || ''
				expect(text).not.toMatch(/AM|PM/i)
			})
		})
	})
})
