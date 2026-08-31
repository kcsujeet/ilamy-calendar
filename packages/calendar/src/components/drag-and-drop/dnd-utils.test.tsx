import { beforeEach, describe, expect, it } from 'bun:test'
import type { DragEndEvent } from '@dnd-kit/core'
import dayjs from '@ilamy/utils/dayjs'
import { type DropCellData, getUpdatedEvent } from './dnd-utils'

let cellType = 'day-cell'
let cellDate = dayjs('2024-10-15T00:00:00')
let cellResourceId: string | number | undefined
let allDayCell: boolean | undefined = false
let hour: number | undefined
let minute: number | undefined
let sourceResourceId: string | number | undefined
let cellDisabled = false
let activeEventAvailable = true
let originCell: DropCellData | null

const getDragEvent = () => {
	return {
		active: {
			id: 'event-1',
			data: {
				current: {
					event: activeEventAvailable ? getActiveEvent() : undefined,
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
					allDay: allDayCell,
					disabled: cellDisabled,
					resourceId: cellResourceId,
					start: cellDate
						.hour(hour ?? cellDate.hour())
						.minute(minute ?? cellDate.minute())
						.startOf('minute'),
				},
			},
		},
	}
}

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

describe('getUpdatedEvent Utility Function', () => {
	beforeEach(() => {
		cellType = 'day-cell'
		cellDate = dayjs('2024-10-15T00:00:00')
		cellResourceId = undefined
		allDayCell = false
		hour = undefined
		minute = undefined
		sourceResourceId = undefined
		cellDisabled = false
		activeEventAvailable = true
		start = dayjs('2024-06-15T00:00:00')
		end = dayjs('2024-06-15T23:59:59')
		allDay = false
		resourceId = undefined
		resourceIds = undefined
		originCell = {
			type: 'day-cell',
			start: dayjs('2024-06-15T00:00:00'),
			allDay: false,
		}
	})

	it('should return null if over is missing', () => {
		const result = getUpdatedEvent(
			{ ...getDragEvent(), over: null } as unknown as DragEndEvent,
			originCell
		)
		expect(result).toBeNull()
	})

	it('should return null if active event data is missing', () => {
		activeEventAvailable = false
		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			originCell
		)
		expect(result).toBeNull()
	})

	it('rejects a disabled destination while allowing it as an origin', () => {
		cellDisabled = true

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			originCell
		)

		expect(result).toBeNull()
	})

	it('should calculate new start and end times correctly for day-cell drop', () => {
		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			originCell
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
				originCell
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
			originCell = {
				type: 'day-cell',
				start: dayjs('2024-06-15T00:00:00'),
				allDay: true,
			}

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				originCell
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
			originCell = {
				type: 'day-cell',
				start: dayjs('2024-06-15T00:00:00'),
				allDay: true,
			}

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				originCell
			)
			expect(result).not.toBeNull()
			const updates = (result as any)?.updates
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
			originCell
		)
		expect(result).not.toBeNull()
		const updates = (result as any)?.updates
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
				originCell
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
				originCell
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
				originCell
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
				originCell
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
			originCell
		)
		expect(result).not.toBeNull()
		const updates = (result as any)?.updates
		if (!updates) return
		const expectedStart = dayjs(cellDate).hour(hour).minute(minute)
		const expectedEnd = expectedStart.add(end.diff(start, 'second'), 'second')
		expect(updates.start.toISOString()).toBe(expectedStart.toISOString())
		expect(updates.end.toISOString()).toBe(expectedEnd.toISOString())
		expect(updates.allDay).toBe(false)
	})

	it('applies the hovered-cell delta to the original event start', () => {
		start = dayjs('2024-10-20T09:45:00.000Z')
		end = dayjs('2024-10-20T11:45:00.000Z')
		cellDate = dayjs('2024-10-20T00:00:00.000Z')
		cellType = 'time-cell'
		allDay = false
		allDayCell = false

		const cases = [
			{ originHour: 9, targetHour: 18, expectedHour: 18 },
			{ originHour: 10, targetHour: 18, expectedHour: 17 },
			{ originHour: 11, targetHour: 18, expectedHour: 16 },
		]
		for (const { originHour, targetHour, expectedHour } of cases) {
			originCell = {
				type: 'time-cell',
				start: cellDate.hour(originHour).minute(0).startOf('minute'),
				allDay: false,
			}
			hour = targetHour
			minute = 0
			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				originCell
			)

			expect(result?.updates.start.hour()).toBe(expectedHour)
			expect(result?.updates.start.minute()).toBe(45)
			expect(result?.updates.end.diff(result.updates.start, 'hour')).toBe(2)
		}
	})

	it('applies one delta across a day and resource change', () => {
		start = dayjs('2025-01-15T09:00:00.000Z')
		end = dayjs('2025-01-15T11:00:00.000Z')
		resourceId = 'resource-1'
		cellDate = dayjs('2025-01-16T00:00:00.000Z')
		cellType = 'time-cell'
		hour = 13
		minute = 0
		cellResourceId = 'resource-2'
		originCell = {
			type: 'time-cell',
			start: dayjs('2025-01-15T10:00:00.000Z'),
			resourceId: 'resource-1',
			allDay: false,
		}

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			originCell
		)

		expect(result?.updates.start.toISOString()).toBe('2025-01-16T12:00:00.000Z')
		expect(result?.updates.resourceId).toBe('resource-2')
	})

	it('keeps the local clock offset when the cell delta crosses DST', () => {
		dayjs.tz.setDefault('America/New_York')
		try {
			start = dayjs.tz('2025-11-01T09:15:00', 'America/New_York')
			end = dayjs.tz('2025-11-01T10:15:00', 'America/New_York')
			cellDate = dayjs.tz('2025-11-02T00:00:00', 'America/New_York')
			cellType = 'time-cell'
			hour = 10
			minute = 0
			originCell = {
				type: 'time-cell',
				start: dayjs.tz('2025-11-01T10:00:00', 'America/New_York'),
				allDay: false,
			}

			const result = getUpdatedEvent(
				getDragEvent() as unknown as DragEndEvent,
				originCell
			)

			expect(result?.updates.start.toISOString()).toBe(
				'2025-11-02T14:15:00.000Z'
			)
		} finally {
			dayjs.tz.setDefault()
		}
	})

	it('should set all-day to false when dropping on time-cell even if original event was all-day', () => {
		allDay = true
		cellType = 'time-cell'
		hour = 9
		minute = 0

		originCell = {
			type: 'day-cell',
			start: dayjs('2024-06-15T00:00:00'),
			allDay: true,
		}

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			originCell
		)
		expect(result).not.toBeNull()
		const updates = (result as any)?.updates
		if (!updates) return
		expect(updates.allDay).toBe(false)
		expect(updates.start.hour()).toBe(9)
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
		originCell = {
			type: 'day-cell',
			start: dayjs('2024-06-15T22:00:00'),
			allDay: false,
		}

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			originCell
		)
		expect(result).not.toBeNull()
		const updates = (result as any)?.updates
		if (!updates) return
		expect(updates.start.format()).toBe(cellDate.format())
		expect(updates.end.format()).toBe(cellDate.add(2, 'hour').format())
		expect(updates.end.diff(updates.start, 'second')).toBe(7200)
	})

	it('preserves duration with millisecond precision', () => {
		start = dayjs('2024-06-15T09:00:00.125Z')
		end = dayjs('2024-06-15T10:00:00.875Z')
		cellDate = dayjs('2024-06-16T12:00:00.000Z')
		originCell = {
			type: 'day-cell',
			start: dayjs('2024-06-15T12:00:00.000Z'),
			allDay: false,
		}

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			originCell
		)

		expect(result?.updates.end.diff(result.updates.start)).toBe(end.diff(start))
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
		originCell = {
			type: 'day-cell',
			start: dayjs('2024-11-04T00:00:00.000Z'),
			allDay: true,
		}

		const result = getUpdatedEvent(
			getDragEvent() as unknown as DragEndEvent,
			originCell
		)
		expect(result).not.toBeNull()
		const updates = (result as any)?.updates
		if (!updates) return

		expect(updates.start.toISOString()).toBe('2024-11-04T01:00:00.000Z')
		expect(updates.end.toISOString()).toBe('2024-11-07T00:59:59.999Z')
		expect(updates.allDay).toBe(false)
	})
})
