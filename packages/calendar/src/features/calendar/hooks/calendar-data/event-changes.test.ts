import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { toMutationResult, toRowChange } from './event-changes'

const mkEvent = (id: string): CalendarEvent => ({
	id,
	title: id,
	start: dayjs('2025-01-15T10:00:00.000Z'),
	end: dayjs('2025-01-15T11:00:00.000Z'),
})

/** The ids in each list of a change or result. */
const getIds = (lists: {
	added: CalendarEvent[]
	updated: CalendarEvent[]
	deleted: CalendarEvent[]
}) => ({
	added: lists.added.map((e) => e.id),
	updated: lists.updated.map((e) => e.id),
	deleted: lists.deleted.map((e) => e.id),
})

describe('toRowChange', () => {
	it('puts the row in the list its action names', () => {
		const row = mkEvent('a')
		const actions = ['add', 'update', 'delete'] as const
		const changes = actions.map((action) =>
			getIds(toRowChange({ action, event: row }, row))
		)
		expect(changes).toEqual([
			{ added: ['a'], updated: [], deleted: [] },
			{ added: [], updated: ['a'], deleted: [] },
			{ added: [], updated: [], deleted: ['a'] },
		])
	})
})

describe('toMutationResult', () => {
	it('passes a structured plugin result through unchanged', () => {
		const result = {
			events: [mkEvent('a')],
			added: [mkEvent('b')],
			updated: [],
			deleted: [mkEvent('c')],
		}
		const origin = { action: 'update', event: mkEvent('a') } as const
		expect(toMutationResult(result, origin, mkEvent('a'))).toBe(result)
	})

	it('reads a plain event list as one updated row for an edit', () => {
		const events = [mkEvent('a')]
		const origin = { action: 'update', event: mkEvent('a') } as const
		const result = toMutationResult(events, origin, mkEvent('a'))
		expect(result.events).toBe(events)
		expect(getIds(result)).toEqual({ added: [], updated: ['a'], deleted: [] })
	})

	it('reads a plain event list as one deleted row for a delete', () => {
		const origin = { action: 'delete', event: mkEvent('a') } as const
		const result = toMutationResult([], origin, mkEvent('a'))
		expect(getIds(result)).toEqual({ added: [], updated: [], deleted: ['a'] })
	})
})
