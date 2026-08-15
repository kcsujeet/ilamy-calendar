import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { layoutHorizontal } from './horizontal'

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

			expect(Math.round(placement.width / (100 / hours.length))).toBe(2)
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

			expect(Math.round(placement.width / (100 / hours.length))).toBe(2)
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

	describe('Hour Grid Type', () => {
		it('handles hour gridType for single-day events', () => {
			const result = run(
				[
					mkEvent(
						'single-day',
						'2025-01-13T10:00:00.000Z',
						'2025-01-13T10:00:00.000Z'
					),
				],
				{ gridType: 'hour' }
			)

			expect(result).toHaveLength(1)
			expect(result.at(0)?.width).toBeCloseTo(14.285714, 2)
		})

		it('handles hour gridType for multi-hour events', () => {
			const result = run(
				[
					mkEvent(
						'single-day',
						'2025-01-13T10:00:00.000Z',
						'2025-01-13T13:01:00.000Z'
					),
				],
				{ gridType: 'hour' }
			)

			expect(result).toHaveLength(1)
			expect(result.at(0)?.row).toBe(0)
		})
	})
})
