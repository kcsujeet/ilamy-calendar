import { afterEach, describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { overlapsRange } from '@ilamy/utils/helpers'
import {
	bucketEventsByColumn,
	bucketEventsByResource,
	getColumnBounds,
	getDefaultZone,
	getResourceEvents,
	shareInDevBuild,
} from './event-buckets'
import { filterEventsForResource } from './event-pipeline'

const ZONES = ['UTC', 'America/New_York', 'America/Vancouver', 'Asia/Kolkata']

const mkEvent = (
	id: string,
	startISO: string,
	endISO: string,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id,
	title: id,
	start: dayjs(startISO),
	end: dayjs(endISO),
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
		const day = dayjs('2025-03-10T10:30:00Z')
		expect(getColumnBounds(day, 'hour', undefined)).toBe(
			getColumnBounds(day, 'hour', undefined)
		)
	})

	it('reads the span of the unit asked for', () => {
		const day = dayjs('2025-03-10T10:30:00Z').tz('UTC')
		const hour = getColumnBounds(day, 'hour', undefined)
		const wholeDay = getColumnBounds(day, 'day', undefined)
		expect([hour.startMs, hour.endMs]).toEqual([
			day.startOf('hour').valueOf(),
			day.endOf('hour').valueOf(),
		])
		expect([wholeDay.startMs, wholeDay.endMs]).toEqual([
			day.startOf('day').valueOf(),
			day.endOf('day').valueOf(),
		])
	})
})

describe('getColumnBounds and the default zone', () => {
	afterEach(() => {
		dayjs.tz.setDefault()
	})

	it('reads a plain instance again after the default zone changes', () => {
		const plainDay = dayjs('2025-03-10T10:30:00Z')
		const inMachineZone = getColumnBounds(plainDay, 'day', getDefaultZone())

		dayjs.tz.setDefault('Asia/Tokyo')
		const inTokyo = getColumnBounds(plainDay, 'day', getDefaultZone())

		expect(inTokyo.startMs).toBe(plainDay.startOf('day').valueOf())
		expect(inTokyo.endMs).toBe(plainDay.endOf('day').valueOf())
		expect(inTokyo.startMs).not.toBe(inMachineZone.startMs)
	})

	it('reports the default zone as set', () => {
		dayjs.tz.setDefault('Asia/Tokyo')
		expect(getDefaultZone()).toBe('Asia/Tokyo')
		dayjs.tz.setDefault()
		expect(getDefaultZone()).toBeUndefined()
	})
})

describe('bucketEventsByColumn', () => {
	// Reference: the per-column `startOf`/`endOf` + `overlapsRange` filter this
	// replaces. Both read the same wall-clock columns in each configured zone,
	// across the 9 March 2025 clock change in New York and Vancouver.
	const columnsFor = (zone: string, unit: 'day' | 'hour') => {
		const first = dayjs.tz('2025-03-08T00:00:00', zone)
		const count = unit === 'day' ? 5 : 72
		return Array.from({ length: count }, (_, i) => first.add(i, unit))
	}
	const eventsAt = (zone: string): CalendarEvent[] => {
		const midnight = dayjs.tz('2025-03-08T00:00:00', zone)
		const spans = [
			[0, 1],
			[30, 90],
			[59, 60],
			[60, 60],
			[95, 400],
			[-600, 30],
			[1700, 6000],
			[2, 2000],
		]
		return spans.map(([startMin, endMin], i) =>
			mkEvent(
				`e${i}`,
				midnight.add(startMin, 'minute').toISOString(),
				midnight.add(endMin, 'minute').toISOString()
			)
		)
	}

	for (const zone of ZONES) {
		for (const unit of ['day', 'hour'] as const) {
			it(`matches overlapsRange per column (${unit} columns, ${zone})`, () => {
				const columns = columnsFor(zone, unit)
				const events = eventsAt(zone)
				const bounds = columns.map((column) =>
					getColumnBounds(column, unit, undefined)
				)
				const expected = columns.map((column) => {
					const columnStart = column.startOf(unit)
					const columnEnd = column.endOf(unit)
					return events
						.filter((event) => overlapsRange(event, columnStart, columnEnd))
						.map((event) => event.id)
				})
				const actual = bucketEventsByColumn(bounds, events).map((column) =>
					column.map((event) => event.id)
				)
				expect(actual).toEqual(expected)
			})
		}
	}

	it('gives an empty column to a row with no events', () => {
		const bounds = columnsFor('UTC', 'day').map((column) =>
			getColumnBounds(column, 'day', undefined)
		)
		expect(bucketEventsByColumn(bounds, [])).toEqual([[], [], [], [], []])
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
