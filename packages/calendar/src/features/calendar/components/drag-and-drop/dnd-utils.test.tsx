import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { ClientRect, DragEndEvent } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import {
	calculateGrabOffset,
	type DragSegment,
} from '@/features/calendar/utils/grab-offset'
import {
	calculateDropTimes,
	calculateResizeTimes,
	type DropCellData,
	getPressedResizeEdge,
	getSnappedOverData,
	getUpdatedEvent,
} from './dnd-utils'

let cellType = 'day-cell'
let cellDate = dayjs('2024-10-15T00:00:00')
let cellResourceId: string | number | undefined
let allDayCell: boolean | undefined = false
let hour: number | undefined
let minute: number | undefined
let sourceResourceId: string | number | undefined
let disabledCell: boolean | undefined

const getDragEvent = () => ({
	activatorEvent: {},
	delta: { x: 0, y: 0 },
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
		rect: { top: 0, left: 0, width: 100, height: 60 },
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

	// FullCalendar commits nothing for a drop that changes nothing (no
	// `eventChange`; EventDragging.ts:374, v7.1.1), so no callback fires.
	describe('a drop that leaves the event where it was', () => {
		const dropInPlace = () =>
			getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				getActiveEvent()
			)

		it('commits nothing on the day cell it already sits on', () => {
			cellDate = dayjs('2024-06-15T00:00:00')
			expect(dropInPlace()).toBeNull()
		})

		it('commits nothing on the time slot it already starts in', () => {
			start = dayjs('2024-06-15T10:00:00')
			end = dayjs('2024-06-15T11:00:00')
			cellDate = dayjs('2024-06-15T00:00:00')
			hour = 10
			minute = 0
			expect(dropInPlace()).toBeNull()
		})

		it('commits nothing on the all-day cell an all-day event already sits on', () => {
			start = dayjs('2024-06-15T00:00:00')
			end = dayjs('2024-06-16T00:00:00')
			allDay = true
			allDayCell = true
			cellDate = dayjs('2024-06-15T00:00:00')
			expect(dropInPlace()).toBeNull()
		})

		it('still commits a move to another resource on the same slot', () => {
			cellDate = dayjs('2024-06-15T00:00:00')
			resourceId = 'resource-1'
			cellResourceId = 'resource-2'
			expect(dropInPlace()).not.toBeNull()
		})

		it('still commits a drop that only changes the time', () => {
			start = dayjs('2024-06-15T10:00:00')
			end = dayjs('2024-06-15T11:00:00')
			cellDate = dayjs('2024-06-15T00:00:00')
			hour = 10
			minute = 30
			expect(dropInPlace()).not.toBeNull()
		})
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
			// This used to expect the old timed length (23:59:59) to be kept. An
			// all-day end is the next midnight (RFC 5545 3.6.1), and FullCalendar
			// resets the length when a drop crosses the all-day boundary
			// (`defaultAllDayEventDuration` {day:1}, `event-mutation.ts:131-134`).
			expect(updates.end.format()).toBe(dayjs(cellDate).add(1, 'day').format())
		})

		// #322. This used to expect `false`: an all-day event dropped on a whole-day
		// cell turned timed. But `allDay: false` with no hour is exactly what a
		// month or resource day-grid cell reports, so every all-day event dragged
		// in a month grid lost its all-day status. A drop changes an event's kind
		// only when it crosses between an all-day area and a timed one
		// (FullCalendar, interaction/src/interactions/EventDragging.ts:450,
		// v6.1.21); a whole-day cell is neither, so the event keeps its own.
		it('keeps an all-day event all-day when dropped on a whole-day cell that is not an all-day cell', () => {
			allDay = true
			allDayCell = false

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

		// This used to keep the 3 day length (to the second). Across the all-day
		// boundary FullCalendar resets the length to the default timed duration,
		// one hour (`event-mutation.ts:131-134`, `defaultTimedEventDuration`,
		// `options.ts:486`, v7.1.1).
		expect(updates.start.toISOString()).toBe('2024-11-04T01:00:00.000Z')
		expect(updates.end.toISOString()).toBe('2024-11-04T02:00:00.000Z')
		expect(updates.allDay).toBe(false)
	})

	describe('grab offset and time preservation (FullCalendar and Google Calendar behaviour)', () => {
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

	describe('across the all-day boundary', () => {
		const allDayEvent = {
			id: 'event-2',
			title: 'Day off',
			allDay: true,
			start: dayjs('2024-10-15T00:00:00.000'),
			end: dayjs('2024-10-16T00:00:00.000'),
		} as CalendarEvent
		const slot = (grabMinutes: number) =>
			calculateDropTimes(
				allDayEvent,
				{
					type: 'day-cell',
					date: dayjs('2024-10-17T00:00:00.000'),
					hour: 11,
					minute: 0,
				},
				{ minutes: grabMinutes, days: 0 }
			)

		it('starts an all-day event at the slot wherever it was grabbed', () => {
			expect(slot(0).start.format('YYYY-MM-DDTHH:mm:ss.SSS')).toBe(
				'2024-10-17T11:00:00.000'
			)
			expect(slot(600).start.format('YYYY-MM-DDTHH:mm:ss.SSS')).toBe(
				'2024-10-17T11:00:00.000'
			)
		})

		it('makes an all-day event dropped on a time slot one hour long', () => {
			expect(slot(0).end.format('YYYY-MM-DDTHH:mm:ss.SSS')).toBe(
				'2024-10-17T12:00:00.000'
			)
			expect(slot(0).allDay).toBe(false)
		})

		it('makes a timed event dropped on the all-day row end at the next midnight', () => {
			const result = calculateDropTimes(timedEvent, {
				type: 'day-cell',
				date: dayjs('2024-10-16T00:00:00.000'),
				allDay: true,
			})
			expect(result.end.format('YYYY-MM-DDTHH:mm:ss.SSS')).toBe(
				'2024-10-17T00:00:00.000'
			)
		})

		it('keeps a multi-day all-day event its length on an all-day cell', () => {
			const threeDays = {
				...allDayEvent,
				end: dayjs('2024-10-18T00:00:00.000'),
			} as CalendarEvent
			const result = calculateDropTimes(threeDays, {
				type: 'day-cell',
				date: dayjs('2024-10-20T00:00:00.000'),
				allDay: true,
			})
			expect(result.end.format('YYYY-MM-DDTHH:mm:ss.SSS')).toBe(
				'2024-10-23T00:00:00.000'
			)
		})
	})

	describe('across a clock change (America/New_York)', () => {
		beforeEach(() => {
			dayjs.tz.setDefault('America/New_York')
		})

		afterEach(() => {
			dayjs.tz.setDefault()
		})

		// A move applies one delta to both edges (`event-mutation.ts:110-114`,
		// `marker.ts:48-58`, v7.1.1), so the event keeps its WALL-CLOCK length.
		const move = (
			startWallClock: string,
			endWallClock: string,
			targetDay: string
		) => {
			const event = {
				id: 'event-3',
				title: 'Shift',
				start: dayjs(startWallClock),
				end: dayjs(endWallClock),
			} as CalendarEvent
			const result = calculateDropTimes(event, {
				type: 'day-cell',
				date: dayjs(`${targetDay}T00:00:00`),
			})
			return {
				start: result.start.format('YYYY-MM-DDTHH:mm'),
				end: result.end.format('YYYY-MM-DDTHH:mm'),
				endOffset: result.end.format('Z'),
			}
		}

		it('keeps a 12 hour shift 12 hours on the clock when it moves over the spring change', () => {
			expect(
				move('2025-03-07T20:00:00', '2025-03-08T08:00:00', '2025-03-08')
			).toEqual({
				start: '2025-03-08T20:00',
				end: '2025-03-09T08:00',
				endOffset: '-04:00',
			})
		})

		it('keeps the end on the clock when it falls in the repeated hour (2 Nov 2025)', () => {
			expect(
				move('2025-11-01T20:00:00', '2025-11-01T23:30:00', '2025-11-02')
			).toMatchObject({ start: '2025-11-02T20:00', end: '2025-11-02T23:30' })
		})

		it('moves an end that lands in the skipped hour forward, as a clock would', () => {
			// 01:00 to 02:30 on 8 March, moved to 9 March, where 02:30 does not exist.
			const landed = move(
				'2025-03-08T00:00:00',
				'2025-03-08T02:30:00',
				'2025-03-09'
			)
			expect(landed.start).toBe('2025-03-09T00:00')
			expect(landed.end).toBe('2025-03-09T03:30')
		})
	})

	// A time-slot drop reports its column's date. On a clock-change day that
	// date can carry the offset of the day's midnight, and `.hour()` keeps it.
	it('puts a drop on the 10:00 slot of New York spring-forward day at 14:00Z', () => {
		dayjs.tz.setDefault('America/New_York')
		const midnightEST = dayjs('2025-03-09T00:00:00.000')
		const result = calculateDropTimes(timedEvent, {
			type: 'time-cell',
			date: midnightEST,
			hour: 10,
			minute: 0,
		})
		dayjs.tz.setDefault()

		expect(result.start.toISOString()).toBe('2025-03-09T14:00:00.000Z')
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

	describe('on a bar that spans hidden days', () => {
		// Fri Jan 10 -> Tue Jan 14, with Sat and Sun hidden: the bar draws three
		// equal columns (Fri, Mon, Tue). Noon UTC is the same calendar day in
		// every zone from Vancouver to Tokyo.
		const fridayToTuesday = {
			id: 'event-3',
			title: 'Offsite',
			start: dayjs('2025-01-10T12:00:00.000Z'),
			end: dayjs('2025-01-14T18:00:00.000Z'),
			allDay: true,
		} as CalendarEvent
		const grabAt = (clientX: number) =>
			calculateGrabOffset({
				activeEvent: fridayToTuesday,
				initialRect: rect,
				activatorEvent: pointerAt(clientX, 100),
				segment: {
					start: fridayToTuesday.start,
					end: fridayToTuesday.end,
					axis: 'horizontal',
					hiddenDays: new Set([0, 6]),
				},
				slotDurationMinutes: 60,
			})

		it('reads the middle column as Monday, three days into the event', () => {
			expect(grabAt(550).days).toBe(3)
		})

		it('reads the last column as Tuesday, four days into the event', () => {
			expect(grabAt(900).days).toBe(4)
		})
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

describe('calculateResizeTimes', () => {
	const originalTz = dayjs.tz.guess()
	const at = (iso: string) => dayjs(iso)
	const mk = (startISO: string, endISO: string, extra = {}): CalendarEvent => ({
		id: 'resized',
		title: 'Resized',
		start: at(startISO),
		end: at(endISO),
		...extra,
	})
	/** The time slot a pointer hovers: `slotMinutes` wide when it has a minute, an hour otherwise. */
	const slot = (
		dayISO: string,
		hourOfDay: number,
		minuteOfHour?: number,
		slotMinutes = 60
	): DropCellData => ({
		type: 'day-cell',
		date: at(dayISO),
		hour: hourOfDay,
		minute: minuteOfHour,
		slotDurationMinutes: slotMinutes,
	})
	const day = (dayISO: string): DropCellData => ({
		type: 'day-cell',
		date: at(dayISO),
	})
	const span = (resized: ReturnType<typeof calculateResizeTimes>) =>
		resized && [resized.start.format(), resized.end.format()]

	describe('the end edge in a time grid', () => {
		const meeting = mk('2025-03-12T09:00:00', '2025-03-12T10:00:00')

		it.each([
			[15, 11, 15, '2025-03-12T11:30:00'],
			[30, 11, 30, '2025-03-12T12:00:00'],
		])(
			'ends at the end of the hovered %i-minute slot',
			(slotMinutes, hovered, minuteOfHour, expected) => {
				const resized = calculateResizeTimes(
					meeting,
					slot('2025-03-12T00:00:00', hovered, minuteOfHour, slotMinutes),
					'end'
				)
				expect(span(resized)).toEqual([
					at('2025-03-12T09:00:00').format(),
					at(expected).format(),
				])
			}
		)

		it('ends at the end of the hovered hour when the slot is an hour', () => {
			const resized = calculateResizeTimes(
				meeting,
				slot('2025-03-12T00:00:00', 12),
				'end'
			)
			expect(span(resized)).toEqual([
				at('2025-03-12T09:00:00').format(),
				at('2025-03-12T13:00:00').format(),
			])
		})

		it('never moves the start', () => {
			const resized = calculateResizeTimes(
				meeting,
				slot('2025-03-13T00:00:00', 8, 0, 30),
				'end'
			)
			expect(resized?.start.isSame(meeting.start)).toBe(true)
		})
	})

	describe('the start edge in a time grid', () => {
		it('starts at the start of the hovered slot', () => {
			const meeting = mk('2025-03-12T09:00:00', '2025-03-12T10:00:00')
			const resized = calculateResizeTimes(
				meeting,
				slot('2025-03-12T00:00:00', 8, 15, 15),
				'start'
			)
			expect(span(resized)).toEqual([
				at('2025-03-12T08:15:00').format(),
				at('2025-03-12T10:00:00').format(),
			])
		})
	})

	describe('in a day grid', () => {
		it('ends an all-day event at the midnight after the hovered day', () => {
			const trip = mk('2025-03-12T00:00:00', '2025-03-13T00:00:00', {
				allDay: true,
			})
			const resized = calculateResizeTimes(
				trip,
				day('2025-03-14T00:00:00'),
				'end'
			)
			expect(span(resized)).toEqual([
				at('2025-03-12T00:00:00').format(),
				at('2025-03-15T00:00:00').format(),
			])
		})

		it('starts an all-day event at the hovered day', () => {
			const trip = mk('2025-03-12T00:00:00', '2025-03-14T00:00:00', {
				allDay: true,
			})
			const resized = calculateResizeTimes(
				trip,
				day('2025-03-11T00:00:00'),
				'start'
			)
			expect(span(resized)).toEqual([
				at('2025-03-11T00:00:00').format(),
				at('2025-03-14T00:00:00').format(),
			])
		})

		it('keeps the time of day of a multi-day timed block', () => {
			const block = mk('2025-03-12T09:00:00', '2025-03-13T17:00:00')
			const endResized = calculateResizeTimes(
				block,
				day('2025-03-15T00:00:00'),
				'end'
			)
			const startResized = calculateResizeTimes(
				block,
				day('2025-03-11T00:00:00'),
				'start'
			)
			expect(span(endResized)).toEqual([
				at('2025-03-12T09:00:00').format(),
				at('2025-03-15T17:00:00').format(),
			])
			expect(span(startResized)).toEqual([
				at('2025-03-11T09:00:00').format(),
				at('2025-03-13T17:00:00').format(),
			])
		})

		it('resizes across a week row the same way', () => {
			const trip = mk('2025-03-14T00:00:00', '2025-03-15T00:00:00', {
				allDay: true,
			})
			const resized = calculateResizeTimes(
				trip,
				day('2025-03-18T00:00:00'),
				'end'
			)
			expect(resized?.end.format()).toBe(at('2025-03-19T00:00:00').format())
		})
	})

	describe('when the result would not be a span', () => {
		it('is null when the end edge is dragged to or before the start', () => {
			const meeting = mk('2025-03-12T09:00:00', '2025-03-12T10:00:00')
			expect(
				calculateResizeTimes(
					meeting,
					slot('2025-03-12T00:00:00', 8, 0, 30),
					'end'
				)
			).toBeNull()
		})

		it('is null when the start edge is dragged to or after the end', () => {
			const meeting = mk('2025-03-12T09:00:00', '2025-03-12T10:00:00')
			expect(
				calculateResizeTimes(meeting, slot('2025-03-12T00:00:00', 10), 'start')
			).toBeNull()
		})

		it('is null for an all-day event whose start edge passes its end', () => {
			const trip = mk('2025-03-12T00:00:00', '2025-03-14T00:00:00', {
				allDay: true,
			})
			expect(
				calculateResizeTimes(trip, day('2025-03-14T00:00:00'), 'start')
			).toBeNull()
		})

		it('is null for a cell that says nothing about where it is', () => {
			const meeting = mk('2025-03-12T09:00:00', '2025-03-12T10:00:00')
			expect(calculateResizeTimes(meeting, {}, 'end')).toBeNull()
		})
	})

	describe('on the day the clocks spring forward (America/New_York, 9 Mar 2025)', () => {
		beforeEach(() => {
			dayjs.tz.setDefault('America/New_York')
		})

		afterEach(() => {
			dayjs.tz.setDefault(originalTz)
		})

		it('ends at the wall-clock end of the hovered slot, not an hour out', () => {
			const overnight = mk('2025-03-08T20:00:00', '2025-03-09T00:30:00')
			const resized = calculateResizeTimes(
				overnight,
				slot('2025-03-09T00:00:00', 10, 0, 30),
				'end'
			)
			// 10:30 EDT is 14:30Z. A slot built with `.hour(10)` on the EST midnight
			// carries -05:00 and reads 15:30Z.
			expect(resized?.end.toISOString()).toBe('2025-03-09T14:30:00.000Z')
		})

		it('keeps an end that follows the change at the same wall-clock time', () => {
			const block = mk('2025-03-08T09:00:00', '2025-03-08T17:00:00')
			const resized = calculateResizeTimes(
				block,
				day('2025-03-10T00:00:00'),
				'end'
			)
			expect(resized?.end.toISOString()).toBe('2025-03-10T21:00:00.000Z')
		})
	})
})

describe('snapping inside a cell', () => {
	const at = (iso: string) => dayjs(iso)
	/** An hour cell with no `minute`, the way a one-hour slot and a timeline column report it. */
	const hourCell = (hourOfDay: number, snapMinutes?: number): DropCellData => ({
		type: 'day-cell',
		date: at('2025-03-12T00:00:00'),
		hour: hourOfDay,
		slotDurationMinutes: 60,
		snapMinutes,
	})
	const meeting = {
		id: 'm',
		title: 'Meeting',
		start: at('2025-03-12T14:00:00'),
		end: at('2025-03-12T15:00:00'),
	} as CalendarEvent

	describe('getSnappedOverData', () => {
		const rect = { top: 100, left: 200, width: 80, height: 60 }
		const overCell = (cell: DropCellData) =>
			({
				id: 'cell',
				rect,
				data: { current: cell },
			}) as unknown as DragEndEvent['over']

		it('reads the vertical fraction from the pointer height', () => {
			const cell: DropCellData = { ...hourCell(9, 15), axis: 'vertical' }
			// 45 of 60px down the cell
			const snapped = getSnappedOverData(overCell(cell), { x: 210, y: 145 })
			expect(snapped?.minute).toBe(45)
		})

		it('reads the horizontal fraction from the pointer width', () => {
			const cell: DropCellData = { ...hourCell(9, 15), axis: 'horizontal' }
			// 20 of 80px across the cell
			const snapped = getSnappedOverData(overCell(cell), { x: 220, y: 100 })
			expect(snapped?.minute).toBe(15)
		})

		it('measures the pointer against the cell where it is now, not where it was', () => {
			// The same pointer over the same cell, which a scroll has moved 30px up:
			// the pointer is now further down the cell.
			const cell: DropCellData = { ...hourCell(9, 15), axis: 'vertical' }
			const pointer = { x: 210, y: 105 }
			const before = getSnappedOverData(overCell(cell), pointer)
			const scrolled = {
				id: 'cell',
				rect: { ...rect, top: rect.top - 30 },
				data: { current: cell },
			} as unknown as DragEndEvent['over']
			const after = getSnappedOverData(scrolled, pointer)
			expect([before?.minute, after?.minute]).toEqual([0, 30])
		})

		it('keeps the start of the cell for a drag with no pointer (keyboard)', () => {
			const cell: DropCellData = { ...hourCell(9, 15), axis: 'vertical' }
			expect(getSnappedOverData(overCell(cell), undefined)?.minute).toBe(0)
		})

		it('is undefined when nothing is under the pointer', () => {
			expect(getSnappedOverData(null, { x: 0, y: 0 })).toBeUndefined()
		})

		describe('over a time column (one drop target for all its slots)', () => {
			// Two hour rows of two 30-minute slots, 4px apart: rows span 100-160 and
			// 164-224, a slot is 30px, and the column is 124px tall in all.
			const column = { top: 100, left: 200, width: 80, height: 124 }
			const slotAt = (hour: number, minute: number): DropCellData => ({
				type: 'day-cell',
				date: at('2025-03-12T00:00:00').hour(hour).minute(minute),
				hour,
				minute,
				slotDurationMinutes: 30,
				axis: 'vertical',
			})
			const slots = [slotAt(9, 0), slotAt(9, 30), slotAt(10, 0), slotAt(10, 30)]
			const overColumn = (
				published: Array<DropCellData | undefined>,
				columnRect = column
			) =>
				({
					id: 'column',
					rect: columnRect,
					data: { current: { slots: published, slotsPerRow: 2, rowGap: 4 } },
				}) as unknown as DragEndEvent['over']
			const slotAtY = (y: number) =>
				getSnappedOverData(overColumn(slots), { x: 210, y })
			const startAt = (y: number) => {
				const slot = slotAtY(y)
				return slot && [slot.hour, slot.minute]
			}

			it('resolves the slot from the pointer height within its row', () => {
				expect([100, 129, 131, 159].map(startAt)).toEqual([
					[9, 0],
					[9, 0],
					[9, 30],
					[9, 30],
				])
				expect([165, 193, 195, 224].map(startAt)).toEqual([
					[10, 0],
					[10, 0],
					[10, 30],
					[10, 30],
				])
			})

			it('gives the gap between two rows to the row above', () => {
				// dnd-kit hit-tests whole-pixel mouse coordinates, so the gap, which
				// the pointer can only be in by a fraction, was the last slot above it.
				expect([161, 162, 163].map(startAt)).toEqual([
					[9, 30],
					[9, 30],
					[9, 30],
				])
			})

			it('gives an edge shared by two slots to the earlier one', () => {
				// Registered cells each contained their own edges, and the one
				// registered first won a point on both.
				expect([130, 160, 194].map(startAt)).toEqual([
					[9, 0],
					[9, 30],
					[10, 0],
				])
			})

			it('measures the pointer against the column where it is now, not where it was', () => {
				const scrolled = overColumn(slots, { ...column, top: column.top - 30 })
				const snapped = getSnappedOverData(scrolled, { x: 210, y: 105 })
				expect(snapped?.minute).toBe(30)
			})

			it('keeps the start of the first slot for a drag with no pointer (keyboard)', () => {
				const snapped = getSnappedOverData(overColumn(slots), undefined)
				expect([snapped?.hour, snapped?.minute]).toEqual([9, 0])
			})

			it('still snaps finer than the slot it picked', () => {
				const finer = slots.map((slot) => ({ ...slot, snapMinutes: 10 }))
				// 28 of the 30px of the 9:30 slot is its last 10-minute piece.
				const snapped = getSnappedOverData(overColumn(finer), {
					x: 210,
					y: 158,
				})
				expect(snapped?.minute).toBe(50)
			})

			it('is undefined for a slot that has not published itself', () => {
				const unpublished = [slots.at(0), undefined, undefined, undefined]
				expect(
					getSnappedOverData(overColumn(unpublished), { x: 210, y: 140 })
				).toBeUndefined()
			})
		})
	})

	describe('getUpdatedEvent', () => {
		it('commits the snapped drop', () => {
			const cell: DropCellData = { ...hourCell(9, 15), axis: 'vertical' }
			const event = {
				active: { id: 'm', data: { current: { type: 'calendar-event' } } },
				over: {
					id: 'cell',
					rect: { top: 100, left: 0, width: 80, height: 60 },
					data: { current: cell },
				},
			} as unknown as DragEndEvent
			const result = getUpdatedEvent(event, meeting, undefined, {
				x: 0,
				y: 130,
			})
			expect(result?.updates.start?.format()).toBe(
				at('2025-03-12T09:30:00').format()
			)
		})

		it('commits nothing when released over a slot that has not published itself', () => {
			const event = {
				active: { id: 'm', data: { current: { type: 'calendar-event' } } },
				over: {
					id: 'column',
					rect: { top: 100, left: 0, width: 80, height: 124 },
					data: {
						current: {
							slots: [undefined, undefined],
							slotsPerRow: 1,
							rowGap: 4,
						},
					},
				},
			} as unknown as DragEndEvent
			expect(getUpdatedEvent(event, meeting, undefined, { x: 0, y: 130 })).toBe(
				null
			)
		})
	})
})

describe('getPressedResizeEdge', () => {
	/** The mousedown dnd-kit reports as the activator, dispatched on `target`. */
	const pressOn = (target: Element) => {
		const press = new Event('mousedown')
		target.dispatchEvent(press)
		return press
	}
	const handle = (edge: string) => {
		const element = document.createElement('div')
		element.setAttribute('data-resize-handle', edge)
		return element
	}

	it('reads the start edge from a press on the start handle', () => {
		expect(getPressedResizeEdge(pressOn(handle('start')))).toBe('start')
	})

	it('reads the end edge from a press on the end handle', () => {
		expect(getPressedResizeEdge(pressOn(handle('end')))).toBe('end')
	})

	it('reads the edge from a press on something inside the handle', () => {
		const inside = document.createElement('span')
		handle('end').append(inside)
		expect(getPressedResizeEdge(pressOn(inside))).toBe('end')
	})

	it('is a move when the press is on the bar itself', () => {
		expect(
			getPressedResizeEdge(pressOn(document.createElement('div')))
		).toBeUndefined()
	})

	it('is a move when the handle names no edge', () => {
		expect(getPressedResizeEdge(pressOn(handle('middle')))).toBeUndefined()
	})

	it('is a move for a keyboard drag, which has no pointer target', () => {
		expect(getPressedResizeEdge(new Event('keydown'))).toBeUndefined()
	})
})

// Europe/London, Lisbon and Dublin read 0 in winter; with no `timezone` prop a
// drop across the 30 March change landed an hour off.
describe('calculateDropTimes across the 30 March change, no calendar zone', () => {
	const dropOnMachineIn = (machineZone: string): string[] => {
		const script = `
			import dayjs from '@ilamy/utils/dayjs'
			import { calculateDropTimes } from '${import.meta.dir}/dnd-utils.ts'
			const allDayEvent = {
				id: 'a', title: 'a', uid: 'a', allDay: true,
				start: dayjs('2025-03-29T00:00:00.000'),
				end: dayjs('2025-03-30T00:00:00.000'),
			}
			const dropped = calculateDropTimes(allDayEvent, {
				date: dayjs('2025-03-30T00:00:00.000'),
				allDay: false,
			})
			console.log(JSON.stringify([dropped.start, dropped.end].map((d) => d.toISOString())))
		`
		const child = Bun.spawnSync(['bun', '-e', script], {
			env: { ...process.env, TZ: machineZone },
		})
		return JSON.parse(child.stdout.toString().trim())
	}

	it.each(['Europe/London', 'Europe/Lisbon', 'Europe/Dublin'])(
		'a one-day all-day event dropped on the 30th covers that day to the next midnight, 00:00 BST (%s)',
		(machineZone) => {
			expect(dropOnMachineIn(machineZone)).toEqual([
				'2025-03-30T00:00:00.000Z',
				'2025-03-30T23:00:00.000Z',
			])
		}
	)
})
