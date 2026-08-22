import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { isRecurringEvent } from '@ilamy/calendar-recurrence'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { act, render, screen } from '@testing-library/react'
import type React from 'react'
import { RRule } from 'rrule'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'

let dragOverlayProps: Record<string, unknown> = {}
let dndContextProps: {
	onDragEnd?: (event: unknown) => void
} = {}
let mockActive: {
	data: { current: Record<string, unknown> }
} | null = null

mock.module('@dnd-kit/core', () => ({
	DndContext: ({
		children,
		...props
	}: {
		children: React.ReactNode
		[key: string]: unknown
	}) => {
		dndContextProps = props
		return <>{children}</>
	},
	DragOverlay: ({
		children,
		...props
	}: {
		children: React.ReactNode
		[key: string]: unknown
	}) => {
		dragOverlayProps = props
		return <div data-testid="mock-drag-overlay-root">{children}</div>
	},
	MouseSensor: class {},
	TouchSensor: class {},
	pointerWithin: () => [],
	useDndContext: () => ({ active: mockActive }),
	useDraggable: () => ({
		attributes: { role: 'button', tabIndex: 0 },
		isDragging: true,
		listeners: {},
		setNodeRef: () => {},
	}),
	useSensor: () => ({}),
	useSensors: () => [],
}))

const { CalendarDndContext } = await import('./calendar-dnd-context')

describe('CalendarDndContext', () => {
	beforeEach(() => {
		dndContextProps = {}
		dragOverlayProps = {}
		mockActive = null
	})

	const createRecurringEvent = (): CalendarEvent => ({
		id: 'recurring-event-1',
		title: 'Weekly Meeting',
		start: dayjs('2025-01-15T09:00:00.000Z'),
		end: dayjs('2025-01-15T10:00:00.000Z'),
		color: 'bg-green-500',
		allDay: false,
		rrule: {
			freq: RRule.WEEKLY,
			byweekday: [RRule.MO],
			interval: 1,
			dtstart: dayjs('2025-01-15T00:00:00.000Z').toDate(),
		},
		uid: 'recurring-event-1@calendar',
	})

	const draggedEvent: CalendarEvent = {
		id: 'dragged-event',
		title: 'Design review',
		start: dayjs('2025-01-15T18:00:00.000Z'),
		end: dayjs('2025-01-15T20:00:00.000Z'),
		allDay: false,
		backgroundColor: 'bg-cyan-100',
		color: 'text-cyan-800',
	}
	const timedDropTarget = {
		data: {
			current: {
				date: '2025-01-16T00:00:00.000Z',
				hour: 19,
				minute: 0,
				type: 'time-cell',
			},
		},
	}

	const getHarness = (
		providerProps: Record<string, unknown> = {},
		style?: React.CSSProperties
	) => (
		<CalendarProvider
			dayMaxEvents={5}
			events={[draggedEvent]}
			firstDayOfWeek={0}
			{...providerProps}
		>
			<CalendarDndContext>
				<div data-testid="source-event">
					<DraggableEvent
						className="h-full custom-source-class shadow"
						elementId="source-dragged-event"
						event={draggedEvent}
						isTruncatedStart
						style={style}
					/>
				</div>
			</CalendarDndContext>
		</CalendarProvider>
	)

	const startDrag = () => {
		mockActive = {
			data: {
				current: {
					event: draggedEvent,
					presentation: {
						className: 'h-full custom-source-class shadow',
						isTruncatedStart: true,
					},
					type: 'calendar-event',
				},
			},
		}
	}

	it('renders the faithful custom event presentation in DragOverlay', () => {
		startDrag()
		render(
			getHarness({
				renderEvent: (event: CalendarEvent) => (
					<span data-testid="custom-event-content">{event.title}</span>
				),
			})
		)

		const overlayRoot = screen.getByTestId('mock-drag-overlay-root')
		const previewEvent = overlayRoot.firstElementChild
		expect(overlayRoot.parentElement).toBe(document.body)
		expect(previewEvent).toHaveClass(
			'h-full',
			'w-full',
			'custom-source-class',
			'shadow'
		)
		expect(previewEvent).not.toHaveClass(
			'animate-in',
			'fade-in',
			'slide-in-from-top-2.5'
		)
		expect(previewEvent).not.toHaveAttribute('role')
		expect(previewEvent).not.toHaveAttribute('tabindex')
		expect(screen.getAllByTestId('custom-event-content')).toHaveLength(2)
		expect(screen.getByTestId('source-event').firstElementChild).toHaveClass(
			'opacity-50'
		)
		expect(dragOverlayProps.adjustScale).toBeUndefined()
		expect(dragOverlayProps.dropAnimation).toBeNull()
		expect(dragOverlayProps.modifiers).toBeUndefined()
	})

	it('renders the faithful default event presentation in DragOverlay', () => {
		startDrag()
		render(getHarness())

		expect(screen.getAllByText('Design review')).toHaveLength(2)
	})

	it('updates the event when only its style changes', () => {
		const { rerender } = render(getHarness({}, { height: '24px' }))
		const sourceEvent = screen.getByTestId('source-event')
			.firstElementChild as HTMLElement
		expect(sourceEvent.style.height).toBe('24px')

		rerender(getHarness({}, { height: '48px' }))

		expect(sourceEvent.style.height).toBe('48px')
	})

	it('updates the event from the active drag data on drop', () => {
		const onEventUpdate = mock((_event: CalendarEvent) => {})
		render(getHarness({ onEventUpdate }))

		act(() => {
			dndContextProps.onDragEnd?.({
				active: {
					data: {
						current: { event: draggedEvent, type: 'calendar-event' },
					},
				},
				over: timedDropTarget,
			})
		})

		expect(onEventUpdate).toHaveBeenCalledTimes(1)
		const updatedEvent = onEventUpdate.mock.calls.at(0)?.at(0)
		expect(updatedEvent?.start.hour()).toBe(19)
		expect(updatedEvent?.end.diff(updatedEvent.start, 'hour')).toBe(2)
	})

	it('ignores event data from another drag type', () => {
		const onEventUpdate = mock((_event: CalendarEvent) => {})
		render(getHarness({ onEventUpdate }))

		act(() => {
			dndContextProps.onDragEnd?.({
				active: {
					data: { current: { event: draggedEvent, type: 'other-drag' } },
				},
				over: timedDropTarget,
			})
		})

		expect(onEventUpdate).not.toHaveBeenCalled()
	})

	describe('Context Rendering', () => {
		it('should render with DndContext when drag and drop is enabled', () => {
			render(getHarness({ disableDragAndDrop: false }))
			expect(screen.getByTestId('source-event')).toBeInTheDocument()
		})

		it('should render without DndContext when drag and drop is disabled', () => {
			render(getHarness({ disableDragAndDrop: true }))
			expect(screen.getByTestId('source-event')).toBeInTheDocument()
			expect(screen.queryByTestId('mock-drag-overlay-root')).toBeNull()
		})

		it('should NOT show RecurrenceEditDialog initially', () => {
			render(getHarness())
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		})
	})

	describe('isRecurringEvent Utility', () => {
		it('should return false for regular events without uid or rrule', () => {
			const regularEvent: CalendarEvent = {
				id: 'regular',
				title: 'Regular',
				start: dayjs('2025-01-15T09:00:00.000Z'),
				end: dayjs('2025-01-15T10:00:00.000Z'),
				allDay: false,
			}

			expect(isRecurringEvent(regularEvent)).toBe(false)
			expect(regularEvent.uid).toBeUndefined()
			expect(regularEvent.rrule).toBeUndefined()
			expect(regularEvent.recurrenceId).toBeUndefined()
		})

		it('should return true for events with rrule', () => {
			const recurringEvent = createRecurringEvent()

			expect(isRecurringEvent(recurringEvent)).toBe(true)
			expect(recurringEvent.rrule).toBeDefined()
			expect(recurringEvent.rrule?.freq).toBe(RRule.WEEKLY)
		})

		it('should return true for events with uid', () => {
			const instance: CalendarEvent = {
				id: 'instance',
				title: 'Instance',
				start: dayjs('2025-01-15T09:00:00.000Z'),
				end: dayjs('2025-01-15T10:00:00.000Z'),
				uid: 'recurring@calendar',
				allDay: false,
			}

			expect(isRecurringEvent(instance)).toBe(true)
			expect(instance.uid).toBe('recurring@calendar')
		})

		it('should return true for events with recurrenceId', () => {
			const modifiedInstance: CalendarEvent = {
				id: 'modified',
				title: 'Modified',
				start: dayjs('2025-01-15T09:00:00.000Z'),
				end: dayjs('2025-01-15T10:00:00.000Z'),
				uid: 'recurring@calendar',
				recurrenceId: '2025-01-15T09:00:00.000Z',
				allDay: false,
			}

			expect(isRecurringEvent(modifiedInstance)).toBe(true)
			expect(modifiedInstance.recurrenceId).toBe('2025-01-15T09:00:00.000Z')
		})
	})
})
