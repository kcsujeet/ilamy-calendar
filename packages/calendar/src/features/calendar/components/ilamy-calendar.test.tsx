import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	setSystemTime,
	spyOn,
	test,
} from 'bun:test'
import { recurrencePlugin } from '@ilamy/calendar-recurrence'
import { yearPlugin } from '@ilamy/calendar-year'
import type { CalendarEvent, IlamyPlugin, Resource } from '@ilamy/types'
import {
	add,
	dayKey,
	endOf,
	getOffsetString,
	parseDate,
	startOf,
	toOffsetIso,
	toUtcIso,
	withTime,
} from '@ilamy/utils/temporal'
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import {
	createContext,
	createRef,
	Suspense,
	startTransition,
	use,
	useContext,
	useLayoutEffect,
	useState,
} from 'react'
import { RRule } from 'rrule'
import { DISABLED_CELL_CLASSNAME } from '@/config/constants'
import type { EventFormProps } from '@/features/calendar/components/event-form/event-form'
import {
	type IlamyCalendarApi,
	useIlamyCalendarContext,
	useSmartCalendarContext,
} from '@/features/calendar/hooks/use-smart-calendar-context'
import type {
	EventSegment,
	IlamyCalendarPropEvent,
	IlamyCalendarProps,
} from '@/features/calendar/types'
import { plainSpaces } from '@/testing/plain-spaces'
import { IlamyCalendar } from './ilamy-calendar'

const at = (iso: string, zone = 'UTC') => {
	const parsed = parseDate(iso, zone)
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const formatYmdHm = (iso: string, zone = 'UTC'): string => {
	const d = at(iso, zone)
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${d.year}-${pad(d.month)}-${pad(d.day)} ${pad(d.hour)}:${pad(d.minute)}`
}

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
						start: '2025-01-15T14:00:00+00:00',
						end: '2025-01-15T15:00:00+00:00',
					})
				}
				type="button"
			>
				Add Event
			</button>
			<button
				data-testid="update-event-btn"
				onClick={() => {
					if (!props.selectedEvent) return
					props.onUpdate?.({
						...props.selectedEvent,
						title: 'Updated Event Title',
					})
				}}
				type="button"
			>
				Update Event
			</button>
			<button
				data-testid="delete-event-btn"
				onClick={() => {
					if (!props.selectedEvent) return
					props.onDelete?.(props.selectedEvent)
				}}
				type="button"
			>
				Delete Event
			</button>
			<button
				data-testid="close-form-btn"
				onClick={props.onClose}
				type="button"
			>
				Close
			</button>
		</div>
	)
}

describe('IlamyCalendar', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('plugin DOM contract', () => {
		it('marks the calendar body with data-calendar-viewport', () => {
			render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					timezone="UTC"
				/>
			)

			const body = screen.getByTestId('calendar-body')
			expect(body).toHaveAttribute('data-calendar-viewport', 'true')
		})

		it('renders grid cells carrying data-start/data-end so plugins can hit-test the DOM', () => {
			const { container } = render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					timezone="UTC"
				/>
			)

			const cell = container.querySelector('[data-start]')
			expect(cell).not.toBeNull()
			expect(cell).toHaveAttribute('data-end')
		})

		it('marks the grid scroll content with data-calendar-scroll-content', () => {
			const { container } = render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					timezone="UTC"
				/>
			)

			const scrollContent = container.querySelector(
				'[data-calendar-scroll-content]'
			)
			expect(scrollContent).not.toBeNull()
		})
	})

	describe('renderEventForm', () => {
		const createEvent = (
			overrides: Partial<CalendarEvent> = {}
		): CalendarEvent => ({
			id: `event-${Date.now()}`,
			title: 'Test Event',
			start: '2025-01-15T10:00:00+00:00',
			end: '2025-01-15T11:00:00+00:00',
			...overrides,
		})

		const mockOnEventAdd = mock(() => {})
		const mockOnEventUpdate = mock(() => {})
		const mockOnEventDelete = mock(() => {})

		beforeEach(() => {
			cleanup()
			mockOnEventAdd.mockClear()
			mockOnEventUpdate.mockClear()
			mockOnEventDelete.mockClear()
		})

		describe('props passed to custom form', () => {
			it('should render custom event form when renderEventForm is provided', () => {
				render(
					<IlamyCalendar
						events={[]}
						initialDate="2025-01-15T00:00:00Z"
						renderEventForm={(props) => <CustomEventForm {...props} />}
						timezone="UTC"
					/>
				)

				expect(screen.getByTestId('custom-event-form')).toBeInTheDocument()
			})

			it('should pass open=false when form is not open', () => {
				render(
					<IlamyCalendar
						events={[]}
						initialDate="2025-01-15T00:00:00Z"
						renderEventForm={(props) => <CustomEventForm {...props} />}
						timezone="UTC"
					/>
				)

				expect(screen.getByTestId('form-open')).toHaveTextContent('closed')
			})

			it('should pass open=true and selectedEvent when cell is clicked', async () => {
				render(
					<IlamyCalendar
						events={[]}
						initialDate="2025-01-15T00:00:00Z"
						initialView="month"
						renderEventForm={(props) => <CustomEventForm {...props} />}
						timezone="UTC"
					/>
				)

				fireEvent.click(screen.getByTestId('day-cell-2025-01-15'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				expect(
					screen.getByTestId('selected-event-title')
				).not.toHaveTextContent('none')
			})

			it('should pass selectedEvent with event data when existing event is clicked', async () => {
				const existingEvent = createEvent({
					id: 'existing-1',
					title: 'Existing Event',
				})

				render(
					<IlamyCalendar
						events={[existingEvent]}
						initialDate="2025-01-15T00:00:00Z"
						initialView="month"
						renderEventForm={(props) => <CustomEventForm {...props} />}
						timezone="UTC"
					/>
				)

				fireEvent.click(screen.getByText('Existing Event'))

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
						initialDate="2025-01-15T00:00:00Z"
						initialView="month"
						renderEventForm={(props) => <CustomEventForm {...props} />}
						timezone="UTC"
					/>
				)

				fireEvent.click(screen.getByTestId('day-cell-2025-01-15'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

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
						initialDate="2025-01-15T00:00:00Z"
						initialView="month"
						onEventAdd={mockOnEventAdd}
						renderEventForm={(props) => <CustomEventForm {...props} />}
						timezone="UTC"
					/>
				)

				fireEvent.click(screen.getByTestId('day-cell-2025-01-15'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				fireEvent.click(screen.getByTestId('add-event-btn'))

				await waitFor(() => {
					expect(
						screen.getByText('New Event From Custom Form')
					).toBeInTheDocument()
				})

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
						initialDate="2025-01-15T00:00:00Z"
						initialView="month"
						renderEventForm={(props) => {
							addEventFn = props.onAdd
							return <CustomEventForm {...props} />
						}}
						timezone="UTC"
					/>
				)

				fireEvent.click(screen.getByTestId('day-cell-2025-01-15'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				act(() => {
					addEventFn?.({
						id: 'event-1',
						title: 'First Event',
						start: '2025-01-15T10:00:00+00:00',
						end: '2025-01-15T11:00:00+00:00',
					})
					addEventFn?.({
						id: 'event-2',
						title: 'Second Event',
						start: '2025-01-16T10:00:00+00:00',
						end: '2025-01-16T11:00:00+00:00',
					})
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
				})

				render(
					<IlamyCalendar
						events={[existingEvent]}
						initialDate="2025-01-15T00:00:00Z"
						initialView="month"
						onEventUpdate={mockOnEventUpdate}
						renderEventForm={(props) => <CustomEventForm {...props} />}
						timezone="UTC"
					/>
				)

				expect(screen.getByText('Original Title')).toBeInTheDocument()
				fireEvent.click(screen.getByText('Original Title'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
					expect(screen.getByTestId('selected-event-id')).toHaveTextContent(
						'update-test-1'
					)
				})

				fireEvent.click(screen.getByTestId('update-event-btn'))

				await waitFor(() => {
					expect(screen.getByText('Updated Event Title')).toBeInTheDocument()
				})

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
				})

				let updateFn: EventFormProps['onUpdate']

				render(
					<IlamyCalendar
						events={[existingEvent]}
						initialDate="2025-01-15T00:00:00Z"
						initialView="month"
						onEventUpdate={mockOnEventUpdate}
						renderEventForm={(props) => {
							updateFn = props.onUpdate
							return <CustomEventForm {...props} />
						}}
						timezone="UTC"
					/>
				)

				fireEvent.click(screen.getByText('Event With Details'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				act(() => {
					updateFn?.({
						...existingEvent,
						title: 'New Title Only',
					})
				})

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
				})

				render(
					<IlamyCalendar
						events={[existingEvent]}
						initialDate="2025-01-15T00:00:00Z"
						initialView="month"
						onEventDelete={mockOnEventDelete}
						renderEventForm={(props) => <CustomEventForm {...props} />}
						timezone="UTC"
					/>
				)

				fireEvent.click(screen.getByText('Event To Delete'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				fireEvent.click(screen.getByTestId('delete-event-btn'))

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
				})

				render(
					<IlamyCalendar
						events={[existingEvent]}
						initialDate="2025-01-15T00:00:00Z"
						initialView="month"
						renderEventForm={(props) => <CustomEventForm {...props} />}
						timezone="UTC"
					/>
				)

				fireEvent.click(screen.getByText('DeleteMe'))

				await waitFor(() => {
					expect(screen.getByTestId('form-open')).toHaveTextContent('open')
				})

				fireEvent.click(screen.getByTestId('delete-event-btn'))
				fireEvent.click(screen.getByTestId('close-form-btn'))

				await waitFor(() => {
					const monthView = screen.getByTestId('horizontal-grid-scroll')
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
						initialDate="2025-01-15T00:00:00Z"
						initialView="week"
						renderEventForm={(props) => {
							addEventFn = props.onAdd
							return <CustomEventForm {...props} />
						}}
						timezone="UTC"
					/>
				)

				await waitFor(() => {
					expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
				})

				act(() => {
					addEventFn?.({
						id: 'week-event-1',
						title: 'Week View Event',
						start: '2025-01-15T10:00:00+00:00',
						end: '2025-01-15T11:00:00+00:00',
					})
				})

				await waitFor(async () => {
					const events = await screen.findAllByText('Week View Event')
					expect(events.length).toBeGreaterThan(0)
				})
			})

			it('should show added events in day view', async () => {
				let addEventFn: EventFormProps['onAdd']

				render(
					<IlamyCalendar
						events={[]}
						initialDate="2025-01-15T00:00:00Z"
						initialView="day"
						renderEventForm={(props) => {
							addEventFn = props.onAdd
							return <CustomEventForm {...props} />
						}}
						timezone="UTC"
					/>
				)

				await waitFor(() => {
					expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
				})

				act(() => {
					addEventFn?.({
						id: 'day-event-1',
						title: 'Day View Event',
						start: '2025-01-15T10:00:00+00:00',
						end: '2025-01-15T11:00:00+00:00',
					})
				})

				await waitFor(async () => {
					const events = await screen.findAllByText('Day View Event')
					expect(events.length).toBeGreaterThan(0)
				})
			})

			it('should persist events when switching views', async () => {
				let addEventFn: EventFormProps['onAdd']

				render(
					<IlamyCalendar
						events={[]}
						initialDate="2025-01-15T00:00:00Z"
						initialView="month"
						renderEventForm={(props) => {
							addEventFn = props.onAdd
							return <CustomEventForm {...props} />
						}}
						timezone="UTC"
					/>
				)

				await waitFor(() => {
					expect(addEventFn).toBeDefined()
				})

				act(() => {
					addEventFn?.({
						id: 'persist-event',
						title: 'Persistent Event',
						start: '2025-01-15T10:00:00+00:00',
						end: '2025-01-15T11:00:00+00:00',
					})
				})

				await waitFor(async () => {
					const events = await screen.findAllByText('Persistent Event')
					expect(events.length).toBeGreaterThan(0)
				})

				fireEvent.click(screen.getByRole('radio', { name: /^week$/i }))

				await waitFor(() => {
					expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
				})

				await waitFor(async () => {
					const events = await screen.findAllByText('Persistent Event')
					expect(events.length).toBeGreaterThan(0)
				})

				fireEvent.click(screen.getByRole('radio', { name: /^day$/i }))

				await waitFor(() => {
					expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
				})

				await waitFor(async () => {
					const events = await screen.findAllByText('Persistent Event')
					expect(events.length).toBeGreaterThan(0)
				})
			})
		})

		describe('default EventForm fallback', () => {
			it('should use default EventForm when renderEventForm is not provided', async () => {
				render(
					<IlamyCalendar
						events={[]}
						initialDate="2025-01-15T00:00:00Z"
						initialView="month"
						timezone="UTC"
					/>
				)

				expect(
					screen.queryByTestId('custom-event-form')
				).not.toBeInTheDocument()

				fireEvent.click(screen.getByTestId('day-cell-2025-01-15'))

				await waitFor(() => {
					expect(screen.getByText('Create Event')).toBeInTheDocument()
				})
			})
		})
	})

	describe('onCellClick', () => {
		const mockOnCellClick = mock(
			(_info: {
				start: string
				end: string
				allDay?: boolean
				resource?: Resource
			}) => {}
		)

		beforeEach(() => {
			cleanup()
			mockOnCellClick.mockClear()
		})

		it('should call onCellClick with ISO strings and allDay=true in month view (D11)', () => {
			render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					initialView="month"
					onCellClick={mockOnCellClick}
					timezone="UTC"
				/>
			)

			fireEvent.click(screen.getByTestId('day-cell-2025-01-15'))

			expect(mockOnCellClick).toHaveBeenCalledTimes(1)
			const callArgs = mockOnCellClick.mock.calls.at(0)?.at(0)
			expect(callArgs?.start).toBe('2025-01-15T00:00:00+00:00')
			expect(callArgs?.end).toBe('2025-01-16T00:00:00+00:00')
			expect(callArgs?.allDay).toBe(true)
			expect(callArgs?.resource).toBeUndefined()
		})

		it('should call onCellClick with correct hour in week view', () => {
			render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					initialView="week"
					onCellClick={mockOnCellClick}
					timezone="UTC"
				/>
			)

			fireEvent.click(screen.getByTestId('vertical-cell-2025-01-15-10-00'))

			expect(mockOnCellClick).toHaveBeenCalledTimes(1)
			const callArgs = mockOnCellClick.mock.calls.at(0)?.at(0)
			expect(callArgs?.start).toBe('2025-01-15T10:00:00+00:00')
			expect(callArgs?.end).toBe('2025-01-15T11:00:00+00:00')
			expect(callArgs?.allDay).toBe(false)
			expect(callArgs?.resource).toBeUndefined()
		})

		it('should call onCellClick with correct arguments in day view', () => {
			render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					initialView="day"
					onCellClick={mockOnCellClick}
					slotDuration={15}
					timezone="UTC"
				/>
			)

			fireEvent.click(screen.getByTestId('vertical-cell-2025-01-15-14-00'))

			expect(mockOnCellClick).toHaveBeenCalledTimes(1)
			const callArgs = mockOnCellClick.mock.calls.at(0)?.at(0)
			expect(callArgs?.start).toBe('2025-01-15T14:00:00+00:00')
			expect(callArgs?.end).toBe('2025-01-15T14:15:00+00:00')
			expect(callArgs?.allDay).toBe(false)
			expect(callArgs?.resource).toBeUndefined()
		})

		it('should call onCellClick with correct arguments in day view for slotDuration=30', () => {
			render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					initialView="day"
					onCellClick={mockOnCellClick}
					slotDuration={30}
					timezone="UTC"
				/>
			)

			fireEvent.click(screen.getByTestId('vertical-cell-2025-01-15-14-00'))

			expect(mockOnCellClick).toHaveBeenCalledTimes(1)
			const callArgs = mockOnCellClick.mock.calls.at(0)?.at(0)
			expect(callArgs?.start).toBe('2025-01-15T14:00:00+00:00')
			expect(callArgs?.end).toBe('2025-01-15T14:30:00+00:00')
			expect(callArgs?.allDay).toBe(false)
			expect(callArgs?.resource).toBeUndefined()
		})
	})

	describe('custom disabled state classesOverride', () => {
		it('should apply default disabled state classes to isCellDisabled cells', () => {
			render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					initialView="month"
					isCellDisabled={(info) => info.start.startsWith('2025-01-18')}
					timezone="UTC"
				/>
			)

			const saturdayCell = screen.getByTestId('day-cell-2025-01-18')
			expect(saturdayCell).toHaveClass(DISABLED_CELL_CLASSNAME)
		})

		it('should apply custom disabledCell className when provided', () => {
			render(
				<IlamyCalendar
					classesOverride={{
						disabledCell: 'bg-gray-100 text-gray-400 cursor-not-allowed',
					}}
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					initialView="month"
					isCellDisabled={(info) => info.start.startsWith('2025-01-18')}
					timezone="UTC"
				/>
			)

			const saturdayCell = screen.getByTestId('day-cell-2025-01-18')
			expect(saturdayCell).toHaveClass('bg-gray-100')
			expect(saturdayCell).toHaveClass('text-gray-400')
			expect(saturdayCell).toHaveClass('cursor-not-allowed')
			expect(saturdayCell).not.toHaveClass('bg-secondary')
			expect(saturdayCell).not.toHaveClass('text-muted-foreground')
		})

		it('should apply custom disabledCell className in week view', () => {
			render(
				<IlamyCalendar
					classesOverride={{
						disabledCell: 'bg-red-50 text-red-300',
					}}
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					initialView="week"
					isCellDisabled={(info) => info.start.startsWith('2025-01-15T08:')}
					timezone="UTC"
				/>
			)

			const disabledTimeCell = screen.getByTestId(
				'vertical-cell-2025-01-15-08-00'
			)
			expect(disabledTimeCell).toHaveClass('bg-red-50')
			expect(disabledTimeCell).toHaveClass('text-red-300')
			expect(disabledTimeCell).not.toHaveClass('bg-secondary')
			expect(disabledTimeCell).not.toHaveClass('text-muted-foreground')
		})

		it('should apply custom disabledCell className in day view', () => {
			render(
				<IlamyCalendar
					classesOverride={{
						disabledCell: 'bg-yellow-50 text-yellow-300',
					}}
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					initialView="day"
					isCellDisabled={(info) => info.start.startsWith('2025-01-15T08:')}
					timezone="UTC"
				/>
			)

			const disabledTimeCell = screen.getByTestId(
				'vertical-cell-2025-01-15-08-00'
			)
			expect(disabledTimeCell).toHaveClass('bg-yellow-50')
			expect(disabledTimeCell).toHaveClass('text-yellow-300')
			expect(disabledTimeCell).not.toHaveClass('bg-secondary')
			expect(disabledTimeCell).not.toHaveClass('text-muted-foreground')
		})
	})

	describe('getCellClassName', () => {
		it('styles unavailable cells without blocking clicks in month view', () => {
			const onCellClick = mock()
			render(
				<IlamyCalendar
					events={[]}
					getCellClassName={(info) =>
						at(info.start).day === 20 ? 'bg-amber-100' : ''
					}
					initialDate="2025-01-15T00:00:00Z"
					initialView="month"
					onCellClick={onCellClick}
					timezone="UTC"
				/>
			)

			const styledCell = screen.getByTestId('day-cell-2025-01-20')
			const plainCell = screen.getByTestId('day-cell-2025-01-15')

			expect(styledCell).toHaveClass('bg-amber-100')
			expect(plainCell).not.toHaveClass('bg-amber-100')
			expect(styledCell.getAttribute('data-disabled')).toBe('false')

			fireEvent.click(styledCell)
			expect(onCellClick).toHaveBeenCalledTimes(1)
		})
	})

	describe('isCellDisabled (issue #79)', () => {
		it('disables the matching cell and blocks its click in month view', () => {
			const onCellClick = mock()
			render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-01-15T00:00:00Z"
					initialView="month"
					isCellDisabled={(info) => at(info.start).day === 20}
					onCellClick={onCellClick}
					timezone="UTC"
				/>
			)

			const disabledCell = screen.getByTestId('day-cell-2025-01-20')
			const enabledCell = screen.getByTestId('day-cell-2025-01-15')

			expect(disabledCell.getAttribute('data-disabled')).toBe('true')
			expect(enabledCell.getAttribute('data-disabled')).toBe('false')

			fireEvent.click(disabledCell)
			expect(onCellClick).toHaveBeenCalledTimes(0)

			fireEvent.click(enabledCell)
			expect(onCellClick).toHaveBeenCalledTimes(1)
		})
	})
})

test('renders a plugin view and exposes the plugin provider context to it', () => {
	cleanup()
	const FakeContext = createContext('default')
	const FakeView = () => {
		const value = useContext(FakeContext)
		return <div data-testid="fake-view">{value}</div>
	}
	const fakePlugin: IlamyPlugin = {
		name: 'fake',
		provider: ({ children }) => (
			<FakeContext.Provider value="from-plugin">
				{children}
			</FakeContext.Provider>
		),
		views: [
			{
				name: 'fake-view',
				label: 'Fake',
				icon: () => null,
				component: FakeView,
				navigationUnit: 'day',
			},
		],
	}

	render(<IlamyCalendar initialView="fake-view" plugins={[fakePlugin]} />)

	const el = screen.getByTestId('fake-view')
	expect(el).toBeDefined()
	expect(el.textContent).toBe('from-plugin')
})

test('renders a spec-driven plugin view that declares no component', () => {
	cleanup()
	const specOnlyPlugin: IlamyPlugin = {
		name: 'spec-only',
		views: [
			{
				name: 'three-day',
				label: 'Three day',
				icon: () => null,
				layout: 'vertical',
				navigationStep: { amount: 3, unit: 'day' },
				range: (date) => {
					const zoned = at(date)
					return {
						start: toOffsetIso(startOf(zoned, 'day')),
						end: toOffsetIso(endOf(add(zoned, 2, 'day'), 'day')),
					}
				},
				columns: (date) => {
					const zoned = at(date)
					return [
						{
							id: 'three-day-col',
							day: date,
							days: [
								toOffsetIso(withTime(zoned, { hour: 9 })),
								toOffsetIso(withTime(zoned, { hour: 10 })),
							],
							gridType: 'hour',
						},
					]
				},
			},
		],
	}

	render(
		<IlamyCalendar
			initialView="three-day"
			plugins={[specOnlyPlugin]}
			timezone="UTC"
		/>
	)

	expect(screen.getByTestId('vertical-col-three-day-col')).toBeDefined()
})

describe('orientation without resources', () => {
	let warnSpy: ReturnType<typeof spyOn>

	beforeEach(() => {
		cleanup()
		warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	const allWarnArgs = () => warnSpy.mock.calls.flat().join(' ')

	it('warns in dev when orientation is passed without resources', () => {
		render(<IlamyCalendar orientation="vertical" />)
		expect(allWarnArgs()).toContain(
			'`orientation` was provided without `resources`'
		)
	})

	it('does not warn when resources are present', () => {
		render(
			<IlamyCalendar
				orientation="vertical"
				resources={[{ id: 'r1', title: 'Room 1' }]}
			/>
		)
		expect(allWarnArgs()).not.toContain('`orientation`')
	})

	it('exposes the resolved orientation on the public context', () => {
		const OrientationProbe = () => (
			<span data-testid="probe-orientation">
				{useIlamyCalendarContext().orientation}
			</span>
		)
		render(
			<IlamyCalendar
				headerComponent={<OrientationProbe />}
				orientation="vertical"
				resources={[{ id: 'r1', title: 'Room 1' }]}
			/>
		)
		expect(screen.getByTestId('probe-orientation').textContent).toBe('vertical')
	})

	it('defaults the public orientation to horizontal', () => {
		const OrientationProbe = () => (
			<span data-testid="probe-orientation">
				{useIlamyCalendarContext().orientation}
			</span>
		)
		render(<IlamyCalendar headerComponent={<OrientationProbe />} />)
		expect(screen.getByTestId('probe-orientation').textContent).toBe(
			'horizontal'
		)
	})
})

describe('IlamyCalendar - internal edits survive re-render (issue #197)', () => {
	beforeEach(() => {
		cleanup()
	})

	const STANDUP: CalendarEvent = {
		id: 'standup',
		title: 'Daily Standup',
		start: '2025-01-06T10:00:00+00:00',
		end: '2025-01-06T11:00:00+00:00',
		rrule: {
			freq: RRule.WEEKLY,
			interval: 1,
			byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
			dtstart: new Date('2025-01-06T10:00:00.000Z'),
		},
		exdates: [],
	}
	const EVENTS: CalendarEvent[] = [STANDUP]
	const PLUGINS = [recurrencePlugin()]
	const WED_PREFIX = '2025-01-08'

	const EditHarness = () => {
		const { events, applyScopedEdit } = useIlamyCalendarContext()
		const wednesdayStandups = events.filter(
			(e) => e.title === 'Daily Standup' && e.start.startsWith(WED_PREFIX)
		)
		const target = wednesdayStandups.at(0)
		return (
			<div>
				<button
					data-testid="extend-wed"
					onClick={() => {
						if (!target) return
						const nextEnd = toOffsetIso(add(at(target.end), 1, 'hour'))
						applyScopedEdit(target, { end: nextEnd }, 'this')
					}}
					type="button"
				>
					extend
				</button>
				<span data-testid="wed-ends">
					{wednesdayStandups.map((e) => toUtcIso(at(e.end))).join('|')}
				</span>
			</div>
		)
	}

	const calendar = () => (
		<IlamyCalendar
			events={EVENTS}
			headerComponent={<EditHarness />}
			initialDate="2025-01-08T12:00:00Z"
			initialView="week"
			plugins={PLUGINS}
			timezone="UTC"
		/>
	)

	it('keeps a scope-"this" edit after IlamyCalendar re-renders', () => {
		const { rerender } = render(calendar())

		expect(screen.getByTestId('wed-ends').textContent).toBe(
			'2025-01-08T11:00:00.000Z'
		)

		fireEvent.click(screen.getByTestId('extend-wed'))
		expect(screen.getByTestId('wed-ends').textContent).toBe(
			'2025-01-08T12:00:00.000Z'
		)

		rerender(calendar())
		expect(screen.getByTestId('wed-ends').textContent).toBe(
			'2025-01-08T12:00:00.000Z'
		)
	})
})

describe('IlamyCalendar - timezone prop & multi-zone isolation (4.0.1)', () => {
	beforeEach(() => {
		cleanup()
	})

	const StartProbe = ({ testId = 'probe-start' }: { testId?: string }) => {
		const event = useIlamyCalendarContext().events.at(0)
		const zone = useIlamyCalendarContext().timezone ?? 'UTC'
		const parsed = event ? at(event.start, zone) : undefined
		const formatted = parsed
			? `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')} ${getOffsetString(parsed)}`
			: ''
		return <span data-testid={testId}>{formatted}</span>
	}

	const renderWithTokyo = (start: IlamyCalendarPropEvent['start']) => {
		cleanup()
		const endIso = toUtcIso(
			add(
				at(typeof start === 'string' ? start : start.toISOString()),
				1,
				'hour'
			)
		)
		render(
			<IlamyCalendar
				events={[
					{
						id: '1',
						title: 'Standup',
						start,
						end: endIso,
					},
				]}
				headerComponent={<StartProbe />}
				initialDate="2025-01-15T12:00:00.000Z"
				timezone="Asia/Tokyo"
			/>
		)
		return screen.getByTestId('probe-start').textContent
	}

	it('renders an ISO string event on the calendar clock', () => {
		expect(renderWithTokyo('2025-01-15T12:00:00.000Z')).toBe('21:00 +09:00')
	})

	it('renders a Date event on the calendar clock', () => {
		expect(renderWithTokyo(new Date('2025-01-15T12:00:00.000Z'))).toBe(
			'21:00 +09:00'
		)
	})

	const DayProbe = ({ prefix = 'probe' }: { prefix?: string }) => {
		const { currentDate, timezone } = useIlamyCalendarContext()
		const parsed = at(currentDate, timezone ?? 'UTC')
		return (
			<>
				<span data-testid={`${prefix}-day`}>{dayKey(parsed)}</span>
				<span data-testid={`${prefix}-instant`}>{toUtcIso(parsed)}</span>
			</>
		)
	}

	const instantShown = () => screen.getByTestId('probe-instant').textContent

	const dayShownFor = (
		timezone: string,
		initialDate?: IlamyCalendarProps['initialDate']
	) => {
		cleanup()
		render(
			<IlamyCalendar
				headerComponent={<DayProbe />}
				initialDate={initialDate}
				initialView="day"
				timezone={timezone}
			/>
		)
		return screen.getByTestId('probe-day').textContent
	}

	it('opens on the date it was given, wherever the reader is', () => {
		expect(dayShownFor('Pacific/Kiritimati', '2025-03-10')).toBe('2025-03-10')
		expect(dayShownFor('Pacific/Midway', '2025-03-10')).toBe('2025-03-10')
	})

	it('keeps the instant of a value that already names one', () => {
		const iso = '2025-03-10T22:00:00.000Z'

		for (const given of [iso, new Date(iso)]) {
			expect(dayShownFor('Pacific/Kiritimati', given)).toBe('2025-03-11')
			expect(instantShown()).toBe(iso)
		}
	})

	it("opens on the calendar's today when given no date", () => {
		setSystemTime(new Date('2025-03-10T12:30:00.000Z'))
		try {
			expect(dayShownFor('Pacific/Kiritimati')).toBe('2025-03-11')
			expect(dayShownFor('Pacific/Midway')).toBe('2025-03-10')
		} finally {
			setSystemTime()
		}
	})

	it('renders two calendars with different timezones side-by-side without interference', () => {
		const sharedInstant = '2025-03-10T22:00:00.000Z'
		const sharedEvent: IlamyCalendarPropEvent = {
			id: 'global-call',
			title: 'Global Call',
			start: sharedInstant,
			end: '2025-03-10T23:00:00.000Z',
		}

		render(
			<div>
				<IlamyCalendar
					events={[sharedEvent]}
					headerComponent={
						<>
							<DayProbe prefix="ny" />
							<StartProbe testId="ny-start" />
						</>
					}
					initialDate={sharedInstant}
					initialView="day"
					timezone="America/New_York"
				/>
				<IlamyCalendar
					events={[sharedEvent]}
					headerComponent={
						<>
							<DayProbe prefix="tokyo" />
							<StartProbe testId="tokyo-start" />
						</>
					}
					initialDate={sharedInstant}
					initialView="day"
					timezone="Asia/Tokyo"
				/>
			</div>
		)

		// 2025-03-10T22:00Z is 18:00 EDT (-04:00) on Mar 10 in NY, and 07:00 JST (+09:00) on Mar 11 in Tokyo
		expect(screen.getByTestId('ny-day').textContent).toBe('2025-03-10')
		expect(screen.getByTestId('ny-start').textContent).toBe('18:00 -04:00')
		expect(screen.getByTestId('tokyo-day').textContent).toBe('2025-03-11')
		expect(screen.getByTestId('tokyo-start').textContent).toBe('07:00 +09:00')
	})
})

describe('IlamyCalendar - cell click then All day (D11)', () => {
	beforeEach(() => {
		cleanup()
	})

	it('creates a one-day all-day event directly when clicking a month cell', () => {
		const added: CalendarEvent[] = []
		render(
			<IlamyCalendar
				events={[]}
				initialDate="2026-05-13T12:00:00.000Z"
				onEventAdd={(event) => added.push(event)}
				timezone="UTC"
			/>
		)

		fireEvent.click(screen.getByTestId('day-cell-2026-05-13'))
		expect(screen.getByLabelText('All day')).toBeChecked()
		fireEvent.click(screen.getByRole('button', { name: /create|add|save/i }))

		const created = added.at(0)
		expect(created?.allDay).toBe(true)
		expect(created && formatYmdHm(created.start)).toBe('2026-05-13 00:00')
		expect(created && formatYmdHm(created.end)).toBe('2026-05-14 00:00')
	})
})

describe('IlamyCalendar - all-day ISO strings east of UTC (#247)', () => {
	beforeEach(() => {
		cleanup()
	})

	const columnOfFirstEventBar = (): number => {
		const bar = document.querySelector('[data-testid^="horizontal-event-"]')
		const left = Number(bar?.getAttribute('data-left'))
		return Math.round(left / (100 / 7))
	}

	it('places the event in the column its offset denotes, not one day early', () => {
		render(
			<IlamyCalendar
				events={[
					{
						id: '1',
						title: 'All-day event',
						start: '2026-08-17T22:00:00.000Z',
						end: '2026-08-18T22:00:00.000Z',
						allDay: true,
					},
				]}
				initialDate="2026-08-18T12:00:00.000Z"
				timezone="Europe/Vienna"
			/>
		)

		expect(columnOfFirstEventBar()).toBe(2)
	})

	describe('header animation', () => {
		const goToNextPeriod = () => fireEvent.click(screen.getByLabelText('Next'))

		it('leaves the month weekday row in place when changing month', () => {
			render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-03-15T00:00:00Z"
					initialView="month"
					timezone="UTC"
				/>
			)
			const firstWeekday = () =>
				screen.getByTestId('month-header').firstElementChild

			const before = firstWeekday()
			goToNextPeriod()

			expect(firstWeekday()?.textContent).toBe(before?.textContent)
			expect(firstWeekday()).toBe(before)
		})

		it('animates the week day number but not its weekday', () => {
			render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-03-03T00:00:00Z"
					initialView="week"
					timezone="UTC"
				/>
			)
			const dayCell = () => screen.getByTestId('week-view-header').children[1]
			const weekday = () => dayCell().querySelector('[data-today], div > div')

			const weekdayBefore = weekday()
			const textBefore = dayCell().textContent
			goToNextPeriod()

			expect(dayCell().textContent).not.toBe(textBefore)
			expect(weekday()).toBe(weekdayBefore)
		})

		it('animates the week number but not the word beside it', () => {
			render(
				<IlamyCalendar
					events={[]}
					initialDate="2025-03-03T00:00:00Z"
					initialView="week"
					timezone="UTC"
				/>
			)
			const corner = () =>
				screen.getByTestId('week-view-header').firstElementChild
			const label = () => corner()?.querySelector('span')
			const number = () => corner()?.querySelectorAll('div')[1]

			const labelBefore = label()
			const numberBefore = number()
			goToNextPeriod()

			expect(corner()?.textContent).toBe('Week11')
			expect(label()).toBe(labelBefore)
			expect(number()).not.toBe(numberBefore)
		})

		it.each(['vertical', 'horizontal'] as const)(
			'animates the weekday but not the number in the %s resource month header',
			(orientation) => {
				render(
					<IlamyCalendar
						events={[]}
						initialDate="2025-03-01T00:00:00Z"
						initialView="month"
						orientation={orientation}
						resources={[{ id: '1', title: 'Resource 1' }]}
						timezone="UTC"
					/>
				)
				const label = () => document.querySelector('.flex-col-reverse')
				const weekday = () => label()?.children[0]?.firstElementChild
				const dayNumber = () => label()?.children[1]?.firstElementChild

				const weekdayBefore = weekday()
				const numberBefore = dayNumber()
				goToNextPeriod()

				expect(label()?.textContent).toBe('Tue1')
				expect(weekday()).not.toBe(weekdayBefore)
				expect(dayNumber()).toBe(numberBefore)
			}
		)
	})
})

describe('navigation keeps every cell mounted (#300)', () => {
	beforeEach(() => {
		cleanup()
	})

	const RESOURCES = [
		{ id: 'r1', title: 'Room A' },
		{ id: 'r2', title: 'Room B' },
	]
	const LAST_DAY_OF_JULY = '2025-07-31T09:00:00.000Z'

	const getCells = () => [...document.querySelectorAll('.droppable-cell')]
	const getFirstCellStart = () => getCells().at(0)?.getAttribute('data-start')

	interface NavigationCase {
		name: string
		view: 'day' | 'week' | 'month'
		orientation?: 'horizontal' | 'vertical'
		resources?: Resource[]
	}

	test.each<NavigationCase>([
		{ name: 'day', view: 'day' as const },
		{ name: 'week', view: 'week' as const },
		{ name: 'month', view: 'month' as const },
		...(['horizontal', 'vertical'] as const).flatMap((orientation) =>
			(['day', 'week', 'month'] as const).map((view) => ({
				name: `resource ${view} ${orientation}`,
				view,
				orientation,
				resources: RESOURCES,
			}))
		),
	])('$name', ({ view, orientation, resources }) => {
		render(
			<IlamyCalendar
				events={[]}
				initialDate={LAST_DAY_OF_JULY}
				initialView={view}
				orientation={orientation}
				resources={resources}
				timezone="UTC"
			/>
		)
		const cellsBefore = getCells()
		const startBefore = getFirstCellStart()

		fireEvent.click(screen.getByLabelText('Next'))

		const cellsAfter = getCells()
		const sharedCellCount = Math.min(cellsBefore.length, cellsAfter.length)
		const sharedCellsAfter = cellsAfter.slice(0, sharedCellCount)
		const remountedCells = sharedCellsAfter.filter(
			(cell, index) => cell !== cellsBefore.at(index)
		)
		expect(getFirstCellStart()).not.toBe(startBefore)
		expect(remountedCells).toHaveLength(0)
	})
})

describe('formats (D9)', () => {
	const standup: CalendarEvent = {
		id: 'standup',
		title: 'Standup',
		start: '2025-03-12T09:30:00+00:00',
		end: '2025-03-12T10:30:00+00:00',
	}
	const wednesdayWeek = '2025-03-12T09:00:00Z'
	const twentyFourHour = {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	} as const

	const renderWeek = (props: Partial<IlamyCalendarProps> = {}) => {
		cleanup()
		return render(
			<IlamyCalendar
				events={[standup]}
				initialDate={wednesdayWeek}
				initialView="week"
				timezone="UTC"
				{...props}
			/>
		)
	}
	const readBarText = () =>
		screen.getAllByTestId('vertical-event-standup').at(0)?.textContent
	const readGutterLabel = (hour: number) =>
		screen.getByTestId(`vertical-time-${String(hour).padStart(2, '0')}`)
			.textContent
	const readWeekdayHeader = () =>
		screen.getByTestId('week-header-weekday-wednesday').textContent

	it('shows start and end time by default in week view (D9)', () => {
		renderWeek()
		expect(plainSpaces(readBarText())).toBe('9:30 – 10:30 AMStandup')
		expect(readGutterLabel(9)).toBe('9 AM')
		expect(readWeekdayHeader()).toBe('Wed12')
		expect(screen.getByTestId('calendar-title').textContent).toBe('Mar 9 – 15')
	})

	it('shows start time only by default in month view (D9)', () => {
		cleanup()
		render(
			<IlamyCalendar
				events={[standup]}
				initialDate={wednesdayWeek}
				initialView="month"
				timezone="UTC"
			/>
		)
		const bar = screen.getAllByTestId('horizontal-event-standup').at(0)
		expect(plainSpaces(bar?.textContent)).toBe('9:30 AMStandup')
	})

	it('eventTimeFormat formats the bar time range in week view', () => {
		renderWeek({ eventTimeFormat: twentyFourHour })
		expect(plainSpaces(readBarText())).toBe('09:30 – 10:30Standup')
	})

	it('displayEventEnd={false} hides the end time in week view', () => {
		renderWeek({ eventTimeFormat: twentyFourHour, displayEventEnd: false })
		expect(readBarText()).toBe('09:30Standup')
	})

	it('displayEventTime={false} keeps the bar bare even with a format', () => {
		renderWeek({ eventTimeFormat: twentyFourHour, displayEventTime: false })
		expect(readBarText()).toBe('Standup')
	})

	it('renderEvent beats eventTimeFormat', () => {
		renderWeek({
			eventTimeFormat: twentyFourHour,
			renderEvent: (event) => <span>{event.title}!</span>,
		})
		expect(readBarText()).toBe('Standup!')
	})

	it('slotHeaderFormat changes only the gutter labels', () => {
		renderWeek({ slotHeaderFormat: twentyFourHour, displayEventTime: false })
		expect(readGutterLabel(9)).toBe('09:00')
		expect(readBarText()).toBe('Standup')
	})

	it('renderHour beats slotHeaderFormat', () => {
		renderWeek({
			slotHeaderFormat: twentyFourHour,
			renderHour: (iso) => <span>H{at(iso).hour}</span>,
		})
		expect(readGutterLabel(9)).toBe('H9')
	})

	it('dayHeaderFormat is the whole text of a week day header', () => {
		renderWeek({ dayHeaderFormat: { weekday: 'long' } })
		expect(readWeekdayHeader()).toBe('Wednesday')
	})

	it('dayHeaderFormat can carry the day number itself', () => {
		renderWeek({ dayHeaderFormat: { weekday: 'short', day: 'numeric' } })
		const expected = new Intl.DateTimeFormat('en', {
			weekday: 'short',
			day: 'numeric',
			timeZone: 'UTC',
		}).format(new Date('2025-03-12T09:00:00.000Z'))
		expect(readWeekdayHeader()).toBe(expected)
		expect(expected).toContain('12')
	})

	it('dayHeaderFormat keeps the today highlight on the header cell', () => {
		setSystemTime(new Date('2025-03-12T09:00:00.000Z'))
		try {
			renderWeek({ dayHeaderFormat: { weekday: 'long' } })
			const todayMarks = screen
				.getByTestId('week-header-weekday-wednesday')
				.querySelectorAll('[data-today="true"]')
			expect(todayMarks).toHaveLength(1)
		} finally {
			setSystemTime()
		}
	})

	it('dayHeaderFormat is the whole text of the day view header', () => {
		cleanup()
		render(
			<IlamyCalendar
				dayHeaderFormat={{ weekday: 'long' }}
				events={[]}
				initialDate={wednesdayWeek}
				initialView="day"
				timezone="UTC"
			/>
		)
		expect(screen.getByTestId('day-view-header').textContent).not.toContain(
			'March'
		)
		expect(screen.getByTestId('day-view-header').textContent).toContain(
			'Wednesday'
		)
	})

	it('the day view header is unchanged without dayHeaderFormat', () => {
		cleanup()
		render(
			<IlamyCalendar
				events={[]}
				initialDate={wednesdayWeek}
				initialView="day"
				timezone="UTC"
			/>
		)
		expect(screen.getByTestId('day-view-header').textContent).toContain(
			'Wednesday, March 12, 2025'
		)
	})

	describe('dayHeaderFormat on the resource axis', () => {
		const rooms: Resource[] = [
			{ id: 'r1', title: 'Room A' },
			{ id: 'r2', title: 'Room B' },
		]
		const renderResourceView = (
			view: 'week' | 'month',
			orientation: 'vertical' | 'horizontal',
			props: Partial<IlamyCalendarProps> = {}
		) => {
			cleanup()
			return render(
				<IlamyCalendar
					dayHeaderFormat={{ weekday: 'long' }}
					events={[]}
					initialDate={wednesdayWeek}
					initialView={view}
					orientation={orientation}
					resources={rooms}
					timezone="UTC"
					{...props}
				/>
			)
		}
		const wednesdayHeaders = () => screen.getAllByText('Wednesday')

		it('writes each hourly vertical week column header with the format', () => {
			renderResourceView('week', 'vertical')
			expect(wednesdayHeaders()).toHaveLength(rooms.length)
			expect(screen.queryAllByText('Wed')).toHaveLength(0)
		})

		it('writes the daily vertical week gutter with the format', () => {
			renderResourceView('week', 'vertical', { weekViewGranularity: 'daily' })
			expect(wednesdayHeaders()).toHaveLength(1)
			expect(screen.queryAllByText('Wed')).toHaveLength(0)
		})

		it('writes the vertical month gutter with the format', () => {
			renderResourceView('month', 'vertical')
			expect(wednesdayHeaders()).toHaveLength(4)
			expect(screen.queryAllByText('Wed')).toHaveLength(0)
		})

		it('writes the horizontal week header with the format', () => {
			renderResourceView('week', 'horizontal')
			expect(wednesdayHeaders()).toHaveLength(1)
		})
	})

	it('titleFormat changes the toolbar title', () => {
		renderWeek({ titleFormat: { month: 'long', year: 'numeric' } })
		expect(screen.getByTestId('calendar-title').textContent).toBe('March 2025')
	})
})

describe('slotMinTime / slotMaxTime validation', () => {
	let warnSpy: ReturnType<typeof spyOn>

	beforeEach(() => {
		cleanup()
		warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	const listSlotWarnings = () =>
		warnSpy.mock.calls.filter((call: unknown[]) =>
			String(call.at(0)).includes('slotM')
		)

	it('warns once, naming the prop, and shows all 24 hours for an invalid value', () => {
		const { rerender } = render(
			<IlamyCalendar initialView="day" slotMinTime="banana" />
		)
		rerender(<IlamyCalendar initialView="day" slotMinTime="banana" />)

		expect(listSlotWarnings()).toHaveLength(1)
		expect(String(listSlotWarnings().at(0)?.at(0))).toContain('slotMinTime')
		expect(screen.getByTestId('vertical-time-00')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-time-23')).toBeInTheDocument()
	})

	it('does not warn for a valid range', () => {
		render(
			<IlamyCalendar
				initialView="day"
				slotMaxTime="18:00"
				slotMinTime="08:00"
			/>
		)
		expect(listSlotWarnings()).toHaveLength(0)
	})
})

describe('hidden days in every view', () => {
	const wednesday = '2025-03-12T09:00:00Z'
	const dayCellIds = () =>
		screen
			.queryAllByTestId(/^day-cell-\d{4}-\d{2}-\d{2}$/)
			.map((cell) => cell.dataset.testid)
	const renderCalendar = (props: Partial<IlamyCalendarProps> = {}) => {
		cleanup()
		return render(
			<IlamyCalendar
				events={[]}
				initialDate={wednesday}
				initialView="month"
				timezone="UTC"
				{...props}
			/>
		)
	}
	const allDay = (id: string, startISO: string, endISO: string) => ({
		id,
		title: id,
		start: startISO,
		end: endISO,
		allDay: true,
	})
	const segmentFlags = (event: CalendarEvent, segment: EventSegment) => (
		<span data-testid={`bar-${event.id}`}>
			{`${segment.isStart}/${segment.isEnd}`}
		</span>
	)

	describe('month view', () => {
		it('draws five columns per week when weekends is false', () => {
			renderCalendar({ weekends: false })
			const weekdayHeaders = screen.queryAllByTestId(/^month-header-weekday-/)
			expect(weekdayHeaders.map((header) => header.textContent)).toEqual([
				'Mon',
				'Tue',
				'Wed',
				'Thu',
				'Fri',
			])
			expect(dayCellIds()).toHaveLength(30)
			expect(dayCellIds()).not.toContain('day-cell-2025-03-15')
			expect(dayCellIds()).toContain('day-cell-2025-03-14')
		})

		it('draws the same grid for weekends false as for hiding Saturday and Sunday', () => {
			renderCalendar({ hiddenDays: ['saturday', 'sunday'] })
			expect(dayCellIds()).toHaveLength(30)
			expect(dayCellIds()).not.toContain('day-cell-2025-03-16')
		})

		it('hides a single weekday in every week', () => {
			renderCalendar({ hiddenDays: ['wednesday'] })
			expect(screen.queryAllByTestId(/^month-header-weekday-/)).toHaveLength(6)
			expect(dayCellIds()).toHaveLength(36)
			expect(dayCellIds()).not.toContain('day-cell-2025-03-12')
		})

		it('draws one bar per week for an event that runs across the hidden weekend', () => {
			renderCalendar({
				weekends: false,
				events: [
					allDay(
						'trip',
						'2025-03-14T00:00:00.000Z',
						'2025-03-18T00:00:00.000Z'
					),
				],
				renderEvent: segmentFlags,
			})
			const bars = screen.getAllByTestId('bar-trip')
			expect(bars.map((bar) => bar.textContent)).toEqual([
				'true/false',
				'false/true',
			])
		})

		it('draws nothing for an event that lies entirely on hidden days', () => {
			renderCalendar({
				weekends: false,
				events: [
					allDay(
						'weekend',
						'2025-03-15T00:00:00.000Z',
						'2025-03-17T00:00:00.000Z'
					),
				],
				renderEvent: segmentFlags,
			})
			expect(screen.queryAllByTestId('bar-weekend')).toHaveLength(0)
		})

		it('clamps an event that starts on a hidden day to the first visible column', () => {
			renderCalendar({
				weekends: false,
				events: [
					allDay(
						'late',
						'2025-03-15T00:00:00.000Z',
						'2025-03-19T00:00:00.000Z'
					),
				],
				renderEvent: segmentFlags,
			})
			const bar = screen.getByTestId('bar-late')
			expect(bar.textContent).toBe('false/true')
			const wrapper = bar.closest<HTMLElement>(
				'[data-testid="horizontal-event-late"]'
			)
			expect([wrapper?.dataset.left, wrapper?.dataset.width]).toEqual([
				'0',
				'40',
			])
		})

		it('numbers each week from the first day it draws', () => {
			renderCalendar({
				weekends: false,
				weekNumbers: true,
				weekNumberCalculation: 'ISO',
			})
			const weekNumbers = screen
				.getAllByTestId('week-number')
				.map((label) => label.textContent)
			expect(weekNumbers).toEqual(['9', '10', '11', '12', '13', '14'])
		})
	})

	describe('day view', () => {
		const dayTitle = () => screen.getByTestId('day-view-header').textContent
		const press = (name: 'Previous' | 'Next' | 'Today') =>
			fireEvent.click(screen.getByRole('button', { name }))

		it('steps forward over the hidden weekend', () => {
			renderCalendar({
				weekends: false,
				initialView: 'day',
				initialDate: '2025-03-14T09:00:00Z',
			})
			expect(dayTitle()).toContain('Friday, March 14, 2025')
			press('Next')
			expect(dayTitle()).toContain('Monday, March 17, 2025')
		})

		it('steps back over the hidden weekend', () => {
			renderCalendar({
				weekends: false,
				initialView: 'day',
				initialDate: '2025-03-17T09:00:00Z',
			})
			press('Previous')
			expect(dayTitle()).toContain('Friday, March 14, 2025')
		})

		it('opens on the next visible day when it is given a hidden one', () => {
			renderCalendar({
				weekends: false,
				initialView: 'day',
				initialDate: '2025-03-15T09:00:00Z',
			})
			expect(dayTitle()).toContain('Monday, March 17, 2025')
		})

		it('moves a hidden Today to the next visible day', () => {
			setSystemTime(new Date('2025-03-16T10:00:00.000Z'))
			try {
				renderCalendar({
					weekends: false,
					initialView: 'day',
					initialDate: '2025-03-12T09:00:00Z',
				})
				press('Today')
				expect(dayTitle()).toContain('Monday, March 17, 2025')
			} finally {
				setSystemTime()
			}
		})

		it('steps one day at a time when nothing is hidden', () => {
			renderCalendar({
				initialView: 'day',
				initialDate: '2025-03-14T09:00:00Z',
			})
			press('Next')
			expect(dayTitle()).toContain('Saturday, March 15, 2025')
		})
	})

	describe('week view', () => {
		const title = () => screen.getByTestId('calendar-title').textContent

		it('names in its title the range of the days it draws', () => {
			renderCalendar({ weekends: false, initialView: 'week' })
			expect(title()).toBe('Mar 10 – 14')
		})

		it('keeps the week when the date it was given is a hidden day', () => {
			renderCalendar({
				weekends: false,
				initialView: 'week',
				initialDate: '2025-03-15T09:00:00Z',
			})
			expect(title()).toBe('Mar 10 – 14')
			fireEvent.click(screen.getByRole('button', { name: 'Next' }))
			expect(title()).toBe('Mar 17 – 21')
		})
	})

	describe('the set of hidden days', () => {
		const HiddenDaysProbe = ({ seen }: { seen: Set<number>[] }) => {
			const { hiddenDays } = useSmartCalendarContext()
			if (hiddenDays) seen.push(hiddenDays)
			return null
		}
		const renderWith = (hiddenDays: IlamyCalendarProps['hiddenDays']) => {
			const seen: Set<number>[] = []
			const calendar = (days: IlamyCalendarProps['hiddenDays']) => (
				<IlamyCalendar
					headerComponent={<HiddenDaysProbe seen={seen} />}
					hiddenDays={days}
					timezone="UTC"
				/>
			)
			const { rerender } = render(calendar(hiddenDays))
			return {
				seen,
				rerender: (days: typeof hiddenDays) => rerender(calendar(days)),
			}
		}

		it('keeps its identity while the hidden values stay the same', () => {
			cleanup()
			const { seen, rerender } = renderWith(['saturday', 'sunday'])
			rerender(['sunday', 'saturday'])
			expect(new Set(seen).size).toBe(1)
		})

		it('changes identity when the hidden values change', () => {
			cleanup()
			const { seen, rerender } = renderWith(['saturday'])
			rerender(['sunday'])
			expect(new Set(seen).size).toBe(2)
		})
	})

	describe('resource views', () => {
		const rooms = [
			{ id: 'r1', title: 'Room A' },
			{ id: 'r2', title: 'Room B' },
		]
		const renderResources = (
			view: 'week' | 'month',
			orientation: 'vertical' | 'horizontal',
			props: Partial<IlamyCalendarProps> = {}
		) =>
			renderCalendar({
				weekends: false,
				initialView: view,
				orientation,
				resources: rooms,
				...props,
			})
		const cellsOn = (dayISO: string) =>
			screen.queryAllByTestId(new RegExp(`^(day|vertical)-cell-${dayISO}`))

		const gutterCell = 1
		it.each([
			['month', 'vertical', rooms.length + gutterCell],
			['month', 'horizontal', rooms.length],
		] as const)(
			'draws no Saturday or Sunday in the resource %s view, %s',
			(view, orientation, fridayCells) => {
				renderResources(view, orientation)
				expect(cellsOn('2025-03-14')).toHaveLength(fridayCells)
				expect(cellsOn('2025-03-15')).toHaveLength(0)
				expect(cellsOn('2025-03-16')).toHaveLength(0)
			}
		)

		it.each([
			['vertical', 'daily', rooms.length + gutterCell],
			['horizontal', 'daily', rooms.length],
			['horizontal', 'hourly', 24 * rooms.length],
		] as const)(
			'draws no Saturday or Sunday in the %s %s resource week',
			(orientation, weekViewGranularity, fridayCells) => {
				renderResources('week', orientation, { weekViewGranularity })
				expect(cellsOn('2025-03-14')).toHaveLength(fridayCells)
				expect(cellsOn('2025-03-15')).toHaveLength(0)
				expect(cellsOn('2025-03-09')).toHaveLength(0)
			}
		)

		it('draws one resource month bar across the gap between Friday and Monday', () => {
			renderResources('month', 'horizontal', {
				events: [
					{
						...allDay(
							'trip',
							'2025-03-14T00:00:00.000Z',
							'2025-03-18T00:00:00.000Z'
						),
						resourceId: 'r1',
					},
				],
				renderEvent: segmentFlags,
			})
			expect(screen.getAllByTestId('bar-trip')).toHaveLength(1)
			expect(screen.getByTestId('bar-trip').textContent).toBe('true/true')
		})
	})

	describe('hiding every day', () => {
		let warnSpy: ReturnType<typeof spyOn>
		beforeEach(() => {
			warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
		})
		afterEach(() => {
			warnSpy.mockRestore()
		})
		const everyDay = [
			'sunday',
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
			'saturday',
		] as const

		it('ignores the setting and warns once, so the calendar stays usable', () => {
			renderCalendar({ hiddenDays: [...everyDay] })
			expect(screen.queryAllByTestId(/^month-header-weekday-/)).toHaveLength(7)
			const warnings = warnSpy.mock.calls
				.flat()
				.filter((message: string) => message.includes('hide every day'))
			expect(warnings).toHaveLength(1)
		})

		it('does not warn for a partial hide', () => {
			renderCalendar({ weekends: false })
			expect(warnSpy).not.toHaveBeenCalled()
		})
	})
})

describe('IlamyCalendar - events as a function', () => {
	beforeEach(() => {
		cleanup()
	})

	const LOADED = {
		id: 'loaded',
		title: 'Loaded Lunch',
		start: '2025-01-15T12:00:00.000Z',
		end: '2025-01-15T13:00:00.000Z',
	}

	const calendar = (fetcher: () => Promise<(typeof LOADED)[]>) => (
		<IlamyCalendar
			events={fetcher}
			initialDate="2025-01-15T12:00:00.000Z"
			initialView="week"
			timezone="UTC"
		/>
	)

	it('shows the fetched events, with ISO strings normalized', async () => {
		const fetcher = mock(() => Promise.resolve([LOADED]))

		render(calendar(fetcher))

		expect(await screen.findByText('Loaded Lunch')).toBeTruthy()
		expect(fetcher).toHaveBeenCalledTimes(1)
	})

	it('keeps the fetched events and does not refetch when re-rendered with an inline function', async () => {
		const fetcher = mock(() => Promise.resolve([LOADED]))
		const { rerender } = render(calendar(fetcher))
		await screen.findByText('Loaded Lunch')

		const inlineFetcher = mock(() => Promise.resolve([LOADED]))
		rerender(calendar(inlineFetcher))

		expect(screen.getByText('Loaded Lunch')).toBeTruthy()
		expect(fetcher).toHaveBeenCalledTimes(1)
		expect(inlineFetcher).toHaveBeenCalledTimes(0)
	})
})

describe('IlamyCalendar ref', () => {
	beforeEach(() => {
		cleanup()
	})

	const HOUR_PIXELS = 60

	const renderWithRef = (props: Partial<IlamyCalendarProps> = {}) => {
		const ref = createRef<IlamyCalendarApi>()
		render(
			<IlamyCalendar
				events={[]}
				initialDate="2025-03-12T09:00:00.000Z"
				initialView="week"
				ref={ref}
				timezone="UTC"
				{...props}
			/>
		)
		const api = () => {
			if (!ref.current) {
				throw new Error('the ref was not set')
			}
			return ref.current
		}
		return api
	}

	const sampleEvent: CalendarEvent = {
		id: 'ref-event',
		title: 'Ref event',
		start: '2025-03-12T10:00:00+00:00',
		end: '2025-03-12T11:00:00+00:00',
		uid: 'ref-event@ilamy',
	}

	it('exposes the same API the hook returns, once mounted', () => {
		let hookKeys: string[] = []
		const KeysProbe = () => {
			hookKeys = Object.keys(useIlamyCalendarContext()).sort()
			return null
		}
		const api = renderWithRef({ headerComponent: <KeysProbe /> })

		expect(Object.keys(api()).sort()).toEqual(hookKeys)
	})

	it('navigates through the ref and reads the latest ISO date afterwards', () => {
		const api = renderWithRef()

		act(() => api().nextPeriod())
		expect(toUtcIso(at(api().currentDate))).toBe('2025-03-19T09:00:00.000Z')

		act(() => api().prevPeriod())
		act(() => api().prevPeriod())
		expect(toUtcIso(at(api().currentDate))).toBe('2025-03-05T09:00:00.000Z')

		act(() => api().setCurrentDate('2025-06-01T12:00:00.000Z'))
		expect(toUtcIso(at(api().currentDate))).toBe('2025-06-01T12:00:00.000Z')

		setSystemTime(new Date('2025-03-20T08:15:00.000Z'))
		try {
			act(() => api().today())
			expect(toUtcIso(at(api().currentDate))).toBe('2025-03-20T08:15:00.000Z')
		} finally {
			setSystemTime()
		}
	})

	it('changes the rendered view through the ref', () => {
		const api = renderWithRef({ initialView: 'month' })
		expect(screen.queryByTestId('vertical-grid-container')).toBeNull()

		act(() => api().setView('week'))

		expect(api().view).toBe('week')
		expect(screen.getByTestId('vertical-grid-container')).toBeInTheDocument()
	})

	it('adds, updates and deletes through the ref, firing the usual callbacks', () => {
		const onEventAdd = mock(() => {})
		const onEventUpdate = mock(() => {})
		const onEventDelete = mock(() => {})
		const api = renderWithRef({ onEventAdd, onEventUpdate, onEventDelete })

		act(() => api().addEvent(sampleEvent))
		expect(onEventAdd).toHaveBeenCalledTimes(1)
		expect(api().events.map((event) => event.id)).toEqual(['ref-event'])

		act(() => api().updateEvent('ref-event', { title: 'Renamed' }))
		expect(onEventUpdate).toHaveBeenCalledTimes(1)

		act(() => api().deleteEvent('ref-event'))
		expect(onEventDelete).toHaveBeenCalledTimes(1)
		expect(api().events).toHaveLength(0)
	})

	it('refetches through the ref when events is a function', async () => {
		const fetcher = mock(() => Promise.resolve([]))
		const api = renderWithRef({ events: fetcher })
		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))

		act(() => api().refetchEvents())

		await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
	})

	it('hands a callback ref that sets state the same handle every time, so it does not loop', () => {
		const received: (IlamyCalendarApi | null)[] = []
		const Host = () => {
			const [, setApi] = useState<IlamyCalendarApi | null>(null)
			return (
				<IlamyCalendar
					events={[]}
					initialDate="2025-03-12T09:00:00.000Z"
					initialView="week"
					ref={(api) => {
						received.push(api)
						setApi(api)
					}}
					timezone="UTC"
				/>
			)
		}

		render(<Host />)

		const handles = new Set(received.filter(Boolean))
		expect(handles.size).toBe(1)
	})

	it('calls a stable callback ref exactly once', () => {
		const received: (IlamyCalendarApi | null)[] = []
		const onApi = (api: IlamyCalendarApi | null) => {
			received.push(api)
		}

		render(
			<IlamyCalendar
				events={[]}
				initialDate="2025-03-12T09:00:00.000Z"
				ref={onApi}
				timezone="UTC"
			/>
		)

		expect(received.filter(Boolean)).toHaveLength(1)
	})

	it('keeps method identities across a navigation', () => {
		const api = renderWithRef()
		const before = [api().nextPeriod, api().setView, api().scrollToTime]

		act(() => api().nextPeriod())

		const after = [api().nextPeriod, api().setView, api().scrollToTime]
		expect(after).toEqual(before)
	})

	describe('the API the ref reports', () => {
		const INITIAL_DATE = '2025-03-12T09:00:00.000Z'
		const NEXT_WEEK = '2025-03-19T09:00:00.000Z'

		it('is the committed one when the consumer reads it in its own layout effect', () => {
			const ref = createRef<IlamyCalendarApi>()
			const reads: { rendered?: string; viaRef?: string }[] = []
			const Consumer = () => {
				const { currentDate } = useIlamyCalendarContext()
				useLayoutEffect(() => {
					reads.push({
						rendered: toUtcIso(at(currentDate)),
						viaRef: ref.current
							? toUtcIso(at(ref.current.currentDate))
							: undefined,
					})
				}, [currentDate])
				return null
			}
			render(
				<IlamyCalendar
					headerComponent={<Consumer />}
					initialDate={INITIAL_DATE}
					initialView="week"
					ref={ref}
					timezone="UTC"
				/>
			)

			act(() => ref.current?.nextPeriod())

			expect(reads.at(-1)).toEqual({ rendered: NEXT_WEEK, viaRef: NEXT_WEEK })
		})

		it('stays the committed one when a transition render is thrown away', async () => {
			const ref = createRef<IlamyCalendarApi>()
			const neverResolves = new Promise<never>(() => undefined)
			const SuspendsOnNextWeek = () => {
				const { currentDate } = useIlamyCalendarContext()
				const isNextWeek = toUtcIso(at(currentDate)) === NEXT_WEEK
				if (isNextWeek) {
					use(neverResolves)
				}
				return null
			}
			render(
				<Suspense fallback="loading">
					<IlamyCalendar
						headerComponent={<SuspendsOnNextWeek />}
						initialDate={INITIAL_DATE}
						initialView="week"
						ref={ref}
						timezone="UTC"
					/>
				</Suspense>
			)

			await act(async () => {
				startTransition(() => ref.current?.nextPeriod())
			})

			expect(ref.current && toUtcIso(at(ref.current.currentDate))).toBe(
				INITIAL_DATE
			)
		})
	})

	describe('scrollToTime', () => {
		let scrollTo: ReturnType<typeof mock>
		const originalScrollTo = Element.prototype.scrollTo
		const originalRect = Element.prototype.getBoundingClientRect

		beforeEach(() => {
			scrollTo = mock(() => {})
			Element.prototype.scrollTo = scrollTo as unknown as Element['scrollTo']
			Element.prototype.getBoundingClientRect = function (this: Element) {
				const hour = Number(this.getAttribute('data-hour') ?? 0)
				const top = hour * HOUR_PIXELS
				return {
					top,
					left: top,
					bottom: top + HOUR_PIXELS,
					right: top + HOUR_PIXELS,
					width: HOUR_PIXELS,
					height: HOUR_PIXELS,
					x: 0,
					y: top,
					toJSON: () => ({}),
				}
			}
		})

		afterEach(() => {
			Element.prototype.scrollTo = originalScrollTo
			Element.prototype.getBoundingClientRect = originalRect
		})

		const lastScroll = () =>
			scrollTo.mock.calls.at(-1)?.at(0) as ScrollToOptions | undefined
		const lastScrollTop = () => lastScroll()?.top

		it('scrolls an hour grid to the time, with the minute as a fraction of the row', () => {
			const api = renderWithRef({ initialView: 'day' })
			scrollTo.mockClear()

			act(() => api().scrollToTime('13:30'))

			expect(lastScrollTop()).toBe(13 * HOUR_PIXELS + 30)
		})

		it('does nothing in a view without an hour axis', () => {
			const api = renderWithRef({ initialView: 'month' })
			scrollTo.mockClear()

			act(() => api().scrollToTime('13:30'))

			expect(scrollTo).not.toHaveBeenCalled()
		})

		it('scrolls the sideways hour axis of a resource timeline', () => {
			const api = renderWithRef({
				initialView: 'day',
				orientation: 'horizontal',
				resources: [{ id: 'r1', title: 'Room 1' }],
			})
			scrollTo.mockClear()

			act(() => api().scrollToTime('13:30'))

			expect(lastScroll()?.left).toBe(13 * HOUR_PIXELS + 30)
		})

		it('does not replay an earlier request in a view opened afterwards', () => {
			const api = renderWithRef({ initialView: 'month' })
			act(() => api().scrollToTime('15:00'))
			scrollTo.mockClear()

			act(() => api().setView('week'))

			expect(scrollTo).not.toHaveBeenCalled()
		})

		it('does not scroll again when the calendar re-renders or navigates', () => {
			const api = renderWithRef({ initialView: 'day' })
			scrollTo.mockClear()
			act(() => api().scrollToTime('13:30'))

			act(() => api().nextPeriod())

			expect(scrollTo).toHaveBeenCalledTimes(1)
		})

		it('scrolls again when asked for the same time twice', () => {
			const api = renderWithRef({ initialView: 'day' })
			act(() => api().scrollToTime('13:30'))
			scrollTo.mockClear()

			act(() => api().scrollToTime('13:30'))

			expect(lastScrollTop()).toBe(13 * HOUR_PIXELS + 30)
		})
	})
})

describe('IlamyCalendar v4.0 theming & optional plugins (D5, D7)', () => {
	beforeEach(() => {
		cleanup()
	})

	it('applies slotProps and unstyled mode to root, header, and cells', () => {
		render(
			<IlamyCalendar
				events={[]}
				initialDate="2025-03-12T00:00:00Z"
				initialView="month"
				slotProps={{
					root: { className: 'my-root', style: { padding: '4px' } },
					header: { className: 'my-header' },
					cell: { className: 'my-cell' },
				}}
				timezone="UTC"
				unstyled={true}
			/>
		)

		const root = screen.getByTestId('ilamy-calendar')
		expect(root).toHaveClass('my-root')
		expect(root.style.padding).toBe('4px')
		expect(root.className).not.toContain('bg-background')

		expect(screen.getByTestId('calendar-header')).toHaveClass('my-header')
		expect(screen.getByTestId('day-cell-2025-03-12')).toHaveClass('my-cell')
	})

	it('swaps primitive Button via the components prop', () => {
		render(
			<IlamyCalendar
				components={{
					Button: ({ children, ...rest }) => (
						<button data-custom-btn="true" {...rest}>
							{children}
						</button>
					),
				}}
				events={[]}
				initialDate="2025-03-12T00:00:00Z"
				timezone="UTC"
			/>
		)

		const todayBtn = screen.getByRole('button', { name: 'Today' })
		expect(todayBtn.getAttribute('data-custom-btn')).toBe('true')
	})

	it('only registers year view when yearPlugin is provided (D7)', () => {
		render(
			<IlamyCalendar
				events={[]}
				initialDate="2025-03-12T00:00:00Z"
				timezone="UTC"
			/>
		)
		expect(screen.queryByRole('radio', { name: /^year$/i })).toBeNull()

		cleanup()
		render(
			<IlamyCalendar
				events={[]}
				initialDate="2025-03-12T00:00:00Z"
				plugins={[yearPlugin()]}
				timezone="UTC"
			/>
		)
		expect(screen.getByRole('radio', { name: /^year$/i })).toBeInTheDocument()
	})
})
