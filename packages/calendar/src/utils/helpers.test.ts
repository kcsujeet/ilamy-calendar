import { describe, expect, it } from 'bun:test'
import {
	getCellMinutes,
	getFractionAlong,
	getSnapBucket,
	listKey,
	readableTextColor,
	resolveSnapDuration,
} from './helpers'

describe('listKey', () => {
	it('joins parts with hyphens', () => {
		expect(listKey('day', 3)).toBe('day-3')
	})
})

describe('readableTextColor', () => {
	it('picks black on light hex backgrounds and white on dark ones', () => {
		expect(readableTextColor('#ffffff')).toBe('#000000')
		expect(readableTextColor('#fff')).toBe('#000000')
		expect(readableTextColor('#000000')).toBe('#ffffff')
		expect(readableTextColor('#1e293b')).toBe('#ffffff')
		expect(readableTextColor('not-a-hex')).toBe('#000000')
	})
})

describe('getCellMinutes', () => {
	it('is an hour for a cell with no minute', () => {
		expect(getCellMinutes(undefined, 15)).toBe(60)
	})

	it('is the slot for a cell with a minute', () => {
		expect(getCellMinutes(30, 20)).toBe(20)
	})

	it('is an hour for a cell with a minute and no slot', () => {
		expect(getCellMinutes(30, undefined)).toBe(60)
	})
})

describe('resolveSnapDuration', () => {
	it('is the cell size when no snap is given', () => {
		expect(resolveSnapDuration(undefined, 30)).toBe(30)
	})

	it.each([
		[15, 60],
		[30, 60],
		[15, 30],
	])('keeps a snap of %i inside a %i-minute cell', (snap, cell) => {
		expect(resolveSnapDuration(snap, cell)).toBe(snap)
	})

	it.each([
		[30, 30],
		[30, 15],
		[15, 15],
	])(
		'falls back to the cell for a snap of %i in a %i-minute cell',
		(snap, cell) => {
			expect(resolveSnapDuration(snap, cell)).toBe(cell)
		}
	)

	it('resolves per cell: 30 is no snap of a 30-minute slot but is one of an hour', () => {
		expect(resolveSnapDuration(30, 30)).toBe(30)
		expect(resolveSnapDuration(30, 60)).toBe(30)
		expect(resolveSnapDuration(15, 30)).toBe(15)
	})
})

describe('getFractionAlong', () => {
	it.each([
		[150, 100, 200, 0.25],
		[100, 100, 200, 0],
		[300, 100, 200, 1],
		[50, 100, 200, 0],
		[900, 100, 200, 1],
	])(
		'puts %p in a span from %p of length %p at %p',
		(at, start, length, expected) => {
			expect(getFractionAlong(at, start, length)).toBe(expected)
		}
	)

	it('is 0 for a span with no length', () => {
		expect(getFractionAlong(150, 100, 0)).toBe(0)
	})
})

describe('getSnapBucket', () => {
	it.each([
		[0, 0],
		[0.24, 0],
		[0.25, 1],
		[0.6, 2],
		[0.99, 3],
		[1, 3],
		[-1, 0],
		[5, 3],
	])('puts a pointer %p along an hour in bucket %i of 4', (fraction, index) => {
		expect(getSnapBucket(fraction, 60, 15)).toEqual({ index, count: 4 })
	})
})
