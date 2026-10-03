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

	// Normalized events are memoized on the `events` prop alone, so a calendar
	// whose `timezone` prop changes keeps the same event objects. An event read
	// with no zone takes its offsets from the default zone, so an answer worked
	// out before the change must not be served after it.
	it('answers for the new zone after the default zone changes', () => {
		dayjs.tz.setDefault()
		const reused = series(
			'zoned',
			'2025-03-03T09:00:00.000Z',
			'2025-03-03T09:45:00.000Z'
		)
		const fresh = series(
			'zoned',
			'2025-03-03T09:00:00.000Z',
			'2025-03-03T09:45:00.000Z'
		)
		expand(reused, ...WEEK)

		dayjs.tz.setDefault('Asia/Kolkata')

		expect(expand(reused, ...WEEK)).toEqual(expand(fresh, ...WEEK))
	})
})
