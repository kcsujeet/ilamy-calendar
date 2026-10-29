import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { getMonthWeeks } from '@/utils/date-utils'
import { findMultiUnitSlot, layoutHorizontal } from './horizontal'

const days = Array.from({ length: 7 }, (_, i) =>
	dayjs('2025-01-12T00:00:00.000Z').add(i, 'day')
)

// Compact event factory: id doubles as title.
const mkEvent = (
	id: string,
	startISO: string,
	endISO: string
): CalendarEvent => ({
	id,
	title: id,
	start: dayjs(startISO),
	end: dayjs(endISO),
})

const singleDayEvent = mkEvent(
	'single-day',
	'2025-01-13T10:00:00.000Z',
	'2025-01-13T11:00:00.000Z'
)
const multiDayEvent = mkEvent(
	'multi-day',
	'2025-01-13T00:00:00.000Z',
	'2025-01-15T23:59:59.000Z'
)
const longMultiDayEvent = mkEvent(
	'long-multi-day',
	'2025-01-10T00:00:00.000Z',
	'2025-01-20T23:59:59.000Z'
)

// Run layout with the default 7-day grid and dayMaxEvents 4.
const run = (
	events: CalendarEvent[],
	opts: { dayMaxEvents?: number; gridType?: 'day' | 'hour' } = {}
) =>
	layoutHorizontal({
		days,
		events,
		dayMaxEvents: opts.dayMaxEvents ?? 4,
		gridType: opts.gridType,
	})

/** Column count a placement covers, derived from its percentage width. */
const columnsOf = (width: number) => Math.round(width / (100 / days.length))

describe('layoutHorizontal', () => {
	/**
	 * #248. `end` is exclusive, matching RFC 5545 ("the DTEND property ...
	 * specifies the non-inclusive end of the event"), the Google Calendar API and
	 * FullCalendar. An event ending at midnight stops as that day begins and must
	 * not paint on it.
	 */
	describe('Exclusive end', () => {
		it('covers one day when the event ends at the next midnight', () => {
			const event = mkEvent(
				'midnight-to-midnight',
				'2025-01-13T00:00:00.000Z',
				'2025-01-14T00:00:00.000Z'
			)

			const [placement] = run([event])

			expect(columnsOf(placement.width)).toBe(1)
		})

		it('covers both days when the event ends during the second day', () => {
			const event = mkEvent(
				'into-the-next-day',
				'2025-01-13T00:00:00.000Z',
				'2025-01-14T09:00:00.000Z'
			)

			const [placement] = run([event])

			expect(columnsOf(placement.width)).toBe(2)
		})

		it('covers three days for an all-day event stored the conventional way', () => {
			// Jan 13, 14 and 15, so the exclusive end is Jan 16 at midnight.
			const event = mkEvent(
				'three-all-days',
				'2025-01-13T00:00:00.000Z',
				'2025-01-16T00:00:00.000Z'
			)

			const [placement] = run([event])

			expect(columnsOf(placement.width)).toBe(3)
		})

		/**
		 * The step back from `end` has to be the smallest unit dayjs represents, not
		 * a convenient one. A minute would swallow anything ending within 59.999
		 * seconds after a boundary: an event running 30 seconds into the next day
		 * really does occupy part of it.
		 */
		it('covers both days when the event ends just past midnight', () => {
			const event = mkEvent(
				'thirty-seconds-over',
				'2025-01-13T00:00:00.000Z',
				'2025-01-14T00:00:30.000Z'
			)

			const [placement] = run([event])

			expect(columnsOf(placement.width)).toBe(2)
		})

		it('covers both hours when the event ends just past the hour', () => {
			const hours = Array.from({ length: 24 }, (_, i) =>
				dayjs('2025-01-13T00:00:00.000Z').add(i, 'hour')
			)
			const event = mkEvent(
				'thirty-seconds-over-the-hour',
				'2025-01-13T09:00:00.000Z',
				'2025-01-13T10:00:30.000Z'
			)

			const [placement] = layoutHorizontal({
				days: hours,
				events: [event],
				dayMaxEvents: 4,
				gridType: 'hour',
			})

			// An hour axis now draws exact times, so the bar no longer fills the
			// second hour. What this pins still holds: it reaches into it, 30s past.
			const hourWidth = 100 / hours.length
			const barEndInHours = (placement.left + placement.width) / hourWidth
			expect(barEndInHours).toBeCloseTo(10 + 30 / 3600, 6)
		})

		/**
		 * The truncation flag has to be read off the same exclusive end as the span,
		 * or the two disagree exactly at the grid's edge: an event ending at the
		 * midnight after the last day covers that day and stops, but a flag read
		 * from the raw `end` marks it as continuing and draws the overrun
		 * indicator.
		 */
		it('does not mark an event ending at the grid edge as continuing past it', () => {
			const endsAtGridEdge = mkEvent(
				'through-the-last-day',
				'2025-01-13T00:00:00.000Z',
				'2025-01-19T00:00:00.000Z'
			)

			const [placement] = run([endsAtGridEdge])

			expect(placement.isTruncatedEnd).toBe(false)
		})

		it('still marks an event that really runs past the grid', () => {
			const overrunsGrid = mkEvent(
				'past-the-last-day',
				'2025-01-13T00:00:00.000Z',
				'2025-01-19T09:00:00.000Z'
			)

			const [placement] = run([overrunsGrid])

			expect(placement.isTruncatedEnd).toBe(true)
		})

		/**
		 * Whether an event spans more than one column is a question about calendar
		 * boundaries, not duration. Classifying by `end.diff(start, unit) > 0` sent
		 * every event shorter than a whole unit down the single-column path, so an
		 * overnight event vanished from its second day even though the span math
		 * had it right.
		 */
		it('covers both days for an overnight event shorter than 24 hours', () => {
			const overnight = mkEvent(
				'overnight',
				'2025-01-13T18:00:00.000Z',
				'2025-01-14T06:00:00.000Z'
			)

			const [placement] = run([overnight])

			expect(columnsOf(placement.width)).toBe(2)
		})

		it('covers both hours for an event crossing the hour by minutes', () => {
			const hours = Array.from({ length: 24 }, (_, i) =>
				dayjs('2025-01-13T00:00:00.000Z').add(i, 'hour')
			)
			const crossesTheHour = mkEvent(
				'nine-thirty-to-ten-fifteen',
				'2025-01-13T09:30:00.000Z',
				'2025-01-13T10:15:00.000Z'
			)

			const [placement] = layoutHorizontal({
				days: hours,
				events: [crossesTheHour],
				dayMaxEvents: 4,
				gridType: 'hour',
			})

			// Exact times now, not whole hours: the bar runs from 09:30 into the
			// 10:00 hour and stops at 10:15, rather than vanishing from it.
			const hourWidth = 100 / hours.length
			const barStartInHours = placement.left / hourWidth
			const barEndInHours = (placement.left + placement.width) / hourWidth
			expect(barStartInHours).toBeCloseTo(9.5, 6)
			expect(barEndInHours).toBeCloseTo(10.25, 6)
		})

		it('still covers one day when start and end are equal', () => {
			const event = mkEvent(
				'zero-length',
				'2025-01-13T00:00:00.000Z',
				'2025-01-13T00:00:00.000Z'
			)

			const [placement] = run([event])

			expect(columnsOf(placement.width)).toBe(1)
		})
	})

	describe('Basic Positioning', () => {
		it('positions single-day event correctly', () => {
			const result = run([singleDayEvent])

			expect(result).toHaveLength(1)
			const [p] = result
			expect(p.left).toBeCloseTo(14.285714, 2)
			expect(p.width).toBeCloseTo(14.285714, 2)
			expect(p.row).toBe(0)
		})

		it('positions multi-day event correctly', () => {
			const result = run([multiDayEvent])

			expect(result).toHaveLength(1)
			const [p] = result
			expect(p.left).toBeCloseTo(14.285714, 2)
			expect(p.width).toBeCloseTo(42.857142, 2)
			expect(p.row).toBe(0)
		})

		it('emits horizontal-kind placements — the renderer derives pixels from row', () => {
			const [p] = run([singleDayEvent])
			expect(p.kind).toBe('horizontal')
		})

		it('nests the original event by reference, un-mutated and un-copied', () => {
			const [p] = run([singleDayEvent])
			expect(p.event).toBe(singleDayEvent)
		})
	})

	describe('Edge Cases - Truncation', () => {
		// Lay out the week-spanning event and return its single placement.
		const runLongMultiDay = () => {
			const result = run([longMultiDayEvent])
			expect(result).toHaveLength(1)
			const [p] = result
			return p
		}

		it('truncates event starting before week start', () => {
			const p = runLongMultiDay()
			expect(p.left).toBe(0)
			expect(p.isTruncatedStart).toBe(true)
		})

		it('truncates event ending after week end', () => {
			const result = run([
				mkEvent(
					'multi-day',
					'2025-01-16T00:00:00.000Z',
					'2025-01-20T23:59:59.000Z'
				),
			])

			expect(result).toHaveLength(1)
			expect(result.at(0)?.isTruncatedEnd).toBe(true)
		})

		it('truncates event spanning entire week and beyond', () => {
			const p = runLongMultiDay()
			expect(p.left).toBe(0)
			expect(p.width).toBe(100)
			expect(p.isTruncatedStart).toBe(true)
			expect(p.isTruncatedEnd).toBe(true)
		})
	})

	describe('Edge Cases - Grid Bounds', () => {
		it('clamps single-day event at last day boundary', () => {
			const result = run([
				mkEvent(
					'single-day',
					'2025-01-18T23:00:00.000Z',
					'2025-01-18T23:59:59.000Z'
				),
			])

			expect(result).toHaveLength(1)
			expect(result.at(0)?.left).toBeCloseTo(85.714285, 2)
		})

		it('handles events exactly at week boundaries', () => {
			const result = run([
				mkEvent(
					'first',
					'2025-01-12T00:00:00.000Z',
					'2025-01-12T23:59:59.000Z'
				),
				mkEvent('last', '2025-01-18T00:00:00.000Z', '2025-01-18T23:59:59.000Z'),
			])

			expect(result).toHaveLength(2)
			const [first, last] = result
			expect(first.left).toBe(0)
			expect(last.left).toBeCloseTo(85.714285, 2)
		})
	})

	describe('Complex Scenarios - Overlapping Events', () => {
		it('stacks overlapping single-day events vertically', () => {
			const result = run([
				singleDayEvent,
				mkEvent(
					'single-2',
					'2025-01-13T11:00:00.000Z',
					'2025-01-13T11:30:00.000Z'
				),
				mkEvent(
					'single-3',
					'2025-01-13T14:00:00.000Z',
					'2025-01-13T14:30:00.000Z'
				),
			])

			expect(result.map((p) => p.row)).toEqual([0, 1, 2])
		})

		it('stacks overlapping multi-day events correctly', () => {
			const result = run([
				multiDayEvent,
				mkEvent(
					'multi-2',
					'2025-01-14T00:00:00.000Z',
					'2025-01-16T23:59:59.000Z'
				),
			])

			expect(result.map((p) => p.row)).toEqual([0, 1])
		})

		it('sorts multi-day events by duration (longer first)', () => {
			const result = run([
				mkEvent(
					'short',
					'2025-01-13T00:00:00.000Z',
					'2025-01-14T23:59:59.000Z'
				),
				mkEvent('long', '2025-01-13T00:00:00.000Z', '2025-01-16T23:59:59.000Z'),
			])

			expect(result.map((p) => p.event.id)).toEqual(['long', 'short'])
		})
	})

	describe('Complex Scenarios - Gap Filling', () => {
		it('fills gaps with single-day events', () => {
			const result = run([
				multiDayEvent,
				mkEvent(
					'gap-filler',
					'2025-01-16T10:00:00.000Z',
					'2025-01-16T11:00:00.000Z'
				),
			])

			expect(result.map((p) => p.row)).toEqual([0, 0])
		})

		it('places non-overlapping events in same row', () => {
			const result = run([
				multiDayEvent,
				mkEvent(
					'multi-2',
					'2025-01-17T00:00:00.000Z',
					'2025-01-18T23:59:59.000Z'
				),
			])

			expect(result.map((p) => p.row)).toEqual([0, 0])
		})
	})

	describe('Grid Overflow Handling', () => {
		it('stops placing events when dayMaxEvents is reached', () => {
			const manyEvents = Array.from({ length: 10 }, (_, i) =>
				mkEvent(
					`event-${i}`,
					dayjs('2025-01-13T10:00:00.000Z').add(i, 'hour').toISOString(),
					dayjs('2025-01-13T11:00:00.000Z').add(i, 'hour').toISOString()
				)
			)

			const result = run(manyEvents, { dayMaxEvents: 3 })

			expect(result).toHaveLength(3)
			expect(result.map((p) => p.event.id)).toEqual([
				'event-0',
				'event-1',
				'event-2',
			])
			expect(result.map((p) => p.row)).toEqual([0, 1, 2])
		})

		it('tries to place truncated version if full event does not fit', () => {
			const fillerEvents = [0, 1, 2].map((i) =>
				mkEvent(
					`filler-${i}`,
					'2025-01-13T00:00:00.000Z',
					'2025-01-15T23:59:59.000Z'
				)
			)

			const result = run(fillerEvents, { dayMaxEvents: 2 })

			expect(result).toHaveLength(2)
		})

		it('respects dayMaxEvents limit when placing overlapping events', () => {
			const blockerEvents = [0, 1, 2].map((i) =>
				mkEvent(
					`blocker-${i}`,
					'2025-01-13T00:00:00.000Z',
					'2025-01-15T23:59:59.000Z'
				)
			)

			const result = run(blockerEvents, { dayMaxEvents: 2 })

			expect(result).toHaveLength(2)
			expect(result.map((p) => p.row)).toEqual([0, 1])
		})
	})

	// These two used to run on the seven DAY columns of `days` with an hour
	// gridType, which only worked because an event outside the columns was clamped
	// onto an edge one. An hour axis is hour columns, and an event that overlaps
	// none of them is dropped, so the fixture is now a real 24-hour axis.
	describe('Hour Grid Type', () => {
		const hourColumns = Array.from({ length: 24 }, (_, i) =>
			dayjs('2025-01-13T00:00:00.000Z').add(i, 'hour')
		)
		const runOnHours = (event: CalendarEvent) =>
			layoutHorizontal({
				days: hourColumns,
				events: [event],
				dayMaxEvents: 4,
				gridType: 'hour',
			})

		it('handles hour gridType for single-day events', () => {
			const result = runOnHours(
				mkEvent(
					'single-day',
					'2025-01-13T10:00:00.000Z',
					'2025-01-13T10:00:00.000Z'
				)
			)

			expect(result).toHaveLength(1)
			expect(result.at(0)?.width).toBeCloseTo(100 / 24, 5)
		})

		it('handles hour gridType for multi-hour events', () => {
			const result = runOnHours(
				mkEvent(
					'single-day',
					'2025-01-13T10:00:00.000Z',
					'2025-01-13T13:01:00.000Z'
				)
			)

			expect(result).toHaveLength(1)
			expect(result.at(0)?.row).toBe(0)
		})
	})

	/**
	 * An hour axis places a bar at its exact times, as FullCalendar's timeline
	 * does (`computeMsSlotCoverage` in `TimelineCoords.ts` adds the remainder
	 * within a slot). Drawing whole hours made a 10:27-12:27 event look three
	 * hours long, and a drag then appeared to shorten it.
	 */
	describe('Exact time on an hour axis', () => {
		const hours = Array.from({ length: 24 }, (_, i) =>
			dayjs('2025-01-13T00:00:00.000Z').add(i, 'hour')
		)
		const hourWidth = 100 / hours.length
		const placeOnHours = (startISO: string, endISO: string) => {
			const [placement] = layoutHorizontal({
				days: hours,
				events: [mkEvent('timed', startISO, endISO)],
				dayMaxEvents: 4,
				gridType: 'hour',
			})
			return placement
		}
		/** Left edge and width, in hours, read back off the percentages. */
		const inHours = ({ left, width }: { left: number; width: number }) => ({
			start: left / hourWidth,
			length: width / hourWidth,
		})

		it('starts and ends a bar at its exact minutes', () => {
			const placement = placeOnHours(
				'2025-01-13T10:27:00.000Z',
				'2025-01-13T12:27:00.000Z'
			)

			const { start, length } = inHours(placement)
			expect(start).toBeCloseTo(10.45, 6)
			expect(length).toBeCloseTo(2, 6)
		})

		it('draws a bar inside one hour at its own length', () => {
			const placement = placeOnHours(
				'2025-01-13T10:15:00.000Z',
				'2025-01-13T10:45:00.000Z'
			)

			const { start, length } = inHours(placement)
			expect(start).toBeCloseTo(10.25, 6)
			expect(length).toBeCloseTo(0.5, 6)
		})

		it('keeps a whole hour for an event with no length', () => {
			const placement = placeOnHours(
				'2025-01-13T10:00:00.000Z',
				'2025-01-13T10:00:00.000Z'
			)

			const { start, length } = inHours(placement)
			expect(start).toBeCloseTo(10, 6)
			expect(length).toBeCloseTo(1, 6)
		})

		it('still draws whole days on a day axis', () => {
			const [placement] = run([
				mkEvent(
					'timed-days',
					'2025-01-13T09:00:00.000Z',
					'2025-01-14T17:00:00.000Z'
				),
			])

			expect(columnsOf(placement.width)).toBe(2)
			expect(placement.left).toBeCloseTo((1 / days.length) * 100, 6)
		})
	})
})

/**
 * An event that does not overlap the column range produces no segment, its end
 * exclusive; one that overlaps is clipped to the range (FullCalendar v7.1.1,
 * `packages/preact/src/timegrid/DayTimeColsSlicer.ts:7-22`). The columns here
 * are a visible-hours window, so an event outside it must not be pulled onto an
 * edge column.
 */
describe('layoutHorizontal on a visible-hours window', () => {
	const DAY = '2025-01-13'
	// Rows are built from the same instants as the events, so the readings agree
	// whatever zone the machine is in. The zone-sensitive path through
	// getViewHours is covered on the clock-change days in vertical.test.ts.
	const window = (firstHour: number, endHour: number) =>
		Array.from({ length: endHour - firstHour }, (_, i) =>
			dayjs(`${DAY}T00:00:00.000Z`).add(firstHour + i, 'hour')
		)
	const hourAt = (hour: number, minute = 0) =>
		`${DAY}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`
	const layout = (
		columns: ReturnType<typeof window>,
		events: CalendarEvent[]
	) =>
		layoutHorizontal({
			days: columns,
			events,
			dayMaxEvents: 4,
			gridType: 'hour',
		})

	it('draws nothing for an event wholly before the window', () => {
		const events = [mkEvent('e', hourAt(10, 27), hourAt(12, 27))]
		expect(layout(window(18, 24), events)).toHaveLength(0)
	})

	it('draws nothing for an event wholly after the window', () => {
		const events = [mkEvent('e', hourAt(10), hourAt(11))]
		expect(layout(window(0, 6), events)).toHaveLength(0)
	})

	it('draws nothing for an event ending exactly at the window start', () => {
		const events = [mkEvent('e', hourAt(10), hourAt(11))]
		expect(layout(window(11, 18), events)).toHaveLength(0)
	})

	it('draws nothing for an event starting exactly at the window end', () => {
		const events = [mkEvent('e', hourAt(11), hourAt(12))]
		expect(layout(window(8, 11), events)).toHaveLength(0)
	})

	it('clips an event crossing the window start to the first column and flags it', () => {
		const [placed] = layout(window(8, 18), [mkEvent('e', hourAt(7), hourAt(9))])
		expect(placed?.left).toBe(0)
		expect(placed?.width).toBeCloseTo(10, 5)
		expect(placed?.isTruncatedStart).toBe(true)
	})

	it('clips an event crossing the window end to the last column and flags it', () => {
		const [placed] = layout(window(8, 18), [
			mkEvent('e', hourAt(17), hourAt(19)),
		])
		expect(placed?.left).toBeCloseTo(90, 5)
		expect(placed?.width).toBeCloseTo(10, 5)
		expect(placed?.isTruncatedEnd).toBe(true)
	})

	it('places an event inside the window from the window start', () => {
		const [placed] = layout(window(8, 18), [
			mkEvent('e', hourAt(9), hourAt(10)),
		])
		expect(placed?.left).toBeCloseTo(10, 5)
		expect(placed?.width).toBeCloseTo(10, 5)
	})

	it('places events by their column when a week of windows has gaps between days', () => {
		const monday = window(18, 24)
		const tuesday = monday.map((hour) => hour.add(1, 'day'))
		const [placed] = layout(
			[...monday, ...tuesday],
			[mkEvent('e', '2025-01-14T19:00:00.000Z', '2025-01-14T20:00:00.000Z')]
		)
		expect(placed?.left).toBeCloseTo((7 / 12) * 100, 5)
		expect(placed?.width).toBeCloseTo((1 / 12) * 100, 5)
	})

	it('places an event in its own day when a mid-week day is hidden', () => {
		// Mon 13, Tue 14 and Thu 16, each showing 09:00 and 10:00. Wednesday has no
		// columns, so Thursday 10:00 is the sixth column, not the eighth hour-pair
		// a count of elapsed hours from Monday would give.
		const monday = window(9, 11)
		const tuesday = monday.map((hour) => hour.add(1, 'day'))
		const thursday = monday.map((hour) => hour.add(3, 'day'))
		const [placed] = layout(
			[...monday, ...tuesday, ...thursday],
			[mkEvent('e', '2025-01-16T10:00:00.000Z', '2025-01-16T11:00:00.000Z')]
		)
		expect(placed?.left).toBeCloseTo((5 / 6) * 100, 5)
		expect(placed?.width).toBeCloseTo((1 / 6) * 100, 5)
	})
})

/**
 * #311. Hour columns are labelled by clock hour, so a bar starts in the column
 * of its clock time, as FullCalendar's timeline places it. By elapsed time,
 * 09:00 on a 23-hour day started in the 8 AM column, and on a 25-hour day in
 * the 10 AM column.
 */
describe('layoutHorizontal on a day the clocks change', () => {
	const originalTz = dayjs.tz.guess()
	const HOUR_PERCENT = 100 / 24

	beforeEach(() => {
		dayjs.tz.setDefault('America/New_York')
	})

	afterEach(() => {
		dayjs.tz.setDefault(originalTz)
	})

	/** Left edge and width, in hours, of a 09:00-10:00 event on `dayISO`'s hour axis. */
	const placeNineToTen = (dayISO: string) => {
		const hours = getViewHours({ referenceDate: dayjs(dayISO) })
		const event = {
			id: 'nine',
			title: 'nine',
			start: dayjs(`${dayISO}T09:00`),
			end: dayjs(`${dayISO}T10:00`),
		}
		const [placed] = layoutHorizontal({
			days: hours,
			events: [event],
			dayMaxEvents: 4,
			gridType: 'hour',
		})
		return {
			start: (placed?.left ?? 0) / HOUR_PERCENT,
			length: (placed?.width ?? 0) / HOUR_PERCENT,
		}
	}

	it('starts 09:00 in the 9 AM column on the spring change day', () => {
		const { start, length } = placeNineToTen('2025-03-09')
		expect(start).toBeCloseTo(9, 6)
		expect(length).toBeCloseTo(1, 6)
	})

	it('starts 09:00 in the 9 AM column on the autumn change day', () => {
		const { start, length } = placeNineToTen('2025-11-02')
		expect(start).toBeCloseTo(9, 6)
		expect(length).toBeCloseTo(1, 6)
	})
})

describe('findMultiUnitSlot', () => {
	const span = {
		startCol: 1,
		endCol: 3,
		isTruncatedStart: false,
		isTruncatedEnd: false,
		spansMultipleUnits: true,
	}
	// A grid of `rows` rows by 5 columns with the given [row, col] cells taken.
	const gridWith = (rows: number, taken: [number, number][]) => {
		const grid = Array.from({ length: rows }, () =>
			Array.from({ length: 5 }, () => false)
		)
		for (const [row, col] of taken) {
			grid[row][col] = true
		}
		return grid
	}

	it('keeps the span start when a row is free there', () => {
		expect(findMultiUnitSlot(gridWith(2, [[0, 2]]), span)).toEqual({
			row: 1,
			startCol: 1,
			isTruncatedStart: false,
		})
	})

	it('keeps the span own truncated-start flag on its first try', () => {
		const clipped = { ...span, isTruncatedStart: true }
		expect(findMultiUnitSlot(gridWith(1, []), clipped)?.isTruncatedStart).toBe(
			true
		)
	})

	it('truncates to a later start when every row is taken at the start', () => {
		expect(findMultiUnitSlot(gridWith(1, [[0, 1]]), span)).toEqual({
			row: 0,
			startCol: 2,
			isTruncatedStart: true,
		})
	})

	it('returns null when even the last column is taken in every row', () => {
		expect(findMultiUnitSlot(gridWith(1, [[0, 3]]), span)).toBeNull()
	})
})

describe('layoutHorizontal over hidden days', () => {
	// Noon UTC is the same calendar day in every zone from Vancouver to Tokyo.
	const noon = (dayOfJanuary: number) =>
		dayjs('2025-01-01T12:00:00.000Z').add(dayOfJanuary - 1, 'day')
	// Thu 9, Fri 10, Mon 13, Tue 14: the weekend between Fri and Mon is hidden.
	const visibleDays = [noon(9), noon(10), noon(13), noon(14)]
	const place = (startDay: number, endDay: number) =>
		layoutHorizontal({
			days: visibleDays,
			events: [
				{
					id: 'e',
					title: 'e',
					start: noon(startDay),
					end: noon(endDay),
					allDay: true,
				},
			],
			dayMaxEvents: 4,
		})
	const edgesOf = (placed: ReturnType<typeof place>) => {
		const bar = placed.at(0)
		return {
			box: [bar?.left, bar?.width],
			truncated: [bar?.isTruncatedStart, bar?.isTruncatedEnd],
		}
	}

	it('draws one bar over the visible columns on either side of the gap', () => {
		expect(edgesOf(place(10, 13))).toEqual({
			box: [25, 50],
			truncated: [false, false],
		})
	})

	it('clamps a bar that starts on a hidden day and marks that end truncated', () => {
		expect(edgesOf(place(11, 14))).toEqual({
			box: [50, 50],
			truncated: [true, false],
		})
	})

	it('clamps a bar that ends on a hidden day and marks that end truncated', () => {
		expect(edgesOf(place(10, 12))).toEqual({
			box: [25, 25],
			truncated: [false, true],
		})
	})

	it('draws nothing for an event that lies entirely on hidden days', () => {
		expect(place(11, 12)).toEqual([])
	})

	it('draws nothing for a single-day timed event on a hidden day', () => {
		const saturdayMeeting = mkEvent(
			'meeting',
			'2025-01-11T11:00:00.000Z',
			'2025-01-11T13:00:00.000Z'
		)
		const placed = layoutHorizontal({
			days: visibleDays,
			events: [saturdayMeeting],
			dayMaxEvents: 4,
		})
		expect(placed).toEqual([])
	})
})

/**
 * The month view's week rows come from `getMonthWeeks`, whose columns are made
 * with `.add(n, 'day')` and carry the offset of the week's first day. In a week
 * the clocks change, later columns read midnight while sitting an hour off it,
 * so a column must never be trusted to BE its day's start: all-day events came
 * out one column too wide and a column too far left. Columns here are the real
 * builder's output, not hand-made ones, which is what hid it.
 */
describe.each([
	['America/New_York', '2025-03-12T12:00:00.000'],
	['America/New_York', '2025-11-05T12:00:00.000'],
	['America/Havana', '2025-03-12T12:00:00.000'],
	['Australia/Lord_Howe', '2025-10-08T12:00:00.000'],
])(
	'layoutHorizontal on a week row from getMonthWeeks in %s',
	(zone, anchor) => {
		const originalTz = dayjs.tz.guess()

		beforeEach(() => {
			dayjs.tz.setDefault(zone)
		})

		afterEach(() => {
			dayjs.tz.setDefault(originalTz)
		})

		const weekRow = () => {
			const weeks = getMonthWeeks(dayjs.tz(anchor, zone), 0)
			const anchorDay = anchor.slice(0, 10)
			const rowOfAnchor = weeks.findIndex((week) =>
				week.some((day) => day.format('YYYY-MM-DD') === anchorDay)
			)
			return weeks.at(rowOfAnchor) ?? []
		}

		const columnAndWidthOf = (
			event: CalendarEvent,
			week: ReturnType<typeof weekRow>
		) => {
			const [placed] = layoutHorizontal({
				days: week,
				events: [event],
				dayMaxEvents: 3,
			})
			const oneColumn = 100 / 7
			return {
				column: Math.round((placed?.left ?? -1) / oneColumn),
				width: Math.round((placed?.width ?? -1) / oneColumn),
			}
		}

		it('puts each all-day event in exactly its own day column', () => {
			const week = weekRow()
			const placements = week.map((day) => {
				const dayISO = day.format('YYYY-MM-DD')
				const nextDayISO = day.add(1, 'day').format('YYYY-MM-DD')
				return columnAndWidthOf(
					{
						id: dayISO,
						title: dayISO,
						start: dayjs.tz(`${dayISO}T00:00:00.000`, zone),
						end: dayjs.tz(`${nextDayISO}T00:00:00.000`, zone),
					},
					week
				)
			})
			expect(placements).toEqual(
				week.map((_, index) => ({ column: index, width: 1 }))
			)
		})

		it('puts a timed event just after midnight in its own day column', () => {
			const week = weekRow()
			const placements = week.map((day) => {
				const dayISO = day.format('YYYY-MM-DD')
				return columnAndWidthOf(
					{
						id: dayISO,
						title: dayISO,
						start: dayjs.tz(`${dayISO}T00:30:00.000`, zone),
						end: dayjs.tz(`${dayISO}T00:45:00.000`, zone),
					},
					week
				).column
			})
			expect(placements).toEqual(week.map((_, index) => index))
		})
	}
)

describe('hour-axis row reuse', () => {
	const hours = Array.from({ length: 12 }, (_, index) =>
		dayjs('2026-10-28T07:00:00.000Z').add(index, 'hour')
	)
	const eventAt = (id: string, start: string, end: string) =>
		mkEvent(id, `2026-10-28T${start}:00.000Z`, `2026-10-28T${end}:00.000Z`)
	const pack = (events: CalendarEvent[], dayMaxEvents = 4) =>
		layoutHorizontal({ days: hours, events, dayMaxEvents, gridType: 'hour' })

	for (const [end, start, expectedRows] of [
		['09:00', '09:00', [0, 0]],
		['09:17', '09:17', [0, 0]],
		['09:17', '09:45', [0, 0]],
		['09:17', '09:16', [0, 1]],
	] as const) {
		it(`places 07:00–${end} and ${start}–11:00 in rows ${expectedRows}`, () => {
			const events = [eventAt('a', '07:00', end), eventAt('b', start, '11:00')]
			expect(pack(events).map(({ row }) => row)).toEqual([...expectedRows])
		})
	}

	it('reuses one row for successive events inside the same hour, even at the limit', () => {
		const events = [
			eventAt('a', '09:01', '09:17'),
			eventAt('b', '09:17', '09:31'),
			eventAt('c', '09:31', '09:59'),
		]
		const placed = pack(events, 1)
		expect(placed).toHaveLength(3)
		expect(placed.map(({ row }) => row)).toEqual([0, 0, 0])
	})

	it('keeps genuine same-hour overlaps on different rows', () => {
		const events = [
			eventAt('a', '09:01', '09:18'),
			eventAt('b', '09:17', '09:59'),
		]
		expect(pack(events).map(({ row }) => row)).toEqual([0, 1])
		expect(pack(events, 1).map(({ event }) => event.id)).toEqual(['a'])
	})

	for (const reverse of [false, true]) {
		it(`packs nested and chained events chronologically (reversed=${reverse})`, () => {
			const events = [
				eventAt('long', '07:00', '12:00'),
				eventAt('a', '08:00', '09:17'),
				eventAt('b', '09:17', '10:00'),
				eventAt('c', '09:18', '09:19'),
				eventAt('d', '10:00', '11:00'),
			]
			const input = reverse ? events.toReversed() : events
			const placed = pack(input)
			expect(placed.map(({ event, row }) => [event.id, row])).toEqual([
				['long', 0],
				['a', 1],
				['b', 1],
				['c', 2],
				['d', 1],
			])
		})
	}

	it('counts an instant event as its drawn full-hour interval', () => {
		const events = [
			eventAt('instant', '09:00', '09:00'),
			eventAt('b', '09:17', '10:00'),
		]
		expect(pack(events).map(({ row }) => row)).toEqual([0, 1])
	})

	it('still reserves whole days on a day axis', () => {
		const events = [
			eventAt('a', '07:00', '09:17'),
			eventAt('b', '09:17', '11:00'),
		]
		const placed = layoutHorizontal({
			days: [hours[0]],
			events,
			dayMaxEvents: 2,
			gridType: 'day',
		})
		expect(placed.map(({ row }) => row)).toEqual([0, 1])
	})
})

describe('hourly overflow clipping', () => {
	it('keeps the visible suffix when the row is occupied in the first hour', () => {
		const hours = Array.from({ length: 4 }, (_, index) =>
			dayjs('2026-10-28T07:00:00.000Z').add(index, 'hour')
		)
		const events = [
			mkEvent(
				'blocker',
				'2026-10-28T07:00:00.000Z',
				'2026-10-28T09:17:00.000Z'
			),
			mkEvent('suffix', '2026-10-28T09:16:00.000Z', '2026-10-28T11:00:00.000Z'),
		]
		const placed = layoutHorizontal({
			days: hours,
			events,
			dayMaxEvents: 1,
			gridType: 'hour',
		})
		expect(placed).toHaveLength(2)
		expect(placed[1]).toMatchObject({
			row: 0,
			startCol: 3,
			endCol: 3,
			left: 75,
			width: 25,
			isTruncatedStart: true,
		})
	})
})
