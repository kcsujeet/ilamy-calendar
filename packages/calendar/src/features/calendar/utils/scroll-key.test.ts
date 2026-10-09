import { describe, expect, test } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { getScrollKey } from './scroll-key'

const DATE = dayjs('2025-03-12T00:00:00.000Z')
const buildDateAtHour = (hour: number) => DATE.hour(hour)
const buildHourColumn = (hour: number) => ({ day: buildDateAtHour(hour) })
const buildGroupedColumn = (...hours: number[]) => ({
	days: hours.map(buildDateAtHour),
})

const getTestScrollKey = (
	columns: Parameters<typeof getScrollKey>[2],
	{ view = 'day', date = DATE } = {}
) => getScrollKey(view, date, columns)

describe('getScrollKey', () => {
	test('names the view, the date and the hours on screen', () => {
		expect(getTestScrollKey([buildHourColumn(9), buildHourColumn(10)])).toBe(
			'day-2025-03-12-2025-03-12T09:00:00.000Z,2025-03-12T10:00:00.000Z'
		)
	})

	// One row or column per resource repeats the same hours; adding a resource
	// must not change the key and scroll a reader back.
	test('counts each hour once, however many resources repeat it', () => {
		const oneResource = [buildGroupedColumn(9, 10)]
		const twoResources = [buildGroupedColumn(9, 10), buildGroupedColumn(9, 10)]
		expect(getTestScrollKey(twoResources)).toBe(getTestScrollKey(oneResource))
	})

	test("reads a column's grouped days and a single day alike", () => {
		expect(getTestScrollKey([buildGroupedColumn(9, 10)])).toBe(
			getTestScrollKey([buildHourColumn(9), buildHourColumn(10)])
		)
	})

	test('changes when the hours on screen change', () => {
		expect(getTestScrollKey([buildGroupedColumn(6, 7)])).not.toBe(
			getTestScrollKey([buildGroupedColumn(12, 13)])
		)
	})

	test('changes with the view', () => {
		const columns = [buildHourColumn(9)]
		expect(getTestScrollKey(columns, { view: 'week' })).not.toBe(
			getTestScrollKey(columns, { view: 'day' })
		)
	})

	test('changes with the date, even when the hours read the same', () => {
		const columns = [buildHourColumn(9)]
		expect(getTestScrollKey(columns, { date: DATE.add(1, 'day') })).not.toBe(
			getTestScrollKey(columns)
		)
	})

	test('treats a column with neither as holding no hours', () => {
		expect(getTestScrollKey([{}])).toBe('day-2025-03-12-')
	})
})
