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
