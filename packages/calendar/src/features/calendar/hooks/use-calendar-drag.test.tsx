import { describe, expect, it, mock } from 'bun:test'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
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
	const grabbedHandle = (edge: 'start' | 'end') => ({
		id: `event-1-resize-${edge}`,
		data: {
			current: {
				type: 'calendar-event-resize',
				event: meeting,
				edge,
				granularity: 'slot',
				sourceResourceId: 'room-a',
			},
		},
	})
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
		edge: 'start' | 'end' = 'end',
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
		const active = grabbedHandle(edge)
		return {
			commitDrop,
			preview: () => result.current.dragPreview,
			grab: () =>
				act(() =>
					result.current.handlers.onDragStart({
						active,
						activatorEvent: new Event('mousedown'),
					} as unknown as DragStartEvent)
				),
			hover: (over: unknown) =>
				act(() =>
					result.current.handlers.onDragOver({
						active,
						over,
					} as unknown as DragOverEvent)
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
