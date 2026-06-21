import { describe, expect, it } from 'bun:test'
import { intersectRect, type Rect, unionRect } from './rect'

const rect = (
	top: number,
	left: number,
	width: number,
	height: number
): Rect => ({
	top,
	left,
	width,
	height,
})

describe('unionRect', () => {
	it('returns the bounding box of two disjoint rects', () => {
		const result = unionRect(rect(10, 10, 20, 20), rect(50, 50, 10, 10))
		expect(result).toEqual(rect(10, 10, 50, 50))
	})

	it('returns the bounding box when one rect overlaps the other', () => {
		const result = unionRect(rect(0, 0, 30, 30), rect(20, 20, 30, 30))
		expect(result).toEqual(rect(0, 0, 50, 50))
	})
})

describe('intersectRect', () => {
	it('clips a selection that overflows the calendar body (the reported bug)', () => {
		// A tall selection (bottom at 600) inside a calendar body clipped at 300:
		// the overlay must be cut to the body's bottom, not paint past it.
		const selection = rect(100, 100, 50, 500)
		const calendarBody = rect(0, 0, 800, 300)
		const result = intersectRect(selection, calendarBody)
		expect(result).toEqual(rect(100, 100, 50, 200))
	})

	it('returns the selection unchanged when it is fully inside the body', () => {
		const selection = rect(50, 50, 20, 20)
		const body = rect(0, 0, 200, 200)
		expect(intersectRect(selection, body)).toEqual(selection)
	})

	it('clips on every edge when the body is smaller than the selection', () => {
		const selection = rect(-10, -10, 400, 400)
		const body = rect(0, 0, 100, 100)
		expect(intersectRect(selection, body)).toEqual(rect(0, 0, 100, 100))
	})

	it('returns null when the rects do not overlap', () => {
		expect(intersectRect(rect(0, 0, 10, 10), rect(100, 100, 10, 10))).toBeNull()
	})

	it('returns null when the rects only touch on an edge (zero area)', () => {
		expect(intersectRect(rect(0, 0, 10, 10), rect(0, 10, 10, 10))).toBeNull()
	})
})
