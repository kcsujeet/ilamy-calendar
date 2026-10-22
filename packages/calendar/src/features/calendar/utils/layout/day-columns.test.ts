import { describe, expect, it } from 'bun:test'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { createDayColumnSpanner } from './day-columns'

// Noon UTC lands on the same calendar day in every zone from Vancouver to
// Tokyo, so these tests do not depend on the machine's zone.
const noon = (dayOfJanuary: number) =>
	dayjs('2025-01-01T12:00:00.000Z').add(dayOfJanuary - 1, 'day')

// Thu 9, Fri 10, Mon 13, Tue 14: the weekend between Fri and Mon is hidden.
const visibleDays = [noon(9), noon(10), noon(13), noon(14)]

const spanOf = createDayColumnSpanner(visibleDays)
const span = (startDay: number, endDay: number) =>
	spanOf({ start: noon(startDay), end: noon(endDay) })

describe('createDayColumnSpanner', () => {
	it('spans only the visible columns the event covers', () => {
		expect(span(10, 13)).toEqual({
			startCol: 1,
			endCol: 2,
			isTruncatedStart: false,
			isTruncatedEnd: false,
			spansMultipleUnits: true,
		})
	})

	it('clamps a start on a hidden day to the next visible column and marks it truncated', () => {
		expect(span(11, 14)).toEqual({
			startCol: 2,
			endCol: 3,
			isTruncatedStart: true,
			isTruncatedEnd: false,
			spansMultipleUnits: true,
		})
	})

	it('clamps an end on a hidden day to the previous visible column and marks it truncated', () => {
		expect(span(10, 12)).toEqual({
			startCol: 1,
			endCol: 1,
			isTruncatedStart: false,
			isTruncatedEnd: true,
			spansMultipleUnits: true,
		})
	})

	it('has no span when every day it covers is hidden', () => {
		expect(span(11, 12)).toBeNull()
	})

	it('has no span when it lies outside the columns', () => {
		expect(span(1, 3)).toBeNull()
		expect(span(20, 22)).toBeNull()
	})

	it('keeps a zero-length event in its own column', () => {
		const instant = noon(13)
		const result = spanOf({ start: instant, end: instant })
		expect(result?.startCol).toBe(2)
		expect(result?.endCol).toBe(2)
	})
})

describe.each(['UTC', 'America/New_York', 'America/Vancouver'])(
	'createDayColumnSpanner day boundaries in %s',
	(zone) => {
		// Mon 10 - Fri 14 March 2025; in New York and Vancouver the clocks went
		// forward on Sun 9 March, so Monday is the first day on the new offset.
		const midnight = (dayOfMarch: number) =>
			dayjs.tz(
				`2025-03-${String(dayOfMarch).padStart(2, '0')}T00:00:00.000`,
				zone
			)
		const days = [10, 11, 12, 13, 14].map(midnight)
		const spanOf = createDayColumnSpanner(days)
		const cols = (start: Dayjs, end: Dayjs) => {
			const columnSpan = spanOf({ start, end })
			return columnSpan ? [columnSpan.startCol, columnSpan.endCol] : null
		}

		it('ends exclusively: an event ending at midnight stays on its day', () => {
			const nineAm = midnight(11).add(9, 'hour')
			expect(cols(nineAm, midnight(12))).toEqual([1, 1])
			expect(cols(nineAm, midnight(12).add(1, 'millisecond'))).toEqual([1, 2])
		})

		it('starts inclusively at midnight', () => {
			const justBefore = midnight(11).subtract(1, 'millisecond')
			expect(cols(midnight(11), midnight(11).add(1, 'hour'))).toEqual([1, 1])
			expect(cols(justBefore, midnight(11))).toEqual([0, 0])
		})

		it('does not count the day before the grid, nor the day after it', () => {
			expect(cols(midnight(9), midnight(10))).toBeNull()
			expect(cols(midnight(15), midnight(16))).toBeNull()
		})

		it('marks an event as truncated only past the grid edges', () => {
			const overhanging = spanOf({ start: midnight(9), end: midnight(16) })
			expect(overhanging).toEqual({
				startCol: 0,
				endCol: 4,
				isTruncatedStart: true,
				isTruncatedEnd: true,
				spansMultipleUnits: true,
			})
			const exact = spanOf({ start: midnight(10), end: midnight(15) })
			expect(exact?.isTruncatedStart).toBe(false)
			expect(exact?.isTruncatedEnd).toBe(false)
		})

		it('keeps a zero-length event at midnight in the day it starts', () => {
			expect(cols(midnight(12), midnight(12))).toEqual([2, 2])
		})

		it('spans several days only when the last instant is on a later day', () => {
			const spans = (start: Dayjs, end: Dayjs) =>
				spanOf({ start, end })?.spansMultipleUnits
			const nineAm = midnight(11).add(9, 'hour')
			const sixPm = midnight(11).add(18, 'hour')
			expect(spans(nineAm, midnight(12))).toBe(false)
			expect(spans(sixPm, midnight(12).add(6, 'hour'))).toBe(true)
		})
	}
)
