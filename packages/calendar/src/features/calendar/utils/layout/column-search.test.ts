import { describe, expect, it } from 'bun:test'
import { countAtOrBelow, countBelow } from './column-search'

const values = [10, 20, 20, 30]

describe('countBelow', () => {
	it.each([
		[5, 0],
		[10, 0],
		[11, 1],
		[20, 1],
		[21, 3],
		[30, 3],
		[31, 4],
	])('counts the entries below %d as %d', (value, expected) => {
		expect(countBelow(values, value)).toBe(expected)
	})

	it('counts nothing in an empty list', () => {
		expect(countBelow([], 1)).toBe(0)
	})
})

describe('countAtOrBelow', () => {
	it.each([
		[5, 0],
		[10, 1],
		[19, 1],
		[20, 3],
		[29, 3],
		[30, 4],
		[31, 4],
	])('counts the entries at or below %d as %d', (value, expected) => {
		expect(countAtOrBelow(values, value)).toBe(expected)
	})

	it('counts nothing in an empty list', () => {
		expect(countAtOrBelow([], 1)).toBe(0)
	})
})
