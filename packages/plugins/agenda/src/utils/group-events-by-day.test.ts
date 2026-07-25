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
 * Differential parity guard for the single-pass rewrite.
 *
 * `referenceGroupEventsByDay` is the original day-cursor implementation
 * verbatim: it walked the window one day at a time, re-filtering the whole event
 * array against `appearsOnDay` and sorting per day. The shipped version buckets
 * in one pass over a precomputed day index, and must agree exactly — including
 * the agenda's asymmetric membership rules (all-day events repeat across every
 * day they span, timed events appear only under their start day) and its
 * dropping of empty days.
 */
const appearsOnDayReference = (
	event: CalendarEvent,
	dayStart: ReturnType<typeof dayjs>,
	dayEnd: ReturnType<typeof dayjs>
): boolean => {
	if (event.allDay) {
		return (
			event.start.isSameOrBefore(dayEnd) && event.end.isSameOrAfter(dayStart)
		)
	}
	return (
		event.start.isSameOrAfter(dayStart) && event.start.isSameOrBefore(dayEnd)
	)
}

const referenceGroupEventsByDay = (
	events: CalendarEvent[],
	range: { start: ReturnType<typeof dayjs>; end: ReturnType<typeof dayjs> }
) => {
	const groups: { key: string; events: string[] }[] = []
	const lastDay = range.end.startOf('day')
	let cursor = range.start.startOf('day')
	while (cursor.isSameOrBefore(lastDay)) {
		const dayStart = cursor.startOf('day')
		const dayEnd = cursor.endOf('day')
		const dayEvents = events
			.filter((event) => appearsOnDayReference(event, dayStart, dayEnd))
			.sort((a, b) => {
				const aRank = a.allDay ? 0 : 1
				const bRank = b.allDay ? 0 : 1
				if (aRank !== bRank) {
					return aRank - bRank
				}
				return a.start.valueOf() - b.start.valueOf()
			})
		if (dayEvents.length > 0) {
			groups.push({
				key: cursor.format('YYYY-MM-DD'),
				events: dayEvents.map((event) => event.id.toString()),
			})
		}
		cursor = cursor.add(1, 'day')
	}
	return groups
}

const shape = (events: CalendarEvent[], startISO: string, endISO: string) =>
	groupEventsByDay(events, {
		start: dayjs(startISO),
		end: dayjs(endISO),
	}).map((group) => ({
		key: group.key,
		events: group.events.map((event) => event.id.toString()),
	}))

const referenceShape = (
	events: CalendarEvent[],
	startISO: string,
	endISO: string
) =>
	referenceGroupEventsByDay(events, {
		start: dayjs(startISO),
		end: dayjs(endISO),
	})

describe('groupEventsByDay parity with the per-day implementation', () => {
	const windowStart = '2026-06-01T00:00:00'
	const windowEnd = '2026-06-30T23:59:59'

	const cases: [string, CalendarEvent[]][] = [
		['no events', []],
		[
			'timed events on distinct days',
			[
				mkEvent('a', '2026-06-03T09:00:00', '2026-06-03T10:00:00'),
				mkEvent('b', '2026-06-10T14:00:00', '2026-06-10T15:00:00'),
			],
		],
		[
			'timed event crossing midnight',
			[mkEvent('night', '2026-06-05T23:00:00', '2026-06-06T01:00:00')],
		],
		[
			'multi-day all-day event',
			[
				mkEvent('span', '2026-06-04T00:00:00', '2026-06-08T23:59:59', {
					allDay: true,
				}),
			],
		],
		[
			'all-day event overlapping the window start',
			[
				mkEvent('lead', '2026-05-28T00:00:00', '2026-06-02T23:59:59', {
					allDay: true,
				}),
			],
		],
		[
			'all-day event overlapping the window end',
			[
				mkEvent('trail', '2026-06-28T00:00:00', '2026-07-05T23:59:59', {
					allDay: true,
				}),
			],
		],
		[
			'all-day event spanning the whole window',
			[
				mkEvent('whole', '2026-01-01T00:00:00', '2026-12-31T23:59:59', {
					allDay: true,
				}),
			],
		],
		[
			'events entirely outside the window',
			[
				mkEvent('past', '2026-01-01T09:00:00', '2026-01-01T10:00:00'),
				mkEvent('future', '2026-12-01T09:00:00', '2026-12-01T10:00:00'),
			],
		],
		[
			'all-day and timed on the same day',
			[
				mkEvent('timed', '2026-06-07T09:00:00', '2026-06-07T10:00:00'),
				mkEvent('allday', '2026-06-07T00:00:00', '2026-06-07T23:59:59', {
					allDay: true,
				}),
			],
		],
		[
			'zero-duration timed event',
			[mkEvent('zero', '2026-06-09T12:00:00', '2026-06-09T12:00:00')],
		],
		[
			'timed event exactly at midnight',
			[mkEvent('midnight', '2026-06-11T00:00:00', '2026-06-11T00:30:00')],
		],
		// End precedes start. The per-day predicate drops these for all-day events
		// (its two-clause overlap fails) but keeps timed ones on their start day.
		[
			'malformed all-day event',
			[
				mkEvent('bad-allday', '2026-06-15T00:00:00', '2026-06-10T00:00:00', {
					allDay: true,
				}),
			],
		],
		[
			'malformed timed event',
			[mkEvent('bad-timed', '2026-06-15T12:00:00', '2026-06-10T12:00:00')],
		],
	]

	it.each(cases)('%s', (_label: string, events: CalendarEvent[]) => {
		expect(shape(events, windowStart, windowEnd)).toEqual(
			referenceShape(events, windowStart, windowEnd)
		)
	})

	it('agrees on a single-day window', () => {
		const events = [
			mkEvent('one', '2026-06-05T09:00:00', '2026-06-05T10:00:00'),
		]
		expect(shape(events, '2026-06-05T00:00:00', '2026-06-05T23:59:59')).toEqual(
			referenceShape(events, '2026-06-05T00:00:00', '2026-06-05T23:59:59')
		)
	})

	it('agrees across a DST transition with a timezone configured', () => {
		dayjs.tz.setDefault('America/Los_Angeles')
		try {
			const events = [
				mkEvent('spanning', '2026-03-05T00:00:00', '2026-03-12T23:59:59', {
					allDay: true,
				}),
				mkEvent('at-two', '2026-03-08T02:00:00', '2026-03-08T03:00:00'),
				mkEvent('at-one', '2026-03-08T01:00:00', '2026-03-08T01:30:00'),
				mkEvent('next-day', '2026-03-09T00:30:00', '2026-03-09T01:00:00'),
			]
			expect(
				shape(events, '2026-03-01T00:00:00', '2026-03-31T23:59:59')
			).toEqual(
				referenceShape(events, '2026-03-01T00:00:00', '2026-03-31T23:59:59')
			)
		} finally {
			dayjs.tz.setDefault()
		}
	})
})
