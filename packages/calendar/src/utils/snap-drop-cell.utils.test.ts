import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import {
	parseDate,
	toOffsetIso,
	toUtcIso,
	withTime,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import {
	calculateDropTimes,
	calculateResizeTimes,
	type DropCellData,
} from './dnd.utils'
import { snapDropCell } from './snap-drop-cell.utils'

const mustParse = (iso: string, zone = 'UTC'): ZonedDate => {
	const parsed = parseDate(iso, zone)
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

describe('snapping inside a cell', () => {
	const at = (iso: string) => mustParse(iso, 'UTC')
	const hourCell = (hourOfDay: number, snapMinutes?: number): DropCellData => ({
		type: 'day-cell',
		date: at('2025-03-12T00:00:00'),
		hour: hourOfDay,
		slotDurationMinutes: 60,
		snapMinutes,
	})
	const slotCell = (
		hourOfDay: number,
		minuteOfHour: number,
		slotMinutes: number,
		snapMinutes?: number
	): DropCellData => ({
		type: 'day-cell',
		date: at('2025-03-12T00:00:00'),
		hour: hourOfDay,
		minute: minuteOfHour,
		slotDurationMinutes: slotMinutes,
		snapMinutes,
	})
	const meeting: CalendarEvent = {
		id: 'm',
		title: 'Meeting',
		start: toOffsetIso(at('2025-03-12T14:00:00')),
		end: toOffsetIso(at('2025-03-12T15:00:00')),
	}
	const dropStart = (data: DropCellData) =>
		toOffsetIso(calculateDropTimes(meeting, data).start)
	const resizeEnd = (data: DropCellData) => {
		const resized = calculateResizeTimes(meeting, data, 'end')
		return resized ? toOffsetIso(resized.end) : undefined
	}

	describe('snapDropCell', () => {
		it.each([
			[0, 0],
			[0.24, 0],
			[0.25, 15],
			[0.6, 30],
			[0.99, 45],
			[1, 45],
		])(
			'puts a pointer %p of the way down an hour cell on :%i with a 15-minute snap',
			(fraction, expectedMinute) => {
				const snapped = snapDropCell(hourCell(9, 15), fraction)
				expect(snapped.minute).toBe(expectedMinute)
				expect(snapped.slotDurationMinutes).toBe(15)
			}
		)

		it('offsets from the minute of a sub-hour cell', () => {
			const snapped = snapDropCell(slotCell(9, 30, 30, 5), 0.5)
			expect(snapped.minute).toBe(45)
			expect(snapped.slotDurationMinutes).toBe(5)
		})

		it.each([
			['no snap', hourCell(9)],
			['a snap as large as the cell', hourCell(9, 60)],
			['a snap larger than the cell', slotCell(9, 0, 30, 60)],
			['a snap that does not divide the cell', hourCell(9, 45)],
		])('leaves the cell alone with %s', (_label, cell) => {
			expect(snapDropCell(cell, 0.9)).toBe(cell)
		})

		it('leaves a day cell alone', () => {
			const dayCell: DropCellData = {
				type: 'day-cell',
				date: at('2025-03-12T00:00:00'),
				snapMinutes: 15,
			}
			expect(snapDropCell(dayCell, 0.9)).toBe(dayCell)
		})
	})

	describe('what a snapped cell does to a drop', () => {
		it('lands the event on the quarter hour under the pointer', () => {
			expect(dropStart(snapDropCell(hourCell(9, 15), 0.6))).toBe(
				toOffsetIso(at('2025-03-12T09:30:00'))
			)
		})

		it('keeps the hour-cell drop when the pointer is at the top of the cell', () => {
			expect(dropStart(snapDropCell(hourCell(9, 15), 0))).toBe(
				toOffsetIso(at('2025-03-12T09:00:00'))
			)
		})
	})

	describe('what a snapped cell does to a resize', () => {
		it('ends the event at the end of the snap bucket under the pointer', () => {
			expect(resizeEnd(snapDropCell(hourCell(16, 15), 0.3))).toBe(
				toOffsetIso(at('2025-03-12T16:30:00'))
			)
		})

		it('ends at the end of a 5-minute bucket inside a 30-minute slot', () => {
			expect(resizeEnd(snapDropCell(slotCell(16, 30, 30, 5), 0.4))).toBe(
				toOffsetIso(at('2025-03-12T16:45:00'))
			)
		})
	})

	describe('on the day the clocks spring forward (America/New_York, 9 Mar 2025)', () => {
		const zone = 'America/New_York'
		const springForwardCell = (): DropCellData => ({
			type: 'day-cell',
			date: withTime(mustParse('2025-03-09T00:00:00', zone), { hour: 10 }),
			hour: 10,
			slotDurationMinutes: 60,
			snapMinutes: 15,
		})

		it('resizes to the wall-clock quarter hour', () => {
			const overnight: CalendarEvent = {
				...meeting,
				start: toOffsetIso(mustParse('2025-03-08T20:00:00', zone)),
				end: toOffsetIso(mustParse('2025-03-09T00:30:00', zone)),
			}
			const resized = calculateResizeTimes(
				overnight,
				snapDropCell(springForwardCell(), 0.5),
				'end'
			)
			expect(resized ? toUtcIso(resized.end) : '').toBe(
				'2025-03-09T14:45:00.000Z'
			)
		})

		it('drops on the wall-clock quarter hour', () => {
			const dropped = calculateDropTimes(
				meeting,
				snapDropCell(springForwardCell(), 0.5)
			)
			expect(toUtcIso(dropped.start)).toBe('2025-03-09T14:30:00.000Z')
		})
	})
})
