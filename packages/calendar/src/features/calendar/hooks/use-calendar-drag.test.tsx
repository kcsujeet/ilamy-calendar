import { describe, expect, it, mock } from 'bun:test'
import type {
	DragEndEvent,
	DragMoveEvent,
	DragOverEvent,
	DragStartEvent,
} from '@dnd-kit/core'
import type { CalendarEvent, EventDropInfo } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CalendarTestProvider } from '@/testing'
import { useCalendarDrag } from './use-calendar-drag'

const wrapper = ({ children }: { children: ReactNode }) => (
	<CalendarTestProvider>{children}</CalendarTestProvider>
)

/** The sensors the hook hands dnd-kit, before and after a re-render. */
const renderSensorsAcrossRerender = () => {
	const { result, rerender } = renderHook(() => useCalendarDrag(() => {}), {
		wrapper,
	})
	const before = result.current.sensors
	rerender()
	return { before, after: result.current.sensors }
}

describe('useCalendarDrag', () => {
	it('keeps one sensor list across re-renders', () => {
		// dnd-kit's useSensor memoizes on the options object; a new list on
		// every render rebuilt its context and re-rendered every cell.
		const { before, after } = renderSensorsAcrossRerender()
		expect(after).toBe(before)
	})
})

describe('useCalendarDrag eventAllow', () => {
	const dragged: CalendarEvent = {
		id: 'event-1',
		title: 'Event',
		start: dayjs('2025-03-12T09:00:00.000Z'),
		end: dayjs('2025-03-12T10:00:00.000Z'),
		resourceId: 'room-a',
	}
	const cell = {
		type: 'day-cell',
		date: dayjs('2025-03-15T00:00:00.000Z'),
		hour: 14,
		minute: 0,
		resourceId: 'room-b',
		allDay: false,
	}
	const active = {
		id: 'event-1',
		data: { current: { type: 'calendar-event', event: dragged } },
	}
	const over = { id: 'cell', data: { current: cell } }
	const disabledOver = {
		id: 'cell',
		data: { current: { ...cell, disabled: true } },
	}

	type EventAllow = (info: EventDropInfo, event: CalendarEvent) => boolean

	/** A drag hook inside a calendar that asks `eventAllow`, with the gestures as plain calls. */
	const renderDragHook = (eventAllow?: EventAllow) => {
		const commitDrop = mock(() => {})
		const { result } = renderHook(() => useCalendarDrag(commitDrop), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<CalendarTestProvider eventAllow={eventAllow}>
					{children}
				</CalendarTestProvider>
			),
		})
		const handlers = () => result.current.handlers
		return {
			commitDrop,
			hoveredPreview: () => result.current.dragPreview,
			grab: () =>
				act(() =>
					handlers().onDragStart({
						active,
						activatorEvent: new Event('mousedown'),
					} as unknown as DragStartEvent)
				),
			hover: (target = over) =>
				act(() =>
					handlers().onDragOver({
						active,
						over: target,
					} as unknown as DragOverEvent)
				),
			release: (target = over) =>
				act(() =>
					handlers().onDragEnd({
						active,
						over: target,
					} as unknown as DragEndEvent)
				),
		}
	}

	it('hands eventAllow the candidate placement and the event before the drag', () => {
		const eventAllow = mock<EventAllow>(() => true)
		const drag = renderDragHook(eventAllow)
		drag.grab()
		drag.hover()

		const [info, draggedEvent] = eventAllow.mock.calls.at(0) ?? []
		expect(info?.start.toISOString()).toBe('2025-03-15T14:00:00.000Z')
		expect(info?.end.toISOString()).toBe('2025-03-15T15:00:00.000Z')
		expect(info?.allDay).toBe(false)
		expect(info?.resourceId).toBe('room-b')
		expect(draggedEvent).toBe(dragged)
	})

	it('marks the placement refused and commits nothing when eventAllow says no', () => {
		const drag = renderDragHook(() => false)
		drag.grab()
		drag.hover()
		const hovered = drag.hoveredPreview()
		drag.release()

		expect(hovered?.isDropAllowed).toBe(false)
		expect(drag.commitDrop).not.toHaveBeenCalled()
	})

	it('commits the drop when eventAllow says yes', () => {
		const drag = renderDragHook(() => true)
		drag.grab()
		drag.hover()
		const hovered = drag.hoveredPreview()
		drag.release()

		expect(hovered?.isDropAllowed).toBe(true)
		expect(drag.commitDrop).toHaveBeenCalledTimes(1)
	})

	it('vetoes a release that arrives before any drag-over was processed', () => {
		// dnd-kit fires drag-over from an effect, so a fast release can reach
		// onDragEnd first. The veto must be read from the release itself.
		const drag = renderDragHook(() => false)
		drag.grab()
		drag.release()

		expect(drag.commitDrop).not.toHaveBeenCalled()
	})

	it('asks once per placement across hover moves and the release', () => {
		const eventAllow = mock<EventAllow>(() => true)
		const drag = renderDragHook(eventAllow)
		drag.grab()
		for (let move = 0; move < 5; move += 1) {
			drag.hover()
		}
		drag.release()

		expect(eventAllow).toHaveBeenCalledTimes(1)
	})

	it('does not ask eventAllow about a cell that already refuses drops', () => {
		const eventAllow = mock<EventAllow>(() => true)
		const drag = renderDragHook(eventAllow)
		drag.grab()
		drag.hover(disabledOver)
		const hovered = drag.hoveredPreview()
		drag.release(disabledOver)

		expect(hovered?.isDropAllowed).toBe(false)
		expect(eventAllow).not.toHaveBeenCalled()
		expect(drag.commitDrop).not.toHaveBeenCalled()
	})
})

describe('useCalendarDrag resize', () => {
	// Zoneless strings are read in the calendar's zone, which is the machine's
	// here, so the fixtures and the wall-clock assertions agree under any TZ.
	const at = (wallClock: string) => dayjs(wallClock)
	const wall = (date: Dayjs | undefined) => date?.format('YYYY-MM-DDTHH:mm')

	const meeting: CalendarEvent = {
		id: 'event-1',
		title: 'Meeting',
		start: at('2025-03-12T09:00:00'),
		end: at('2025-03-12T10:00:00'),
		resourceId: 'room-a',
	}
	// One draggable per bar: a resize is the same bar pressed on a handle, which
	// the activator event's target says (FullCalendar tells them apart the same
	// way, `EventDragging.ts:110`, v7.1.1).
	const resizableBar = {
		id: 'event-1',
		data: {
			current: {
				type: 'calendar-event',
				event: meeting,
				resizeGranularity: 'slot',
				sourceResourceId: 'room-a',
			},
		},
	}
	const pressedOn = (edge: 'start' | 'end' | 'bar') => {
		const target = document.createElement('div')
		if (edge !== 'bar') {
			target.setAttribute('data-resize-handle', edge)
		}
		const press = new Event('mousedown')
		target.dispatchEvent(press)
		return press
	}
	const slotCell = (hourOfDay: number, extra = {}) => ({
		id: 'cell',
		data: {
			current: {
				type: 'day-cell',
				date: at('2025-03-12T00:00:00'),
				hour: hourOfDay,
				minute: 0,
				slotDurationMinutes: 30,
				resourceId: 'room-a',
				...extra,
			},
		},
	})
	const dayCell = {
		id: 'day',
		data: {
			current: { type: 'day-cell', date: at('2025-03-14T00:00:00') },
		},
	}

	type EventAllow = (info: EventDropInfo, event: CalendarEvent) => boolean
	type ProviderProps = Omit<
		React.ComponentProps<typeof CalendarTestProvider>,
		'children'
	>

	const renderResizeHook = (
		edge: 'start' | 'end' | 'bar' = 'end',
		providerProps: ProviderProps = {}
	) => {
		const commitDrop = mock(
			(_event: CalendarEvent, _updates: Partial<CalendarEvent>) => {}
		)
		const { result } = renderHook(() => useCalendarDrag(commitDrop), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<CalendarTestProvider
					initialDate={at('2025-03-12T00:00:00')}
					initialView="week"
					{...providerProps}
				>
					{children}
				</CalendarTestProvider>
			),
		})
		const active = resizableBar
		return {
			commitDrop,
			preview: () => result.current.dragPreview,
			grab: () =>
				act(() =>
					result.current.handlers.onDragStart({
						active,
						activatorEvent: pressedOn(edge),
					} as unknown as DragStartEvent)
				),
			hover: (over: unknown) =>
				act(() =>
					result.current.handlers.onDragOver({
						active,
						over,
					} as unknown as DragOverEvent)
				),
			moveOver: (over: unknown) =>
				act(() =>
					result.current.handlers.onDragMove({
						active,
						over,
					} as unknown as DragMoveEvent)
				),
			release: (over: unknown) =>
				act(() =>
					result.current.handlers.onDragEnd({
						active,
						over,
					} as unknown as DragEndEvent)
				),
		}
	}

	it('previews the end at the end of the hovered slot and keeps the start', () => {
		const drag = renderResizeHook()
		drag.grab()
		drag.hover(slotCell(11))

		expect(wall(drag.preview()?.start)).toBe('2025-03-12T09:00')
		expect(wall(drag.preview()?.end)).toBe('2025-03-12T11:30')
	})

	it('moves the event instead when the press is on the bar, not on a handle', () => {
		const drag = renderResizeHook('bar')
		drag.grab()
		drag.hover(slotCell(11))

		expect(wall(drag.preview()?.start)).toBe('2025-03-12T11:00')
		expect(wall(drag.preview()?.end)).toBe('2025-03-12T12:00')
	})

	it('repaints the preview on a drag move, which dnd-kit fires inside one hovered cell', () => {
		const drag = renderResizeHook()
		drag.grab()
		drag.moveOver(slotCell(11))

		expect(wall(drag.preview()?.end)).toBe('2025-03-12T11:30')
	})

	it('commits only the new start and end, never a move or another resource', () => {
		const drag = renderResizeHook()
		drag.grab()
		drag.hover(slotCell(11, { resourceId: 'room-b' }))
		drag.release(slotCell(11, { resourceId: 'room-b' }))

		const [committed, updates] = drag.commitDrop.mock.calls.at(0) ?? []
		expect(committed).toBe(meeting)
		expect(Object.keys(updates ?? {}).sort()).toEqual(['end', 'start'])
		expect(wall(updates?.end)).toBe('2025-03-12T11:30')
		expect(drag.preview()).toBeNull()
	})

	it('draws the preview in the lane the resize started in', () => {
		const drag = renderResizeHook()
		drag.grab()
		drag.hover(slotCell(11, { resourceId: 'room-b' }))

		expect(drag.preview()?.resourceId).toBe('room-a')
	})

	it('resizes from the start edge', () => {
		const drag = renderResizeHook('start')
		drag.grab()
		drag.hover(slotCell(8))

		expect(wall(drag.preview()?.start)).toBe('2025-03-12T08:00')
		expect(wall(drag.preview()?.end)).toBe('2025-03-12T10:00')
	})

	it('shows the original and commits nothing when the end is dragged past the start', () => {
		const drag = renderResizeHook()
		drag.grab()
		drag.hover(slotCell(7))
		const hovered = drag.preview()
		drag.release(slotCell(7))

		expect(hovered?.start.isSame(meeting.start)).toBe(true)
		expect(hovered?.end.isSame(meeting.end)).toBe(true)
		expect(hovered?.isDropAllowed).toBe(true)
		expect(drag.commitDrop).not.toHaveBeenCalled()
	})

	it('ignores a cell of the other component and commits nothing there', () => {
		const drag = renderResizeHook()
		drag.grab()
		drag.hover(dayCell)
		const hovered = drag.preview()
		drag.release(dayCell)

		expect(hovered?.end.isSame(meeting.end)).toBe(true)
		expect(drag.commitDrop).not.toHaveBeenCalled()
	})

	describe('where the calendar is closed', () => {
		// Open 09:00-10:00 only, so the 11:00 slot is closed.
		const closedAfterTen = { businessHours: { startTime: 9, endTime: 10 } }

		it('refuses a closed slot', () => {
			const drag = renderResizeHook('end', closedAfterTen)
			drag.grab()
			drag.hover(slotCell(11))
			const hovered = drag.preview()
			drag.release(slotCell(11))

			expect(hovered?.isDropAllowed).toBe(false)
			expect(drag.commitDrop).not.toHaveBeenCalled()
		})

		it("refuses what the consumer's isCellDisabled closes", () => {
			const drag = renderResizeHook('end', { isCellDisabled: () => true })
			drag.grab()
			drag.hover(slotCell(11))

			expect(drag.preview()?.isDropAllowed).toBe(false)
		})
	})

	describe("on the event's own lane", () => {
		// Room A closes after 10:00, Room B is always open.
		const resources = [
			{
				id: 'room-a',
				title: 'Room A',
				businessHours: { startTime: 9, endTime: 10 },
			},
			{ id: 'room-b', title: 'Room B' },
		]

		it("refuses a time the event's own lane is closed at, although the hovered lane is open", () => {
			const drag = renderResizeHook('end', { resources })
			drag.grab()
			drag.hover(slotCell(11, { resourceId: 'room-b', disabled: false }))
			const hovered = drag.preview()
			drag.release(slotCell(11, { resourceId: 'room-b', disabled: false }))

			expect(hovered?.isDropAllowed).toBe(false)
			expect(drag.commitDrop).not.toHaveBeenCalled()
		})

		it('allows a time the hovered lane is closed at, when the own lane is open', () => {
			const drag = renderResizeHook('end', {
				resources: [
					{ id: 'room-a', title: 'Room A' },
					{
						id: 'room-b',
						title: 'Room B',
						businessHours: { startTime: 9, endTime: 10 },
					},
				],
			})
			drag.grab()
			drag.hover(slotCell(11, { resourceId: 'room-b', disabled: true }))
			const hovered = drag.preview()
			drag.release(slotCell(11, { resourceId: 'room-b', disabled: true }))

			expect(hovered?.isDropAllowed).toBe(true)
			expect(drag.commitDrop).toHaveBeenCalledTimes(1)
		})
	})

	it('hands eventAllow the resized range and the event', () => {
		const eventAllow = mock<EventAllow>(() => true)
		const drag = renderResizeHook('end', { eventAllow })
		drag.grab()
		drag.hover(slotCell(11))

		const [info, resizedEvent] = eventAllow.mock.calls.at(0) ?? []
		expect(wall(info?.start)).toBe('2025-03-12T09:00')
		expect(wall(info?.end)).toBe('2025-03-12T11:30')
		expect(info?.resourceId).toBe('room-a')
		expect(resizedEvent).toBe(meeting)
	})

	it('commits nothing when eventAllow refuses the resized range', () => {
		const drag = renderResizeHook('end', { eventAllow: () => false })
		drag.grab()
		drag.hover(slotCell(11))
		const hovered = drag.preview()
		drag.release(slotCell(11))

		expect(hovered?.isDropAllowed).toBe(false)
		expect(drag.commitDrop).not.toHaveBeenCalled()
	})

	it('does not ask eventAllow about a resize that changes nothing', () => {
		const eventAllow = mock<EventAllow>(() => false)
		const drag = renderResizeHook('end', { eventAllow })
		drag.grab()
		drag.hover(slotCell(7))

		expect(eventAllow).not.toHaveBeenCalled()
	})
})

describe('useCalendarDrag snapping inside a cell', () => {
	const at = (wallClock: string) => dayjs(wallClock)
	const wall = (date: Dayjs | undefined) => date?.format('YYYY-MM-DDTHH:mm')

	const meeting: CalendarEvent = {
		id: 'event-1',
		title: 'Meeting',
		start: at('2025-03-12T09:00:00'),
		end: at('2025-03-12T11:00:00'),
	}
	type Box = { top: number; left: number; width: number; height: number }
	const barBox: Box = { top: 0, left: 0, width: 100, height: 120 }
	/** A move of the meeting, as dnd-kit reports it for a bar drawn along `axis`. */
	const moveOf = (axis: 'vertical' | 'horizontal', bar: Box = barBox) => ({
		id: 'event-1',
		data: {
			current: {
				type: 'calendar-event',
				event: meeting,
				dragSegment: { start: meeting.start, end: meeting.end, axis },
				getBarRect: () => bar,
			},
		},
	})
	const resizableBar = {
		id: 'event-1',
		data: {
			current: {
				type: 'calendar-event',
				event: meeting,
				resizeGranularity: 'slot',
			},
		},
	}
	const endHandle = document.createElement('div')
	endHandle.setAttribute('data-resize-handle', 'end')
	/** A one-hour cell at 14:00 snapping to 15 minutes, 120px along `axis` from `from`. */
	const hourCell = (
		axis: 'vertical' | 'horizontal',
		from = 100,
		extra: Record<string, unknown> = {}
	) => ({
		id: 'cell',
		rect:
			axis === 'vertical'
				? { top: from, left: 0, width: 80, height: 120 }
				: { top: 0, left: from, width: 120, height: 80 },
		data: {
			current: {
				type: 'day-cell',
				date: at('2025-03-12T00:00:00'),
				hour: 14,
				slotDurationMinutes: 60,
				snapMinutes: 15,
				axis,
				...extra,
			},
		},
	})

	/** The pointer as the window sees it: the hook follows it, whatever dnd-kit's delta says. */
	const pointerMovesTo = (x: number, y: number) =>
		act(() => {
			window.dispatchEvent(
				new MouseEvent('pointermove', { clientX: x, clientY: y })
			)
		})

	const renderSnapHook = (providerProps: Record<string, unknown> = {}) => {
		const commitDrop = mock(
			(_event: CalendarEvent, _updates: Partial<CalendarEvent>) => {}
		)
		const { result } = renderHook(() => useCalendarDrag(commitDrop), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<CalendarTestProvider
					initialDate={at('2025-03-12T00:00:00')}
					{...providerProps}
				>
					{children}
				</CalendarTestProvider>
			),
		})
		const drag = (
			active: ReturnType<typeof moveOf> | typeof resizableBar,
			pressedAt: { x: number; y: number },
			target?: Element
		) => {
			const activatorEvent = {
				clientX: pressedAt.x,
				clientY: pressedAt.y,
				target,
			}
			return {
				grab: () =>
					act(() =>
						result.current.handlers.onDragStart({
							active,
							activatorEvent,
						} as unknown as DragStartEvent)
					),
				hover: (over: unknown) =>
					act(() =>
						result.current.handlers.onDragOver({
							active,
							over,
							activatorEvent,
						} as unknown as DragOverEvent)
					),
				release: (over: unknown) =>
					act(() =>
						result.current.handlers.onDragEnd({
							active,
							over,
							activatorEvent,
						} as unknown as DragEndEvent)
					),
			}
		}
		return { commitDrop, preview: () => result.current.dragPreview, drag }
	}

	it('previews a move on the quarter hour under the pointer', () => {
		const { drag, preview } = renderSnapHook()
		const dragging = drag(moveOf('vertical'), { x: 10, y: 0 })
		dragging.grab()
		pointerMovesTo(10, 170)
		dragging.hover(hourCell('vertical'))

		// 70 of 120px is 35 of 60 minutes: the 30-minute bucket.
		expect(wall(preview()?.start)).toBe('2025-03-12T14:30')
		expect(wall(preview()?.end)).toBe('2025-03-12T16:30')
	})

	it('commits a resize to the end of the quarter hour under the pointer', () => {
		const { drag, commitDrop } = renderSnapHook()
		const dragging = drag(resizableBar, { x: 10, y: 0 }, endHandle)
		dragging.grab()
		pointerMovesTo(10, 170)
		dragging.release(hourCell('vertical'))

		const [, updates] = commitDrop.mock.calls.at(0) ?? []
		expect(wall(updates?.end)).toBe('2025-03-12T14:45')
	})

	it('reads the pointer against the cell as it is after a scroll, not as it was', () => {
		// The pointer parks while the grid scrolls 60px under it (auto-scroll or a
		// wheel): dnd-kit re-measures the cell, and its delta already includes the
		// scroll, so only the live pointer and the live rect agree.
		const { drag, preview } = renderSnapHook()
		const dragging = drag(moveOf('vertical'), { x: 10, y: 0 })
		dragging.grab()
		pointerMovesTo(10, 110)
		dragging.hover(hourCell('vertical', 100))
		const beforeScroll = wall(preview()?.start)
		dragging.hover(hourCell('vertical', 40))

		expect([beforeScroll, wall(preview()?.start)]).toEqual([
			'2025-03-12T14:00',
			'2025-03-12T14:30',
		])
	})

	it('stops following the pointer once the drag has ended', () => {
		const { drag, preview } = renderSnapHook()
		const first = drag(moveOf('vertical'), { x: 10, y: 0 })
		first.grab()
		first.release(hourCell('vertical'))
		pointerMovesTo(10, 190)
		// A keyboard drag carries no pointer, so it must not inherit the old one.
		const keyboard = drag(moveOf('vertical'), {
			x: undefined as unknown as number,
			y: undefined as unknown as number,
		})
		keyboard.grab()
		keyboard.hover(hourCell('vertical'))

		expect(wall(preview()?.start)).toBe('2025-03-12T14:00')
	})

	describe('grabbing an event partway along its bar', () => {
		it('keeps a vertical grab in snap steps: 50 minutes in is 45', () => {
			const { drag, preview } = renderSnapHook({
				slotDuration: 60,
				snapDuration: 15,
			})
			// The bar is 120px for 120 minutes, so y=50 is minute 50.
			const dragging = drag(moveOf('vertical'), { x: 10, y: 50 })
			dragging.grab()
			pointerMovesTo(10, 100)
			dragging.hover(hourCell('vertical'))

			// 14:00 less the 45 minutes grabbed. An unsnapped grab would floor to 0.
			expect(wall(preview()?.start)).toBe('2025-03-12T13:15')
		})

		it('keeps a horizontal grab in steps of the snap inside the hour column: slot 30, snap 30', () => {
			const { drag, preview } = renderSnapHook({
				slotDuration: 30,
				snapDuration: 30,
			})
			const wideBar = { top: 0, left: 0, width: 120, height: 40 }
			// The bar is 120px for 120 minutes, so x=50 is minute 50.
			const dragging = drag(moveOf('horizontal', wideBar), { x: 50, y: 10 })
			dragging.grab()
			pointerMovesTo(100, 10)
			dragging.hover(hourCell('horizontal', 100, { snapMinutes: 30 }))

			// 14:00 less the 30 minutes grabbed (30-minute steps). An unsnapped grab
			// would floor to 0.
			expect(wall(preview()?.start)).toBe('2025-03-12T13:30')
		})
	})
})

describe('useCalendarDrag over a time column', () => {
	const dragged: CalendarEvent = {
		id: 'event-1',
		title: 'Event',
		start: dayjs('2025-03-12T09:00:00.000Z'),
		end: dayjs('2025-03-12T10:00:00.000Z'),
	}
	const active = {
		id: 'event-1',
		data: { current: { type: 'calendar-event', event: dragged } },
	}
	// Two one-hour rows 4px apart, drawn at 100-160 and 164-224.
	const slotAt = (hour: number) => {
		const top = 100 + (hour - 9) * 64
		return {
			data: {
				type: 'day-cell',
				date: dayjs('2025-03-15T00:00:00.000Z').hour(hour),
				hour,
				minute: 0,
				slotDurationMinutes: 60,
			},
			element: {
				getBoundingClientRect: () => ({ top, bottom: top + 60, height: 60 }),
			},
		}
	}
	const columnOf = (slots: Array<ReturnType<typeof slotAt> | undefined>) => ({
		id: 'column',
		rect: { top: 100, left: 0, width: 80, height: 124 },
		data: { current: { slots } },
	})
	const column = columnOf([slotAt(9), slotAt(10)])

	/** A drag with the pointer at height `y`, hovering and releasing over `target`. */
	const dragWithPointerAt = (y: number, target = column) => {
		const commitDrop = mock(() => {})
		const { result } = renderHook(() => useCalendarDrag(commitDrop), {
			wrapper,
		})
		act(() =>
			result.current.handlers.onDragStart({
				active,
				activatorEvent: new MouseEvent('mousedown', {
					clientX: 10,
					clientY: y,
				}),
			} as unknown as DragStartEvent)
		)
		act(() =>
			result.current.handlers.onDragOver({
				active,
				over: target,
			} as unknown as DragOverEvent)
		)
		const hovered = result.current.dragPreview
		act(() =>
			result.current.handlers.onDragEnd({
				active,
				over: target,
			} as unknown as DragEndEvent)
		)
		return { hovered, commitDrop }
	}

	it('previews the slot under the pointer', () => {
		const { hovered } = dragWithPointerAt(170)

		expect(hovered?.start.toISOString()).toBe('2025-03-15T10:00:00.000Z')
	})

	it('commits the slot under the pointer', () => {
		const { commitDrop } = dragWithPointerAt(170)

		expect(commitDrop).toHaveBeenCalledTimes(1)
	})

	it('previews the slot above while the pointer is in the gap between two rows', () => {
		const { hovered } = dragWithPointerAt(162)

		expect(hovered?.start.toISOString()).toBe('2025-03-15T09:00:00.000Z')
	})

	// A slot publishes itself when it mounts. Over one that has not, there is no
	// cell to read: no preview, and a release there commits nothing rather than
	// reading no date, which is today.
	describe('over a slot that has not published itself', () => {
		const unpublished = columnOf([undefined, undefined])

		it('previews nothing', () => {
			const { hovered } = dragWithPointerAt(130, unpublished)

			expect(hovered).toBeNull()
		})

		it('commits nothing when released', () => {
			const { commitDrop } = dragWithPointerAt(130, unpublished)

			expect(commitDrop).not.toHaveBeenCalled()
		})
	})
})
