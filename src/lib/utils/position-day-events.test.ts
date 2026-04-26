import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { getPositionedDayEvents } from './position-day-events'

// Default 24-hour grid anchored at 2025-01-13 00:00 UTC.
const BASE = '2025-01-13T00:00:00.000Z'
const hourDays = Array.from({ length: 24 }, (_, i) =>
	dayjs(BASE).add(i, 'hour')
)

// at(h, m=0) → dayjs anchored BASE + h hours + m minutes.
// Negative or >24 hours crosses the day boundary for before/after-grid tests.
const at = (hour: number, minute = 0) =>
	dayjs(BASE).add(hour * 60 + minute, 'minute')

// Compact event factory: id, startHour, endHour, optional extras.
const mkEvent = (
	id: string,
	startH: number,
	endH: number,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id,
	title: id,
	start: at(startH),
	end: at(endH),
	...extra,
})

// Run positioning with hourDays by default; allow overriding days/gridType.
const position = (
	events: CalendarEvent[],
	opts: {
		days?: typeof hourDays
		gridType?: 'day' | 'hour' | 'minute'
	} = {}
) =>
	getPositionedDayEvents({
		days: opts.days ?? hourDays,
		gridType: opts.gridType,
		events,
	})

describe('getPositionedDayEvents', () => {
	describe('Input handling', () => {
		it('returns empty array when no events', () => {
			expect(position([])).toHaveLength(0)
		})

		it('filters out all-day events', () => {
			const result = position([
				mkEvent('all', 9, 10, { allDay: true }),
				mkEvent('timed', 9, 10),
			])
			expect(result).toHaveLength(1)
			expect(result[0].id).toBe('timed')
		})

		it('returns empty when only all-day events', () => {
			expect(
				position([
					mkEvent('a', 9, 10, { allDay: true }),
					mkEvent('b', 9, 10, { allDay: true }),
				])
			).toHaveLength(0)
		})
	})

	describe('Single non-overlapping events', () => {
		it('emits one position with full width and no zIndex', () => {
			const [p] = position([mkEvent('e', 9, 10)])
			expect(p.left).toBe(0)
			expect(p.width).toBe(100)
			expect(p.zIndex).toBeUndefined()
		})

		it('top/height reflect start/duration as percentage of grid', () => {
			const [p] = position([mkEvent('e', 6, 9)])
			expect(p.top).toBeCloseTo((6 / 24) * 100, 5)
			expect(p.height).toBeCloseTo((3 / 24) * 100, 5)
		})

		it('splits non-overlapping events into separate clusters', () => {
			const result = position([mkEvent('a', 8, 9), mkEvent('b', 10, 11)])
			expect(result).toHaveLength(2)
			expect(result.every((e) => e.width === 100)).toBe(true)
			expect(result.every((e) => e.zIndex === undefined)).toBe(true)
		})

		it('back-to-back events (end === next start) are separate clusters', () => {
			// isSameOrAfter boundary: second event starts exactly when first ends.
			const result = position([mkEvent('a', 9, 10), mkEvent('b', 10, 11)])
			expect(result).toHaveLength(2)
			expect(result.every((e) => e.width === 100)).toBe(true)
		})
	})

	describe('Overlapping clusters', () => {
		it('2 events → 0 / 25 offset, longest first, zIndex 1 then 2', () => {
			const result = position([
				mkEvent('long', 9, 11),
				mkEvent('short', 9.5, 10),
			])
			expect(result.map((e) => e.id)).toEqual(['long', 'short'])
			expect(result.map((e) => e.left)).toEqual([0, 25])
			expect(result.map((e) => e.width)).toEqual([100, 75])
			expect(result.map((e) => e.zIndex)).toEqual([1, 2])
		})

		it('3 events → 0 / 25 / 50 offset', () => {
			const result = position([
				mkEvent('a', 9, 12), // 3h (longest)
				mkEvent('b', 9.5, 11.5), // 2h
				mkEvent('c', 10, 11), // 1h
			])
			expect(result.map((e) => e.id)).toEqual(['a', 'b', 'c'])
			expect(result.map((e) => e.left)).toEqual([0, 25, 50])
			expect(result.map((e) => e.width)).toEqual([100, 75, 50])
			expect(result.map((e) => e.zIndex)).toEqual([1, 2, 3])
		})

		it('4 events → 0 / 20 / 40 / 60 offsets (maxOffset = 60)', () => {
			const result = position(
				[4, 3, 2, 1].map((hours, i) => mkEvent(`e${i}`, 9, 9 + hours))
			)
			expect(result.map((e) => e.left)).toEqual([0, 20, 40, 60])
		})

		it('5 events → 0 / 17.5 / 35 / 52.5 / 70 offsets (maxOffset = 70)', () => {
			const result = position(
				[5, 4, 3, 2, 1].map((hours, i) => mkEvent(`e${i}`, 9, 9 + hours))
			)
			expect(result.map((e) => e.left)).toEqual([0, 17.5, 35, 52.5, 70])
		})
	})

	describe('Sorting within cluster', () => {
		it('places longest-duration event first', () => {
			const result = position([
				mkEvent('short', 9.5, 10),
				mkEvent('long', 9, 11),
			])
			expect(result.map((e) => e.id)).toEqual(['long', 'short'])
		})

		it('tie-breaks equal durations by earliest start', () => {
			const result = position([
				mkEvent('later', 9.5, 10.5),
				mkEvent('earlier', 9, 10),
			])
			expect(result.map((e) => e.id)).toEqual(['earlier', 'later'])
		})
	})

	describe('Grid boundary clamping', () => {
		it('clamps event starting before grid to top=0', () => {
			// Starts at -2h (prev day 22:00), ends at +2h → 2 visible hours.
			const [p] = position([mkEvent('e', -2, 2)])
			expect(p.top).toBe(0)
			expect(p.height).toBeCloseTo((2 / 24) * 100, 5)
		})

		it('clamps event ending after grid', () => {
			// Starts at 22h, ends at 26h (next day 02:00) → 2 visible hours.
			const [p] = position([mkEvent('e', 22, 26)])
			expect(p.top).toBeCloseTo((22 / 24) * 100, 5)
			expect(p.height).toBeCloseTo((2 / 24) * 100, 5)
		})

		it('skips event entirely outside grid (zero duration after clamp)', () => {
			// Event entirely before grid: start=end=21:00 on prev day (-3h).
			expect(position([mkEvent('e', -3, -3)])).toHaveLength(0)
		})
	})

	describe('Discrete (day) grid', () => {
		const dayDays = Array.from({ length: 7 }, (_, i) =>
			dayjs(BASE).add(i, 'day')
		)

		it('floors/ceils fractional day boundaries', () => {
			// start 6h (0.25d), end +42h (1.75d): floor→0, ceil→2. height = 2/7.
			const [p] = position([mkEvent('e', 6, 42)], {
				days: dayDays,
				gridType: 'day',
			})
			expect(p.top).toBe(0)
			expect(p.height).toBeCloseTo((2 / 7) * 100, 5)
		})

		it('ensures at least 1 unit duration for discrete events', () => {
			// Zero-duration on the same day: floor/ceil both = 0, guard bumps to 1.
			const [p] = position([mkEvent('e', 10, 10)], {
				days: dayDays,
				gridType: 'day',
			})
			expect(p.height).toBeCloseTo((1 / 7) * 100, 5)
		})
	})

	describe('Stability', () => {
		it('preserves original event fields in positioned output', () => {
			const [p] = position([
				mkEvent('kept', 9, 10, {
					title: 'Kept Title',
					description: 'some description',
					color: 'blue',
				}),
			])
			expect(p).toMatchObject({
				id: 'kept',
				title: 'Kept Title',
				description: 'some description',
				color: 'blue',
			})
		})
	})
})
