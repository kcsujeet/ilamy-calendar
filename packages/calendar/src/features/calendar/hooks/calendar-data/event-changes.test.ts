import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { CalendarEvent, EventsChange } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import {
	type MutationCallbacks,
	toEventDelta,
	toEventsChange,
	toMutationResult,
	toRowChange,
} from './event-changes'

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

const noRevertContext = {
	previousEvents: [],
	setCurrentEvents: () => undefined,
}

describe('toRowChange', () => {
	it('puts the row in the list its action names', () => {
		const row = mkEvent('a')
		const actions = ['add', 'update', 'delete'] as const
		const changes = actions.map((action) =>
			getIds(toRowChange({ action, event: row }, row, noRevertContext))
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

describe('toEventDelta', () => {
	// The calendar's zone is the configured default, as the provider sets it.
	// UTC here so the expected wall-clock times hold on any machine zone.
	beforeEach(() => {
		dayjs.tz.setDefault('UTC')
	})
	afterEach(() => {
		dayjs.tz.setDefault()
	})

	const deltaBetween = (before: string, after: string) =>
		toEventDelta(dayjs.tz(before, 'UTC'), dayjs.tz(after, 'UTC'))

	it('reports a move within the day as milliseconds only', () => {
		expect(
			deltaBetween('2025-03-12T09:00:00.000', '2025-03-12T10:30:00.000')
		).toEqual({ days: 0, milliseconds: 5_400_000 })
	})

	it('reports a move of whole days at the same time as days only', () => {
		expect(
			deltaBetween('2025-03-12T09:00:00.000', '2025-03-13T09:00:00.000')
		).toEqual({ days: 1, milliseconds: 0 })
	})

	it('reports an earlier day and time as negative parts', () => {
		expect(
			deltaBetween('2025-03-12T09:00:00.000', '2025-03-10T08:30:00.000')
		).toEqual({ days: -2, milliseconds: -1_800_000 })
	})

	it('splits a move across midnight into a day and a negative time', () => {
		expect(
			deltaBetween('2025-03-12T23:00:00.000', '2025-03-13T01:00:00.000')
		).toEqual({ days: 1, milliseconds: -79_200_000 })
	})

	it('reports no move as zero', () => {
		expect(
			deltaBetween('2025-03-12T09:00:00.000', '2025-03-12T09:00:00.000')
		).toEqual({ days: 0, milliseconds: 0 })
	})

	it('keeps the clock time across a daylight-saving change', () => {
		// New York springs forward on 2025-03-09: 10:00 local is a different UTC
		// instant the day after, but the same wall-clock time (FullCalendar's
		// diffDayAndTime compares wall-clock times).
		dayjs.tz.setDefault('America/New_York')
		const before = dayjs.tz('2025-03-08T10:00:00', 'America/New_York')
		const after = dayjs.tz('2025-03-09T10:00:00', 'America/New_York')
		expect(toEventDelta(before, after)).toEqual({ days: 1, milliseconds: 0 })
	})

	it('keeps the clock time across the autumn change', () => {
		dayjs.tz.setDefault('America/New_York')
		const before = dayjs.tz('2025-11-01T10:00:00', 'America/New_York')
		const after = dayjs.tz('2025-11-02T10:00:00', 'America/New_York')
		expect(toEventDelta(before, after)).toEqual({ days: 1, milliseconds: 0 })
	})
})

describe('toEventDelta for a start that carries a stale offset', () => {
	// The grid draws a cell for 02:00-02:59 on the spring-forward day, a wall
	// time that does not exist. A drop there stores 06:30Z (01:30 EST) but the
	// start keeps the EDT offset of the hour before, so reading its clock gives
	// 02:30. The e2e spec 'a drop in the skipped spring hour reports the
	// stored clock time' reaches it through the real drag; the object is built
	// here with `utcOffset` so the test does not depend on the machine's zone.
	afterEach(() => {
		dayjs.tz.setDefault()
	})

	const wednesdayNine = () =>
		dayjs.tz('2025-03-12T09:00:00', 'America/New_York')
	const sundayStaleStart = () =>
		dayjs.utc('2025-03-09T06:30:00.000Z').utcOffset(-240)

	it('reads the wall clock of the instant, 01:30 EST', () => {
		dayjs.tz.setDefault('America/New_York')
		const sevenAndAHalfHoursBack = -27_000_000
		expect(toEventDelta(wednesdayNine(), sundayStaleStart())).toEqual({
			days: -3,
			milliseconds: sevenAndAHalfHoursBack,
		})
	})

	it('reads a start that carries the right offset the same way', () => {
		dayjs.tz.setDefault('America/New_York')
		const start = dayjs.tz('2025-03-09T01:30:00', 'America/New_York')
		expect(toEventDelta(wednesdayNine(), start)).toEqual(
			toEventDelta(wednesdayNine(), sundayStaleStart())
		)
	})
})

describe('toEventsChange', () => {
	const rowA = mkEvent('a')
	const rowB = mkEvent('b')
	const rowC = mkEvent('c')
	const before = [rowA, rowB, rowC]

	/** A store holding `initial`, and what it holds after `reverts` calls of the change's `revert`. */
	const revertFrom = (
		initial: CalendarEvent[],
		rows: Pick<EventsChange, 'added' | 'updated' | 'deleted'>,
		reverts = 1
	) => {
		let store = initial
		const setCurrentEvents: MutationCallbacks['setCurrentEvents'] = (next) => {
			store = typeof next === 'function' ? next(store) : next
		}
		const change = toEventsChange(
			{ action: 'update', event: rowA, ...rows },
			{ previousEvents: before, setCurrentEvents }
		)
		for (let call = 0; call < reverts; call += 1) {
			change.revert()
		}
		return store
	}

	it('removes the rows the action added', () => {
		const added = mkEvent('new')
		const reverted = revertFrom([...before, added], {
			added: [added],
			updated: [],
			deleted: [],
		})
		expect(reverted).toEqual(before)
	})

	it('restores the previous version of the rows the action updated', () => {
		const renamedB = { ...rowB, title: 'Renamed' }
		const reverted = revertFrom([rowA, renamedB, rowC], {
			added: [],
			updated: [renamedB],
			deleted: [],
		})
		expect(reverted.at(1)).toBe(rowB)
		expect(reverted).toHaveLength(3)
	})

	it('puts back the rows the action deleted, in their old places', () => {
		const reverted = revertFrom([rowB], {
			added: [],
			updated: [],
			deleted: [rowA, rowC],
		})
		expect(reverted.map((e) => e.id)).toEqual(['a', 'b', 'c'])
	})

	it('keeps rows another action added later', () => {
		const later = mkEvent('later')
		const added = mkEvent('new')
		const reverted = revertFrom([...before, added, later], {
			added: [added],
			updated: [],
			deleted: [],
		})
		expect(reverted.map((e) => e.id)).toEqual(['a', 'b', 'c', 'later'])
	})

	it('overwrites a later edit of a row the action updated', () => {
		const renamedB = { ...rowB, title: 'Renamed' }
		const editedLaterB = { ...rowB, title: 'Edited later' }
		const reverted = revertFrom([rowA, editedLaterB, rowC], {
			added: [],
			updated: [renamedB],
			deleted: [],
		})
		expect(reverted.at(1)).toBe(rowB)
	})

	it('does not put a deleted row back twice when reverted twice', () => {
		const reverted = revertFrom(
			[rowB, rowC],
			{ added: [], updated: [], deleted: [rowA] },
			2
		)
		expect(reverted.map((e) => e.id)).toEqual(['a', 'b', 'c'])
	})

	it('does nothing the second time, even for a row added since', () => {
		const added = mkEvent('new')
		let store = [...before, added]
		const setCurrentEvents: MutationCallbacks['setCurrentEvents'] = (next) => {
			store = typeof next === 'function' ? next(store) : next
		}
		const change = toEventsChange(
			{ action: 'add', event: added, added: [added], updated: [], deleted: [] },
			{ previousEvents: before, setCurrentEvents }
		)
		change.revert()
		store = [...store, added]
		change.revert()
		expect(store.map((e) => e.id)).toEqual(['a', 'b', 'c', 'new'])
	})
})
