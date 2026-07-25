import { afterEach, describe, expect, it } from 'bun:test'
import dayjs from './dayjs'
import {
	bucketEventsByDay,
	buildDayIndex,
	type DayIndex,
	dayIndexOf,
	getEventBoundsMs,
	overlapsRangeMs,
} from './events'

interface TestEvent {
	id: string
	start: ReturnType<typeof dayjs>
	end: ReturnType<typeof dayjs>
}

const makeEvent = (
	id: string,
	startISO: string,
	endISO: string
): TestEvent => ({
	id,
	start: dayjs(startISO),
	end: dayjs(endISO),
})

const dayGrid = (startISO: string, count: number) =>
	Array.from({ length: count }, (_, i) => dayjs(startISO).add(i, 'day'))

/**
 * Reference implementation: the per-day filter shape that bucketing replaces.
 * Uses the same inclusive overlap predicate against each day's real boundaries.
 */
const referenceBuckets = (
	events: readonly TestEvent[],
	days: readonly ReturnType<typeof dayjs>[]
): TestEvent[][] =>
	days.map((day) => {
		const dayStart = day.startOf('day').valueOf()
		const dayEnd = day.endOf('day').valueOf()
		return events.filter((event) =>
			overlapsRangeMs(getEventBoundsMs(event), dayStart, dayEnd)
		)
	})

const ids = (buckets: TestEvent[][]): string[][] =>
	buckets.map((bucket) => bucket.map((event) => event.id))

afterEach(() => {
	dayjs.tz.setDefault()
})

describe('buildDayIndex', () => {
	it('records one start per day and the last millisecond of the final day', () => {
		const days = dayGrid('2026-03-02T00:00:00.000Z', 3)
		const index = buildDayIndex(days)
		expect(index.dayStarts).toHaveLength(3)
		expect(index.dayStarts.at(0)).toBe(days[0].startOf('day').valueOf())
		expect(index.gridEnd).toBe(days[2].endOf('day').valueOf())
	})

	it('returns an empty index for no days', () => {
		expect(buildDayIndex([]).dayStarts).toHaveLength(0)
	})
})

describe('dayIndexOf', () => {
	const days = dayGrid('2026-03-02T00:00:00.000Z', 5)
	const index: DayIndex = buildDayIndex(days)

	it('locates a timestamp inside the grid', () => {
		expect(dayIndexOf(index, days[3].startOf('day').valueOf())).toBe(3)
		expect(dayIndexOf(index, days[3].hour(13).valueOf())).toBe(3)
	})

	it('returns -1 before the grid', () => {
		expect(dayIndexOf(index, days[0].startOf('day').valueOf() - 1)).toBe(-1)
	})

	it('returns the last index after the grid', () => {
		expect(dayIndexOf(index, days[4].add(10, 'day').valueOf())).toBe(4)
	})

	it('is exact on every day boundary', () => {
		days.forEach((day, expected) => {
			expect(dayIndexOf(index, day.startOf('day').valueOf())).toBe(expected)
			expect(dayIndexOf(index, day.endOf('day').valueOf())).toBe(expected)
		})
	})
})

describe('bucketEventsByDay parity with per-day filtering', () => {
	const runParity = (
		label: string,
		startISO: string,
		dayCount: number,
		events: TestEvent[]
	) => {
		it(label, () => {
			const days = dayGrid(startISO, dayCount)
			const index = buildDayIndex(days)
			expect(ids(bucketEventsByDay(events, index))).toEqual(
				ids(referenceBuckets(events, days))
			)
		})
	}

	runParity('single-day timed events', '2026-03-02T00:00:00.000Z', 7, [
		makeEvent('a', '2026-03-02T09:00:00.000Z', '2026-03-02T10:00:00.000Z'),
		makeEvent('b', '2026-03-05T14:00:00.000Z', '2026-03-05T15:00:00.000Z'),
	])

	runParity(
		'multi-day event spanning the middle',
		'2026-03-02T00:00:00.000Z',
		7,
		[makeEvent('span', '2026-03-03T00:00:00.000Z', '2026-03-05T23:59:59.999Z')]
	)

	runParity('event starting before the grid', '2026-03-02T00:00:00.000Z', 7, [
		makeEvent('before', '2026-02-25T00:00:00.000Z', '2026-03-03T12:00:00.000Z'),
	])

	runParity('event ending after the grid', '2026-03-02T00:00:00.000Z', 7, [
		makeEvent('after', '2026-03-06T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
	])

	runParity('event spanning the whole grid', '2026-03-02T00:00:00.000Z', 7, [
		makeEvent('all', '2026-01-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z'),
	])

	runParity('events entirely outside the grid', '2026-03-02T00:00:00.000Z', 7, [
		makeEvent('past', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
		makeEvent('future', '2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z'),
	])

	runParity('event crossing midnight', '2026-03-02T00:00:00.000Z', 7, [
		makeEvent('night', '2026-03-03T23:00:00.000Z', '2026-03-04T01:00:00.000Z'),
	])

	runParity('zero-duration events', '2026-03-02T00:00:00.000Z', 7, [
		makeEvent(
			'zero-in',
			'2026-03-04T12:00:00.000Z',
			'2026-03-04T12:00:00.000Z'
		),
		makeEvent(
			'zero-out',
			'2026-04-04T12:00:00.000Z',
			'2026-04-04T12:00:00.000Z'
		),
	])

	runParity('events exactly on day boundaries', '2026-03-02T00:00:00.000Z', 7, [
		makeEvent(
			'at-start',
			'2026-03-04T00:00:00.000Z',
			'2026-03-04T00:00:00.000Z'
		),
		makeEvent('at-end', '2026-03-04T23:59:59.999Z', '2026-03-04T23:59:59.999Z'),
	])

	// End precedes start. The original predicate matches the start day and the
	// end day independently; bucketing must not silently drop it.
	runParity(
		'malformed event, both endpoints inside',
		'2026-03-02T00:00:00.000Z',
		7,
		[makeEvent('bad', '2026-03-06T12:00:00.000Z', '2026-03-03T12:00:00.000Z')]
	)

	runParity(
		'malformed event, end outside the grid',
		'2026-03-02T00:00:00.000Z',
		7,
		[makeEvent('bad2', '2026-03-06T12:00:00.000Z', '2026-01-03T12:00:00.000Z')]
	)

	it('preserves input order within a day', () => {
		const days = dayGrid('2026-03-02T00:00:00.000Z', 3)
		const events = [
			makeEvent(
				'third',
				'2026-03-02T15:00:00.000Z',
				'2026-03-02T16:00:00.000Z'
			),
			makeEvent(
				'first',
				'2026-03-02T08:00:00.000Z',
				'2026-03-02T09:00:00.000Z'
			),
			makeEvent(
				'second',
				'2026-03-02T11:00:00.000Z',
				'2026-03-02T12:00:00.000Z'
			),
		]
		const buckets = bucketEventsByDay(events, buildDayIndex(days))
		expect(ids(buckets).at(0)).toEqual(['third', 'first', 'second'])
	})

	it('returns one empty bucket per day for no events', () => {
		const buckets = bucketEventsByDay(
			[],
			buildDayIndex(dayGrid('2026-03-02T00:00:00.000Z', 4))
		)
		expect(buckets).toHaveLength(4)
		expect(buckets.every((bucket) => bucket.length === 0)).toBe(true)
	})
})

/**
 * The case that broke the first prototype, which derived day indices from a
 * fixed 86_400_000ms stride. With a default timezone set, local days around a
 * DST transition are 23 or 25 hours long, so fixed-stride division misassigns
 * events. These run with a real zone configured, unlike the rest of the suite.
 */
describe('bucketEventsByDay across DST transitions', () => {
	const dstCases: [string, string, string][] = [
		// Northern hemisphere: spring forward (23h day) and fall back (25h day).
		['America/Los_Angeles spring forward', 'America/Los_Angeles', '2026-03-06'],
		['America/Los_Angeles fall back', 'America/Los_Angeles', '2026-10-30'],
		['Europe/Berlin spring forward', 'Europe/Berlin', '2026-03-27'],
		// Southern hemisphere: transitions run the opposite way.
		['Australia/Sydney fall back', 'Australia/Sydney', '2026-04-03'],
		['Australia/Sydney spring forward', 'Australia/Sydney', '2026-10-02'],
		// Half-hour offset zone, probing the 15-minute bucket assumption.
		['Australia/Adelaide spring forward', 'Australia/Adelaide', '2026-10-02'],
	]

	it.each(
		dstCases
	)('%s', (_label: string, zone: string, gridStartDate: string) => {
		dayjs.tz.setDefault(zone)
		const days = dayGrid(`${gridStartDate}T00:00:00.000Z`, 7)
		const index = buildDayIndex(days)

		// Events at hours that straddle a 2am-style transition, on every day.
		const events: TestEvent[] = []
		for (let day = 0; day < 7; day++) {
			for (const hour of [0, 1, 2, 3, 12, 23]) {
				const start = days[day].startOf('day').add(hour, 'hour')
				events.push({
					id: `d${day}h${hour}`,
					start,
					end: start.add(90, 'minute'),
				})
			}
		}
		// Plus a multi-day event spanning the transition itself.
		events.push({
			id: 'spanning',
			start: days[0].startOf('day'),
			end: days[4].endOf('day'),
		})

		expect(ids(bucketEventsByDay(events, index))).toEqual(
			ids(referenceBuckets(events, days))
		)
	})

	it('assigns every event to at least one day when inside the grid', () => {
		dayjs.tz.setDefault('America/Los_Angeles')
		const days = dayGrid('2026-03-06T00:00:00.000Z', 5)
		const index = buildDayIndex(days)
		const events = days.map((day, i) => ({
			id: `day-${i}`,
			start: day.startOf('day').add(2, 'hour'),
			end: day.startOf('day').add(3, 'hour'),
		}))
		const buckets = bucketEventsByDay(events, index)
		const placed = buckets.flat().map((event) => event.id)
		for (const event of events) {
			expect(placed).toContain(event.id)
		}
	})
})
