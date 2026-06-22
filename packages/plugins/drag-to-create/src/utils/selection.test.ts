import { describe, expect, it } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import type { RawCell } from './read-cell'
import { computeRange, exceedsThreshold, isSameRegion } from './selection'

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

	it('allows a timed cell on a different day (cross-day timed range)', () => {
		const nextDay = cell('2025-01-02T09:00:00.000Z', '2025-01-02T10:00:00.000Z')
		expect(isSameRegion(timed, nextDay)).toBe(true)
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

	it('spans across days for a cross-day timed drag', () => {
		const a = cell('2025-01-01T12:00:00.000Z', '2025-01-01T13:00:00.000Z')
		const b = cell('2025-01-02T14:00:00.000Z', '2025-01-02T15:00:00.000Z')

		const range = computeRange(a, b)

		expect(range.start.toISOString()).toBe('2025-01-01T12:00:00.000Z')
		expect(range.end.toISOString()).toBe('2025-01-02T15:00:00.000Z')
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
