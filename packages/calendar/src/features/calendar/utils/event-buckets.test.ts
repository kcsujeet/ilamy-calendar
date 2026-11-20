import { afterEach, describe, expect, it } from 'bun:test'
import { filterEventsForResource } from '@ilamy/core'
import type { CalendarEvent } from '@ilamy/types'
import {
	endOf,
	parseDate,
	startOf,
	toEpochMs,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import {
	bucketEventsByResource,
	getColumnBounds,
	getResourceEvents,
	shareInDevBuild,
} from './event-buckets'

const mustParse = (iso: string, zone = 'UTC'): ZonedDate => {
	const parsed = parseDate(iso, zone)
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const mkEvent = (
	id: string,
	start: string,
	end: string,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id,
	title: id,
	start,
	end,
	...extra,
})

describe('bucketEventsByResource', () => {
	const unassigned = mkEvent(
		'u',
		'2025-03-10T10:00:00Z',
		'2025-03-10T11:00:00Z'
	)
	const single = mkEvent('s', '2025-03-10T10:00:00Z', '2025-03-10T11:00:00Z', {
		resourceId: 'r1',
	})
	const zeroId = mkEvent('z', '2025-03-10T10:00:00Z', '2025-03-10T11:00:00Z', {
		resourceId: 0,
	})
	const shared = mkEvent('m', '2025-03-10T10:00:00Z', '2025-03-10T11:00:00Z', {
		resourceId: 'ignored',
		resourceIds: ['r1', 'r2', 'r2'],
	})
	const events = [unassigned, single, zeroId, shared]

	it('groups each event under every resource that lists it, in order', () => {
		const buckets = bucketEventsByResource(events)
		expect(buckets.get('r1')?.map((e) => e.id)).toEqual(['s', 'm'])
		expect(buckets.get('r2')?.map((e) => e.id)).toEqual(['m'])
	})

	it('keeps resource 0 as a real id and drops unassigned events', () => {
		const buckets = bucketEventsByResource(events)
		expect(buckets.get(0)?.map((e) => e.id)).toEqual(['z'])
		expect([...buckets.keys()]).toEqual(['r1', 0, 'r2'])
	})

	it('answers exactly what filterEventsForResource answers', () => {
		for (const resourceId of ['r1', 'r2', 0, 'nobody', undefined]) {
			expect(getResourceEvents(events, resourceId)).toEqual(
				filterEventsForResource(events, resourceId)
			)
		}
	})

	it('computes the grouping once per events array', () => {
		expect(bucketEventsByResource(events)).toBe(bucketEventsByResource(events))
	})
})

describe('getColumnBounds', () => {
	it('returns the same bounds object for the same column instance', () => {
		const day = mustParse('2025-03-10T10:30:00Z', 'UTC')
		expect(getColumnBounds(day, 'hour')).toBe(getColumnBounds(day, 'hour'))
	})

	it('reads the span of the unit asked for in the date timezone', () => {
		const day = mustParse('2025-03-10T10:30:00Z', 'UTC')
		const hour = getColumnBounds(day, 'hour')
		const wholeDay = getColumnBounds(day, 'day')
		expect([hour.startMs, hour.endMs]).toEqual([
			toEpochMs(startOf(day, 'hour')),
			toEpochMs(endOf(day, 'hour')),
		])
		expect([wholeDay.startMs, wholeDay.endMs]).toEqual([
			toEpochMs(startOf(day, 'day')),
			toEpochMs(endOf(day, 'day')),
		])
	})

	it('computes distinct day spans for the same instant in different zones', () => {
		const inUtc = mustParse('2025-03-10T10:30:00Z', 'UTC')
		const inTokyo = mustParse('2025-03-10T10:30:00Z', 'Asia/Tokyo')
		expect(getColumnBounds(inTokyo, 'day').startMs).not.toBe(
			getColumnBounds(inUtc, 'day').startMs
		)
	})
})

describe('shared lists in a development build', () => {
	const sample = mkEvent('a', '2025-03-10T10:00:00Z', '2025-03-10T11:00:00Z', {
		resourceId: 'r1',
	})

	afterEach(() => {
		process.env.NODE_ENV = 'test'
	})

	it('throws when a consumer pushes into a resource bucket', () => {
		const bucket = getResourceEvents([sample], 'r1')
		expect(() => bucket.push(sample)).toThrow()
	})

	it('throws when a consumer sorts a shared list in place', () => {
		const shared = shareInDevBuild([sample, sample])
		expect(() => shared.sort()).toThrow()
	})

	it('leaves the list the caller handed in unfrozen', () => {
		const owned = [sample]
		shareInDevBuild(owned)
		expect(Object.isFrozen(owned)).toBe(false)
	})

	it('returns the very same list in a production build', () => {
		process.env.NODE_ENV = 'production'
		const owned = [sample]
		expect(shareInDevBuild(owned)).toBe(owned)
	})
})
