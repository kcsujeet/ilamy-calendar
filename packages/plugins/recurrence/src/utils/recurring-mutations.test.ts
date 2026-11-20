import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import {
	add,
	type DateUnit,
	parseDate,
	subtract,
	toDate,
	toEpochMs,
	toOffsetIso,
	toUtcIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { RRule, type Weekday } from 'rrule'
import { recurrencePlugin } from '../recurrence-plugin'
import type { RRuleOptions } from '../types'
import { deleteRecurringEvent } from './delete-recurring-event'
import { updateRecurringEvent } from './update-recurring-event'

const mustParse = (iso: string, zone = 'UTC'): ZonedDate => {
	const parsed = parseDate(iso, zone)
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const shiftUtc = (iso: string, amount: number, unit: DateUnit): string =>
	toUtcIso(add(mustParse(iso, 'UTC'), amount, unit))

const utcIso = (iso: string | undefined): string | undefined =>
	iso ? toUtcIso(mustParse(iso, 'UTC')) : undefined

const sameInstant = (a: string, b: string): boolean =>
	toEpochMs(mustParse(a, 'UTC')) === toEpochMs(mustParse(b, 'UTC'))

const createBaseRecurringEvent = (
	overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id: 'event-1',
	title: 'Weekly Sync',
	start: '2025-01-06T10:00:00.000Z',
	end: '2025-01-06T11:00:00.000Z',
	rrule: {
		freq: RRule.WEEKLY,
		interval: 1,
		dtstart: new Date('2025-01-06T10:00:00.000Z'),
	},
	...overrides,
})

describe('recurring mutations', () => {
	describe('deleteRecurringEvent', () => {
		it('should delete entire series (scope: all) when uid is missing from base event', () => {
			const baseEvent = createBaseRecurringEvent({ id: 'series-1' })
			const targetInstance: CalendarEvent = {
				...baseEvent,
				id: 'series-1_1',
				start: shiftUtc(baseEvent.start, 1, 'week'),
				end: shiftUtc(baseEvent.end, 1, 'week'),
				uid: 'series-1@ilamy.calendar',
				rrule: undefined,
			}

			const result = deleteRecurringEvent({
				targetEvent: targetInstance,
				currentEvents: [baseEvent],
				scope: 'all',
				timezone: 'UTC',
			}).events

			expect(result).toHaveLength(0)
		})

		it('should delete entire series (scope: all) when uid is explicitly set', () => {
			const baseEvent = createBaseRecurringEvent({
				id: 'series-2',
				uid: 'custom-uid',
			})
			const targetInstance: CalendarEvent = {
				...baseEvent,
				id: 'series-2_1',
				start: shiftUtc(baseEvent.start, 1, 'week'),
				end: shiftUtc(baseEvent.end, 1, 'week'),
				uid: 'custom-uid',
				rrule: undefined,
			}

			const result = deleteRecurringEvent({
				targetEvent: targetInstance,
				currentEvents: [baseEvent],
				scope: 'all',
				timezone: 'UTC',
			}).events

			expect(result).toHaveLength(0)
		})

		it('should only delete this instance (scope: this) and update exdates', () => {
			const baseEvent = createBaseRecurringEvent({ id: 'series-3' })
			const targetInstance: CalendarEvent = {
				...baseEvent,
				id: 'series-3_1',
				start: shiftUtc(baseEvent.start, 1, 'week'),
				end: shiftUtc(baseEvent.end, 1, 'week'),
				uid: 'series-3@ilamy.calendar',
				rrule: undefined,
			}

			const result = deleteRecurringEvent({
				targetEvent: targetInstance,
				currentEvents: [baseEvent],
				scope: 'this',
				timezone: 'UTC',
			}).events

			expect(result).toHaveLength(1)
			expect(result[0].exdates).toContain(targetInstance.start)
		})

		it('should report base + overrides in deleted for scope all', () => {
			const baseEvent = createBaseRecurringEvent({
				id: 'series-del-all',
				uid: 'series-del-all@ilamy.calendar',
			})
			const override: CalendarEvent = {
				...baseEvent,
				id: 'series-del-all_override',
				recurrenceId: '2025-01-13T10:00:00.000Z',
				rrule: undefined,
			}

			const { deleted, updated, added, events } = deleteRecurringEvent({
				targetEvent: baseEvent,
				currentEvents: [baseEvent, override],
				scope: 'all',
				timezone: 'UTC',
			})

			expect(events).toHaveLength(0)
			expect(updated).toHaveLength(0)
			expect(added).toHaveLength(0)
			expect(deleted.map((e) => e.id)).toEqual([
				'series-del-all',
				'series-del-all_override',
			])
		})

		it('should report only the override in deleted for scope this when an override exists', () => {
			const baseEvent = createBaseRecurringEvent({
				id: 'series-del-this',
				uid: 'series-del-this@ilamy.calendar',
			})
			const occurrenceISO = '2025-01-13T10:00:00.000Z'
			const override: CalendarEvent = {
				...baseEvent,
				id: 'series-del-this_override',
				recurrenceId: occurrenceISO,
				rrule: undefined,
				start: occurrenceISO,
				end: '2025-01-13T11:00:00.000Z',
			}

			const { deleted, updated, added, events } = deleteRecurringEvent({
				targetEvent: override,
				currentEvents: [baseEvent, override],
				scope: 'this',
				timezone: 'UTC',
			})

			expect(added).toHaveLength(0)
			expect(updated).toHaveLength(0)
			expect(deleted).toHaveLength(1)
			expect(deleted[0].id).toBe('series-del-this_override')
			expect(events).toHaveLength(1)
			expect(events[0].exdates).toContain(occurrenceISO)
		})

		it('should report empty deleted and base in updated for scope this on a generated instance', () => {
			const baseEvent = createBaseRecurringEvent({
				id: 'series-del-gen',
				uid: 'series-del-gen@ilamy.calendar',
			})
			const generatedInstance: CalendarEvent = {
				...baseEvent,
				id: 'series-del-gen_1',
				start: shiftUtc(baseEvent.start, 1, 'week'),
				end: shiftUtc(baseEvent.end, 1, 'week'),
				rrule: undefined,
			}

			const { deleted, updated } = deleteRecurringEvent({
				targetEvent: generatedInstance,
				currentEvents: [baseEvent],
				scope: 'this',
				timezone: 'UTC',
			})

			expect(deleted).toHaveLength(0)
			expect(updated).toHaveLength(1)
			expect(updated[0].id).toBe('series-del-gen')
			expect(updated[0].exdates).toContain(generatedInstance.start)
		})
	})

	describe('updateRecurringEvent', () => {
		it('should update entire series (scope: all) when uid is missing', () => {
			const baseEvent = createBaseRecurringEvent({ id: 'series-4' })
			const targetInstance: CalendarEvent = {
				...baseEvent,
				id: 'series-4_1',
				start: shiftUtc(baseEvent.start, 1, 'week'),
				end: shiftUtc(baseEvent.end, 1, 'week'),
				uid: 'series-4@ilamy.calendar',
				rrule: undefined,
			}

			const result = updateRecurringEvent({
				targetEvent: targetInstance,
				updates: { title: 'New Title' },
				currentEvents: [baseEvent],
				scope: 'all',
				timezone: 'UTC',
			}).events

			expect(result).toHaveLength(1)
			expect(result[0].title).toBe('New Title')
		})

		it('should report dropped detached overrides in deleted for scope all', () => {
			const baseEvent = createBaseRecurringEvent({
				id: 'series-edit-all',
				uid: 'series-edit-all@ilamy.calendar',
			})
			const detachedOverride: CalendarEvent = {
				...baseEvent,
				id: 'series-edit-all_override',
				recurrenceId: '2025-01-13T10:00:00.000Z',
				rrule: undefined,
			}

			const { deleted, updated, events } = updateRecurringEvent({
				targetEvent: baseEvent,
				updates: { title: 'Reset Title' },
				currentEvents: [baseEvent, detachedOverride],
				scope: 'all',
				timezone: 'UTC',
			})

			expect(deleted).toHaveLength(1)
			expect(deleted[0].id).toBe('series-edit-all_override')
			expect(updated).toHaveLength(1)
			expect(updated[0].id).toBe('series-edit-all')
			expect(events.some((e) => e.id === 'series-edit-all_override')).toBe(
				false
			)
		})

		describe('across a clock-change day', () => {
			const editAll = (
				seriesStartISO: string,
				occurrenceStartISO: string,
				editedStartISO: string
			) => {
				const zone = 'America/New_York'
				const seriesStart = mustParse(seriesStartISO, zone)
				const baseEvent = createBaseRecurringEvent({
					id: 'change-day-series',
					start: toOffsetIso(seriesStart),
					end: toOffsetIso(add(seriesStart, 30, 'minute')),
					rrule: { freq: RRule.DAILY, dtstart: toDate(seriesStart) },
				})
				const occurrenceStart = mustParse(occurrenceStartISO, zone)
				const occurrence: CalendarEvent = {
					...baseEvent,
					id: 'change-day-series_1',
					uid: 'change-day-series@ilamy.calendar',
					start: toOffsetIso(occurrenceStart),
					end: toOffsetIso(add(occurrenceStart, 30, 'minute')),
					rrule: undefined,
				}
				const editedStart = mustParse(editedStartISO, zone)
				const { events } = updateRecurringEvent({
					targetEvent: occurrence,
					updates: {
						start: toOffsetIso(editedStart),
						end: toOffsetIso(add(editedStart, 30, 'minute')),
					},
					currentEvents: [baseEvent],
					scope: 'all',
					timezone: zone,
				})
				const series = events.find((event) => event.id === 'change-day-series')
				return [utcIso(series?.start), utcIso(series?.end)]
			}

			it('takes the clock time of an occurrence on the change day', () => {
				const series = editAll(
					'2025-03-07T14:00:00.000Z',
					'2025-03-09T13:00:00.000Z',
					'2025-03-09T13:30:00.000Z'
				)
				expect(series).toEqual([
					'2025-03-07T14:30:00.000Z',
					'2025-03-07T15:00:00.000Z',
				])
			})

			it('applies the clock time to a series starting on the change day', () => {
				const series = editAll(
					'2025-03-09T13:00:00.000Z',
					'2025-03-12T13:00:00.000Z',
					'2025-03-12T13:30:00.000Z'
				)
				expect(series).toEqual([
					'2025-03-09T13:30:00.000Z',
					'2025-03-09T14:00:00.000Z',
				])
			})
		})
	})

	describe('generateRecurringEvents', () => {
		it('should respect overrides when uid is missing from base but present in override', () => {
			const baseEvent = createBaseRecurringEvent({ id: 'series-5' })
			const overrideStart = shiftUtc(baseEvent.start, 1, 'week')
			const overrideEvent: CalendarEvent = {
				...baseEvent,
				id: 'series-5_override',
				start: overrideStart,
				end: shiftUtc(overrideStart, 1, 'hour'),
				title: 'Overridden Title',
				uid: 'series-5@ilamy.calendar',
				recurrenceId: overrideStart,
				rrule: undefined,
			}

			const generated = recurrencePlugin().transformEvents?.(
				[baseEvent, overrideEvent],
				{
					start: toUtcIso(subtract(mustParse(baseEvent.start), 1, 'day')),
					end: shiftUtc(baseEvent.start, 1, 'month'),
					timezone: 'UTC',
				}
			)

			const overridden = generated?.filter((e) =>
				sameInstant(e.start, overrideStart)
			)
			expect(overridden).toHaveLength(1)
			expect(overridden?.at(0)?.title).toBe('Overridden Title')
		})
	})

	describe('"following" edit that moves the occurrence to another day', () => {
		const SEED_START = '2025-03-05T09:00:00.000Z'
		const MARCH_12 = '2025-03-12T09:00:00.000Z'
		const seriesWith = (
			rrule: Partial<RRuleOptions>,
			seedStart = SEED_START
		): CalendarEvent => ({
			id: 'series',
			title: 'Series',
			start: seedStart,
			end: shiftUtc(seedStart, 30, 'minute'),
			rrule: {
				freq: RRule.WEEKLY,
				dtstart: new Date(seedStart),
				...rrule,
			},
		})
		const moveFollowing = (
			base: CalendarEvent,
			occurrence: string,
			movedTo: string
		) => {
			const targetEvent: CalendarEvent = {
				...base,
				id: 'series_1',
				start: occurrence,
				end: shiftUtc(occurrence, 30, 'minute'),
				rrule: undefined,
				uid: 'series@ilamy.calendar',
			}
			const result = updateRecurringEvent({
				targetEvent,
				updates: { start: movedTo, end: shiftUtc(movedTo, 30, 'minute') },
				currentEvents: [{ ...base, uid: 'series@ilamy.calendar' }],
				scope: 'following',
				timezone: 'UTC',
			})
			const added = result.added.at(0)
			const generated = recurrencePlugin().transformEvents?.(result.events, {
				start: '2025-03-09T00:00:00.000Z',
				end: '2025-04-30T00:00:00.000Z',
				timezone: 'UTC',
			})
			const starts = (generated ?? [])
				.map((e) => utcIso(e.start) ?? '')
				.filter((iso) => iso >= movedTo)
			return { rule: added?.rrule, starts }
		}
		const weekdays = (rule?: RRuleOptions) =>
			[rule?.byweekday ?? []].flat().map((day) => {
				if (typeof day === 'number') {
					return day
				}
				const { weekday, n } = day as Weekday
				return n === undefined ? weekday : `${weekday}:${n}`
			})

		it('moves a weekly series to the new weekday and keeps the moved occurrence', () => {
			const { rule, starts } = moveFollowing(
				seriesWith({ byweekday: [2] }),
				MARCH_12,
				'2025-03-13T10:00:00.000Z'
			)
			expect(weekdays(rule)).toEqual([3])
			expect(starts.slice(0, 3)).toEqual([
				'2025-03-13T10:00:00.000Z',
				'2025-03-20T10:00:00.000Z',
				'2025-03-27T10:00:00.000Z',
			])
		})

		it('moves only the weekday that named the occurrence in a multi-day rule', () => {
			const { rule } = moveFollowing(
				seriesWith({ byweekday: [0, 2, 4] }),
				MARCH_12,
				'2025-03-13T10:00:00.000Z'
			)
			expect(weekdays(rule)).toEqual([0, 3, 4])
		})

		it('reads weekdays given as rrule constants', () => {
			const { rule } = moveFollowing(
				seriesWith({ byweekday: [RRule.WE] }),
				MARCH_12,
				'2025-03-13T10:00:00.000Z'
			)
			expect(weekdays(rule)).toEqual([3])
		})

		it('leaves a rule that already names the new weekday', () => {
			const { rule } = moveFollowing(
				seriesWith({ byweekday: [2, 3] }),
				MARCH_12,
				'2025-03-13T10:00:00.000Z'
			)
			expect(weekdays(rule)).toEqual([2, 3])
		})

		it('leaves the weekdays alone when only the time changes', () => {
			const { rule } = moveFollowing(
				seriesWith({ byweekday: [2] }),
				MARCH_12,
				'2025-03-12T11:00:00.000Z'
			)
			expect(weekdays(rule)).toEqual([2])
		})

		it('moves a monthly series to the new day of the month', () => {
			const { rule, starts } = moveFollowing(
				seriesWith(
					{ freq: RRule.MONTHLY, bymonthday: [12] },
					'2025-01-12T09:00:00.000Z'
				),
				MARCH_12,
				'2025-03-13T10:00:00.000Z'
			)
			expect(rule?.bymonthday).toEqual([13])
			expect(starts.at(0)).toBe('2025-03-13T10:00:00.000Z')
			expect(starts.at(1)?.slice(0, 10)).toBe('2025-04-13')
		})

		it('moves a yearly series to the new month and day', () => {
			const { rule } = moveFollowing(
				seriesWith(
					{ freq: RRule.YEARLY, bymonth: [3], bymonthday: [12] },
					'2024-03-12T09:00:00.000Z'
				),
				MARCH_12,
				'2025-04-13T10:00:00.000Z'
			)
			expect(rule?.bymonth).toEqual([4])
			expect(rule?.bymonthday).toEqual([13])
		})

		it('moves an nth weekday of the month to the nth of the new date', () => {
			const { rule } = moveFollowing(
				seriesWith(
					{ freq: RRule.MONTHLY, byweekday: [RRule.WE.nth(2)] },
					'2025-02-12T09:00:00.000Z'
				),
				MARCH_12,
				'2025-03-13T10:00:00.000Z'
			)
			expect(weekdays(rule)).toEqual(['3:2'])
		})

		it('moves an nth weekday of the month when the weekday stays but the week changes', () => {
			const { rule, starts } = moveFollowing(
				seriesWith(
					{ freq: RRule.MONTHLY, byweekday: [RRule.WE.nth(2)] },
					'2025-02-12T09:00:00.000Z'
				),
				MARCH_12,
				'2025-03-19T10:00:00.000Z'
			)
			expect(weekdays(rule)).toEqual(['2:3'])
			expect(starts.at(0)).toBe('2025-03-19T10:00:00.000Z')
		})
	})
})
