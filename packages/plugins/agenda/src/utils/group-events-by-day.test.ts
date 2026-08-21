import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import { groupEventsByDay } from './group-events-by-day'

const mkEvent = (
	id: string,
	startISO: string,
	endISO: string,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id,
	title: `Event ${id}`,
	start: dayjs(startISO),
	end: dayjs(endISO),
	...extra,
})

const run = (events: CalendarEvent[], startISO: string, endISO: string) =>
	groupEventsByDay(events, { start: dayjs(startISO), end: dayjs(endISO) })

describe('groupEventsByDay', () => {
	it('returns an empty array when there are no events', () => {
		expect(run([], '2026-06-01T00:00:00', '2026-06-30T23:59:59')).toEqual([])
	})

	it('groups by day, skips empty days, orders chronologically', () => {
		const events = [
			mkEvent('b', '2026-06-03T09:00:00', '2026-06-03T10:00:00'),
			mkEvent('a', '2026-06-01T09:00:00', '2026-06-01T10:00:00'),
		]
		const groups = run(events, '2026-06-01T00:00:00', '2026-06-05T23:59:59')
		expect(groups.map((g) => g.key)).toEqual(['2026-06-01', '2026-06-03'])
		expect(groups.map((g) => g.events.map((e) => e.id))).toEqual([['a'], ['b']])
	})

	it('sorts within a day: all-day first, then by start time', () => {
		const events = [
			mkEvent('timed-late', '2026-06-01T15:00:00', '2026-06-01T16:00:00'),
			mkEvent('allday', '2026-06-01T00:00:00', '2026-06-01T23:59:59', {
				allDay: true,
			}),
			mkEvent('timed-early', '2026-06-01T09:00:00', '2026-06-01T10:00:00'),
		]
		const [group] = run(events, '2026-06-01T00:00:00', '2026-06-01T23:59:59')
		expect(group.events.map((e) => e.id)).toEqual([
			'allday',
			'timed-early',
			'timed-late',
		])
	})

	it('places a timed event only on its start day, even across midnight', () => {
		const events = [
			mkEvent('overnight', '2026-06-02T23:00:00', '2026-06-03T01:00:00'),
		]
		const groups = run(events, '2026-06-01T00:00:00', '2026-06-05T23:59:59')
		expect(groups.map((g) => g.key)).toEqual(['2026-06-02'])
	})

	/**
	 * #248. An all-day event's `end` is exclusive, so one stored the conventional
	 * way (midnight to the following midnight) covers a single day and must be
	 * listed once. Testing the end against `isSameOrAfter(dayStart)` listed it
	 * under the following day as well, contradicting the month grid.
	 */
	it('lists a one-day all-day event once when its end is the following midnight', () => {
		const groups = run(
			[
				mkEvent('one-day', '2026-06-02T00:00:00', '2026-06-03T00:00:00', {
					allDay: true,
				}),
			],
			'2026-06-01T00:00:00',
			'2026-06-30T23:59:59'
		)

		expect(groups.map((g) => g.key)).toEqual(['2026-06-02'])
	})

	/**
	 * A zero-duration all-day event still belongs to its date. The core's
	 * `overlapsRange` keeps it (its START falls inside the day) and the grid
	 * paints it; testing only the end against the day's first instant dropped it
	 * from the agenda alone.
	 */
	it('lists a zero-duration all-day event on its date', () => {
		const groups = run(
			[
				mkEvent('zero', '2026-06-02T00:00:00', '2026-06-02T00:00:00', {
					allDay: true,
				}),
			],
			'2026-06-01T00:00:00',
			'2026-06-30T23:59:59'
		)

		expect(groups.map((g) => g.key)).toEqual(['2026-06-02'])
	})

	it('repeats a conventionally stored multi-day all-day event under each day it covers', () => {
		const groups = run(
			[
				// Covers Jun 2, 3 and 4: the exclusive end is Jun 5 at midnight.
				mkEvent('three-days', '2026-06-02T00:00:00', '2026-06-05T00:00:00', {
					allDay: true,
				}),
			],
			'2026-06-01T00:00:00',
			'2026-06-30T23:59:59'
		)

		expect(groups.map((g) => g.key)).toEqual([
			'2026-06-02',
			'2026-06-03',
			'2026-06-04',
		])
	})

	it('repeats a multi-day all-day event under each overlapped day in the range', () => {
		const events = [
			mkEvent('multi', '2026-06-02T00:00:00', '2026-06-04T23:59:59', {
				allDay: true,
			}),
		]
		const groups = run(events, '2026-06-01T00:00:00', '2026-06-05T23:59:59')
		expect(groups.map((g) => g.key)).toEqual([
			'2026-06-02',
			'2026-06-03',
			'2026-06-04',
		])
		expect(groups.every((g) => g.events.at(0)?.id === 'multi')).toBe(true)
	})

	it('clamps a multi-day event to the range window', () => {
		const events = [
			mkEvent('multi', '2026-05-30T00:00:00', '2026-06-03T23:59:59', {
				allDay: true,
			}),
		]
		const groups = run(events, '2026-06-01T00:00:00', '2026-06-02T23:59:59')
		expect(groups.map((g) => g.key)).toEqual(['2026-06-01', '2026-06-02'])
	})
})

/**
 * The per-day loop is the agenda's hot path, and it was measured at ~4.4s for a
 * 30-day window over 512 events once a `timezone` was configured (#245). The
 * fix compares epoch milliseconds instead of asking dayjs, so these pin day
 * placement in a zone whose offset differs from the machine's, including across
 * a DST transition where a local day is 23 or 25 hours long.
 *
 * No suite covered grouping under a timezone before, which is how a numeric
 * conversion could have shifted a day boundary unnoticed.
 */
describe('groupEventsByDay under a configured timezone', () => {
	const TZ = 'America/New_York'
	const at = (local: string) => dayjs.tz(local, TZ)
	const zoned = (
		id: string,
		startLocal: string,
		endLocal: string,
		extra: Partial<CalendarEvent> = {}
	): CalendarEvent => ({
		id,
		title: `Event ${id}`,
		start: at(startLocal),
		end: at(endLocal),
		...extra,
	})
	const runZoned = (
		events: CalendarEvent[],
		startLocal: string,
		endLocal: string
	) => groupEventsByDay(events, { start: at(startLocal), end: at(endLocal) })

	it('places a timed event on its local start day, not the UTC one', () => {
		// 21:00 in New York is 02:00 the NEXT day in UTC.
		const events = [zoned('late', '2026-06-01T21:00:00', '2026-06-01T22:00:00')]
		const groups = runZoned(
			events,
			'2026-06-01T00:00:00',
			'2026-06-03T23:59:59'
		)
		expect(groups.map((g) => g.key)).toEqual(['2026-06-01'])
	})

	it('keeps a timed event on its start day across the DST fall-back', () => {
		// 2025-11-02 is a 25-hour day in New York.
		const events = [zoned('dst', '2025-11-02T23:30:00', '2025-11-03T00:30:00')]
		const groups = runZoned(
			events,
			'2025-11-01T00:00:00',
			'2025-11-04T23:59:59'
		)
		expect(groups.map((g) => g.key)).toEqual(['2025-11-02'])
	})

	/**
	 * `add(1, 'day')` on a tz-aware instance keeps the wall clock at 00:00 but
	 * carries the PREVIOUS offset across a transition, so the day after a
	 * spring-forward is emitted as `00:00 -05:00` (05:00Z) when true local
	 * midnight is 04:00Z. An event in that missing first hour then lands in the
	 * previous day's bucket. The cursor must be re-normalized each step.
	 */
	it('assigns the first hour after a spring-forward to the correct day', () => {
		const events = [
			zoned('early', '2025-03-10T00:30:00', '2025-03-10T01:30:00'),
		]
		const groups = runZoned(
			events,
			'2025-03-08T00:00:00',
			'2025-03-11T23:59:59'
		)
		expect(groups.map((g) => g.key)).toEqual(['2025-03-10'])
	})

	it('assigns the first hour after a fall-back to the correct day', () => {
		const events = [
			zoned('early', '2025-11-03T00:30:00', '2025-11-03T01:30:00'),
		]
		const groups = runZoned(
			events,
			'2025-11-01T00:00:00',
			'2025-11-04T23:59:59'
		)
		expect(groups.map((g) => g.key)).toEqual(['2025-11-03'])
	})

	it('repeats an all-day event under each local day it covers across a DST spring-forward', () => {
		// 2025-03-09 is a 23-hour day in New York.
		const events = [
			zoned('span', '2025-03-08T00:00:00', '2025-03-11T00:00:00', {
				allDay: true,
			}),
		]
		const groups = runZoned(
			events,
			'2025-03-07T00:00:00',
			'2025-03-12T23:59:59'
		)
		expect(groups.map((g) => g.key)).toEqual([
			'2025-03-08',
			'2025-03-09',
			'2025-03-10',
		])
	})
})
