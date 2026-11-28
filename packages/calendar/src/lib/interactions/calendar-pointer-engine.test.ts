import { afterEach, describe, expect, it } from 'bun:test'
import type {
	CalendarEvent,
	CellInfo,
	EventDropInfo,
} from '../../types/calendar.types'
import { parseDate, toUtcIso, wallClockDiff } from '../../utils/temporal'
import {
	attachCalendarInteractions,
	type InteractionPreview,
} from './calendar-pointer-engine'

const makeRectEl = (
	attrs: Record<string, string>,
	box: { top: number; left: number; width: number; height: number }
): HTMLElement => {
	const el = document.createElement('div')
	for (const [k, v] of Object.entries(attrs)) {
		el.setAttribute(k, v)
	}
	el.getBoundingClientRect = () =>
		({
			...box,
			right: box.left + box.width,
			bottom: box.top + box.height,
			x: box.left,
			y: box.top,
			toJSON: () => ({}),
		}) as DOMRect
	return el
}

const mustUtcIso = (iso: string): string => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) throw new Error(`Invalid ISO date: ${iso}`)
	return toUtcIso(parsed)
}

const originalElementsFromPoint = document.elementsFromPoint
afterEach(() => {
	document.elementsFromPoint = originalElementsFromPoint
	document.body.innerHTML = ''
	document.body.style.cursor = ''
})

describe('attachCalendarInteractions', () => {
	const buildGrid = () => {
		const root = document.createElement('div')
		const c09 = makeRectEl(
			{
				'data-cell': 'true',
				'data-start': '2025-03-12T09:00:00.000Z',
				'data-end': '2025-03-12T10:00:00.000Z',
				'data-time-axis': 'vertical',
				'data-snap-minutes': '15',
			},
			{ top: 100, left: 0, width: 200, height: 60 }
		)
		const c10 = makeRectEl(
			{
				'data-cell': 'true',
				'data-start': '2025-03-12T10:00:00.000Z',
				'data-end': '2025-03-12T11:00:00.000Z',
				'data-time-axis': 'vertical',
				'data-snap-minutes': '15',
			},
			{ top: 160, left: 0, width: 200, height: 60 }
		)
		const c18 = makeRectEl(
			{
				'data-cell': 'true',
				'data-start': '2025-03-12T18:00:00.000Z',
				'data-end': '2025-03-12T19:00:00.000Z',
				'data-time-axis': 'vertical',
				'data-snap-minutes': '15',
			},
			{ top: 220, left: 0, width: 200, height: 60 }
		)
		const bar = makeRectEl(
			{
				'data-event-id': 'ev-1',
				'data-drag-axis': 'vertical',
			},
			{ top: 100, left: 0, width: 200, height: 60 }
		)
		const startHandle = makeRectEl(
			{ 'data-resize-handle': 'start', 'data-event-id': 'ev-1' },
			{ top: 100, left: 0, width: 200, height: 6 }
		)
		const endHandle = makeRectEl(
			{ 'data-resize-handle': 'end', 'data-event-id': 'ev-1' },
			{ top: 154, left: 0, width: 200, height: 6 }
		)
		bar.append(startHandle, endHandle)
		root.append(c09, c10, c18, bar)
		document.body.appendChild(root)

		const cellsByY = [
			{ top: 100, bottom: 160, el: c09 },
			{ top: 160, bottom: 220, el: c10 },
			{ top: 220, bottom: 280, el: c18 },
		]
		document.elementsFromPoint = (_x: number, y: number) => {
			const hit = cellsByY.find((c) => y >= c.top && y < c.bottom)
			return hit ? [hit.el, root, document.body] : [root, document.body]
		}
		return { root, c09, c10, c18, bar, startHandle, endHandle }
	}

	const ev: CalendarEvent = {
		id: 'ev-1',
		title: 'Standup',
		start: '2025-03-12T09:00:00.000Z',
		end: '2025-03-12T10:00:00.000Z',
	}

	const pt = (
		type: string,
		target: EventTarget,
		clientX: number,
		clientY: number
	) => {
		target.dispatchEvent(
			new PointerEvent(type, {
				button: 0,
				isPrimary: true,
				pointerId: 1,
				pointerType: 'mouse',
				clientX,
				clientY,
				bubbles: true,
			})
		)
	}

	it('treats tap on event bar as click, and drag with grab offset + businessHours enforcement as move', () => {
		const { root, bar } = buildGrid()
		const clicks: CalendarEvent[] = []
		const moves: Array<{ placement: EventDropInfo; previewCount: number }> = []
		const previews: Array<InteractionPreview | null> = []

		const handle = attachCalendarInteractions({
			root,
			getState: () => ({
				events: [ev],
				resources: [],
				timezone: 'UTC',
				editable: true,
				enableDragToCreate: true,
				slotDurationMinutes: 60,
				snapDurationMinutes: 15,
				businessHours: { startTime: 9, endTime: 17 },
				eventConstraint: 'businessHours',
			}),
			onEventClick: (clicked) => clicks.push(clicked),
			onMoveCommit: (_event, placement) =>
				moves.push({ placement, previewCount: previews.length }),
			onPreviewChange: (p) => previews.push(p),
		})

		// 1. Tap on bar opens event instead of moving
		pt('pointerdown', bar, 50, 120)
		pt('pointerup', window, 51, 121)
		expect(clicks).toHaveLength(1)
		expect(moves).toHaveLength(0)

		// 2. Drag from top quarter (grabOffset=0) onto 10:30 quarter (y=195 -> 10:30)
		pt('pointerdown', bar, 50, 105)
		pt('pointermove', window, 50, 195)
		expect(previews.at(-1)?.allowed).toBe(true)
		pt('pointerup', window, 50, 195)

		expect(moves).toHaveLength(1)
		expect(mustUtcIso(moves[0].placement.start)).toBe(
			'2025-03-12T10:30:00.000Z'
		)
		expect(mustUtcIso(moves[0].placement.end)).toBe('2025-03-12T11:30:00.000Z')

		// 3. Drag onto closed cell (18:00) previews disallowed and refuses commit on drop
		pt('pointerdown', bar, 50, 105)
		pt('pointermove', window, 50, 230)
		expect(previews.at(-1)?.allowed).toBe(false)
		pt('pointerup', window, 50, 230)
		expect(moves).toHaveLength(1)

		handle.destroy()
	})

	it('supports end resize with sub-cell snap and gates start resize on eventResizableFromStart', () => {
		const { root, startHandle, endHandle } = buildGrid()
		const resizes: Array<{ start: string; end: string }> = []
		let resizableFromStart = false

		const handle = attachCalendarInteractions({
			root,
			getState: () => ({
				events: [ev],
				resources: [],
				timezone: 'UTC',
				editable: true,
				eventResizableFromStart: resizableFromStart,
				slotDurationMinutes: 60,
				snapDurationMinutes: 15,
			}),
			onResizeCommit: (_event, placement) =>
				resizes.push({
					start: mustUtcIso(placement.start),
					end: mustUtcIso(placement.end),
				}),
		})

		// Start handle ignored when eventResizableFromStart is false
		pt('pointerdown', startHandle, 50, 101)
		pt('pointermove', window, 50, 170)
		pt('pointerup', window, 50, 170)
		expect(resizes).toHaveLength(0)

		// End handle resizes to 10:30 (y=180..194 is 10:15..10:30 slice -> end 10:30)
		pt('pointerdown', endHandle, 50, 156)
		pt('pointermove', window, 50, 185)
		pt('pointerup', window, 50, 185)
		expect(resizes).toEqual([
			{
				start: '2025-03-12T09:00:00.000Z',
				end: '2025-03-12T10:30:00.000Z',
			},
		])

		// With eventResizableFromStart enabled, start handle shrinks start to 09:30 (y=135)
		resizableFromStart = true
		pt('pointerdown', startHandle, 50, 101)
		pt('pointermove', window, 50, 135)
		pt('pointerup', window, 50, 135)
		expect(resizes).toHaveLength(2)
		expect(resizes[1]).toEqual({
			start: '2025-03-12T09:30:00.000Z',
			end: '2025-03-12T10:00:00.000Z',
		})

		handle.destroy()
	})

	it('runs drag-to-create selection (forward, reverse, Escape cancel) with sub-cell snapping', () => {
		const { root, c09, c10 } = buildGrid()
		const selections: CellInfo[] = []
		let activeSelCount = 0

		const handle = attachCalendarInteractions({
			root,
			getState: () => ({
				events: [],
				resources: [],
				timezone: 'UTC',
				enableDragToCreate: true,
				slotDurationMinutes: 60,
				snapDurationMinutes: 15,
			}),
			onSelectionChange: (sel) => {
				if (sel) activeSelCount += 1
			},
			onRangeSelect: (sel) => selections.push(sel),
		})

		// Reverse selection from 10:30-10:45 (y=195) back to 09:15-09:30 (y=120)
		pt('pointerdown', c10, 50, 195)
		pt('pointermove', window, 50, 120)
		expect(activeSelCount).toBeGreaterThan(0)
		pt('pointerup', window, 50, 120)

		expect(selections).toHaveLength(1)
		expect(mustUtcIso(selections[0].start)).toBe('2025-03-12T09:15:00.000Z')
		expect(mustUtcIso(selections[0].end)).toBe('2025-03-12T10:45:00.000Z')
		const selStart = parseDate(selections[0].start, 'UTC')
		const selEnd = parseDate(selections[0].end, 'UTC')
		expect(
			selStart && selEnd ? wallClockDiff(selEnd, selStart, 'minute') : 0
		).toBe(90)

		// Escape cancels without committing
		pt('pointerdown', c09, 50, 110)
		pt('pointermove', window, 50, 140)
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		pt('pointerup', window, 50, 140)
		expect(selections).toHaveLength(1)

		handle.destroy()
	})

	it('publishes signed deltas, zeroes unchanged resize edge delta, and suppresses no-op commits', () => {
		const { root, bar, startHandle, endHandle } = buildGrid()
		const moves: Array<{
			delta?: { days: number; milliseconds: number }
			endDelta?: { days: number; milliseconds: number }
		}> = []
		const resizes: Array<{
			delta?: { days: number; milliseconds: number }
			endDelta?: { days: number; milliseconds: number }
		}> = []

		const handle = attachCalendarInteractions({
			root,
			getState: () => ({
				events: [ev],
				resources: [],
				timezone: 'UTC',
				editable: true,
				eventResizableFromStart: true,
				slotDurationMinutes: 60,
				snapDurationMinutes: 15,
			}),
			onMoveCommit: (_e, _p, info) => moves.push(info),
			onResizeCommit: (_e, _p, info) => resizes.push(info),
		})

		// Move forward +90m: 09:00 -> 10:30
		pt('pointerdown', bar, 50, 105)
		pt('pointermove', window, 50, 195)
		pt('pointerup', window, 50, 195)
		expect(moves).toEqual([
			{
				delta: { days: 0, milliseconds: 5_400_000 },
				endDelta: { days: 0, milliseconds: 5_400_000 },
			},
		])

		// Move back to original position -> suppressed no-op
		pt('pointerdown', bar, 50, 105)
		pt('pointermove', window, 50, 130)
		pt('pointermove', window, 50, 105)
		pt('pointerup', window, 50, 105)
		expect(moves).toHaveLength(1)

		// End resize +30m -> delta is zero, endDelta is +1800000ms
		pt('pointerdown', endHandle, 50, 156)
		pt('pointermove', window, 50, 185)
		pt('pointerup', window, 50, 185)
		expect(resizes[0]).toEqual({
			delta: { days: 0, milliseconds: 0 },
			endDelta: { days: 0, milliseconds: 1_800_000 },
		})

		// Start resize shrink +30m -> delta is +1800000ms, endDelta is zero
		pt('pointerdown', startHandle, 50, 101)
		pt('pointermove', window, 50, 135)
		pt('pointerup', window, 50, 135)
		expect(resizes[1]).toEqual({
			delta: { days: 0, milliseconds: 1_800_000 },
			endDelta: { days: 0, milliseconds: 0 },
		})

		handle.destroy()
	})

	it('does not throw when onStart cancels the gesture on a non-editable event drag', () => {
		const root = document.createElement('div')
		document.body.appendChild(root)
		const bar = makeRectEl(
			{
				'data-event-id': 'locked-1',
				'data-drag-axis': 'vertical',
				'data-seg-start': '2025-03-12T09:00:00.000Z',
				'data-seg-end': '2025-03-12T10:00:00.000Z',
			},
			{ top: 100, left: 0, width: 100, height: 60 }
		)
		root.appendChild(bar)
		const event: CalendarEvent = {
			id: 'locked-1',
			title: 'Locked',
			start: '2025-03-12T09:00:00.000Z',
			end: '2025-03-12T10:00:00.000Z',
		}
		let committed = 0
		const handle = attachCalendarInteractions({
			root,
			getState: () => ({
				view: 'week',
				timezone: 'UTC',
				editable: false,
				dragAndDrop: true,
				events: [event],
				resources: [],
			}),
			onMoveCommit: () => {
				committed += 1
			},
		})
		const dispatch = (
			type: string,
			target: EventTarget,
			clientX: number,
			clientY: number
		) => {
			target.dispatchEvent(
				new PointerEvent(type, {
					bubbles: true,
					button: 0,
					isPrimary: true,
					pointerId: 1,
					pointerType: 'mouse',
					clientX,
					clientY,
				})
			)
		}
		dispatch('pointerdown', bar, 50, 120)
		expect(() => dispatch('pointermove', window, 50, 140)).not.toThrow()
		dispatch('pointerup', window, 50, 140)
		expect(committed).toBe(0)
		handle.destroy()
	})
})
