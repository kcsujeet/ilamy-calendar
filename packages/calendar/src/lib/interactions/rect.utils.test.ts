import { describe, expect, it } from 'bun:test'
import {
	computeEdgeScroll,
	exceedsThreshold,
	intersectRect,
	type Rect,
	unionRect,
} from './rect.utils'

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

describe('exceedsThreshold', () => {
	it('is false for no movement and below the threshold', () => {
		expect(exceedsThreshold(0, 0)).toBe(false)
		expect(exceedsThreshold(1, 1)).toBe(false)
	})

	it('is true at or above the threshold', () => {
		expect(exceedsThreshold(2, 0)).toBe(true)
		expect(exceedsThreshold(0, 5)).toBe(true)
		expect(exceedsThreshold(0, 0, 0)).toBe(true)
	})
})

describe('unionRect', () => {
	it('returns the bounding box of two disjoint rects', () => {
		expect(unionRect(rect(10, 10, 20, 20), rect(50, 50, 10, 10))).toEqual(
			rect(10, 10, 50, 50)
		)
	})

	it('returns the bounding box when one rect overlaps the other', () => {
		expect(unionRect(rect(0, 0, 30, 30), rect(20, 20, 30, 30))).toEqual(
			rect(0, 0, 50, 50)
		)
	})
})

describe('intersectRect', () => {
	it('clips a selection that overflows the calendar body', () => {
		const selection = rect(100, 100, 50, 500)
		const calendarBody = rect(0, 0, 800, 300)
		expect(intersectRect(selection, calendarBody)).toEqual(
			rect(100, 100, 50, 200)
		)
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
	const container = rect(100, 100, 800, 600)
	const opts = { edge: 40, speed: 10 }

	it('does not scroll from the center', () => {
		expect(
			computeEdgeScroll({ clientX: 500, clientY: 400 }, container, opts)
		).toEqual({ x: 0, y: 0 })
	})

	it('scrolls up near the top edge', () => {
		expect(
			computeEdgeScroll({ clientX: 500, clientY: 120 }, container, opts)
		).toEqual({ x: 0, y: -10 })
	})

	it('scrolls down near the bottom edge', () => {
		expect(
			computeEdgeScroll({ clientX: 500, clientY: 690 }, container, opts)
		).toEqual({ x: 0, y: 10 })
	})

	it('scrolls left near the left edge', () => {
		expect(
			computeEdgeScroll({ clientX: 120, clientY: 400 }, container, opts)
		).toEqual({ x: -10, y: 0 })
	})

	it('scrolls right near the right edge', () => {
		expect(
			computeEdgeScroll({ clientX: 880, clientY: 400 }, container, opts)
		).toEqual({ x: 10, y: 0 })
	})

	it('scrolls both axes in a corner and respects y/x axis locks', () => {
		expect(
			computeEdgeScroll({ clientX: 110, clientY: 110 }, container, opts)
		).toEqual({ x: -10, y: -10 })
		expect(
			computeEdgeScroll({ clientX: 110, clientY: 110 }, container, {
				...opts,
				axis: 'y',
			})
		).toEqual({ x: 0, y: -10 })
		expect(
			computeEdgeScroll({ clientX: 110, clientY: 110 }, container, {
				...opts,
				axis: 'x',
			})
		).toEqual({ x: -10, y: 0 })
		expect(
			computeEdgeScroll({ clientX: 110, clientY: 110 }, container, {
				...opts,
				axis: 'both',
			})
		).toEqual({ x: -10, y: -10 })
	})
})
