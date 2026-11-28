import { describe, expect, it, spyOn } from 'bun:test'
import type { CalendarEvent } from '../types/calendar.types'
import {
	getDayHours,
	getMonthDays,
	getMonthGridRange,
	getMonthWeeks,
	getVisibleDateRange,
	getWeekDays,
	skipHiddenDays,
	toHiddenDaysSet,
	withoutHiddenDays,
} from './core-date-grid.utils'
import {
	resolveDurationEditable,
	resolveStartEditable,
} from './core-editability.utils'
import {
	normalizeEvent,
	normalizeEvents,
	resolveEventDate,
} from './core-normalize.utils'
import {
	bucketEventsByResource,
	filterEventsForResource,
	getEventResourceIds,
	getResourceEvents,
} from './core-resource-filter.utils'
import {
	collectResourceBusinessHours,
	getViewHours,
	parseSlotRange,
} from './core-view-hours.utils'
import {
	createCalendarFormatters,
	formatCalendarHeaderTitle,
} from './date-time-formatters.utils'
import { fromFields, getFields, toOffsetIso } from './temporal'

describe('core-date-grid', () => {
	it('builds hiddenDays sets and returns undefined when empty or all 7 hidden', () => {
		expect(toHiddenDaysSet()).toBeUndefined()
		expect(toHiddenDaysSet([], false)).toEqual(new Set([0, 6]))
		expect(
			toHiddenDaysSet([
				'sunday',
				'monday',
				'tuesday',
				'wednesday',
				'thursday',
				'friday',
				'saturday',
			])
		).toBeUndefined()
	})

	it('skips hidden days forward and backward and filters hidden days from lists', () => {
		const saturday = fromFields(
			{ year: 2025, month: 3, day: 15, hour: 10 },
			'UTC'
		)
		const hidden = toHiddenDaysSet([], false)
		expect(skipHiddenDays(saturday, hidden, 1).day).toBe(17)
		expect(skipHiddenDays(saturday, hidden, -1).day).toBe(14)

		const week = getWeekDays(saturday, 0)
		expect(week).toHaveLength(7)
		expect(withoutHiddenDays(week, hidden)).toHaveLength(5)
	})

	it('builds 6x7 month weeks, month days, and trims visible ranges when weekends are hidden (D10)', () => {
		const march15 = fromFields({ year: 2025, month: 3, day: 15 }, 'UTC')
		expect(getMonthWeeks(march15, 0)).toHaveLength(6)
		expect(getMonthDays(march15)).toHaveLength(31)

		const hiddenWeekends = toHiddenDaysSet([], false)
		const weekRange = getVisibleDateRange(march15, 'week', 0, hiddenWeekends)
		expect(weekRange.start.day).toBe(10)
		expect(weekRange.end.day).toBe(14)

		const dayRange = getVisibleDateRange(march15, 'day', 0, hiddenWeekends)
		expect(dayRange.start.day).toBe(17)
		expect(dayRange.end.day).toBe(17)

		const monthRange = getMonthGridRange(march15, 0, hiddenWeekends)
		expect(getFields(monthRange.start).dayOfWeek).toBe(1)
		expect(getFields(monthRange.end).dayOfWeek).toBe(5)

		const yearRange = getVisibleDateRange(march15, 'year', 0)
		expect(yearRange.start.month).toBe(1)
		expect(yearRange.end.month).toBe(12)
	})

	it('builds 24 wall-clock hours cleanly across a DST spring-forward day', () => {
		const dstDay = fromFields(
			{ year: 2025, month: 3, day: 9 },
			'America/New_York'
		)
		const hours = getDayHours({ referenceDate: dstDay })
		expect(hours).toHaveLength(24)
		expect(hours.at(0)?.hour).toBe(0)
		expect(hours.at(23)?.hour).toBe(23)
	})
})

describe('core-view-hours', () => {
	it('parses valid slotMinTime/slotMaxTime and falls back to [0, 1440) on invalid bounds', () => {
		expect(parseSlotRange('08:00', '18:30')).toEqual({
			startMinutes: 480,
			endMinutes: 1110,
			invalidProps: [],
		})
		expect(parseSlotRange('18:00', '08:00')).toEqual({
			startMinutes: 0,
			endMinutes: 1440,
			invalidProps: ['slotMinTime', 'slotMaxTime'],
		})
		expect(parseSlotRange('25:00', '24:00').invalidProps).toEqual([
			'slotMinTime',
			'slotMaxTime',
		])
		expect(parseSlotRange('08:60', undefined).invalidProps).toEqual([
			'slotMinTime',
		])
	})

	it('narrows hours by slot window and hideNonBusinessHours, warning once on empty intersection', () => {
		const monday = fromFields({ year: 2025, month: 3, day: 10 }, 'UTC')
		const hours = getViewHours({
			referenceDate: monday,
			businessHours: { daysOfWeek: ['monday'], startTime: 9, endTime: 17 },
			hideNonBusinessHours: true,
			slotMinTime: '08:00',
			slotMaxTime: '18:00',
		})
		expect(hours.map((slot) => slot.hour)).toEqual([
			9, 10, 11, 12, 13, 14, 15, 16,
		])

		const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
		try {
			const fallbackHours = getViewHours({
				referenceDate: monday,
				businessHours: { daysOfWeek: ['monday'], startTime: 18, endTime: 22 },
				hideNonBusinessHours: true,
				slotMinTime: '08:00',
				slotMaxTime: '12:00',
			})
			expect(fallbackHours.map((slot) => slot.hour)).toEqual([8, 9, 10, 11])
			expect(warnSpy).toHaveBeenCalledTimes(1)
		} finally {
			warnSpy.mockRestore()
		}
	})

	it('collects per-resource businessHours', () => {
		const collected = collectResourceBusinessHours([
			{ id: 'r1', title: 'Room 1' },
			{
				id: 'r2',
				title: 'Room 2',
				businessHours: { daysOfWeek: ['monday'], startTime: 10, endTime: 16 },
			},
		])
		expect(collected).toHaveLength(1)
	})
})

describe('core-editability', () => {
	it('defaults editable to false (D8) and follows FullCalendar precedence', () => {
		expect(resolveStartEditable({}, {})).toBe(false)
		expect(resolveDurationEditable({}, {})).toBe(false)

		expect(resolveStartEditable({}, { editable: true })).toBe(true)
		expect(
			resolveStartEditable({}, { editable: true, eventStartEditable: false })
		).toBe(false)
		expect(
			resolveStartEditable(
				{ editable: true },
				{ editable: false, eventStartEditable: false }
			)
		).toBe(true)
		expect(
			resolveDurationEditable(
				{ editable: true, durationEditable: false },
				{ editable: true, eventDurationEditable: true }
			)
		).toBe(false)
	})
})

describe('core-normalize', () => {
	it('anchors offset-less wall-clock times in event.timezone and projects into calendar timezone (#314)', () => {
		const resolved = resolveEventDate(
			'2025-07-01T09:00:00',
			'America/New_York',
			'Asia/Tokyo'
		)
		expect(resolved).toBeDefined()
		// 09:00 JST (+09:00) === 20:00 previous day EDT (-04:00)
		expect(resolved && toOffsetIso(resolved)).toBe('2025-06-30T20:00:00-04:00')
	})

	it('normalizes events to canonical ISO strings with offset and handles empty arrays', () => {
		expect(normalizeEvents(undefined, 'UTC')).toEqual([])
		const normalized = normalizeEvent(
			{
				id: 'e1',
				title: 'Meeting',
				start: new Date('2025-03-10T14:00:00Z'),
				end: '2025-03-10T15:30:00Z',
			},
			'America/New_York'
		)
		expect(normalized.start).toBe('2025-03-10T10:00:00-04:00')
		expect(normalized.end).toBe('2025-03-10T11:30:00-04:00')
	})
})

describe('core-resource-filter', () => {
	const events: CalendarEvent[] = [
		{
			id: 'e1',
			title: 'Single',
			start: '2025-03-10T09:00:00Z',
			end: '2025-03-10T10:00:00Z',
			resourceId: 'r1',
		},
		{
			id: 'e2',
			title: 'Multi',
			start: '2025-03-10T10:00:00Z',
			end: '2025-03-10T11:00:00Z',
			resourceId: 'ignored',
			resourceIds: ['r1', 'r2'],
		},
		{
			id: 'e3',
			title: 'Unassigned',
			start: '2025-03-10T11:00:00Z',
			end: '2025-03-10T12:00:00Z',
		},
	]

	it('gives resourceIds precedence over resourceId and buckets by resource', () => {
		const [single, multi, unassigned] = events
		expect(single && getEventResourceIds(single)).toEqual(['r1'])
		expect(multi && getEventResourceIds(multi)).toEqual(['r1', 'r2'])
		expect(unassigned && getEventResourceIds(unassigned)).toEqual([])

		expect(filterEventsForResource(events, undefined)).toHaveLength(3)
		expect(filterEventsForResource(events, 'r1').map((e) => e.id)).toEqual([
			'e1',
			'e2',
		])
		expect(filterEventsForResource(events, 'ignored')).toEqual([])

		const buckets = bucketEventsByResource(events)
		expect(bucketEventsByResource(events)).toBe(buckets)
		expect(getResourceEvents(events, 'r2').map((e) => e.id)).toEqual(['e2'])
		expect(getResourceEvents(events, 'missing')).toEqual([])
		expect(getResourceEvents(events, undefined)).toBe(events)
	})

	it('trims hidden days from week header titles regardless of resource axis', () => {
		const formatters = createCalendarFormatters({
			view: 'week',
			locale: 'en-US',
			timezone: 'UTC',
		})
		const hiddenWeekends = toHiddenDaysSet([], false)
		const baseParams = {
			currentDateIso: '2025-03-12T09:00:00Z',
			visibleRange: {
				start: '2025-03-10T00:00:00Z',
				end: '2025-03-14T00:00:00Z',
			},
			view: 'week',
			firstDayOfWeek: 0,
			hiddenDays: hiddenWeekends,
			timezone: 'UTC',
			locale: 'en-US',
			formatters,
		}
		expect(
			formatCalendarHeaderTitle({ ...baseParams, hasResources: false })
		).toBe('Mar 10 – 14')
		expect(
			formatCalendarHeaderTitle({ ...baseParams, hasResources: true })
		).toBe('Mar 10 – 14')
	})
})
