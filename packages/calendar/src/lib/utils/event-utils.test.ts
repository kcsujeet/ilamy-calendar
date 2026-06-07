import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { eventOverlapsRange, filterEventsByResource } from './event-utils'

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

describe('filterEventsByResource', () => {
	it('keeps events whose id appears in the resource event list', () => {
		const events = [
			makeEvent('a', '2025-01-01T10:00:00.000Z', '2025-01-01T11:00:00.000Z'),
			makeEvent('b', '2025-01-01T10:00:00.000Z', '2025-01-01T11:00:00.000Z'),
			makeEvent('c', '2025-01-01T10:00:00.000Z', '2025-01-01T11:00:00.000Z'),
		]
		const resourceEvents = [events[0], events[2]]
		expect(filterEventsByResource(events, resourceEvents)).toEqual([
			events[0],
			events[2],
		])
	})

	it('compares ids as strings so numeric/string mismatches still match', () => {
		const events = [makeEvent(1, '2025-01-01', '2025-01-01')]
		const resourceEvents = [makeEvent('1', '2025-01-01', '2025-01-01')]
		expect(filterEventsByResource(events, resourceEvents)).toHaveLength(1)
	})

	it('returns an empty array when nothing matches', () => {
		const events = [makeEvent('a', '2025-01-01', '2025-01-01')]
		const resourceEvents = [makeEvent('z', '2025-01-01', '2025-01-01')]
		expect(filterEventsByResource(events, resourceEvents)).toEqual([])
	})
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
})
