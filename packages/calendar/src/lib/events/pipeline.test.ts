import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { filterEventsForResource, getEventResourceIds } from './pipeline'

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
