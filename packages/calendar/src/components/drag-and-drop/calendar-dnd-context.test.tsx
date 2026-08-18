import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { isRecurringEvent } from '@ilamy/calendar-recurrence'
import type { CalendarEvent, Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { act, cleanup, render, screen } from '@testing-library/react'
import type React from 'react'
import { RRule } from 'rrule'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import type { RenderDragTimeIndicatorProps } from '@/features/calendar/types'

let dndContextProps: Record<string, (...args: never[]) => void> = {}
let dragOverlayProps: Record<string, unknown> = {}
let mockIsDragging = false

mock.module('@dnd-kit/core', () => ({
	DndContext: ({
		children,
		...props
	}: {
		children: React.ReactNode
		[key: string]: unknown
	}) => {
		dndContextProps = props as Record<string, (...args: never[]) => void>
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
	useDraggable: () => ({
		attributes: {},
		isDragging: mockIsDragging,
		listeners: {},
		setNodeRef: () => {},
	}),
	useSensor: () => ({}),
	useSensors: () => [],
}))

const { CalendarDndContext } = await import('./calendar-dnd-context')

describe('CalendarDndContext', () => {
	beforeEach(() => {
		cleanup()
		dndContextProps = {}
		dragOverlayProps = {}
		mockIsDragging = false
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

	const renderWithCalendarProvider = (providerProps = {}) => {
		return render(
			<CalendarProvider
				dayMaxEvents={5}
				disableDragAndDrop={false}
				events={[]}
				firstDayOfWeek={0}
				{...providerProps}
			>
				<CalendarDndContext>
					<div data-testid="calendar-content">Test Content</div>
				</CalendarDndContext>
			</CalendarProvider>
		)
	}

	describe('Context Rendering', () => {
		it('should render with DndContext when drag and drop is enabled', () => {
			renderWithCalendarProvider({ disableDragAndDrop: false })
			expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
		})

		it('should portal the fixed drag overlay outside transformed calendar ancestors', () => {
			renderWithCalendarProvider({ disableDragAndDrop: false })

			const dragOverlay = screen.getByTestId('mock-drag-overlay-root')
			expect(dragOverlay.parentElement).toBe(document.body)
		})

		it('should render without DndContext when drag and drop is disabled', () => {
			renderWithCalendarProvider({ disableDragAndDrop: true })
			expect(screen.getByTestId('calendar-content')).toBeInTheDocument()
		})

		it('should NOT show RecurrenceEditDialog initially', () => {
			renderWithCalendarProvider()
			const dialog = screen.queryByRole('dialog')
			expect(dialog).not.toBeInTheDocument()
		})
	})

	describe('minute-accurate dragging', () => {
		const draggedEvent: CalendarEvent = {
			id: 'dragged-event',
			title: 'Design review',
			start: dayjs('2025-01-15T18:00:00.000Z'),
			end: dayjs('2025-01-15T19:00:00.000Z'),
			allDay: false,
			backgroundColor: 'bg-cyan-100',
			color: 'text-cyan-800',
		}
		const sourceEventStyle = { outline: '1px solid rgb(1, 2, 3)' }

		const getRect = (
			left: number,
			top: number,
			width: number,
			height: number
		) => ({
			bottom: top + height,
			height,
			left,
			right: left + width,
			top,
			width,
			x: left,
			y: top,
			toJSON: () => ({}),
		})

		const renderDragHarness = (
			providerProps: Record<string, unknown> = {},
			axis: 'vertical' | 'horizontal' = 'vertical',
			timeCellGap = 0,
			otherLaneStart = 400
		) => {
			mockIsDragging = true
			const destinationResourceId = (
				providerProps.resources as Resource[] | undefined
			)?.at(0)?.id
			render(
				<CalendarProvider
					dayMaxEvents={5}
					events={[draggedEvent]}
					firstDayOfWeek={0}
					initialView="day"
					{...providerProps}
				>
					<CalendarDndContext>
						<div data-calendar-viewport="true">
							<div data-testid="source-event">
								<DraggableEvent
									className="h-full custom-source-class shadow"
									elementId="source-dragged-event"
									event={draggedEvent}
									isTruncatedStart
									style={sourceEventStyle}
									timeAxis={axis}
								/>
							</div>
							<div
								data-disabled="false"
								data-dnd-axis={axis}
								data-dnd-lane="vertical-day"
								data-end="2025-01-15T19:00:00.000Z"
								data-resource-id={destinationResourceId}
								data-start="2025-01-15T18:00:00.000Z"
								data-testid="hour-18"
							/>
							<div
								data-disabled="false"
								data-dnd-axis={axis}
								data-dnd-lane="vertical-day"
								data-end="2025-01-15T20:00:00.000Z"
								data-resource-id={destinationResourceId}
								data-start="2025-01-15T19:00:00.000Z"
								data-testid="hour-19"
							/>
							<div
								data-disabled="false"
								data-dnd-axis={axis}
								data-dnd-lane="other-day"
								data-end="2025-01-16T20:00:00.000Z"
								data-resource-id={destinationResourceId}
								data-start="2025-01-16T19:00:00.000Z"
								data-testid="other-day-hour-19"
							/>
							<div
								data-disabled="false"
								data-dnd-axis={axis}
								data-dnd-lane="other-day"
								data-end="2025-01-16T21:00:00.000Z"
								data-resource-id={destinationResourceId}
								data-start="2025-01-16T20:00:00.000Z"
								data-testid="other-day-hour-20"
							/>
						</div>
					</CalendarDndContext>
				</CalendarProvider>
			)

			let cellRects = [
				{ testId: 'hour-18', value: getRect(100, 100, 200, 60) },
				{
					testId: 'hour-19',
					value: getRect(100, 160 + timeCellGap, 200, 60),
				},
				{
					testId: 'other-day-hour-19',
					value: getRect(otherLaneStart, 160, 200, 60),
				},
				{
					testId: 'other-day-hour-20',
					value: getRect(otherLaneStart, 220, 200, 60),
				},
			]
			if (axis === 'horizontal') {
				cellRects = [
					{ testId: 'hour-18', value: getRect(100, 100, 60, 200) },
					{
						testId: 'hour-19',
						value: getRect(160 + timeCellGap, 100, 60, 200),
					},
					{
						testId: 'other-day-hour-19',
						value: getRect(160, otherLaneStart, 60, 200),
					},
					{
						testId: 'other-day-hour-20',
						value: getRect(220, otherLaneStart, 60, 200),
					},
				]
			}
			for (const cellRect of cellRects) {
				Object.defineProperty(
					screen.getByTestId(cellRect.testId),
					'getBoundingClientRect',
					{ value: () => cellRect.value }
				)
			}
		}

		const startAndMoveToQuarterHour = (
			axis: 'vertical' | 'horizontal' = 'vertical',
			sourceSize?: { width: number; height: number },
			initialRectAvailable = true,
			sourceEvent: CalendarEvent = draggedEvent
		) => {
			const width = sourceSize?.width ?? (axis === 'vertical' ? 120 : 60)
			const height = sourceSize?.height ?? (axis === 'vertical' ? 60 : 120)
			const activeRect =
				axis === 'vertical'
					? getRect(100, 0, width, height)
					: getRect(0, 100, width, height)
			const active = {
				id: 'source-dragged-event',
				data: {
					current: {
						event: sourceEvent,
						presentation: {
							className: 'h-full custom-source-class shadow',
							isTruncatedEnd: false,
							isTruncatedStart: true,
							style: sourceEventStyle,
						},
						timeAxis: sourceEvent.allDay ? undefined : axis,
						type: 'calendar-event',
					},
				},
				rect: {
					current: {
						initial: initialRectAvailable ? activeRect : null,
						translated: activeRect,
					},
				},
			}
			const sourceNode = screen.getByTestId('source-event')
				.firstElementChild as HTMLElement
			Object.defineProperty(sourceNode, 'getBoundingClientRect', {
				configurable: true,
				value: () => activeRect,
			})
			const over = {
				id: 'hour-19',
				data: {
					current: {
						type: 'time-cell',
					},
				},
			}

			act(() => {
				dndContextProps.onDragStart({
					active,
					activatorEvent: {
						clientX: axis === 'vertical' ? 110 : 25,
						clientY: axis === 'vertical' ? 25 : 110,
						target: sourceNode,
					},
				} as never)
			})
			act(() => {
				dndContextProps.onDragMove({
					active,
					delta: axis === 'vertical' ? { x: 0, y: 145 } : { x: 145, y: 0 },
					over,
				} as never)
			})

			return { active, over }
		}

		it('preserves the grab offset, shows the snapped time, and updates at 18:45', () => {
			const onEventUpdate = mock()
			renderDragHarness({
				dragSnapInterval: 15,
				onEventUpdate,
				renderEvent: (event: CalendarEvent) => (
					<span data-testid="custom-event-content">{event.title}</span>
				),
				timeFormat: '24-hour',
			})
			const { active, over } = startAndMoveToQuarterHour()

			expect(screen.getByTestId('drag-time-indicator-host').parentElement).toBe(
				document.body
			)
			expect(screen.getByTestId('drag-time-indicator')).toHaveTextContent(
				'18:45'
			)
			expect(screen.getByTestId('event-drag-overlay')).toHaveStyle({
				height: '60px',
				width: '120px',
			})
			const previewEvent = screen.getByTestId('event-drag-overlay').firstChild
			expect(previewEvent).toHaveClass('h-full', 'custom-source-class')
			expect(previewEvent).toHaveClass('shadow')
			expect(previewEvent).toHaveStyle(sourceEventStyle)
			expect(previewEvent).not.toHaveClass(
				'animate-in',
				'fade-in',
				'slide-in-from-top-2.5'
			)
			expect(dragOverlayProps.adjustScale).toBe(false)
			expect(dragOverlayProps.dropAnimation).toBeNull()
			expect(dragOverlayProps.style).toEqual({ height: 60, width: 120 })
			const modifier = (
				dragOverlayProps.modifiers as Array<(args: never) => { y: number }>
			).at(0)
			if (!modifier) throw new Error('Expected a drag overlay modifier')
			const alignedTransform = modifier({
				activeNodeRect: getRect(100, 1000, 120, 60),
				transform: { x: 0, y: -1000, scaleX: 1, scaleY: 1 },
			} as never)
			expect(alignedTransform.y).toBe(145)
			expect(screen.getAllByTestId('custom-event-content')).toHaveLength(2)
			expect(screen.getByTestId('source-event').firstElementChild).toHaveClass(
				'opacity-50'
			)

			act(() => {
				dndContextProps.onDragEnd({ active, over } as never)
			})

			expect(onEventUpdate).toHaveBeenCalledTimes(1)
			expect(onEventUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					start: expect.objectContaining({}),
				})
			)
			const updated = onEventUpdate.mock.calls.at(0)?.at(0) as CalendarEvent
			expect(updated.start.toISOString()).toBe('2025-01-15T18:45:00.000Z')
			expect(updated.end.toISOString()).toBe('2025-01-15T19:45:00.000Z')
			expect(screen.queryByTestId('event-drag-overlay')).toBeNull()
			expect(screen.queryByTestId('drag-time-indicator')).toBeNull()
		})

		it('preserves default colors and truncation styling in the preview', () => {
			renderDragHarness({ dragSnapInterval: 15 })
			startAndMoveToQuarterHour()

			const previewEvent = screen.getByTestId('event-drag-overlay').firstChild
			const defaultContent = previewEvent?.firstChild
			expect(defaultContent).toHaveClass(
				'bg-cyan-100',
				'text-cyan-800',
				'rounded-r-md',
				'rounded-l-none'
			)
		})

		it('preserves the full height of a two-hour Week event', () => {
			renderDragHarness({ dragSnapInterval: 15 })
			startAndMoveToQuarterHour(
				'vertical',
				{
					height: 121.9140625,
					width: 43.9609375,
				},
				false
			)

			expect(screen.getByTestId('event-drag-overlay')).toHaveStyle({
				height: '121.9140625px',
				width: '43.9609375px',
			})
			expect(dragOverlayProps.style).toEqual({
				height: 121.9140625,
				width: 43.9609375,
			})
		})

		it('passes axis-aware context to a custom indicator and honors visibility', () => {
			const room = { id: 'room-1', title: 'Room 1' }
			const onEventUpdate = mock()
			const renderIndicator = mock(
				({ selectedTime, axis }: RenderDragTimeIndicatorProps) => (
					<div data-testid="custom-drag-indicator">
						{axis}:{selectedTime.format('HH:mm')}
					</div>
				)
			)
			renderDragHarness({
				dragSnapInterval: 15,
				onEventUpdate,
				renderDragTimeIndicator: renderIndicator,
				resources: [room],
			})
			const { active, over } = startAndMoveToQuarterHour('vertical')

			expect(screen.getByTestId('custom-drag-indicator')).toHaveTextContent(
				'vertical:18:45'
			)
			expect(renderIndicator).toHaveBeenCalledTimes(1)
			expect(renderIndicator.mock.calls.at(0)?.at(0)).toEqual({
				axis: 'vertical',
				event: draggedEvent,
				progress: 75,
				rangeEnd: expect.objectContaining({}),
				rangeStart: expect.objectContaining({}),
				resource: room,
				selectedTime: expect.objectContaining({}),
				view: 'day',
			})
			const indicatorProps = renderIndicator.mock.calls.at(0)?.at(0)
			if (!indicatorProps) throw new Error('Expected drag indicator props')
			expect(indicatorProps.selectedTime.toISOString()).toBe(
				'2025-01-15T18:45:00.000Z'
			)
			expect(indicatorProps.rangeStart.toISOString()).toBe(
				'2025-01-15T18:00:00.000Z'
			)
			expect(indicatorProps.rangeEnd.toISOString()).toBe(
				'2025-01-15T19:00:00.000Z'
			)

			act(() => {
				dndContextProps.onDragMove({
					active,
					delta: { x: 0, y: 140 },
					over,
				} as never)
			})
			expect(renderIndicator).toHaveBeenCalledTimes(1)
			expect(screen.getByTestId('custom-drag-indicator')).toBeInTheDocument()

			act(() => {
				dndContextProps.onDragMove({
					active,
					delta: { x: 0, y: 140 },
					over: null,
				} as never)
			})
			expect(screen.getByTestId('custom-drag-indicator')).toBeInTheDocument()
			expect(renderIndicator).toHaveBeenCalledTimes(1)

			act(() => {
				dndContextProps.onDragEnd({ active, over } as never)
			})
			const updatedEvent = onEventUpdate.mock.calls
				.at(0)
				?.at(0) as CalendarEvent
			expect(updatedEvent.resourceId).toBe(room.id)

			expect(renderIndicator).toHaveBeenCalledTimes(1)

			cleanup()
			dndContextProps = {}
			renderIndicator.mockClear()
			renderDragHarness({
				dragSnapInterval: 15,
				renderDragTimeIndicator: renderIndicator,
				showDragTimeIndicator: false,
			})
			startAndMoveToQuarterHour()

			expect(screen.queryByTestId('custom-drag-indicator')).toBeNull()
			expect(renderIndicator).toHaveBeenCalledTimes(0)
		})

		it('uses pointer geometry when the collision target lags behind', () => {
			const onEventUpdate = mock()
			renderDragHarness({
				dragSnapInterval: 15,
				onEventUpdate,
				timeFormat: '24-hour',
			})
			const { active, over } = startAndMoveToQuarterHour()

			act(() => {
				dndContextProps.onDragMove({
					active,
					delta: { x: 310, y: 205 },
					over,
				} as never)
			})

			expect(screen.getByTestId('drag-time-indicator-host')).toHaveStyle({
				left: '400px',
				top: '160px',
			})
			expect(screen.getByTestId('drag-time-indicator')).toHaveTextContent(
				'19:45'
			)

			act(() => {
				dndContextProps.onDragEnd({ active, over } as never)
			})
			const updated = onEventUpdate.mock.calls.at(0)?.at(0) as CalendarEvent
			expect(updated.start.toISOString()).toBe('2025-01-16T19:45:00.000Z')
		})

		it('resolves timed drag geometry only within the source calendar', () => {
			render(
				<div
					data-disabled="false"
					data-dnd-axis="vertical"
					data-dnd-lane="foreign-day"
					data-end="2025-01-16T19:00:00.000Z"
					data-start="2025-01-16T18:00:00.000Z"
					data-testid="foreign-calendar-cell"
				/>
			)
			const foreignCell = screen.getByTestId('foreign-calendar-cell')
			Object.defineProperty(foreignCell, 'getBoundingClientRect', {
				value: () => getRect(100, 400, 200, 60),
			})
			renderDragHarness({ dragSnapInterval: 15, timeFormat: '24-hour' })

			startAndMoveToQuarterHour()

			expect(screen.getByTestId('drag-time-indicator')).toHaveTextContent(
				'18:45'
			)
		})

		it('uses the pointer as the time anchor for an all-day source event', () => {
			const allDayEvent: CalendarEvent = {
				...draggedEvent,
				allDay: true,
				start: dayjs('2025-01-15T00:00:00.000Z'),
				end: dayjs('2025-01-16T00:00:00.000Z'),
			}
			renderDragHarness({ dragSnapInterval: 15, timeFormat: '24-hour' })

			startAndMoveToQuarterHour('vertical', undefined, true, allDayEvent)

			expect(screen.getByTestId('drag-time-indicator')).toHaveTextContent(
				'19:15'
			)
		})

		it('rejects a pointer outside the timed grid', () => {
			const onEventUpdate = mock()
			renderDragHarness({ dragSnapInterval: 15, onEventUpdate })
			const { active, over } = startAndMoveToQuarterHour()

			act(() => {
				window.dispatchEvent(
					new MouseEvent('mousemove', { clientX: 900, clientY: 900 })
				)
				dndContextProps.onDragMove({
					active,
					delta: { x: 790, y: 875 },
					over,
				} as never)
			})

			expect(screen.queryByTestId('drag-time-indicator')).toBeNull()
			act(() => {
				dndContextProps.onDragEnd({ active, over } as never)
			})
			expect(onEventUpdate).toHaveBeenCalledTimes(0)
		})

		it('keeps the snap position at the viewport pointer during auto-scroll', () => {
			renderDragHarness({ dragSnapInterval: 15, timeFormat: '24-hour' })
			const { active, over } = startAndMoveToQuarterHour()

			act(() => {
				window.dispatchEvent(
					new MouseEvent('mousemove', { clientX: 110, clientY: 170 })
				)
				dndContextProps.onDragMove({
					active,
					delta: { x: 0, y: 205 },
					over,
				} as never)
			})

			expect(screen.getByTestId('drag-time-indicator')).toHaveTextContent(
				'18:45'
			)
			const modifier = (
				dragOverlayProps.modifiers as Array<(args: never) => { y: number }>
			).at(0)
			if (!modifier) throw new Error('Expected a drag overlay modifier')
			const transform = modifier({
				transform: { x: 0, y: 205, scaleX: 1, scaleY: 1 },
			} as never)
			expect(transform.y).toBe(145)
		})

		it('keeps the indicator and drop active in a gap between timed cells', () => {
			const onEventUpdate = mock()
			renderDragHarness(
				{
					dragSnapInterval: 15,
					onEventUpdate,
					timeFormat: '24-hour',
				},
				'vertical',
				1
			)
			const { active, over } = startAndMoveToQuarterHour()

			act(() => {
				window.dispatchEvent(
					new MouseEvent('mousemove', { clientX: 110, clientY: 185.5 })
				)
				dndContextProps.onDragMove({
					active,
					delta: { x: 0, y: 160.5 },
					over,
				} as never)
			})

			expect(screen.getByTestId('drag-time-indicator')).toHaveTextContent(
				'19:00'
			)
			act(() => {
				dndContextProps.onDragEnd({ active, over } as never)
			})
			const updated = onEventUpdate.mock.calls.at(0)?.at(0) as CalendarEvent
			expect(updated.start.toISOString()).toBe('2025-01-15T19:00:00.000Z')
		})

		it('keeps the indicator active in a gap between timed lanes', () => {
			renderDragHarness(
				{ dragSnapInterval: 15, timeFormat: '24-hour' },
				'vertical',
				0,
				301
			)
			const { active, over } = startAndMoveToQuarterHour()

			act(() => {
				window.dispatchEvent(
					new MouseEvent('mousemove', { clientX: 300.5, clientY: 205 })
				)
				dndContextProps.onDragMove({
					active,
					delta: { x: 190.5, y: 180 },
					over,
				} as never)
			})

			expect(screen.getByTestId('drag-time-indicator-host')).toHaveStyle({
				left: '301px',
				top: '160px',
			})
			expect(screen.getByTestId('drag-time-indicator')).toHaveTextContent(
				'19:15'
			)
		})

		it('formats the built-in label in 12-hour time', () => {
			renderDragHarness({ dragSnapInterval: 15, timeFormat: '12-hour' })
			startAndMoveToQuarterHour()

			expect(screen.getByTestId('drag-time-indicator')).toHaveTextContent(
				'6:45 PM'
			)
		})

		it('resolves snapped clock time in the configured timezone', () => {
			const onEventUpdate = mock()
			renderDragHarness({
				dragSnapInterval: 15,
				onEventUpdate,
				timeFormat: '24-hour',
				timezone: 'America/New_York',
			})
			const { active, over } = startAndMoveToQuarterHour()

			expect(screen.getByTestId('drag-time-indicator')).toHaveTextContent(
				'13:45'
			)
			act(() => {
				dndContextProps.onDragEnd({ active, over } as never)
			})
			const updated = onEventUpdate.mock.calls.at(0)?.at(0) as CalendarEvent
			expect(updated.start.toISOString()).toBe('2025-01-15T18:45:00.000Z')
		})

		it('uses a vertical snap line when time runs horizontally', () => {
			renderDragHarness(
				{
					dragSnapInterval: 15,
					timeFormat: '24-hour',
				},
				'horizontal'
			)
			startAndMoveToQuarterHour('horizontal')

			const indicator = screen.getByTestId('drag-time-indicator')
			expect(indicator).toHaveTextContent('18:45')
			expect(indicator).toHaveStyle({ left: '75%' })
		})

		it('rejects a snapped start in a disabled cell and clears visuals on cancel', () => {
			const onEventUpdate = mock()
			renderDragHarness({
				dragSnapInterval: 60,
				onEventUpdate,
			})
			screen.getByTestId('hour-19').dataset.disabled = 'true'
			const { active, over } = startAndMoveToQuarterHour()

			expect(screen.queryByTestId('drag-time-indicator')).toBeNull()
			act(() => {
				dndContextProps.onDragEnd({ active, over } as never)
			})
			expect(onEventUpdate).toHaveBeenCalledTimes(0)

			const nextDrag = startAndMoveToQuarterHour()
			act(() => {
				dndContextProps.onDragCancel(nextDrag as never)
			})
			expect(screen.queryByTestId('event-drag-overlay')).toBeNull()
			expect(screen.queryByTestId('drag-time-indicator')).toBeNull()
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
