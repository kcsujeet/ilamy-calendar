import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import { RRule } from 'rrule'
import { generateRecurringEvents } from './generate-recurring-events'

const at = (iso: string) => dayjs(iso)

const series = (
	id: string,
	startISO: string,
	endISO: string,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id,
	title: id,
	start: at(startISO),
	end: at(endISO),
	// generateRecurringEvents overrides dtstart with the event's own start.
	rrule: { freq: RRule.DAILY, dtstart: at(startISO).toDate() },
	...extra,
})

const expand = (
	event: CalendarEvent,
	startISO: string,
	endISO: string,
	currentEvents: CalendarEvent[] = [event]
) =>
	generateRecurringEvents({
		event,
		currentEvents,
		startDate: at(startISO),
		endDate: at(endISO),
	}).map((instance) => `${instance.id}@${instance.start.toISOString()}`)

const WEEK = ['2025-03-10T00:00:00.000Z', '2025-03-16T23:59:59.999Z'] as const
const WEDNESDAY = [
	'2025-03-12T00:00:00.000Z',
	'2025-03-12T23:59:59.999Z',
] as const

// An instance id is `${baseId}_${index}`, where index counts the rrule
// occurrences the QUERIED range turned up (after the backward duration
// widening), before EXDATE and override filtering. The same occurrence
// therefore carries a different id under a different range. These pin that
// contract so a performance change cannot quietly renumber instances.
describe('generateRecurringEvents instance ids', () => {
	const originalTz = dayjs.tz.guess()

	beforeEach(() => {
		dayjs.tz.setDefault('UTC')
	})

	afterEach(() => {
		dayjs.tz.setDefault(originalTz)
	})

	it('numbers occurrences from the start of the queried range', () => {
		const daily = series(
			'daily',
			'2025-03-01T09:00:00.000Z',
			'2025-03-01T10:00:00.000Z'
		)

		expect(expand(daily, ...WEEK).at(2)).toBe(
			'daily_2@2025-03-12T09:00:00.000Z'
		)
		expect(expand(daily, ...WEDNESDAY)).toEqual([
			'daily_0@2025-03-12T09:00:00.000Z',
		])
	})

	it('counts from the range, not from a distant DTSTART', () => {
		const old = series(
			'old',
			'2015-03-01T09:00:00.000Z',
			'2015-03-01T10:00:00.000Z'
		)

		expect(expand(old, ...WEDNESDAY)).toEqual([
			'old_0@2025-03-12T09:00:00.000Z',
		])
	})

	it('counts the occurrence the backward duration widening pulls in', () => {
		const overnight = series(
			'night',
			'2025-03-01T22:00:00.000Z',
			'2025-03-02T03:00:00.000Z'
		)

		expect(expand(overnight, ...WEDNESDAY)).toEqual([
			'night_0@2025-03-11T22:00:00.000Z',
			'night_1@2025-03-12T22:00:00.000Z',
		])
	})

	it('keeps the index of an EXDATE-excluded occurrence', () => {
		const daily = series(
			'ex',
			'2025-03-10T09:00:00.000Z',
			'2025-03-10T10:00:00.000Z',
			{
				exdates: ['2025-03-11T09:00:00.000Z'],
			}
		)

		expect(
			expand(daily, '2025-03-10T00:00:00.000Z', '2025-03-12T23:59:59.999Z')
		).toEqual([
			'ex_0@2025-03-10T09:00:00.000Z',
			'ex_2@2025-03-12T09:00:00.000Z',
		])
	})

	it('keeps the index of an overridden occurrence', () => {
		const daily = series(
			'ov',
			'2025-03-10T09:00:00.000Z',
			'2025-03-10T10:00:00.000Z'
		)
		const override: CalendarEvent = {
			id: 'ov-moved',
			title: 'moved',
			uid: 'ov@ilamy.calendar',
			recurrenceId: '2025-03-10T09:00:00.000Z',
			start: at('2025-03-10T15:00:00.000Z'),
			end: at('2025-03-10T16:00:00.000Z'),
		}

		expect(
			expand(daily, '2025-03-10T00:00:00.000Z', '2025-03-11T23:59:59.999Z', [
				daily,
				override,
			])
		).toEqual(['ov_1@2025-03-11T09:00:00.000Z'])
	})

	it('includes an occurrence that starts exactly at the range start', () => {
		const instant = series(
			'edge',
			'2025-03-01T00:00:00.000Z',
			'2025-03-01T00:00:00.000Z'
		)

		expect(expand(instant, ...WEDNESDAY)).toEqual([
			'edge_0@2025-03-12T00:00:00.000Z',
		])
	})

	it('answers a range the same after the series answered a wider one', () => {
		const reused = series(
			'reused',
			'2015-03-01T22:00:00.000Z',
			'2015-03-02T03:00:00.000Z'
		)
		const fresh = series(
			'reused',
			'2015-03-01T22:00:00.000Z',
			'2015-03-02T03:00:00.000Z'
		)

		expand(reused, ...WEEK)
		expect(expand(reused, ...WEDNESDAY)).toEqual(expand(fresh, ...WEDNESDAY))
	})

	// The series memo is keyed on the event object. These change the rule or
	// the start on that same object between queries: the second answer must
	// come from the new rule, never from the one the memo worked out before.
	it('answers from the new rule when the same event gets a new rrule', () => {
		const event = series(
			'rule',
			'2025-03-01T09:00:00.000Z',
			'2025-03-01T10:00:00.000Z'
		)
		expand(event, ...WEEK)

		event.rrule = {
			freq: RRule.WEEKLY,
			byweekday: [RRule.WE],
			dtstart: at('2025-03-01T09:00:00.000Z').toDate(),
		}

		expect(expand(event, ...WEEK)).toEqual(['rule_0@2025-03-12T09:00:00.000Z'])
	})

	it('answers from the new start when the same event moves', () => {
		const event = series(
			'moved',
			'2025-03-01T09:00:00.000Z',
			'2025-03-01T10:00:00.000Z'
		)
		expand(event, ...WEDNESDAY)

		event.start = at('2025-03-01T14:00:00.000Z')
		event.end = at('2025-03-01T15:00:00.000Z')

		expect(expand(event, ...WEDNESDAY)).toEqual([
			'moved_0@2025-03-12T14:00:00.000Z',
		])
	})
})
