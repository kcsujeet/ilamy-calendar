import { describe, expect, it } from 'bun:test'
import { add, parseDate, toOffsetIso, toUtcIso } from '../../utils/temporal'
import {
	type ConstraintCheckOptions,
	calculateMovePlacement,
	calculateResizePlacement,
	canDragEvent,
	canResizeEvent,
	computeGrabOffset,
	getCellSpan,
	getDragSegment,
	getPressedResizeEdge,
	getResourceUpdates,
	isPlacementAllowed,
	isSelectionAllowed,
	NO_GRAB_OFFSET,
	type PlacementCell,
} from './event-placement.utils'

const utc = (iso: string) => {
	const d = parseDate(iso, 'UTC')
	if (!d) throw new Error(`Invalid date ${iso}`)
	return d
}

describe('getDragSegment & calculateGrabOffset', () => {
	it('computes minutes into a vertical bar and days into a horizontal bar with hiddenDays', () => {
		const range = {
			start: utc('2025-03-10T00:00:00Z'),
			end: utc('2025-03-15T00:00:00Z'),
		}
		const seg = getDragSegment(
			{
				start: '2025-03-11T09:00:00Z',
				end: '2025-03-11T12:00:00Z',
			},
			range,
			'vertical'
		)
		expect(seg).toBeDefined()
		if (!seg) return

		const grab = computeGrabOffset({
			activeEvent: {
				id: 'e1',
				title: 'Work',
				start: '2025-03-11T09:00:00Z',
				end: '2025-03-11T12:00:00Z',
			},
			initialRect: { top: 100, left: 0, width: 80, height: 180 },
			pointer: { x: 20, y: 190 }, // midpoint -> 90m into 180m bar
			segment: seg,
			slotDurationMinutes: 30,
		})
		expect(grab.minutes).toBe(90)
		expect(grab.days).toBe(0)

		const hSeg = getDragSegment(
			{
				start: '2025-03-10T00:00:00Z',
				end: '2025-03-14T00:00:00Z',
			},
			range,
			'horizontal',
			new Set([2]) // hide Tuesday
		)
		expect(hSeg).toBeDefined()
		if (!hSeg) return

		// 3 visible days (Mon 10, Wed 12, Thu 13). Clicking 2/3 across hits Thu 13 (3 days in).
		const hGrab = computeGrabOffset({
			activeEvent: {
				id: 'e2',
				title: 'Multi',
				allDay: true,
				start: '2025-03-10T00:00:00Z',
				end: '2025-03-14T00:00:00Z',
			},
			initialRect: { top: 0, left: 100, width: 300, height: 24 },
			pointer: { x: 350, y: 10 },
			segment: hSeg,
			slotDurationMinutes: 60,
		})
		expect(hGrab.days).toBe(3)
	})
})

describe('calculateMovePlacement', () => {
	it('preserves wall-clock length and applies grab offset across timed drops', () => {
		const event = {
			id: 'e1',
			title: 'Meeting',
			start: '2025-03-12T09:00:00Z',
			end: '2025-03-12T10:30:00Z',
		}
		const target: PlacementCell = {
			date: utc('2025-03-13T00:00:00Z'),
			hour: 14,
			minute: 30,
			axis: 'vertical',
		}
		const moved = calculateMovePlacement(event, target, {
			minutes: 30,
			days: 0,
		})
		expect(toUtcIso(moved.start)).toBe('2025-03-13T14:00:00.000Z')
		expect(toUtcIso(moved.end)).toBe('2025-03-13T15:30:00.000Z')
		expect(moved.allDay).toBe(false)
	})

	it('preserves wall-clock span when dropping all-day across spring-forward DST', () => {
		const zone = 'Europe/London'
		const start = parseDate('2025-03-29T00:00:00', zone)
		const targetDate = parseDate('2025-03-30T00:00:00', zone)
		if (!start || !targetDate) throw new Error('Invalid DST fixture')
		const allDayEvent = {
			id: 'a1',
			title: 'All Day',
			allDay: true,
			start: toOffsetIso(start),
			end: toOffsetIso(add(start, 1, 'day')),
		}
		const moved = calculateMovePlacement(
			allDayEvent,
			{ date: targetDate, allDay: false },
			NO_GRAB_OFFSET
		)
		expect(toUtcIso(moved.start)).toBe('2025-03-30T00:00:00.000Z')
		expect(toUtcIso(moved.end)).toBe('2025-03-30T23:00:00.000Z')
		expect(moved.allDay).toBe(true)
	})

	it('updates single resourceId or swaps within resourceIds array', () => {
		expect(
			getResourceUpdates(
				{ id: '1', title: 'A', start: '', end: '', resourceId: 'r1' },
				'r1',
				'r2'
			)
		).toEqual({ resourceId: 'r2' })
		expect(
			getResourceUpdates(
				{ id: '1', title: 'A', start: '', end: '', resourceIds: ['r1', 'r3'] },
				'r1',
				'r2'
			)
		).toEqual({ resourceIds: ['r3', 'r2'] })
	})
})

describe('calculateResizePlacement & getPressedResizeEdge & getCellSpan', () => {
	const meeting = {
		id: 'm1',
		title: 'Sync',
		start: '2025-03-12T10:00:00Z',
		end: '2025-03-12T11:00:00Z',
	}

	it('resizes end edge and rejects zero/negative resulting span', () => {
		const extended = calculateResizePlacement(
			meeting,
			{
				date: utc('2025-03-12T00:00:00Z'),
				hour: 11,
				minute: 15,
				slotDurationMinutes: 15,
				axis: 'vertical',
			},
			'end'
		)
		expect(extended ? toUtcIso(extended.start) : '').toBe(
			'2025-03-12T10:00:00.000Z'
		)
		expect(extended ? toUtcIso(extended.end) : '').toBe(
			'2025-03-12T11:30:00.000Z'
		)

		const inverted = calculateResizePlacement(
			meeting,
			{
				date: utc('2025-03-12T00:00:00Z'),
				hour: 9,
				minute: 30,
				slotDurationMinutes: 15,
				axis: 'vertical',
			},
			'end'
		)
		expect(inverted).toBeNull()
	})

	it('resizes start edge only when edge === start, preserving end and exclusive all-day DTEND', () => {
		const earlier = calculateResizePlacement(
			meeting,
			{
				date: utc('2025-03-12T00:00:00Z'),
				hour: 9,
				minute: 45,
				slotDurationMinutes: 15,
				axis: 'vertical',
			},
			'start'
		)
		expect(earlier ? toUtcIso(earlier.start) : '').toBe(
			'2025-03-12T09:45:00.000Z'
		)
		expect(earlier ? toUtcIso(earlier.end) : '').toBe(
			'2025-03-12T11:00:00.000Z'
		)

		const span = getCellSpan({
			date: utc('2025-03-12T00:00:00Z'),
		})
		expect(span ? toUtcIso(span.start) : '').toBe('2025-03-12T00:00:00.000Z')
		expect(span ? toUtcIso(span.end) : '').toBe('2025-03-13T00:00:00.000Z')

		expect(
			calculateResizePlacement(
				meeting,
				{
					date: utc('2025-03-12T00:00:00Z'),
					hour: 9,
					minute: 45,
					slotDurationMinutes: 15,
					axis: 'vertical',
				},
				'start',
				{ resizableFromStart: false }
			)
		).toBeNull()
	})

	it('reads data-resize-handle edge from nested element', () => {
		const handle = document.createElement('div')
		handle.setAttribute('data-resize-handle', 'start')
		const dot = document.createElement('span')
		handle.appendChild(dot)
		const ev = new Event('pointerdown')
		dot.dispatchEvent(ev)
		expect(getPressedResizeEdge(ev)).toBe('start')
	})
})

describe('isPlacementAllowed, isSelectionAllowed, canDragEvent, canResizeEvent', () => {
	const ev = {
		id: 'e1',
		title: 'Task',
		start: '2025-03-12T10:00:00Z',
		end: '2025-03-12T11:00:00Z',
	}

	it('enforces editable defaults and per-event overrides', () => {
		expect(canDragEvent(ev, {})).toBe(false)
		expect(canResizeEvent(ev, {})).toBe(false)
		expect(canDragEvent(ev, { editable: true })).toBe(true)
		expect(canResizeEvent(ev, { editable: true })).toBe(true)
		expect(
			canResizeEvent({ ...ev, durationEditable: false }, { editable: true })
		).toBe(false)
	})

	it('enforces businessHours and disabled checks for placements and selections', () => {
		const opts: ConstraintCheckOptions = {
			businessHours: {
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 9,
				endTime: 17,
			},
			eventConstraint: 'businessHours',
			selectConstraint: 'businessHours',
		}

		expect(
			isPlacementAllowed(
				ev,
				{
					start: '2025-03-12T10:00:00Z',
					end: '2025-03-12T11:00:00Z',
					allDay: false,
				},
				opts,
				'UTC'
			)
		).toBe(true)

		expect(
			isPlacementAllowed(
				ev,
				{
					start: '2025-03-15T10:00:00Z', // Saturday
					end: '2025-03-15T11:00:00Z',
					allDay: false,
				},
				opts,
				'UTC'
			)
		).toBe(false)

		expect(
			isSelectionAllowed(
				{
					start: '2025-03-12T07:00:00Z',
					end: '2025-03-12T08:00:00Z',
					allDay: false,
				},
				opts,
				'UTC'
			)
		).toBe(false)
	})
})
