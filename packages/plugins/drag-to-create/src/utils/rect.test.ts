import { describe, expect, it } from 'bun:test'
import { computeEdgeScroll, intersectRect, type Rect, unionRect } from './rect'

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

describe('computeEdgeScroll', () => {
	// Container occupying (top 100, left 100) with a 800x600 box; 40px edge zones.
	const container = rect(100, 100, 800, 600)
	const opts = { edge: 40, speed: 10 }

	it('does not scroll from the center', () => {
		const result = computeEdgeScroll(
			{ clientX: 500, clientY: 400 },
			container,
			opts
		)
		expect(result).toEqual({ x: 0, y: 0 })
	})

	it('scrolls up near the top edge', () => {
		const result = computeEdgeScroll(
			{ clientX: 500, clientY: 120 },
			container,
			opts
		)
		expect(result).toEqual({ x: 0, y: -10 })
	})

	it('scrolls down near the bottom edge', () => {
		const result = computeEdgeScroll(
			{ clientX: 500, clientY: 690 },
			container,
			opts
		)
		expect(result).toEqual({ x: 0, y: 10 })
	})

	it('scrolls left near the left edge', () => {
		const result = computeEdgeScroll(
			{ clientX: 120, clientY: 400 },
			container,
			opts
		)
		expect(result).toEqual({ x: -10, y: 0 })
	})

	it('scrolls right near the right edge (horizontal grids)', () => {
		const result = computeEdgeScroll(
			{ clientX: 880, clientY: 400 },
			container,
			opts
		)
		expect(result).toEqual({ x: 10, y: 0 })
	})

	it('scrolls both axes in a corner', () => {
		const result = computeEdgeScroll(
			{ clientX: 110, clientY: 110 },
			container,
			opts
		)
		expect(result).toEqual({ x: -10, y: -10 })
	})

	it('locks to the y axis, zeroing horizontal scroll (vertical resource grid)', () => {
		const result = computeEdgeScroll(
			{ clientX: 110, clientY: 110 },
			container,
			{
				...opts,
				axis: 'y',
			}
		)
		expect(result).toEqual({ x: 0, y: -10 })
	})

	it('locks to the x axis, zeroing vertical scroll (horizontal resource grid)', () => {
		const result = computeEdgeScroll(
			{ clientX: 110, clientY: 110 },
			container,
			{
				...opts,
				axis: 'x',
			}
		)
		expect(result).toEqual({ x: -10, y: 0 })
	})

	it("treats axis 'both' like no lock", () => {
		const result = computeEdgeScroll(
			{ clientX: 110, clientY: 110 },
			container,
			{
				...opts,
				axis: 'both',
			}
		)
		expect(result).toEqual({ x: -10, y: -10 })
	})
})
