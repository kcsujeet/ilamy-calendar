import { describe, expect, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import { RRule } from 'rrule'
import { recurrencePlugin } from './recurrence-plugin'

const base: CalendarEvent = {
	id: 'daily-1',
	uid: 'daily-1@ilamy.calendar',
	title: 'Daily',
	start: dayjs('2025-01-06T09:00:00.000Z'),
	end: dayjs('2025-01-06T10:00:00.000Z'),
	rrule: {
		freq: RRule.DAILY,
		interval: 1,
		dtstart: new Date('2025-01-06T09:00:00.000Z'),
	},
} as CalendarEvent

const range = {
	start: dayjs('2025-01-06T00:00:00.000Z'),
	end: dayjs('2025-01-08T23:59:59.999Z'),
}

describe('recurrencePlugin', () => {
	test('managesEvent matches the previous isRecurringEvent gate', () => {
		const plugin = recurrencePlugin()
		// An event is managed if it has an rrule (base), a recurrenceId (modified
		// instance), or a uid (generated instance). A plain event with none of
		// those is not managed.
		expect(plugin.managesEvent?.(base)).toBe(true)
		expect(
			plugin.managesEvent?.({
				...base,
				rrule: undefined,
				recurrenceId: '2025-01-08T09:00:00.000Z',
				uid: undefined,
			})
		).toBe(true)
		const plain = {
			id: 'plain',
			title: 'Plain',
			start: base.start,
			end: base.end,
		} as CalendarEvent
		expect(plugin.managesEvent?.(plain)).toBe(false)
	})

	test('transformEvents expands an rrule event into its occurrences', () => {
		const plugin = recurrencePlugin()
		const occurrences = plugin.transformEvents?.([base], range)
		expect(occurrences?.length).toBe(3)
	})

	test('transformEvents merges a detached override into its occurrence', () => {
		const plugin = recurrencePlugin()
		const override = {
			...base,
			id: 'daily-1_override',
			title: 'Moved',
			start: dayjs('2025-01-07T14:00:00.000Z'),
			end: dayjs('2025-01-07T15:00:00.000Z'),
			recurrenceId: '2025-01-07T09:00:00.000Z',
			rrule: undefined,
		} as CalendarEvent
		const occurrences = plugin.transformEvents?.([base, override], range)
		const moved = occurrences?.find((e) =>
			e.start.isSame(dayjs('2025-01-07T14:00:00.000Z'))
		)
		expect(moved?.title).toBe('Moved')
	})

	test('transformEvents passes a non-rrule event through untouched', () => {
		const plugin = recurrencePlugin()
		const plain = { ...base, id: 'plain', rrule: undefined } as CalendarEvent
		expect(plugin.transformEvents?.([plain], range)).toEqual([plain])
	})

	test('contribute returns the RRULE line for a base event at the ical point', () => {
		const plugin = recurrencePlugin()
		const lines = plugin.contribute?.('ical:vevent-properties', base)
		expect(lines).toEqual(['RRULE:FREQ=DAILY;INTERVAL=1'])
	})

	test('contribute returns the EXDATE line for an event with exdates', () => {
		const plugin = recurrencePlugin()
		const withExdates = {
			...base,
			exdates: ['2025-01-07T09:00:00.000Z', '2025-01-08T09:00:00.000Z'],
		} as CalendarEvent
		const lines = plugin.contribute?.('ical:vevent-properties', withExdates)
		expect(lines).toEqual([
			'RRULE:FREQ=DAILY;INTERVAL=1',
			'EXDATE:20250107T090000Z,20250108T090000Z',
		])
	})

	test('contribute returns the RECURRENCE-ID line for a modified instance', () => {
		const plugin = recurrencePlugin()
		const modified = {
			...base,
			rrule: undefined,
			recurrenceId: '2025-01-07T09:00:00.000Z',
		} as CalendarEvent
		const lines = plugin.contribute?.('ical:vevent-properties', modified)
		expect(lines).toEqual(['RECURRENCE-ID:20250107T090000Z'])
	})

	test('contribute returns an empty array for an unrelated point', () => {
		const plugin = recurrencePlugin()
		expect(plugin.contribute?.('some:other-point', base)).toEqual([])
	})
})
