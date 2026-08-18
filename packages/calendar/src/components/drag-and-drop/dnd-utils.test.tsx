import { beforeEach, describe, expect, it } from 'bun:test'
import type { DragEndEvent } from '@dnd-kit/core'
import dayjs from '@ilamy/utils/dayjs'
import { getUpdatedEvent } from './dnd-utils'

let cellType = 'day-cell'
let cellDate = dayjs('2024-10-15T00:00:00')
let cellResourceId: string | number | undefined
let allDayCell: boolean | undefined = false
let hour: number | undefined
let minute: number | undefined

const getDragEvent = () => ({
	active: {
		id: 'event-1',
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
			},
		},
	},
})

let start = dayjs('2024-06-15T00:00:00')
let end = dayjs('2024-06-15T23:59:59')
let allDay = false
let resourceId: string | number | undefined
const getActiveEvent = () => ({
	id: 'event-1',
	title: 'Sample Event',
	start: start,
	end: end,
	allDay: allDay,
	resourceId: resourceId,
})

describe('getUpdatedEvent Utility Function', () => {
	beforeEach(() => {
		cellType = 'day-cell'
		cellDate = dayjs('2024-10-15T00:00:00')
		cellResourceId = undefined
		allDayCell = false
		hour = undefined
		minute = undefined
		start = dayjs('2024-06-15T00:00:00')
		end = dayjs('2024-06-15T23:59:59')
		allDay = false
		resourceId = undefined
	})

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

	it('should calculate new start and end times correctly for day-cell drop', () => {
		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent()
		)
		expect(result).not.toBeNull()
		const updates = (result as any)?.updates
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
			const updates = (result as any)?.updates
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
			const updates = (result as any)?.updates
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
			const updates = (result as any)?.updates
			if (!updates) return
			expect(updates.allDay).toBe(true)
		})
	})

	it('should update resourceId when dropping on a cell with different resourceId', () => {
		resourceId = 'resource-1'
		cellResourceId = 'resource-2'

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent()
		)
		expect(result).not.toBeNull()
		const updates = (result as any)?.updates
		if (!updates) return
		expect(updates.resourceId).toBe(cellResourceId)
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
		const updates = (result as any)?.updates
		if (!updates) return
		const expectedStart = dayjs(cellDate).hour(15).minute(0)
		const expectedEnd = expectedStart.add(end.diff(start, 'second'), 'second')
		expect(updates.start.toISOString()).toBe(expectedStart.toISOString())
		expect(updates.end.toISOString()).toBe(expectedEnd.toISOString())
		expect(updates.allDay).toBe(false)
	})

	it.each([
		[1, '2024-10-20T18:43:29.999Z', '2024-10-20T18:43:00.000Z'],
		[5, '2024-10-20T18:43:00.000Z', '2024-10-20T18:45:00.000Z'],
		[10, '2024-10-20T18:43:00.000Z', '2024-10-20T18:40:00.000Z'],
		[15, '2024-10-20T18:44:00.000Z', '2024-10-20T18:45:00.000Z'],
		[30, '2024-10-20T18:44:00.000Z', '2024-10-20T18:30:00.000Z'],
		[60, '2024-10-20T18:44:00.000Z', '2024-10-20T19:00:00.000Z'],
	] as const)('snaps a timed leading edge to the nearest %i-minute clock line', (interval, rawStartISO, expectedStartISO) => {
		cellDate = dayjs('2024-10-20T18:00:00.000Z')
		cellType = 'time-cell'
		hour = 18
		minute = 0

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent(),
			{
				rawStart: dayjs(rawStartISO),
				snapInterval: interval,
			}
		)

		expect(result?.updates.start.toISOString()).toBe(expectedStartISO)
	})

	it('rounds half intervals forward across hour and day boundaries', () => {
		cellDate = dayjs('2024-10-20T18:00:00.000Z')
		cellType = 'time-cell'
		hour = 18
		minute = 0

		const halfInterval = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent(),
			{
				rawStart: dayjs('2024-10-20T18:07:30.000Z'),
				snapInterval: 15,
			}
		)
		const nextHour = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent(),
			{
				rawStart: dayjs('2024-10-20T18:53:00.000Z'),
				snapInterval: 15,
			}
		)
		const nextDay = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent(),
			{
				rawStart: dayjs('2024-10-20T23:53:00.000Z'),
				snapInterval: 15,
			}
		)

		expect(halfInterval?.updates.start.toISOString()).toBe(
			'2024-10-20T18:15:00.000Z'
		)
		expect(nextHour?.updates.start.toISOString()).toBe(
			'2024-10-20T19:00:00.000Z'
		)
		expect(nextDay?.updates.start.toISOString()).toBe(
			'2024-10-21T00:00:00.000Z'
		)
	})

	it('defaults timed dragging to one-hour snapping', () => {
		cellDate = dayjs('2024-10-20T18:00:00.000Z')
		cellType = 'time-cell'
		hour = 18
		minute = 0

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			getActiveEvent(),
			{ rawStart: dayjs('2024-10-20T18:31:00.000Z') }
		)

		expect(result?.updates.start.toISOString()).toBe('2024-10-20T19:00:00.000Z')
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
		const updates = (result as any)?.updates
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
		const updates = (result as any)?.updates
		if (!updates) return
		expect(updates.start.format()).toBe(cellDate.format())
		expect(updates.end.format()).toBe(cellDate.add(2, 'hour').format())
		expect(updates.end.diff(updates.start, 'second')).toBe(7200)
	})

	it('preserves millisecond duration when dragging an event to a time cell', () => {
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
		const updates = (result as any)?.updates
		if (!updates) return

		expect(updates.start.toISOString()).toBe('2024-11-04T01:00:00.000Z')
		expect(updates.end.toISOString()).toBe('2024-11-07T00:59:59.999Z')
		expect(updates.allDay).toBe(false)
		expect(updates.end.diff(updates.start, 'millisecond')).toBe(
			end.diff(start, 'millisecond')
		)
	})
})
