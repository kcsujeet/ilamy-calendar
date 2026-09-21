import { beforeEach, describe, expect, it } from 'bun:test'
import type { ClientRect, DragEndEvent } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { calculateGrabOffset, type DragSegment } from '@/lib/utils/grab-offset'
import { calculateDropTimes, getUpdatedEvent } from './dnd-utils'

let cellType = 'day-cell'
let cellDate = dayjs('2024-10-15T00:00:00')
let cellResourceId: string | number | undefined
let allDayCell: boolean | undefined = false
let hour: number | undefined
let minute: number | undefined
let sourceResourceId: string | number | undefined
let disabledCell: boolean | undefined

const getDragEvent = () => ({
	active: {
		id: 'event-1',
		data: {
			current: {
				type: 'calendar-event',
				sourceResourceId,
			},
		},
	},
	over: {
		id: 'time-cell-2024-06-15-10-30',
		data: {
			current: {
				type: cellType,
				date: cellDate,
				allDay: allDayCell,
				resourceId: cellResourceId,
				hour: hour,
				minute: minute,
				disabled: disabledCell,
			},
		},
	},
})

let start = dayjs('2024-06-15T00:00:00')
let end = dayjs('2024-06-15T23:59:59')
let allDay = false
let resourceId: string | number | undefined
let resourceIds: (string | number)[] | undefined
const getActiveEvent = () => ({
	id: 'event-1',
	title: 'Sample Event',
	start: start,
	end: end,
	allDay: allDay,
	resourceId: resourceId,
	resourceIds: resourceIds,
})

// These fixtures are module-level and mutated per test; `hour` in particular
// now selects the time-slot branch, so a value left behind by one case would
// silently change what the next one exercises.
beforeEach(() => {
	cellType = 'day-cell'
	cellDate = dayjs('2024-10-15T00:00:00')
	cellResourceId = undefined
	allDayCell = false
	hour = undefined
	minute = undefined
	sourceResourceId = undefined
	disabledCell = undefined
	start = dayjs('2024-06-15T00:00:00')
	end = dayjs('2024-06-15T23:59:59')
	allDay = false
	resourceId = undefined
	resourceIds = undefined
})

describe('getUpdatedEvent Utility Function', () => {
	it('should return null if active or over is missing', () => {
		const result = getUpdatedEvent(
			{ active: null, over: null } as unknown as DragEndEvent,
			null
		)
		expect(result).toBeNull()
	})

	it('should return null if activeEvent is null', () => {
		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			null
		)
		expect(result).toBeNull()
	})

	it('returns null when the cell released on is disabled', () => {
		// A disabled cell is a droppable now, so the mirror keeps rendering over
		// it and the pointer can be released there. Validity is decided HERE, at
		// drop time, the way FullCalendar separates "where would this land" from
		// "is that allowed" -- releasing simply commits nothing and the event
		// reverts.
		disabledCell = true

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent()
		)

		expect(result).toBeNull()
	})

	it('should calculate new start and end times correctly for day-cell drop', () => {
		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent()
		)
		expect(result).not.toBeNull()
		const updates = result?.updates
		if (!updates) return
		expect(updates.start.format()).toBe(cellDate.format())
		expect(updates.end.format()).toBe(
			cellDate.add(end.diff(start, 'second'), 'second').format()
		)
		expect(updates.allDay).toBe(false)
	})

	describe('should handle all-day conversions correctly', () => {
		it('should convert timed event to all-day when dropped on all-day cell', () => {
			cellDate = dayjs('2024-10-25T00:00:00')
			allDayCell = true

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent()
			)
			expect(result).not.toBeNull()
			const updates = result?.updates
			if (!updates) return
			expect(updates.allDay).toBe(true)
			expect(updates.start.format()).toBe(dayjs(cellDate).format())
			expect(updates.end.diff(updates.start, 'second')).toBe(
				end.diff(start, 'second')
			)
		})

		it('should convert all-day event to non-all-day when dropped on non-all-day cell', () => {
			allDay = true
			allDayCell = false

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent()
			)
			expect(result).not.toBeNull()
			const updates = result?.updates
			if (!updates) return
			expect(updates.allDay).toBe(false)
			expect(updates.start.format()).toBe(dayjs(cellDate).format())
			expect(updates.end.diff(updates.start, 'second')).toBe(
				end.diff(start, 'second')
			)
		})

		it('should retain all-day status when dropping all-day event on cell with all-day flag not defined', () => {
			allDay = true
			allDayCell = undefined

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent()
			)
			expect(result).not.toBeNull()
			const updates = result?.updates
			if (!updates) return
			expect(updates.allDay).toBe(true)
		})
	})

	it('should update resourceId when dropping on a cell with different resourceId', () => {
		resourceId = 'resource-1'
		resourceIds = undefined
		cellResourceId = 'resource-2'

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent()
		)
		expect(result).not.toBeNull()
		const updates = result?.updates
		if (!updates) return
		expect(updates.resourceId).toBe(cellResourceId)
	})

	// Cross-resource membership follows FullCalendar's resource mutation: remove
	// the row the drag started from, add the drop target, dedupe, and leave an
	// event that was not in the source row untouched.
	// premium/packages/preact-scheduler/src/resource/EventDragging.ts
	describe('cross-resource drops (resourceIds)', () => {
		it('should swap the source resource for the target and keep the others', () => {
			resourceId = undefined
			resourceIds = ['resource-1', 'resource-2']
			sourceResourceId = 'resource-1'
			cellResourceId = 'resource-3'

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent()
			)
			const updates = result?.updates
			expect(updates?.resourceIds).toEqual(['resource-2', 'resource-3'])
		})

		it('should not duplicate a target the event already belongs to', () => {
			resourceId = undefined
			resourceIds = ['resource-1', 'resource-2']
			sourceResourceId = 'resource-1'
			cellResourceId = 'resource-2'

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent()
			)
			const updates = result?.updates
			expect(updates?.resourceIds).toEqual(['resource-2'])
		})

		it('should leave membership untouched when the source row is not a member', () => {
			resourceId = undefined
			resourceIds = ['resource-1', 'resource-2']
			sourceResourceId = 'resource-9'
			cellResourceId = 'resource-3'

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent()
			)
			const updates = result?.updates
			expect(updates?.resourceIds).toBeUndefined()
			expect(updates?.resourceId).toBeUndefined()
		})

		it('should not change the resource when dropped on its own row', () => {
			resourceId = undefined
			resourceIds = ['resource-1', 'resource-2']
			sourceResourceId = 'resource-1'
			cellResourceId = 'resource-1'

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent()
			)
			const updates = result?.updates
			expect(updates?.resourceIds).toBeUndefined()
		})
	})

	it('should calculate new start and end times correctly for time-cell drop', () => {
		cellDate = dayjs('2024-10-20T00:00:00.000Z')
		cellType = 'time-cell'
		hour = 14
		minute = 30

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent()
		)
		expect(result).not.toBeNull()
		const updates = result?.updates
		if (!updates) return
		const expectedStart = dayjs(cellDate).hour(hour).minute(minute)
		const expectedEnd = expectedStart.add(end.diff(start, 'second'), 'second')
		expect(updates.start.toISOString()).toBe(expectedStart.toISOString())
		expect(updates.end.toISOString()).toBe(expectedEnd.toISOString())
		expect(updates.allDay).toBe(false)
	})

	it('should set all-day to false when dropping on time-cell even if original event was all-day', () => {
		allDay = true
		cellType = 'time-cell'
		hour = 9
		minute = 0

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent()
		)
		expect(result).not.toBeNull()
		const updates = result?.updates
		if (!updates) return
		expect(updates.allDay).toBe(false)
	})

	/**
	 * #248. A drag moves an event; it must not resize it. An end landing on
	 * midnight used to be snapped back to the previous day's 23:59:59.999, which
	 * shortened this two-hour event to 1h59m59.999s and reintroduced the
	 * sub-second residue the form no longer produces. `end` is exclusive, so
	 * midnight is a legitimate end and the layout already paints it on the right
	 * day.
	 */
	it('keeps an end that lands on midnight, preserving the duration', () => {
		start = dayjs('2024-06-15T22:00:00')
		end = dayjs('2024-06-16T00:00:00') // 2 hour duration
		cellType = 'day-cell'
		cellDate = dayjs('2024-10-22T22:00:00')
		allDay = false
		hour = undefined
		minute = undefined

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent()
		)
		expect(result).not.toBeNull()
		const updates = result?.updates
		if (!updates) return
		expect(updates.start.format()).toBe(cellDate.format())
		expect(updates.end.format()).toBe(cellDate.add(2, 'hour').format())
		expect(updates.end.diff(updates.start, 'second')).toBe(7200)
	})

	it('should handle dragging multi-day all-day event to time cell correctly', () => {
		// Event ID 15 from seed.ts: Conference Nov 4-6 (all-day)
		// Using endOf('day') for all-day events: Nov 4 00:00:00 to Nov 6 23:59:59.999
		start = dayjs('2024-11-04T00:00:00.000Z')
		end = dayjs('2024-11-06T23:59:59.999Z')
		allDay = true
		cellType = 'time-cell'
		cellDate = dayjs('2024-11-04T00:00:00.000Z')
		hour = 1
		minute = 0
		cellResourceId = undefined

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent()
		)
		expect(result).not.toBeNull()
		const updates = result?.updates
		if (!updates) return

		// CURRENT BEHAVIOR (with second precision):
		// - Original duration: 2 days 23h 59m 59.999s (using endOf('day'))
		// - Duration in seconds: 259199 (loses millisecond precision)
		// - Start: Nov 4 01:00:00
		// - End: Nov 4 01:00:00 + 259199 sec = Nov 7 00:59:59
		expect(updates.start.toISOString()).toBe('2024-11-04T01:00:00.000Z')
		expect(updates.end.toISOString()).toBe('2024-11-07T00:59:59.000Z')
		expect(updates.allDay).toBe(false)

		// NOTE: Still 1 second off from ideal behavior due to millisecond truncation
		// - Ideal: Nov 7 01:00:00 (3 full days later)
		// - Actual: Nov 7 00:59:59 (loses .999ms when using second precision)
		// - To fully fix: would need millisecond precision instead of second
	})

	describe('grab offset and time preservation (FullCalendar / Google Calendar parity)', () => {
		it('should drop a timed event on the hovered hour slot', () => {
			start = dayjs('2024-10-15T10:00:00.000Z')
			end = dayjs('2024-10-15T11:00:00.000Z')
			cellDate = dayjs('2024-10-15T00:00:00.000Z')
			hour = 14
			minute = 0

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent()
			)

			// An hour grid publishes `hour`; the drop must take it, not keep the
			// event's own 10:00. Every cell reports type 'day-cell', so branching
			// on the type sent this down the day path and never moved the event.
			expect(result?.updates.start.toISOString()).toBe(
				'2024-10-15T14:00:00.000Z'
			)
			expect(result?.updates.end.toISOString()).toBe('2024-10-15T15:00:00.000Z')
			expect(result?.updates.allDay).toBe(false)
		})

		it('should preserve grab offset in minutes when dropping on an hour slot', () => {
			start = dayjs('2024-10-15T10:00:00.000Z')
			end = dayjs('2024-10-15T12:00:00.000Z') // 2-hour event
			cellDate = dayjs('2024-10-15T00:00:00.000Z')
			hour = 14
			minute = 0 // Hovering over 14:00 cell

			// Grabbed 30 minutes into the event
			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent(),
				{ minutes: 30, days: 0 }
			)

			// 14:00 - 30 minutes = 13:30
			expect(result?.updates.start.toISOString()).toBe(
				'2024-10-15T13:30:00.000Z'
			)
			expect(result?.updates.end.toISOString()).toBe('2024-10-15T15:30:00.000Z')
		})

		it('should preserve grab offset in days when dropping on a day cell', () => {
			start = dayjs('2024-10-15T00:00:00.000Z')
			end = dayjs('2024-10-18T00:00:00.000Z') // 3-day event
			allDay = true
			cellDate = dayjs('2024-10-22T00:00:00.000Z') // Hovering over Oct 22
			allDayCell = undefined

			// Grabbed 1 day in (e.g. the middle day of the 3-day event)
			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent(),
				{ minutes: 0, days: 1 }
			)

			// Oct 22 - 1 day = Oct 21
			expect(result?.updates.start.toISOString()).toBe(
				'2024-10-21T00:00:00.000Z'
			)
			expect(result?.updates.end.toISOString()).toBe('2024-10-24T00:00:00.000Z')
		})

		it('should preserve time of day when moving a timed event between day cells', () => {
			start = dayjs('2024-10-15T15:45:00.000Z') // 3:45 PM
			end = dayjs('2024-10-15T17:15:00.000Z') // 5:15 PM
			cellDate = dayjs('2024-10-25T00:00:00.000Z') // Dropping onto Oct 25
			allDayCell = undefined

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent()
			)

			// Keeps 15:45 on the new date, matching Google Calendar and FullCalendar
			expect(result?.updates.start.toISOString()).toBe(
				'2024-10-25T15:45:00.000Z'
			)
			expect(result?.updates.end.toISOString()).toBe('2024-10-25T17:15:00.000Z')
			expect(result?.updates.allDay).toBe(false)
		})
	})
})

describe('calculateDropTimes', () => {
	const timedEvent = {
		id: 'event-1',
		title: 'Sample Event',
		start: dayjs('2024-10-15T10:00:00.000Z'),
		end: dayjs('2024-10-15T11:00:00.000Z'),
	} as CalendarEvent

	it('takes the slot when the cell reports an hour', () => {
		const result = calculateDropTimes(timedEvent, {
			type: 'day-cell',
			date: dayjs('2024-10-16T00:00:00.000Z'),
			hour: 9,
			minute: 30,
		})

		expect(result.start.toISOString()).toBe('2024-10-16T09:30:00.000Z')
		expect(result.allDay).toBe(false)
	})

	it('keeps the clock when the cell reports no hour', () => {
		const result = calculateDropTimes(timedEvent, {
			type: 'day-cell',
			date: dayjs('2024-10-16T00:00:00.000Z'),
		})

		expect(result.start.toISOString()).toBe('2024-10-16T10:00:00.000Z')
		expect(result.allDay).toBe(false)
	})

	it('anchors to midnight when the cell is an all-day cell', () => {
		const result = calculateDropTimes(timedEvent, {
			type: 'day-cell',
			date: dayjs('2024-10-16T00:00:00.000Z'),
			allDay: true,
		})

		expect(result.start.toISOString()).toBe('2024-10-16T00:00:00.000Z')
		expect(result.allDay).toBe(true)
	})
})

describe('calculateGrabOffset', () => {
	const rect = { top: 100, left: 200, width: 700, height: 120 } as ClientRect
	const pointerAt = (clientX: number, clientY: number) =>
		({ clientX, clientY }) as unknown as Event

	// A 3-day event (Jan 1..Jan 3; `end` is exclusive, #248) whose row shows
	// only its last two days, so the rendered bar starts mid-event.
	const multiDayEvent = {
		id: 'event-1',
		title: 'Conference',
		start: dayjs('2025-01-01T00:00:00.000Z'),
		end: dayjs('2025-01-04T00:00:00.000Z'),
		allDay: true,
	} as CalendarEvent

	const twoHourEvent = {
		id: 'event-2',
		title: 'Workshop',
		start: dayjs('2025-01-01T10:00:00.000Z'),
		end: dayjs('2025-01-01T12:00:00.000Z'),
	} as CalendarEvent

	const verticalSegment: DragSegment = {
		start: twoHourEvent.start,
		end: twoHourEvent.end,
		axis: 'vertical',
	}

	it('reports no offset when the event is grabbed at its start', () => {
		const offset = calculateGrabOffset({
			activeEvent: twoHourEvent,
			initialRect: rect,
			activatorEvent: pointerAt(200, 100),
			segment: verticalSegment,
			slotDurationMinutes: 30,
		})

		expect(offset).toEqual({ minutes: 0, days: 0 })
	})

	it('snaps a mid-event grab down to the slot it lands in', () => {
		// Halfway down a 2-hour bar is 60 minutes in.
		const offset = calculateGrabOffset({
			activeEvent: twoHourEvent,
			initialRect: rect,
			activatorEvent: pointerAt(200, 160),
			segment: verticalSegment,
			slotDurationMinutes: 30,
		})

		expect(offset.minutes).toBe(60)
	})

	it('clamps a grab at the very bottom to the last slot', () => {
		const offset = calculateGrabOffset({
			activeEvent: twoHourEvent,
			initialRect: rect,
			activatorEvent: pointerAt(200, 220),
			segment: verticalSegment,
			slotDurationMinutes: 30,
		})

		// Not 120: the final pixel grabs the final slot, not one past the event.
		expect(offset.minutes).toBe(90)
	})

	it('measures a clipped bar against the span it draws, not the whole event', () => {
		// The row shows Jan 2..Jan 3, so the bar's midpoint is Jan 3, two days
		// into the event. Scaling the fraction by the event's own 3-day span
		// would report one day and drop the event a day early.
		const offset = calculateGrabOffset({
			activeEvent: multiDayEvent,
			initialRect: rect,
			activatorEvent: pointerAt(550, 100),
			segment: {
				start: dayjs('2025-01-02T00:00:00.000Z'),
				end: dayjs('2025-01-04T00:00:00.000Z'),
				axis: 'horizontal',
			},
			slotDurationMinutes: 60,
		})

		expect(offset.days).toBe(2)
	})

	it('clamps a grab at the right edge to the last day the event occupies', () => {
		const offset = calculateGrabOffset({
			activeEvent: multiDayEvent,
			initialRect: rect,
			activatorEvent: pointerAt(900, 100),
			segment: {
				start: multiDayEvent.start,
				end: multiDayEvent.end,
				axis: 'horizontal',
			},
			slotDurationMinutes: 60,
		})

		// `end` is exclusive, so Jan 1 -> Jan 4 occupies Jan 1, 2 and 3.
		expect(offset.days).toBe(2)
	})

	it('keeps the wall clock across a DST transition, not the stale offset', () => {
		// Moving a timed event between DAY cells keeps its time of day. Building
		// that with `.hour()/.minute()` holds the clock face but carries the
		// SOURCE day's UTC offset, so landing on a spring-forward day serialises
		// an hour late: the grid shows 10:00 while `onEventUpdate` reports 15:00Z
		// where New York 10:00 is 14:00Z. `docs/timezones.md` documents the
		// re-anchor this relies on.
		dayjs.tz.setDefault('America/New_York')
		const march9 = dayjs.tz('2025-03-09T00:00:00', 'America/New_York')
		const tenAm = dayjs.tz('2025-03-05T10:00:00', 'America/New_York')

		const result = calculateDropTimes(
			{
				id: 'timed',
				title: 'Timed',
				start: tenAm,
				end: tenAm.add(1, 'hour'),
			} as CalendarEvent,
			{ type: 'day-cell', date: march9 },
			{ minutes: 0, days: 0 }
		)

		const trueTenAm = dayjs.tz('2025-03-09T10:00:00', 'America/New_York')
		expect(result.start.toISOString()).toBe(trueTenAm.toISOString())
		dayjs.tz.setDefault()
	})

	it('reads the grabbed day from the column, not from elapsed time', () => {
		// A month row draws a multi-day bar across WHOLE, EQUAL day columns, so
		// the pointer's fraction across the bar is a fraction of columns. Mapping
		// it through elapsed time instead only agrees when the event is
		// midnight-aligned (which every other fixture here is). For a timed span
		// the two diverge and the drop lands a day out.
		//
		// Jan 1 09:00 -> Jan 4 17:00 draws 4 columns over the 700px rect at
		// left 200, so column 0 (Jan 1) is x 200..375. x=370 is inside it.
		// Time-proportionally that same fraction is 19.4h past 09:00, i.e. Jan 2.
		const timedMultiDay = {
			id: 'timed-multi-day',
			title: 'Timed multi-day',
			start: dayjs('2025-01-01T09:00:00.000Z'),
			end: dayjs('2025-01-04T17:00:00.000Z'),
		} as CalendarEvent

		const offset = calculateGrabOffset({
			activeEvent: timedMultiDay,
			initialRect: rect,
			activatorEvent: pointerAt(370, 100),
			segment: {
				start: timedMultiDay.start,
				end: timedMultiDay.end,
				axis: 'horizontal',
			},
			slotDurationMinutes: 60,
		})

		expect(offset.days).toBe(0)
	})

	it('reports no offset for a keyboard drag, which carries no pointer', () => {
		const offset = calculateGrabOffset({
			activeEvent: twoHourEvent,
			initialRect: rect,
			activatorEvent: new Event('keydown'),
			segment: verticalSegment,
			slotDurationMinutes: 30,
		})

		expect(offset).toEqual({ minutes: 0, days: 0 })
	})
})
