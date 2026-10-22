import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import {
	calculateDropTimes,
	calculateResizeTimes,
	type DropCellData,
} from '@/features/calendar/components/drag-and-drop/dnd-utils'
import { snapDropCell } from './snap-drop-cell'

describe('snapping inside a cell', () => {
	const originalTz = dayjs.tz.guess()
	const at = (iso: string) => dayjs(iso)
	/** An hour cell with no `minute`, the way a one-hour slot and a timeline column report it. */
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
	const meeting = {
		id: 'm',
		title: 'Meeting',
		start: at('2025-03-12T14:00:00'),
		end: at('2025-03-12T15:00:00'),
	} as CalendarEvent
	const dropStart = (data: DropCellData) =>
		calculateDropTimes(meeting, data).start.format()
	const resizeEnd = (data: DropCellData) =>
		calculateResizeTimes(meeting, data, 'end')?.end.format()

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
				at('2025-03-12T09:30:00').format()
			)
		})

		it('keeps the hour-cell drop when the pointer is at the top of the cell', () => {
			expect(dropStart(snapDropCell(hourCell(9, 15), 0))).toBe(
				at('2025-03-12T09:00:00').format()
			)
		})
	})

	describe('what a snapped cell does to a resize', () => {
		it('ends the event at the end of the snap bucket under the pointer', () => {
			expect(resizeEnd(snapDropCell(hourCell(16, 15), 0.3))).toBe(
				at('2025-03-12T16:30:00').format()
			)
		})

		it('ends at the end of a 5-minute bucket inside a 30-minute slot', () => {
			expect(resizeEnd(snapDropCell(slotCell(16, 30, 30, 5), 0.4))).toBe(
				at('2025-03-12T16:45:00').format()
			)
		})
	})

	describe('on the day the clocks spring forward (America/New_York, 9 Mar 2025)', () => {
		beforeEach(() => {
			dayjs.tz.setDefault('America/New_York')
		})

		afterEach(() => {
			dayjs.tz.setDefault(originalTz)
		})

		// The cell's date is the grid's own: the day's midnight set to the hour, as
		// `getDayHours` builds it, so it carries the offset in force at 10:00.
		const springForwardCell = (): DropCellData => ({
			type: 'day-cell',
			date: dayjs.tz('2025-03-09T00:00:00', 'America/New_York').hour(10),
			hour: 10,
			slotDurationMinutes: 60,
			snapMinutes: 15,
		})

		it('resizes to the wall-clock quarter hour', () => {
			const overnight = {
				...meeting,
				start: dayjs.tz('2025-03-08T20:00:00', 'America/New_York'),
				end: dayjs.tz('2025-03-09T00:30:00', 'America/New_York'),
			}
			const resized = calculateResizeTimes(
				overnight,
				snapDropCell(springForwardCell(), 0.5),
				'end'
			)
			// 10:45 EDT is 14:45Z.
			expect(resized?.end.toISOString()).toBe('2025-03-09T14:45:00.000Z')
		})

		it('drops on the wall-clock quarter hour', () => {
			const dropped = calculateDropTimes(
				meeting,
				snapDropCell(springForwardCell(), 0.5)
			)
			// 10:30 EDT is 14:30Z.
			expect(dropped.start.toISOString()).toBe('2025-03-09T14:30:00.000Z')
		})
	})
})
