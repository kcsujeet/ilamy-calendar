import { describe, expect, it } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { getDayColumnSpan } from './day-columns'

// Noon UTC lands on the same calendar day in every zone from Vancouver to
// Tokyo, so these tests do not depend on the machine's zone.
const noon = (dayOfJanuary: number) =>
	dayjs('2025-01-01T12:00:00.000Z').add(dayOfJanuary - 1, 'day')

// Thu 9, Fri 10, Mon 13, Tue 14: the weekend between Fri and Mon is hidden.
const visibleDays = [noon(9), noon(10), noon(13), noon(14)]

const span = (startDay: number, endDay: number) =>
	getDayColumnSpan({ start: noon(startDay), end: noon(endDay) }, visibleDays)

describe('getDayColumnSpan', () => {
	it('spans only the visible columns the event covers', () => {
		expect(span(10, 13)).toEqual({
			startCol: 1,
			endCol: 2,
			isTruncatedStart: false,
			isTruncatedEnd: false,
		})
	})

	it('clamps a start on a hidden day to the next visible column and marks it truncated', () => {
		expect(span(11, 14)).toEqual({
			startCol: 2,
			endCol: 3,
			isTruncatedStart: true,
			isTruncatedEnd: false,
		})
	})

	it('clamps an end on a hidden day to the previous visible column and marks it truncated', () => {
		expect(span(10, 12)).toEqual({
			startCol: 1,
			endCol: 1,
			isTruncatedStart: false,
			isTruncatedEnd: true,
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
		const result = getDayColumnSpan(
			{ start: instant, end: instant },
			visibleDays
		)
		expect(result?.startCol).toBe(2)
		expect(result?.endCol).toBe(2)
	})
})
