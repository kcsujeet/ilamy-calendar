import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import {
	eventOverlapsRange,
	filterEventsForResource,
	getEventResourceIds,
} from './pipeline'

const makeEvent = (
	id: string | number,
	startISO: string,
	endISO: string
): CalendarEvent => ({
	id,
	title: `Event ${id}`,
	start: dayjs(startISO),
	end: dayjs(endISO),
})

describe('eventOverlapsRange', () => {
	const start = dayjs('2025-01-05T00:00:00.000Z')
	const end = dayjs('2025-01-05T23:59:59.999Z')

	it('returns true when the event starts within the range', () => {
		const event = makeEvent(
			'a',
			'2025-01-05T10:00:00.000Z',
			'2025-01-06T02:00:00.000Z'
		)
		expect(eventOverlapsRange(event, start, end)).toBe(true)
	})

	it('returns true when the event ends within the range', () => {
		const event = makeEvent(
			'b',
			'2025-01-04T22:00:00.000Z',
			'2025-01-05T01:00:00.000Z'
		)
		expect(eventOverlapsRange(event, start, end)).toBe(true)
	})

	it('returns true when the event fully spans the range', () => {
		const event = makeEvent(
			'c',
			'2025-01-04T10:00:00.000Z',
			'2025-01-06T10:00:00.000Z'
		)
		expect(eventOverlapsRange(event, start, end)).toBe(true)
	})

	it('returns false when the event is entirely before the range', () => {
		const event = makeEvent(
			'd',
			'2025-01-04T00:00:00.000Z',
			'2025-01-04T12:00:00.000Z'
		)
		expect(eventOverlapsRange(event, start, end)).toBe(false)
	})

	it('returns false when the event is entirely after the range', () => {
		const event = makeEvent(
			'e',
			'2025-01-06T12:00:00.000Z',
			'2025-01-06T15:00:00.000Z'
		)
		expect(eventOverlapsRange(event, start, end)).toBe(false)
	})

	// Boundary contract: the range is inclusive on BOTH ends — an event
	// touching either boundary instant counts as overlapping.
	it('returns true when the event ends exactly at the range start', () => {
		const event = makeEvent(
			'f',
			'2025-01-04T22:00:00.000Z',
			'2025-01-05T00:00:00.000Z'
		)
		expect(eventOverlapsRange(event, start, end)).toBe(true)
	})

	it('returns true when the event starts exactly at the range end', () => {
		const event = makeEvent(
			'g',
			'2025-01-05T23:59:59.999Z',
			'2025-01-06T02:00:00.000Z'
		)
		expect(eventOverlapsRange(event, start, end)).toBe(true)
	})
})

describe('getEventResourceIds', () => {
	it('returns resourceIds when present, ignoring resourceId', () => {
		const event = {
			...makeEvent('a', '2025-01-01T10:00:00.000Z', '2025-01-01T11:00:00.000Z'),
			resourceId: 'ignored',
			resourceIds: ['r1', 'r2'],
		}
		expect(getEventResourceIds(event)).toEqual(['r1', 'r2'])
	})

	it('falls back to resourceId when resourceIds is absent', () => {
		const event = {
			...makeEvent('a', '2025-01-01T10:00:00.000Z', '2025-01-01T11:00:00.000Z'),
			resourceId: 'r1',
		}
		expect(getEventResourceIds(event)).toEqual(['r1'])
	})

	it('returns an empty membership for unassigned events', () => {
		const event = makeEvent(
			'a',
			'2025-01-01T10:00:00.000Z',
			'2025-01-01T11:00:00.000Z'
		)
		expect(getEventResourceIds(event)).toEqual([])
	})

	it('treats an empty resourceIds array as empty membership, still ignoring resourceId', () => {
		// Pins the "resourceIds wins when present" rule for the [] edge: the
		// event belongs to NO resource, even though resourceId is set.
		const event = {
			...makeEvent('a', '2025-01-01T10:00:00.000Z', '2025-01-01T11:00:00.000Z'),
			resourceId: 'ignored',
			resourceIds: [],
		}
		expect(getEventResourceIds(event)).toEqual([])
	})
})

describe('filterEventsForResource', () => {
	it('keeps events whose membership set contains the resource', () => {
		const base = makeEvent(
			'x',
			'2025-01-01T10:00:00.000Z',
			'2025-01-01T11:00:00.000Z'
		)
		const events = [
			{ ...base, id: 'e1', resourceId: 'r1' },
			{ ...base, id: 'e2', resourceIds: ['r1', 'r2'] },
			{ ...base, id: 'e3' },
		]
		const matched = filterEventsForResource(events, 'r1')
		expect(matched.map((e) => e.id)).toEqual(['e1', 'e2'])
	})
})

/**
 * Differential parity guard for the numeric rewrite of `eventOverlapsRange`.
 *
 * `referenceOverlapsRange` is the original implementation verbatim, comparing
 * `Dayjs` instances. The production version now compares cached epoch
 * milliseconds. Both must agree on every case, including the awkward ones:
 * inclusive boundaries, zero-duration events, events spanning the range, and
 * malformed events whose end precedes their start (where the three-clause shape
 * differs from a naive two-comparison overlap test).
 */
const referenceOverlapsRange = (
	event: CalendarEvent,
	start: Dayjs,
	end: Dayjs
): boolean => {
	const startsInRange =
		event.start.isSameOrAfter(start) && event.start.isSameOrBefore(end)
	const endsInRange =
		event.end.isSameOrAfter(start) && event.end.isSameOrBefore(end)
	const spansRange = event.start.isBefore(start) && event.end.isAfter(end)
	return startsInRange || endsInRange || spansRange
}

describe('eventOverlapsRange parity with the Dayjs implementation', () => {
	const rangeStart = dayjs('2025-01-05T00:00:00.000Z')
	const rangeEnd = dayjs('2025-01-05T23:59:59.999Z')

	const cases: [string, string, string][] = [
		['starts inside', '2025-01-05T10:00:00.000Z', '2025-01-06T02:00:00.000Z'],
		['ends inside', '2025-01-04T10:00:00.000Z', '2025-01-05T02:00:00.000Z'],
		['fully inside', '2025-01-05T09:00:00.000Z', '2025-01-05T17:00:00.000Z'],
		['spans the range', '2025-01-01T00:00:00.000Z', '2025-01-31T00:00:00.000Z'],
		['entirely before', '2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z'],
		['entirely after', '2025-02-01T00:00:00.000Z', '2025-02-02T00:00:00.000Z'],
		[
			'ends exactly at range start',
			'2025-01-04T12:00:00.000Z',
			'2025-01-05T00:00:00.000Z',
		],
		[
			'starts exactly at range end',
			'2025-01-05T23:59:59.999Z',
			'2025-01-06T12:00:00.000Z',
		],
		[
			'identical to the range',
			'2025-01-05T00:00:00.000Z',
			'2025-01-05T23:59:59.999Z',
		],
		[
			'one ms before range start',
			'2025-01-04T12:00:00.000Z',
			'2025-01-04T23:59:59.999Z',
		],
		[
			'one ms after range end',
			'2025-01-06T00:00:00.000Z',
			'2025-01-06T12:00:00.000Z',
		],
		[
			'zero duration inside',
			'2025-01-05T12:00:00.000Z',
			'2025-01-05T12:00:00.000Z',
		],
		[
			'zero duration outside',
			'2025-01-07T12:00:00.000Z',
			'2025-01-07T12:00:00.000Z',
		],
		[
			'zero duration at range start',
			'2025-01-05T00:00:00.000Z',
			'2025-01-05T00:00:00.000Z',
		],
		[
			'all-day spanning a week',
			'2025-01-01T00:00:00.000Z',
			'2025-01-08T23:59:59.999Z',
		],
		// Malformed: end precedes start. Behaviour must still match exactly.
		[
			'malformed, start inside',
			'2025-01-05T12:00:00.000Z',
			'2025-01-01T00:00:00.000Z',
		],
		[
			'malformed, both outside',
			'2025-02-01T00:00:00.000Z',
			'2025-01-01T00:00:00.000Z',
		],
	]

	it.each(cases)('%s', (label, startISO, endISO) => {
		const event = makeEvent(label, startISO, endISO)
		expect(eventOverlapsRange(event, rangeStart, rangeEnd)).toBe(
			referenceOverlapsRange(event, rangeStart, rangeEnd)
		)
	})

	it('agrees across a sliding one-day window over a month', () => {
		const events = cases.map(([label, startISO, endISO]) =>
			makeEvent(label, startISO, endISO)
		)
		for (let dayOffset = 0; dayOffset < 31; dayOffset++) {
			const windowStart = dayjs('2025-01-01T00:00:00.000Z').add(
				dayOffset,
				'day'
			)
			const windowEnd = windowStart.add(1, 'day').subtract(1, 'millisecond')
			for (const event of events) {
				expect(eventOverlapsRange(event, windowStart, windowEnd)).toBe(
					referenceOverlapsRange(event, windowStart, windowEnd)
				)
			}
		}
	})

	it('agrees for recurrence-style spread copies that changed start/end', () => {
		const parent = makeEvent(
			'series',
			'2025-01-05T09:00:00.000Z',
			'2025-01-05T10:00:00.000Z'
		)
		// Prime the identity cache for the parent, as a render pass would.
		expect(eventOverlapsRange(parent, rangeStart, rangeEnd)).toBe(true)

		const instance: CalendarEvent = {
			...parent,
			start: dayjs('2025-02-05T09:00:00.000Z'),
			end: dayjs('2025-02-05T10:00:00.000Z'),
		}
		expect(eventOverlapsRange(instance, rangeStart, rangeEnd)).toBe(
			referenceOverlapsRange(instance, rangeStart, rangeEnd)
		)
		expect(eventOverlapsRange(instance, rangeStart, rangeEnd)).toBe(false)
	})
})
