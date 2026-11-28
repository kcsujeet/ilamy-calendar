import { describe, expect, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import { RRule } from 'rrule'
import { parseDate, toEpochMs } from '../../../utils/temporal'
import { recurrencePlugin } from './recurrence-plugin'

const sameInstant = (a: string, b: string): boolean => {
	const pa = parseDate(a, 'UTC')
	const pb = parseDate(b, 'UTC')
	return Boolean(pa && pb && toEpochMs(pa) === toEpochMs(pb))
}

const base: CalendarEvent = {
	id: 'daily-1',
	uid: 'daily-1@ilamy.calendar',
	title: 'Daily',
	start: '2025-01-06T09:00:00.000Z',
	end: '2025-01-06T10:00:00.000Z',
	rrule: {
		freq: RRule.DAILY,
		interval: 1,
		dtstart: new Date('2025-01-06T09:00:00.000Z'),
	},
}

const range = {
	start: '2025-01-06T00:00:00.000Z',
	end: '2025-01-08T23:59:59.999Z',
	timezone: 'UTC',
}

describe('recurrencePlugin', () => {
	test('managesEvent matches the previous isRecurringEvent gate', () => {
		const plugin = recurrencePlugin()
		expect(plugin.managesEvent?.(base)).toBe(true)
		expect(
			plugin.managesEvent?.({
				...base,
				rrule: undefined,
				recurrenceId: '2025-01-08T09:00:00.000Z',
				uid: undefined,
			})
		).toBe(true)
		const plain: CalendarEvent = {
			id: 'plain',
			title: 'Plain',
			start: base.start,
			end: base.end,
		}
		expect(plugin.managesEvent?.(plain)).toBe(false)
	})

	test('transformEvents expands an rrule event into its occurrences', () => {
		const plugin = recurrencePlugin()
		const occurrences = plugin.transformEvents?.([base], range)
		expect(occurrences?.length).toBe(3)
	})

	test('transformEvents merges a detached override into its occurrence', () => {
		const plugin = recurrencePlugin()
		const override: CalendarEvent = {
			...base,
			id: 'daily-1_override',
			title: 'Moved',
			start: '2025-01-07T14:00:00.000Z',
			end: '2025-01-07T15:00:00.000Z',
			recurrenceId: '2025-01-07T09:00:00.000Z',
			rrule: undefined,
		}
		const occurrences = plugin.transformEvents?.([base, override], range)
		const moved = occurrences?.find((e) =>
			sameInstant(e.start, '2025-01-07T14:00:00.000Z')
		)
		expect(moved?.title).toBe('Moved')
	})

	test('transformEvents emits a moved override exactly once', () => {
		const plugin = recurrencePlugin()
		const occurrenceISO = '2025-01-07T09:00:00.000Z'
		const movedStart = '2025-01-07T14:00:00.000Z'
		const baseWithExdate: CalendarEvent = {
			...base,
			exdates: [occurrenceISO],
		}
		const override: CalendarEvent = {
			...base,
			id: 'daily-1_modified_1',
			title: 'Moved',
			start: movedStart,
			end: '2025-01-07T15:00:00.000Z',
			recurrenceId: occurrenceISO,
			rrule: undefined,
		}
		const occurrences = plugin.transformEvents?.(
			[baseWithExdate, override],
			range
		)
		const moved = occurrences?.filter((e) => sameInstant(e.start, movedStart))
		expect(moved).toHaveLength(1)
	})

	test('transformEvents fills a sparse override from its base', () => {
		const plugin = recurrencePlugin()
		const colouredBase: CalendarEvent = {
			...base,
			description: 'Series description',
			backgroundColor: '#123456',
		}
		const sparseOverride: CalendarEvent = {
			id: 'daily-1_sparse',
			uid: 'daily-1@ilamy.calendar',
			title: 'Moved',
			start: '2025-01-07T14:00:00.000Z',
			end: '2025-01-07T15:00:00.000Z',
			recurrenceId: '2025-01-07T09:00:00.000Z',
		}
		const occurrences = plugin.transformEvents?.(
			[colouredBase, sparseOverride],
			range
		)
		const moved = occurrences?.find((e) => e.id === 'daily-1_sparse')
		expect(moved?.description).toBe('Series description')
		expect(moved?.backgroundColor).toBe('#123456')
		expect(moved?.rrule).toBeUndefined()
	})

	test('transformEvents passes a non-rrule event through untouched', () => {
		const plugin = recurrencePlugin()
		const plain: CalendarEvent = { ...base, id: 'plain', rrule: undefined }
		expect(plugin.transformEvents?.([plain], range)).toEqual([plain])
	})

	test('contribute returns the RRULE line for a base event at the ical point', () => {
		const plugin = recurrencePlugin()
		const lines = plugin.contribute?.('ical:vevent-properties', base)
		expect(lines).toEqual(['RRULE:FREQ=DAILY;INTERVAL=1'])
	})

	test('contribute returns the EXDATE line for an event with exdates', () => {
		const plugin = recurrencePlugin()
		const withExdates: CalendarEvent = {
			...base,
			exdates: ['2025-01-07T09:00:00.000Z', '2025-01-08T09:00:00.000Z'],
		}
		const lines = plugin.contribute?.('ical:vevent-properties', withExdates)
		expect(lines).toEqual([
			'RRULE:FREQ=DAILY;INTERVAL=1',
			'EXDATE:20250107T090000Z,20250108T090000Z',
		])
	})

	test('contribute returns the RECURRENCE-ID line for a modified instance', () => {
		const plugin = recurrencePlugin()
		const modified: CalendarEvent = {
			...base,
			rrule: undefined,
			recurrenceId: '2025-01-07T09:00:00.000Z',
		}
		const lines = plugin.contribute?.('ical:vevent-properties', modified)
		expect(lines).toEqual(['RECURRENCE-ID:20250107T090000Z'])
	})

	test('contribute returns an empty array for an unrelated point', () => {
		const plugin = recurrencePlugin()
		expect(plugin.contribute?.('some:other-point', base)).toEqual([])
	})
})
