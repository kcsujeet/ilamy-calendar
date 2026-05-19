import { describe, expect, it } from 'bun:test'
import { RRule } from 'rrule'
import type { CalendarEvent } from '@/components'
import dayjs from '@/lib/configs/dayjs-config'
import {
	deleteRecurringEvent,
	generateRecurringEvents,
	isRecurringEvent,
	updateRecurringEvent,
} from './recurrence-handler'

// Test helper to create a base recurring event
const createBaseRecurringEvent = (
	overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id: 'recurring-1',
	title: 'Weekly Meeting',
	start: dayjs('2025-01-06T09:00:00'),
	end: dayjs('2025-01-06T10:00:00'),
	rrule: {
		freq: RRule.WEEKLY,
		byweekday: [RRule.MO],
		interval: 1,
		dtstart: dayjs('2025-01-06T09:00:00').toDate(), // Match event start time
	},
	uid: 'recurring-1@calendar.test',
	...overrides,
})

// Test helper to create a target event instance
const createTargetEvent = (
	overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id: 'recurring-1_2',
	title: 'Weekly Meeting',
	start: dayjs('2025-01-20T09:00:00'),
	end: dayjs('2025-01-20T10:00:00'),
	uid: 'recurring-1@calendar.test',
	...overrides,
})

describe('isRecurringEvent', () => {
	it('should identify events with rrule as recurring', () => {
		const event = createBaseRecurringEvent()
		expect(isRecurringEvent(event)).toBeTruthy()
	})

	it('should identify events with recurrenceId as recurring', () => {
		const event = createTargetEvent({
			recurrenceId: '2025-01-20T09:00:00.000Z',
		})
		expect(isRecurringEvent(event)).toBeTruthy()
	})

	it('should not identify regular events as recurring', () => {
		const event = {
			...createBaseRecurringEvent(),
			rrule: undefined,
			recurrenceId: undefined,
			uid: undefined,
		}
		expect(isRecurringEvent(event)).toBeFalsy()
	})
})

describe('generateRecurringEvents', () => {
	it('should generate weekly recurring events correctly', () => {
		const baseEvent = createBaseRecurringEvent()
		const startDate = dayjs('2025-01-01')
		const endDate = dayjs('2025-01-31')

		const result = generateRecurringEvents({
			event: baseEvent,
			currentEvents: [],
			startDate,
			endDate,
		})

		expect(result).toHaveLength(4) // 4 Mondays in January 2025
		expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06')
		expect(result[1].start.format('YYYY-MM-DD')).toBe('2025-01-13')
		expect(result[2].start.format('YYYY-MM-DD')).toBe('2025-01-20')
		expect(result[3].start.format('YYYY-MM-DD')).toBe('2025-01-27')

		// Each instance should have unique ID and no rrule
		result.forEach((event, index) => {
			expect(event.id).toBe(`recurring-1_${index}`)
			expect(event.rrule).toBeUndefined()
			expect(event.uid).toBe('recurring-1@calendar.test')
		})
	})

	it('should exclude EXDATE events correctly', () => {
		const baseEvent = createBaseRecurringEvent({
			exdates: ['2025-01-13T09:00:00.000Z', '2025-01-27T09:00:00.000Z'],
		})
		const startDate = dayjs('2025-01-01')
		const endDate = dayjs('2025-01-31')

		const result = generateRecurringEvents({
			event: baseEvent,
			currentEvents: [],
			startDate,
			endDate,
		})

		expect(result).toHaveLength(2) // 4 Mondays - 2 excluded = 2
		expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06')
		expect(result[1].start.format('YYYY-MM-DD')).toBe('2025-01-20')
	})

	it('should handle overrides correctly', () => {
		const baseEvent = createBaseRecurringEvent()
		const overrideEvent: CalendarEvent = {
			...createTargetEvent(),
			recurrenceId: '2025-01-13T09:00:00.000Z',
			title: 'Modified Meeting',
			start: dayjs('2025-01-13T14:00:00'),
			end: dayjs('2025-01-13T15:00:00'),
		}

		const result = generateRecurringEvents({
			event: baseEvent,
			currentEvents: [overrideEvent],
			startDate: dayjs('2025-01-01'),
			endDate: dayjs('2025-01-31'),
		})

		expect(result).toHaveLength(4)

		// Find the overridden event
		const modifiedEvent = result.find((e) =>
			e.start.isSame(dayjs('2025-01-13T14:00:00'))
		)
		expect(modifiedEvent).toBeDefined()
		expect(modifiedEvent?.title).toBe('Modified Meeting')
	})

	it('should return empty array for non-recurring events', () => {
		const regularEvent = { ...createBaseRecurringEvent(), rrule: undefined }

		const result = generateRecurringEvents({
			event: regularEvent,
			currentEvents: [],
			startDate: dayjs('2025-01-01'),
			endDate: dayjs('2025-01-31'),
		})

		expect(result).toHaveLength(0)
	})
})

describe('updateRecurringEvent', () => {
	describe('scope: "this"', () => {
		it('should update only the target event instance', () => {
			const baseEvent = createBaseRecurringEvent()
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent]
			const updates = {
				title: 'Modified Meeting',
				start: dayjs('2025-01-20T14:00:00'),
			}

			const result = updateRecurringEvent({
				targetEvent,
				updates,
				currentEvents,
				scope: 'this',
			})

			expect(result).toHaveLength(2) // base event + modified standalone event

			// Base event should have EXDATE
			const updatedBaseEvent = result.find((e) => e.id === baseEvent.id)
			expect(updatedBaseEvent?.exdates).toHaveLength(1)
			expect(updatedBaseEvent?.exdates).toContain('2025-01-20T09:00:00.000Z')

			// Should have new standalone modified event
			const modifiedEvent = result.find((e) => e.id !== baseEvent.id)
			expect(modifiedEvent?.title).toBe('Modified Meeting')
			expect(modifiedEvent?.recurrenceId).toBe('2025-01-20T09:00:00.000Z')
			expect(modifiedEvent?.uid).toBe(baseEvent.uid)
			expect(modifiedEvent?.rrule).toBeUndefined()
		})

		it('should preserve existing EXDATES when adding new one', () => {
			const baseEvent = createBaseRecurringEvent({
				exdates: ['2025-01-13T09:00:00.000Z'],
			})
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent]

			const result = updateRecurringEvent({
				targetEvent,
				updates: { title: 'Modified' },
				currentEvents,
				scope: 'this',
			})

			const updatedBaseEvent = result.find((e) => e.id === baseEvent.id)
			expect(updatedBaseEvent?.exdates).toHaveLength(2)
			expect(updatedBaseEvent?.exdates).toContain('2025-01-13T09:00:00.000Z')
			expect(updatedBaseEvent?.exdates).toContain('2025-01-20T09:00:00.000Z')
		})
	})

	describe('scope: "following"', () => {
		it('should terminate original series and create new series', () => {
			const baseEvent = createBaseRecurringEvent()
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent]
			const updates = {
				title: 'Modified Series',
				start: dayjs('2025-01-20T14:00:00'),
			}

			const result = updateRecurringEvent({
				targetEvent,
				updates,
				currentEvents,
				scope: 'following',
			})

			expect(result).toHaveLength(2) // terminated original + new series

			// Original series should be terminated with UNTIL
			const terminatedEvent = result.find((e) => e.id === baseEvent.id)
			if (!terminatedEvent?.rrule)
				throw new Error('terminatedEvent.rrule missing')
			expect(terminatedEvent.rrule.until).toEqual(
				dayjs('2025-01-19T23:59:59.999Z').toDate()
			)

			// New series should start from target date
			const newSeries = result.find((e) => e.id !== baseEvent.id)
			expect(newSeries?.title).toBe('Modified Series')
			expect(newSeries?.start.isSame(dayjs('2025-01-20T14:00:00'))).toEqual(
				true
			)
			expect(newSeries?.uid).toBe('recurring-1_following@ilamy.calendar')
			expect(newSeries?.recurrenceId).toBeUndefined()
		})

		it('should handle edge case when target is first occurrence', () => {
			const baseEvent = createBaseRecurringEvent()
			const firstOccurrence = {
				...createTargetEvent(),
				start: dayjs('2025-01-06T09:00:00'),
			}
			const currentEvents = [baseEvent]

			const result = updateRecurringEvent({
				targetEvent: firstOccurrence,
				updates: { title: 'New Series' },
				currentEvents,
				scope: 'following',
			})

			expect(result).toHaveLength(2)

			// Original should terminate before first occurrence (effectively making it empty)
			const terminatedEvent = result.find((e) => e.id === baseEvent.id)
			if (!terminatedEvent?.rrule)
				throw new Error('terminatedEvent.rrule missing')
			expect(terminatedEvent.rrule.until).toEqual(
				dayjs('2025-01-05T23:59:59.999Z').toDate()
			)
		})
	})

	describe('scope: "all"', () => {
		it('should collapse detached overrides when editing all after scope this', () => {
			const dayThreeISO = '2025-01-08T09:00:00.000Z'
			const baseEvent = createBaseRecurringEvent({
				id: 'daily-1',
				rrule: {
					freq: RRule.DAILY,
					interval: 1,
					dtstart: dayjs('2025-01-06T09:00:00.000Z').toDate(),
				},
				start: dayjs('2025-01-06T09:00:00.000Z'),
				end: dayjs('2025-01-06T10:00:00.000Z'),
			})
			const dayThreeInstance: CalendarEvent = {
				...baseEvent,
				id: 'daily-1_2',
				start: dayjs(dayThreeISO),
				end: dayjs('2025-01-08T10:00:00.000Z'),
				rrule: undefined,
			}

			let currentEvents = updateRecurringEvent({
				targetEvent: dayThreeInstance,
				updates: { title: 'Modified day' },
				currentEvents: [baseEvent],
				scope: 'this',
			})

			currentEvents = updateRecurringEvent({
				targetEvent: dayThreeInstance,
				updates: { title: 'All daily' },
				currentEvents,
				scope: 'all',
			})

			expect(currentEvents).toHaveLength(1)
			expect(
				currentEvents.filter((e) => e.recurrenceId && !e.rrule)
			).toHaveLength(0)

			const storedBase = currentEvents.find((e) => e.rrule)
			if (!storedBase?.rrule) throw new Error('storedBase.rrule missing')

			const generated = generateRecurringEvents({
				event: storedBase,
				currentEvents,
				startDate: dayjs('2025-01-06T00:00:00.000Z'),
				endDate: dayjs('2025-01-10T23:59:59.999Z'),
			})
			const detachedOverrides = currentEvents.filter(
				(e) => e.recurrenceId && !e.rrule
			)
			const onModifiedDay = [...generated, ...detachedOverrides].filter((e) =>
				e.start.isSame(dayjs(dayThreeISO), 'day')
			)

			expect(onModifiedDay).toHaveLength(1)
			expect(onModifiedDay[0].title).toBe('All daily')
			expect(
				generated.some((e) => e.start.isSame(dayjs(dayThreeISO), 'day'))
			).toBe(true)
		})

		it('should not duplicate when scope all shifts series time after scope this (drag collapses overrides)', () => {
			const dayThreeISO = '2025-01-08T09:00:00.000Z'
			const baseEvent = createBaseRecurringEvent({
				id: 'daily-1',
				rrule: {
					freq: RRule.DAILY,
					interval: 1,
					dtstart: dayjs('2025-01-06T09:00:00.000Z').toDate(),
				},
				start: dayjs('2025-01-06T09:00:00.000Z'),
				end: dayjs('2025-01-06T10:00:00.000Z'),
			})
			const dayThreeInstance: CalendarEvent = {
				...baseEvent,
				id: 'daily-1_2',
				start: dayjs(dayThreeISO),
				end: dayjs('2025-01-08T10:00:00.000Z'),
				rrule: undefined,
			}

			let currentEvents = updateRecurringEvent({
				targetEvent: dayThreeInstance,
				updates: { title: 'Modified day' },
				currentEvents: [baseEvent],
				scope: 'this',
			})

			currentEvents = updateRecurringEvent({
				targetEvent: dayThreeInstance,
				updates: {
					title: 'All daily',
					start: dayjs('2025-01-08T11:00:00.000Z'),
					end: dayjs('2025-01-08T12:00:00.000Z'),
				},
				currentEvents,
				scope: 'all',
			})

			expect(
				currentEvents.filter((e) => e.recurrenceId && !e.rrule)
			).toHaveLength(0)
			expect(currentEvents).toHaveLength(1)

			const storedBase = currentEvents.find((e) => e.rrule)
			if (!storedBase?.rrule) throw new Error('storedBase.rrule missing')

			const generated = generateRecurringEvents({
				event: storedBase,
				currentEvents,
				startDate: dayjs('2025-01-08T00:00:00.000Z'),
				endDate: dayjs('2025-01-08T23:59:59.999Z'),
			})
			expect(generated).toHaveLength(1)
			expect(generated[0].title).toBe('All daily')
			expect(generated[0].start.isSame(dayjs(dayThreeISO), 'day')).toBe(true)
		})

		it('should update the base recurring event', () => {
			const baseEvent = createBaseRecurringEvent()
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent]
			const updates = {
				title: 'Updated All Events',
				rrule: {
					freq: RRule.DAILY,
					interval: 1,
					dtstart: dayjs('2025-01-06T09:00:00').toDate(), // Match event start time
				},
			}

			const result = updateRecurringEvent({
				targetEvent,
				updates,
				currentEvents,
				scope: 'all',
			})

			expect(result).toHaveLength(1)

			const updatedEvent = result[0]
			expect(updatedEvent.title).toBe('Updated All Events')
			if (!updatedEvent.rrule) throw new Error('updatedEvent.rrule missing')
			expect(updatedEvent.rrule.freq).toBe(RRule.DAILY)
			expect(updatedEvent.id).toBe(baseEvent.id)
		})

		it('should preserve other events in the array', () => {
			const baseEvent = createBaseRecurringEvent()
			const otherEvent = createBaseRecurringEvent({
				id: 'other-event',
				uid: 'other@test',
			})
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent, otherEvent]

			const result = updateRecurringEvent({
				targetEvent,
				updates: { title: 'Updated' },
				currentEvents,
				scope: 'all',
			})

			expect(result).toHaveLength(2)
			expect(result.find((e) => e.id === 'other-event')).toBeDefined()
		})

		it('should keep base series anchor when editing a later instance (scope: all)', () => {
			const mondayStartISO = '2025-01-06T09:00:00.000Z'
			const fridayStartISO = '2025-01-10T09:00:00.000Z'
			const baseEvent = createBaseRecurringEvent({
				start: dayjs(mondayStartISO),
				end: dayjs('2025-01-06T10:00:00.000Z'),
				rrule: {
					freq: RRule.WEEKLY,
					interval: 1,
					byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
					dtstart: dayjs(mondayStartISO).toDate(),
				},
			})
			const fridayInstance = createTargetEvent({
				id: 'recurring-1_4',
				start: dayjs(fridayStartISO),
				end: dayjs('2025-01-10T10:00:00.000Z'),
			})

			const result = updateRecurringEvent({
				targetEvent: fridayInstance,
				updates: {
					title: 'Updated Weekdays',
					start: dayjs(fridayStartISO),
					end: dayjs('2025-01-10T10:00:00.000Z'),
					rrule: {
						freq: RRule.WEEKLY,
						interval: 1,
						byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
						dtstart: dayjs(fridayStartISO).toDate(),
					},
				},
				currentEvents: [baseEvent],
				scope: 'all',
			})

			const updatedBase = result[0]
			expect(updatedBase.title).toBe('Updated Weekdays')
			expect(updatedBase.start.toISOString()).toBe(mondayStartISO)
			if (!updatedBase.rrule) throw new Error('updatedBase.rrule missing')
			expect(updatedBase.rrule.dtstart?.toISOString()).toBe(mondayStartISO)

			const instances = generateRecurringEvents({
				event: updatedBase,
				currentEvents: result,
				startDate: dayjs('2025-01-06T00:00:00.000Z'),
				endDate: dayjs('2025-01-12T23:59:59.999Z'),
			})
			expect(instances).toHaveLength(5)
			expect(instances[0].start.toISOString()).toBe(mondayStartISO)
			expect(instances[4].start.toISOString()).toBe(fridayStartISO)
		})

		it('should apply submitted time to base anchor (scope: all)', () => {
			const mondayStartISO = '2025-01-06T09:00:00.000Z'
			const baseEvent = createBaseRecurringEvent({
				start: dayjs(mondayStartISO),
				end: dayjs('2025-01-06T10:00:00.000Z'),
			})
			const fridayInstance = createTargetEvent({
				start: dayjs('2025-01-10T09:00:00.000Z'),
				end: dayjs('2025-01-10T10:00:00.000Z'),
			})

			const result = updateRecurringEvent({
				targetEvent: fridayInstance,
				updates: {
					start: dayjs('2025-01-10T11:00:00.000Z'),
					end: dayjs('2025-01-10T12:00:00.000Z'),
				},
				currentEvents: [baseEvent],
				scope: 'all',
			})

			expect(result[0].start.toISOString()).toBe('2025-01-06T11:00:00.000Z')
			expect(result[0].end.toISOString()).toBe('2025-01-06T12:00:00.000Z')
		})
	})

	describe('error handling', () => {
		it('should throw error when base recurring event not found', () => {
			const targetEvent = createTargetEvent()
			const currentEvents: CalendarEvent[] = []

			expect(() => {
				updateRecurringEvent({
					targetEvent,
					updates: { title: 'Test' },
					currentEvents,
					scope: 'this',
				})
			}).toThrow('Base recurring event not found')
		})

		it('should throw error for invalid scope', () => {
			const baseEvent = createBaseRecurringEvent()
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent]

			expect(() => {
				updateRecurringEvent({
					targetEvent,
					updates: { title: 'Test' },
					currentEvents,
					scope: 'invalid' as unknown as 'this',
				})
			}).toThrow(
				"Invalid scope: invalid. Must be 'this', 'following', or 'all'"
			)
		})
	})
})

describe('deleteRecurringEvent', () => {
	describe('scope: "this"', () => {
		it('should add EXDATE to exclude only target occurrence', () => {
			const baseEvent = createBaseRecurringEvent()
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent]

			const result = deleteRecurringEvent({
				targetEvent,
				currentEvents,
				scope: 'this',
			})

			expect(result).toHaveLength(1)

			const updatedEvent = result[0]
			expect(updatedEvent.exdates).toHaveLength(1)
			expect(updatedEvent.exdates).toContain('2025-01-20T09:00:00.000Z')
			expect(updatedEvent.id).toBe(baseEvent.id)
		})

		it('should preserve existing EXDATES when adding new exclusion', () => {
			const baseEvent = createBaseRecurringEvent({
				exdates: ['2025-01-13T09:00:00.000Z', '2025-01-27T09:00:00.000Z'],
			})
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent]

			const result = deleteRecurringEvent({
				targetEvent,
				currentEvents,
				scope: 'this',
			})

			const updatedEvent = result[0]
			expect(updatedEvent.exdates).toHaveLength(3)
			expect(updatedEvent.exdates).toContain('2025-01-13T09:00:00.000Z')
			expect(updatedEvent.exdates).toContain('2025-01-27T09:00:00.000Z')
			expect(updatedEvent.exdates).toContain('2025-01-20T09:00:00.000Z')
		})
	})

	describe('scope: "following"', () => {
		it('should terminate series with UNTIL before target date', () => {
			const baseEvent = createBaseRecurringEvent()
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent]

			const result = deleteRecurringEvent({
				targetEvent,
				currentEvents,
				scope: 'following',
			})

			expect(result).toHaveLength(1)

			const terminatedEvent = result[0]
			if (!terminatedEvent.rrule) throw new Error('rrule missing')
			expect(terminatedEvent.rrule.until).toEqual(
				dayjs('2025-01-19T23:59:59.999Z').toDate()
			)
			expect(terminatedEvent.id).toBe(baseEvent.id)
		})

		it('should handle deletion from first occurrence correctly', () => {
			const baseEvent = createBaseRecurringEvent()
			const firstOccurrence = {
				...createTargetEvent(),
				start: dayjs('2025-01-06T09:00:00'),
			}
			const currentEvents = [baseEvent]

			const result = deleteRecurringEvent({
				targetEvent: firstOccurrence,
				currentEvents,
				scope: 'following',
			})

			const terminatedEvent = result[0]
			if (!terminatedEvent.rrule) throw new Error('rrule missing')
			expect(terminatedEvent.rrule.until).toEqual(
				dayjs('2025-01-05T23:59:59.999Z').toDate()
			)
		})

		it('should handle existing UNTIL in RRULE correctly', () => {
			const baseEvent = createBaseRecurringEvent({
				rrule: {
					freq: RRule.WEEKLY,
					byweekday: [RRule.MO],
					until: dayjs('2025-12-31T00:00:00Z').toDate(),
					interval: 1,
					dtstart: dayjs('2025-01-06T09:00:00').toDate(), // Match event start time
				},
			})
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent]

			const result = deleteRecurringEvent({
				targetEvent,
				currentEvents,
				scope: 'following',
			})

			const terminatedEvent = result[0]
			// Should replace existing UNTIL with earlier termination date
			if (!terminatedEvent.rrule) throw new Error('rrule missing')
			expect(terminatedEvent.rrule.until).toEqual(
				dayjs('2025-01-19T23:59:59.999Z').toDate()
			)
		})
	})

	describe('scope: "all"', () => {
		it('should remove entire recurring series', () => {
			const baseEvent = createBaseRecurringEvent()
			const otherEvent = createBaseRecurringEvent({
				id: 'other',
				uid: 'other@test',
			})
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent, otherEvent]

			const result = deleteRecurringEvent({
				targetEvent,
				currentEvents,
				scope: 'all',
			})

			expect(result).toHaveLength(1)
			expect(result[0].id).toBe('other')
			expect(
				result.find((e) => e.uid === 'recurring-1@calendar.test')
			).toBeUndefined()
		})

		it('should handle empty result when only target series exists', () => {
			const baseEvent = createBaseRecurringEvent()
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent]

			const result = deleteRecurringEvent({
				targetEvent,
				currentEvents,
				scope: 'all',
			})

			expect(result).toHaveLength(0)
		})

		it('should remove all events with same UID including overrides', () => {
			const baseEvent = createBaseRecurringEvent()
			const override1 = {
				...createTargetEvent(),
				id: 'override1',
				recurrenceId: '2025-01-13T09:00:00.000Z',
			}
			const override2 = {
				...createTargetEvent(),
				id: 'override2',
				recurrenceId: '2025-01-20T09:00:00.000Z',
			}
			const otherEvent = createBaseRecurringEvent({
				id: 'other',
				uid: 'other@test',
			})
			const currentEvents = [baseEvent, override1, override2, otherEvent]
			const targetEvent = createTargetEvent()

			const result = deleteRecurringEvent({
				targetEvent,
				currentEvents,
				scope: 'all',
			})

			expect(result).toHaveLength(1)
			expect(result[0].id).toBe('other')
		})
	})

	describe('error handling', () => {
		it('should throw error when base recurring event not found', () => {
			const targetEvent = createTargetEvent()
			const currentEvents: CalendarEvent[] = []

			expect(() => {
				deleteRecurringEvent({
					targetEvent,
					currentEvents,
					scope: 'this',
				})
			}).toThrow('Base recurring event not found')
		})

		it('should throw error for invalid scope', () => {
			const baseEvent = createBaseRecurringEvent()
			const targetEvent = createTargetEvent()
			const currentEvents = [baseEvent]

			expect(() => {
				deleteRecurringEvent({
					targetEvent,
					currentEvents,
					scope: 'invalid' as unknown as 'this',
				})
			}).toThrow(
				"Invalid scope: invalid. Must be 'this', 'following', or 'all'"
			)
		})
	})
})

describe('Edge cases and stress tests', () => {
	it('should handle complex RRULE with COUNT limit', () => {
		const baseEvent = createBaseRecurringEvent({
			rrule: {
				freq: RRule.WEEKLY,
				byweekday: [RRule.MO, RRule.WE, RRule.FR],
				count: 10,
				interval: 1,
				dtstart: dayjs('2025-01-06T09:00:00').toDate(), // Match event start time
			},
		})

		const result = generateRecurringEvents({
			event: baseEvent,
			currentEvents: [],
			startDate: dayjs('2025-01-01'),
			endDate: dayjs('2025-02-28'),
		})

		expect(result).toHaveLength(10)
	})

	it('should handle daily recurring event with interval', () => {
		const baseEvent = createBaseRecurringEvent({
			rrule: {
				freq: RRule.DAILY,
				interval: 3,
				dtstart: dayjs('2025-01-06T09:00:00').toDate(), // Match event start time
			},
		})

		const result = generateRecurringEvents({
			event: baseEvent,
			currentEvents: [],
			startDate: dayjs('2025-01-06'),
			endDate: dayjs('2025-01-20'),
		})

		expect(result).toHaveLength(5) // Every 3 days: 6, 9, 12, 15, 18
		expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06')
		expect(result[1].start.format('YYYY-MM-DD')).toBe('2025-01-09')
		expect(result[2].start.format('YYYY-MM-DD')).toBe('2025-01-12')
	})

	it('should handle monthly recurring event', () => {
		const baseEvent = createBaseRecurringEvent({
			rrule: {
				freq: RRule.MONTHLY,
				bymonthday: [15],
				interval: 1,
				dtstart: dayjs('2025-01-06T09:00:00').toDate(), // Match event start time
			},
		})

		const result = generateRecurringEvents({
			event: baseEvent,
			currentEvents: [],
			startDate: dayjs('2025-01-01'),
			endDate: dayjs('2025-06-30'),
		})

		expect(result).toHaveLength(6) // Jan 15, Feb 15, Mar 15, Apr 15, May 15, Jun 15
	})

	it('should handle updating and then deleting same event', () => {
		const baseEvent = createBaseRecurringEvent()
		const targetEvent = createTargetEvent()
		let currentEvents = [baseEvent]

		// First update "this" event
		currentEvents = updateRecurringEvent({
			targetEvent,
			updates: { title: 'Modified' },
			currentEvents,
			scope: 'this',
		})

		expect(currentEvents).toHaveLength(2) // base + modified

		// Then delete the same occurrence
		const finalResult = deleteRecurringEvent({
			targetEvent,
			currentEvents,
			scope: 'this',
		})

		// Should have base event with 2 EXDATES (one from update, one from delete)
		const baseEventResult = finalResult.find((e) => e.rrule)
		expect(baseEventResult?.exdates).toHaveLength(2)
		expect(
			baseEventResult?.exdates?.filter((d) => d === '2025-01-20T09:00:00.000Z')
		).toHaveLength(2)
	})

	it('should handle multiple "following" updates creating series chain', () => {
		const baseEvent = createBaseRecurringEvent()
		let currentEvents = [baseEvent]

		// Update "following" from first occurrence
		const firstTarget = {
			...createTargetEvent(),
			start: dayjs('2025-01-06T09:00:00'),
		}
		currentEvents = updateRecurringEvent({
			targetEvent: firstTarget,
			updates: { title: 'First Split' },
			currentEvents,
			scope: 'following',
		})

		expect(currentEvents).toHaveLength(2) // terminated original + new series

		// Update "following" from later occurrence in new series
		const secondTarget = {
			...createTargetEvent(),
			start: dayjs('2025-01-20T09:00:00'),
			uid: 'recurring-1_following@ilamy.calendar',
		}
		currentEvents = updateRecurringEvent({
			targetEvent: secondTarget,
			updates: { title: 'Second Split' },
			currentEvents,
			scope: 'following',
		})

		expect(currentEvents).toHaveLength(3) // original terminated + first series terminated + second series
	})

	it('should preserve duration when creating new series in "following" scope', () => {
		const baseEvent = createBaseRecurringEvent({
			start: dayjs('2025-01-06T09:00:00'),
			end: dayjs('2025-01-06T11:30:00'), // 2.5 hour duration
		})
		const targetEvent = {
			...createTargetEvent(),
			start: dayjs('2025-01-20T09:00:00'),
			end: dayjs('2025-01-20T11:30:00'),
		}

		const result = updateRecurringEvent({
			targetEvent,
			updates: { start: dayjs('2025-01-20T14:00:00') }, // Change start time
			currentEvents: [baseEvent],
			scope: 'following',
		})

		const newSeries = result.find((e) => e.uid?.includes('_following'))
		expect(newSeries?.start.format('HH:mm')).toBe('14:00')
		expect(newSeries?.end.format('HH:mm')).toBe('16:30') // Should preserve 2.5 hour duration
	})
})
