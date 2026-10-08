import { describe, expect, test } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { getScrollKey } from './scroll-key'

const DATE = dayjs('2025-03-12T00:00:00.000Z')
const at = (hour: number) => DATE.hour(hour)
const hourColumn = (hour: number) => ({ day: at(hour) })
const groupedColumn = (...hours: number[]) => ({ days: hours.map(at) })

const key = (columns: Parameters<typeof getScrollKey>[2], view = 'day') =>
	getScrollKey(view, DATE, columns)

describe('getScrollKey', () => {
	test('names the view, the date and the hours on screen', () => {
		expect(key([hourColumn(9), hourColumn(10)])).toBe(
			'day-2025-03-12-2025-03-12T09:00:00.000Z,2025-03-12T10:00:00.000Z'
		)
	})

	// #321: one row or column per resource repeated the same hours, so adding a
	// resource changed the key and scrolled a reader back.
	test('counts each hour once, however many resources repeat it', () => {
		const oneResource = [groupedColumn(9, 10)]
		const twoResources = [groupedColumn(9, 10), groupedColumn(9, 10)]
		expect(key(twoResources)).toBe(key(oneResource))
	})

	test("reads a column's grouped days and a single day alike", () => {
		expect(key([groupedColumn(9, 10)])).toBe(
			key([hourColumn(9), hourColumn(10)])
		)
	})

	test('changes when the hours on screen change', () => {
		expect(key([groupedColumn(6, 7)])).not.toBe(key([groupedColumn(12, 13)]))
	})

	test('changes with the view', () => {
		expect(key([hourColumn(9)], 'week')).not.toBe(key([hourColumn(9)], 'day'))
	})

	test('treats a column with neither as holding no hours', () => {
		expect(key([{}])).toBe('day-2025-03-12-')
	})
})
