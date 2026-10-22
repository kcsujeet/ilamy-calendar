import { describe, expect, it, mock } from 'bun:test'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import type { CalendarEvent, EventDropInfo } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
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
