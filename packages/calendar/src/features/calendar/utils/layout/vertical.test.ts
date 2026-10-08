import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { layoutVertical } from './vertical'

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
	layoutVertical({
		days: opts.days ?? hourDays,
		gridType: opts.gridType,
		events,
	})

describe('layoutVertical', () => {
	describe('Input handling', () => {
		it('returns empty array when no events', () => {
			expect(position([])).toHaveLength(0)
		})

		// An hour grid's all-day row draws them, as FullCalendar's time grid splits
		// them off (AllDaySplitter, DayTimeColsView.tsx:27, v6.1.21).
		it('filters out all-day events on an hour grid', () => {
			const result = position([
				mkEvent('all', 9, 10, { allDay: true }),
				mkEvent('timed', 9, 10),
			])
			expect(result.map((p) => p.event.id)).toEqual(['timed'])
		})

		it('filters out all-day events on a minute grid too', () => {
			const minuteDays = Array.from({ length: 24 * 60 }, (_, i) =>
				dayjs(BASE).add(i, 'minute')
			)
			const result = position(
				[mkEvent('all', 9, 10, { allDay: true }), mkEvent('timed', 9, 10)],
				{ days: minuteDays, gridType: 'minute' }
			)
			expect(result.map((p) => p.event.id)).toEqual(['timed'])
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
			expect(result.map((p) => p.event.id)).toEqual(['long', 'short'])
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
			expect(result.map((p) => p.event.id)).toEqual(['a', 'b', 'c'])
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
			expect(result.map((p) => p.event.id)).toEqual(['long', 'short'])
		})

		it('tie-breaks equal durations by earliest start', () => {
			const result = position([
				mkEvent('later', 9.5, 10.5),
				mkEvent('earlier', 9, 10),
			])
			expect(result.map((p) => p.event.id)).toEqual(['earlier', 'later'])
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

		// #322. A day grid has no all-day row, so its rows are the only place an
		// all-day event can be drawn; FullCalendar's day grid draws all-day and
		// timed events alike (daygrid/src/DayTable.tsx has no all-day split, v6.1.21).
		it('keeps an all-day event, across its days up to the exclusive end', () => {
			// Days 1-3: starts at day 1's midnight, ends at day 4's (exclusive).
			const [p] = position([mkEvent('all', 24, 96, { allDay: true })], {
				days: dayDays,
				gridType: 'day',
			})
			expect(p.event.id).toBe('all')
			expect(p.top).toBeCloseTo((1 / 7) * 100, 5)
			expect(p.height).toBeCloseTo((3 / 7) * 100, 5)
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
		it('nests the original event by reference, un-mutated and un-copied', () => {
			const source = mkEvent('kept', 9, 10, {
				title: 'Kept Title',
				description: 'some description',
				color: 'blue',
			})
			const [p] = position([source])
			expect(p.event).toBe(source)
		})

		it('emits vertical-kind placements', () => {
			const [p] = position([mkEvent('e', 9, 10)])
			expect(p.kind).toBe('vertical')
		})
	})
})

/**
 * #311. Rows are labelled by clock hour, so a bar sits at the clock time it
 * starts, as FullCalendar's time grid places it (`computeDateTop` in
 * TimeColsSlatsCoords.ts, v6.1.21). By elapsed time, 09:00 on a 23-hour day
 * landed on the 8 AM row, and on a 25-hour day on the 10 AM row.
 */
describe('layoutVertical on a day the clocks change', () => {
	const originalTz = dayjs.tz.guess()
	const HOUR_PERCENT = 100 / 24

	beforeEach(() => {
		dayjs.tz.setDefault('America/New_York')
	})

	afterEach(() => {
		dayjs.tz.setDefault(originalTz)
	})

	/** Top and height, in hours, of a 09:00-10:00 event on `dayISO`'s grid. */
	const placeNineToTen = (dayISO: string) => {
		const days = getViewHours({ referenceDate: dayjs(dayISO) })
		const event = {
			id: 'nine',
			title: 'nine',
			start: dayjs(`${dayISO}T09:00`),
			end: dayjs(`${dayISO}T10:00`),
		}
		const [placed] = layoutVertical({ days, events: [event] })
		return {
			top: (placed?.top ?? 0) / HOUR_PERCENT,
			height: (placed?.height ?? 0) / HOUR_PERCENT,
		}
	}

	it('puts 09:00 on the 9 AM row on the spring change day', () => {
		const { top, height } = placeNineToTen('2025-03-09')
		expect(top).toBeCloseTo(9, 6)
		expect(height).toBeCloseTo(1, 6)
	})

	it('puts 09:00 on the 9 AM row on the autumn change day', () => {
		const { top, height } = placeNineToTen('2025-11-02')
		expect(top).toBeCloseTo(9, 6)
		expect(height).toBeCloseTo(1, 6)
	})

	it('puts 09:00 on the 9 AM row when the clocks move by half an hour', () => {
		// Lord Howe Island: 5 October 2025 is 23.5 hours long.
		dayjs.tz.setDefault('Australia/Lord_Howe')
		const { top, height } = placeNineToTen('2025-10-05')
		expect(top).toBeCloseTo(9, 6)
		expect(height).toBeCloseTo(1, 6)
	})
})
