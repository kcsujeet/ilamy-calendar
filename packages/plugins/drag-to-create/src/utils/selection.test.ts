import { describe, expect, it } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import type { RawCell } from './read-cell'
import {
	computeRange,
	exceedsThreshold,
	intersectRect,
	isSameRegion,
	type Rect,
	unionRect,
} from './selection'

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

const cell = (
	startISO: string,
	endISO: string,
	extra: Partial<Pick<RawCell, 'allDay' | 'resourceId'>> = {}
): RawCell => ({
	start: dayjs(startISO),
	end: dayjs(endISO),
	allDay: extra.allDay ?? false,
	resourceId: extra.resourceId,
	element: document.createElement('div'),
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

describe('exceedsThreshold', () => {
	it('is false for no movement and below the threshold', () => {
		expect(exceedsThreshold(0, 0)).toBe(false)
		expect(exceedsThreshold(1, 1)).toBe(false) // hypot ~1.41 < 2
	})

	it('is true at or above the threshold', () => {
		expect(exceedsThreshold(2, 0)).toBe(true)
		expect(exceedsThreshold(0, 5)).toBe(true)
	})
})

describe('isSameRegion', () => {
	const timed = cell('2025-01-01T09:00:00.000Z', '2025-01-01T10:00:00.000Z')

	it('accepts a same-day timed cell', () => {
		const other = cell('2025-01-01T14:00:00.000Z', '2025-01-01T15:00:00.000Z')
		expect(isSameRegion(timed, other)).toBe(true)
	})

	it('rejects mixing timed and all-day', () => {
		const allDay = cell(
			'2025-01-01T00:00:00.000Z',
			'2025-01-01T23:59:00.000Z',
			{
				allDay: true,
			}
		)
		expect(isSameRegion(timed, allDay)).toBe(false)
	})

	it('rejects a different resource', () => {
		const a = cell('2025-01-01T09:00:00.000Z', '2025-01-01T10:00:00.000Z', {
			resourceId: 'room-a',
		})
		const b = cell('2025-01-01T11:00:00.000Z', '2025-01-01T12:00:00.000Z', {
			resourceId: 'room-b',
		})
		expect(isSameRegion(a, b)).toBe(false)
	})

	it('rejects a timed cell on a different day (MVP single-day clamp)', () => {
		const nextDay = cell('2025-01-02T09:00:00.000Z', '2025-01-02T10:00:00.000Z')
		expect(isSameRegion(timed, nextDay)).toBe(false)
	})

	it('allows an all-day cell on a different day (multi-day all-day)', () => {
		const a = cell('2025-01-01T00:00:00.000Z', '2025-01-01T23:59:00.000Z', {
			allDay: true,
		})
		const b = cell('2025-01-03T00:00:00.000Z', '2025-01-03T23:59:00.000Z', {
			allDay: true,
		})
		expect(isSameRegion(a, b)).toBe(true)
	})

	it('allows month/day-grid full-day cells across days (not allDay-flagged)', () => {
		// Month day-cells span the whole day but are not allDay-flagged.
		const a = cell('2025-01-01T00:00:00.000Z', '2025-01-01T23:59:00.000Z')
		const b = cell('2025-01-05T00:00:00.000Z', '2025-01-05T23:59:00.000Z')
		expect(isSameRegion(a, b)).toBe(true)
	})

	it('allows full-day cells across days within one resource (resource month)', () => {
		const a = cell('2025-01-01T00:00:00.000Z', '2025-01-01T23:59:00.000Z', {
			resourceId: 'room-a',
		})
		const b = cell('2025-01-04T00:00:00.000Z', '2025-01-04T23:59:00.000Z', {
			resourceId: 'room-a',
		})
		expect(isSameRegion(a, b)).toBe(true)
	})

	it('rejects full-day cells in different resources', () => {
		const a = cell('2025-01-01T00:00:00.000Z', '2025-01-01T23:59:00.000Z', {
			resourceId: 'room-a',
		})
		const b = cell('2025-01-02T00:00:00.000Z', '2025-01-02T23:59:00.000Z', {
			resourceId: 'room-b',
		})
		expect(isSameRegion(a, b)).toBe(false)
	})
})

describe('computeRange', () => {
	it('spans first.start to second.end for a forward drag', () => {
		const a = cell('2025-01-01T09:00:00.000Z', '2025-01-01T10:00:00.000Z')
		const b = cell('2025-01-01T11:00:00.000Z', '2025-01-01T12:00:00.000Z')

		const range = computeRange(a, b)

		expect(range.start.toISOString()).toBe('2025-01-01T09:00:00.000Z')
		expect(range.end.toISOString()).toBe('2025-01-01T12:00:00.000Z')
	})

	it('normalizes a reverse drag', () => {
		const a = cell('2025-01-01T11:00:00.000Z', '2025-01-01T12:00:00.000Z', {
			resourceId: 'room-a',
		})
		const b = cell('2025-01-01T09:00:00.000Z', '2025-01-01T10:00:00.000Z', {
			resourceId: 'room-a',
		})

		const range = computeRange(a, b)

		expect(range.start.toISOString()).toBe('2025-01-01T09:00:00.000Z')
		expect(range.end.toISOString()).toBe('2025-01-01T12:00:00.000Z')
		expect(range.resourceId).toBe('room-a')
	})

	it('carries allDay and resourceId from the earlier cell', () => {
		const a = cell('2025-01-01T00:00:00.000Z', '2025-01-01T23:59:00.000Z', {
			allDay: true,
			resourceId: 'room-a',
		})
		const b = cell('2025-01-02T00:00:00.000Z', '2025-01-02T23:59:00.000Z', {
			allDay: true,
			resourceId: 'room-a',
		})

		const range = computeRange(a, b)

		expect(range.allDay).toBe(true)
		expect(range.resourceId).toBe('room-a')
		expect(range.end.toISOString()).toBe('2025-01-02T23:59:00.000Z')
	})
})
