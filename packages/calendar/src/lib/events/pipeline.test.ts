import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
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
