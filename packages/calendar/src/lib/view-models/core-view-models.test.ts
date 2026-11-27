import { describe, expect, it, setSystemTime } from 'bun:test'
import type { CalendarEvent, Resource } from '../../types/calendar.types'
import {
	createTranslator,
	defaultTranslations,
} from '../../utils/i18n/core-translations'
import { fromFields, parseDate } from '../../utils/temporal'
import {
	buildAgendaViewModel,
	resolveAgendaWindowRange,
	resolveAgendaWindowStep,
} from './core-agenda-view-model'
import { buildMonthViewModel } from './core-month-view-model'
import {
	buildResourceTimelineViewModel,
	resolveTimelineGranularity,
} from './core-resource-timeline-view-model'
import {
	buildTimeGridViewModel,
	isAllDayOrMultiDay,
} from './core-time-grid-view-model'
import { buildYearViewModel } from './core-year-view-model'

const mustParse = (iso: string, zone = 'UTC') => {
	const parsed = parseDate(iso, zone)
	if (!parsed) throw new Error(`Failed to parse ${iso}`)
	return parsed
}

describe('core-translations', () => {
	it('ships all 94 default keys and resolves precedence cleanly', () => {
		expect(Object.keys(defaultTranslations)).toHaveLength(94)
		expect(defaultTranslations.today).toBe('Today')
		expect(defaultTranslations.addResourcesOrShowExisting).toBe(
			'Add resources or show existing ones'
		)

		const defaultOnly = createTranslator()
		expect(defaultOnly('today')).toBe('Today')
		expect(defaultOnly('unknownKey', 'Fallback Label')).toBe('Fallback Label')
		expect(defaultOnly('unknownKey')).toBe('unknownKey')

		const partial = createTranslator({ today: 'Hoy' })
		expect(partial('today')).toBe('Hoy')
		expect(partial('month')).toBe('Month')
		expect(partial('customKey', 'Custom Fallback')).toBe('Custom Fallback')

		const custom = createTranslator({ today: 'Ignored' }, (key) => `fn:${key}`)
		expect(custom('today')).toBe('fn:today')
	})
})

describe('buildMonthViewModel', () => {
	it('handles hiddenDays, weekNumbers, outsideMonth, businessHours, isCellDisabled, and layout overflow', () => {
		const anchor = fromFields({ year: 2026, month: 3, day: 15 }, 'UTC')
		const events: CalendarEvent[] = [
			{
				id: 'multi',
				title: 'Multi-day',
				start: '2026-03-02T09:00:00Z',
				end: '2026-03-05T17:00:00Z',
			},
			{
				id: 'd1',
				title: 'One',
				start: '2026-03-03T10:00:00Z',
				end: '2026-03-03T11:00:00Z',
			},
			{
				id: 'd2',
				title: 'Two',
				start: '2026-03-03T12:00:00Z',
				end: '2026-03-03T13:00:00Z',
			},
		]

		setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
		try {
			const model = buildMonthViewModel({
				currentDate: anchor,
				events,
				firstDayOfWeek: 0,
				locale: 'en-US',
				hiddenDays: new Set([0, 6]),
				weekNumbers: true,
				weekNumberCalculation: 'ISO',
				dayMaxEvents: 2,
				businessHours: {
					daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday'],
				},
				isCellDisabled: (info) => info.start.startsWith('2026-03-04'),
			})

			expect(model.colCount).toBe(5)
			expect(model.weekdayHeaders).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
			expect(model.weeks).toHaveLength(6)

			const firstWeek = model.weeks[0]
			expect(firstWeek.weekNumber).toBe(10)
			expect(firstWeek.days).toHaveLength(5)
			expect(firstWeek.days[0].key).toBe('2026-03-02')
			expect(firstWeek.days[0].isOutsideMonth).toBe(false)
			expect(firstWeek.days[0].isNonBusiness).toBe(false)
			expect(firstWeek.days[2].isDisabled).toBe(true)
			expect(firstWeek.days[4].isNonBusiness).toBe(true) // Friday closed

			// March 3 has 3 events with dayMaxEvents: 2 -> 1 hidden
			expect(firstWeek.layout.columnLayouts[1].events).toHaveLength(3)
			expect(firstWeek.layout.columnLayouts[1].hiddenCount).toBe(1)

			// Last week has April outside-month days
			const lastWeek = model.weeks[5]
			expect(lastWeek.days.every((day) => day.isOutsideMonth)).toBe(true)
		} finally {
			setSystemTime()
		}
	})
})

describe('buildTimeGridViewModel', () => {
	it('classifies all-day/multi-day events and isolates timezones', () => {
		expect(
			isAllDayOrMultiDay(
				{
					id: 'all',
					title: 'Holiday',
					start: '2026-03-10T00:00:00Z',
					end: '2026-03-11T00:00:00Z',
					allDay: true,
				},
				'UTC'
			)
		).toBe(true)
		expect(
			isAllDayOrMultiDay(
				{
					id: 'span',
					title: '24h Span',
					start: '2026-03-10T09:00:00Z',
					end: '2026-03-11T09:00:00Z',
				},
				'UTC'
			)
		).toBe(true)
		expect(
			isAllDayOrMultiDay(
				{
					id: 'short',
					title: 'Meeting',
					start: '2026-03-10T09:00:00Z',
					end: '2026-03-10T10:30:00Z',
				},
				'UTC'
			)
		).toBe(false)

		const tokyoDate = fromFields(
			{ year: 2026, month: 3, day: 10 },
			'Asia/Tokyo'
		)
		const events: CalendarEvent[] = [
			{
				id: 'utc-timed',
				title: 'Cross-TZ Sync',
				// 01:00Z = 10:00 JST on 2026-03-10
				start: '2026-03-10T01:00:00Z',
				end: '2026-03-10T02:00:00Z',
			},
			{
				id: 'allday',
				title: 'All Day',
				start: '2026-03-10T00:00:00+09:00',
				end: '2026-03-11T00:00:00+09:00',
				allDay: true,
			},
		]

		setSystemTime(new Date('2026-03-10T02:30:00.000Z')) // 11:30 JST
		try {
			const dayModel = buildTimeGridViewModel({
				mode: 'day',
				currentDate: tokyoDate,
				events,
				firstDayOfWeek: 0,
				timezone: 'Asia/Tokyo',
				locale: 'en-US',
				businessHours: { startTime: 9, endTime: 17 },
				hideNonBusinessHours: true,
				nowIndicator: true,
			})

			expect(dayModel.days).toHaveLength(1)
			expect(dayModel.hours.map((h) => h.hour)).toEqual([
				9, 10, 11, 12, 13, 14, 15, 16,
			])
			expect(dayModel.columns).toHaveLength(1)
			const col = dayModel.columns[0]
			expect(col.allDayEvents.map((e) => e.id)).toEqual(['allday'])
			expect(col.timedEvents.map((e) => e.id)).toEqual(['utc-timed'])
			expect(col.positionedEvents).toHaveLength(1)
			// 10:00..11:00 in 9..17 (8 hours) -> top 12.5%, height 12.5%
			expect(col.positionedEvents[0].top).toBeCloseTo(12.5, 5)
			expect(col.positionedEvents[0].height).toBeCloseTo(12.5, 5)
			// 11:30 in 9..17 -> 150 / 480 = 31.25%
			expect(col.nowIndicatorPercent).toBeCloseTo(31.25, 5)
		} finally {
			setSystemTime()
		}
	})

	it('builds resource x day columns in week mode with hiddenDays', () => {
		const resources: Resource[] = [
			{
				id: 'r1',
				title: 'Room A',
				businessHours: { startTime: 8, endTime: 12 },
			},
			{
				id: 'r2',
				title: 'Room B',
				businessHours: { startTime: 13, endTime: 18 },
			},
		]
		const events: CalendarEvent[] = [
			{
				id: 'e1',
				title: 'Morning',
				start: '2026-03-10T09:00:00Z',
				end: '2026-03-10T10:00:00Z',
				resourceId: 'r1',
			},
			{
				id: 'e2',
				title: 'Afternoon',
				start: '2026-03-11T14:00:00Z',
				end: '2026-03-11T15:00:00Z',
				resourceId: 'r2',
			},
		]
		const model = buildTimeGridViewModel({
			mode: 'week',
			currentDate: fromFields({ year: 2026, month: 3, day: 10 }, 'UTC'),
			events,
			resources,
			firstDayOfWeek: 1,
			timezone: 'UTC',
			locale: 'en-US',
			hiddenDays: new Set([0, 6]),
			hideNonBusinessHours: true,
		})

		expect(model.days).toHaveLength(5)
		expect(model.hours.map((h) => h.hour)).toEqual([
			8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
		])
		expect(model.columns).toHaveLength(10)
		expect(model.columns[0].label).toBe('Room A')
		expect(model.columns[1].timedEvents.map((e) => e.id)).toEqual(['e1'])
		expect(model.columns[7].label).toBe('Room B')
		expect(model.columns[7].timedEvents.map((e) => e.id)).toEqual(['e2'])
	})

	it('keeps multi-day timed events in vertical timed columns rather than allDayEvents', () => {
		const model = buildTimeGridViewModel({
			mode: 'week',
			currentDate: fromFields({ year: 2025, month: 3, day: 12 }, 'UTC'),
			events: [
				{
					id: 'span-1',
					title: 'Field survey',
					start: '2025-03-10T09:00:00.000Z',
					end: '2025-03-13T17:00:00.000Z',
				},
			],
			firstDayOfWeek: 0,
			timezone: 'UTC',
			locale: 'en-US',
		})

		expect(model.columns[1].allDayEvents).toEqual([])
		expect(model.columns[1].timedEvents.map((e) => e.id)).toEqual(['span-1'])
		expect(model.columns[2].allDayEvents).toEqual([])
		expect(model.columns[2].timedEvents.map((e) => e.id)).toEqual(['span-1'])
	})
})

describe('buildResourceTimelineViewModel', () => {
	const resources: Resource[] = [
		{ id: 'r1', title: 'Alice' },
		{ id: 'r2', title: 'Bob' },
	]

	it('resolves timeline granularity and builds clamped hourly bars', () => {
		expect(resolveTimelineGranularity('day')).toBe('hourly')
		expect(resolveTimelineGranularity('month')).toBe('daily')
		expect(resolveTimelineGranularity('week')).toBe('hourly')
		expect(resolveTimelineGranularity('week', 'hourly')).toBe('hourly')
		expect(resolveTimelineGranularity('week', 'daily')).toBe('daily')

		const events: CalendarEvent[] = [
			{
				id: 'tiny',
				title: 'Quick Ping',
				start: '2026-03-10T09:00:00Z',
				end: '2026-03-10T09:05:00Z',
				resourceId: 'r1',
			},
			{
				id: 'overlap',
				title: 'Overlap',
				start: '2026-03-10T09:02:00Z',
				end: '2026-03-10T11:00:00Z',
				resourceId: 'r1',
			},
			{
				id: 'later',
				title: 'Later',
				start: '2026-03-10T12:00:00Z',
				end: '2026-03-10T14:00:00Z',
				resourceId: 'r1',
			},
		]

		setSystemTime(new Date('2026-03-10T12:00:00.000Z'))
		try {
			const model = buildResourceTimelineViewModel({
				mode: 'day',
				currentDate: fromFields({ year: 2026, month: 3, day: 10 }, 'UTC'),
				events,
				resources,
				firstDayOfWeek: 0,
				timezone: 'UTC',
				slotMinTime: '08:00',
				slotMaxTime: '18:00',
				nowIndicator: true,
			})

			expect(model.granularity).toBe('hourly')
			expect(model.hourSlots).toHaveLength(10)
			expect(model.nowIndicatorPercent).toBeCloseTo(40, 5)

			const aliceBars = model.rows[0].hourlyBars
			expect(aliceBars).toHaveLength(3)
			expect(aliceBars[0].event.id).toBe('tiny')
			expect(aliceBars[0].widthPercent).toBeCloseTo(4, 5)
			expect(aliceBars[0].lane).toBe(0)
			expect(aliceBars[1].event.id).toBe('overlap')
			expect(aliceBars[1].lane).toBe(1)
			expect(aliceBars[2].event.id).toBe('later')
			expect(aliceBars[2].lane).toBe(0)
			expect(model.rows[0].dailyLayout).toBeUndefined()
			expect(model.rows[1].hourlyBars).toEqual([])
		} finally {
			setSystemTime()
		}
	})

	it('maps discrete hourSlots across DST days, hiddenDays, and exclusive slotMaxTime bounds', () => {
		const springEvents: CalendarEvent[] = [
			{
				id: 'dst-9am',
				title: 'DST 9 AM',
				start: '2025-03-09T13:00:00Z',
				end: '2025-03-09T14:00:00Z',
				resourceId: 'r1',
			},
		]
		setSystemTime(new Date('2025-03-09T13:00:00.000Z'))
		try {
			const springModel = buildResourceTimelineViewModel({
				mode: 'day',
				currentDate: fromFields(
					{ year: 2025, month: 3, day: 9 },
					'America/New_York'
				),
				events: springEvents,
				resources,
				firstDayOfWeek: 0,
				timezone: 'America/New_York',
				nowIndicator: true,
			})
			expect(springModel.nowIndicatorPercent).toBeCloseTo(37.5, 5)
			expect(springModel.rows[0].hourlyBars[0]?.leftPercent).toBeCloseTo(
				37.5,
				5
			)

			const boundAtMax = buildResourceTimelineViewModel({
				mode: 'day',
				currentDate: fromFields(
					{ year: 2025, month: 3, day: 9 },
					'America/New_York'
				),
				events: [],
				resources,
				firstDayOfWeek: 0,
				timezone: 'America/New_York',
				slotMinTime: '06:00',
				slotMaxTime: '09:00',
				nowIndicator: true,
			})
			expect(boundAtMax.nowIndicatorPercent).toBeNull()

			const timeGridAtMax = buildTimeGridViewModel({
				mode: 'day',
				currentDate: fromFields(
					{ year: 2025, month: 3, day: 9 },
					'America/New_York'
				),
				events: [],
				firstDayOfWeek: 0,
				timezone: 'America/New_York',
				locale: 'en-US',
				slotMinTime: '06:00',
				slotMaxTime: '09:00',
				nowIndicator: true,
			})
			expect(timeGridAtMax.columns[0]?.nowIndicatorPercent).toBeNull()
		} finally {
			setSystemTime()
		}

		const hiddenModel = buildResourceTimelineViewModel({
			mode: 'week',
			currentDate: fromFields({ year: 2025, month: 3, day: 12 }, 'UTC'),
			events: [
				{
					id: 'wed-only',
					title: 'Wed Hidden',
					start: '2025-03-12T10:00:00Z',
					end: '2025-03-12T11:00:00Z',
					resourceId: 'r1',
				},
				{
					id: 'thu-2pm',
					title: 'Thu 2 PM',
					start: '2025-03-13T14:00:00Z',
					end: '2025-03-13T15:00:00Z',
					resourceId: 'r1',
				},
			],
			resources,
			firstDayOfWeek: 0,
			timezone: 'UTC',
			hiddenDays: new Set([3]),
		})
		const thuBar = hiddenModel.rows[0].hourlyBars
		expect(thuBar).toHaveLength(1)
		expect(thuBar[0].event.id).toBe('thu-2pm')
		expect(thuBar[0].leftPercent).toBeCloseTo(((3 * 24 + 14) / 144) * 100, 5)
	})

	it('builds daily layout for month mode and week daily granularity', () => {
		const events: CalendarEvent[] = [
			{
				id: 'w1',
				title: 'Sprint',
				start: '2026-03-09T09:00:00Z',
				end: '2026-03-11T17:00:00Z',
				resourceId: 'r1',
			},
		]

		const weekDaily = buildResourceTimelineViewModel({
			mode: 'week',
			weekViewGranularity: 'daily',
			currentDate: fromFields({ year: 2026, month: 3, day: 10 }, 'UTC'),
			events,
			resources,
			firstDayOfWeek: 1,
			timezone: 'UTC',
		})
		expect(weekDaily.granularity).toBe('daily')
		expect(weekDaily.days).toHaveLength(7)
		expect(weekDaily.hourSlots).toEqual([])
		expect(weekDaily.rows[0].hourlyBars).toEqual([])
		expect(weekDaily.rows[0].dailyLayout?.positionedEvents).toHaveLength(1)

		const monthModel = buildResourceTimelineViewModel({
			mode: 'month',
			currentDate: fromFields({ year: 2026, month: 3, day: 10 }, 'UTC'),
			events,
			resources,
			firstDayOfWeek: 1,
			timezone: 'UTC',
		})
		expect(monthModel.granularity).toBe('daily')
		expect(monthModel.days).toHaveLength(31)
	})
})

describe('buildAgendaViewModel', () => {
	it('resolves day, week, month, and numeric windows', () => {
		const anchor = fromFields({ year: 2026, month: 3, day: 11 }, 'UTC')

		const dayRange = resolveAgendaWindowRange(anchor, 'day')
		expect(dayRange.start.day).toBe(11)
		expect(dayRange.end.day).toBe(11)

		const weekRange = resolveAgendaWindowRange(anchor, 'week', 1)
		expect(weekRange.start.day).toBe(9)
		expect(weekRange.end.day).toBe(15)

		const monthRange = resolveAgendaWindowRange(anchor, 'month')
		expect(monthRange.start.day).toBe(1)
		expect(monthRange.end.day).toBe(31)

		const numRange = resolveAgendaWindowRange(anchor, 3)
		expect(numRange.start.day).toBe(11)
		expect(numRange.end.day).toBe(13)

		const guardedRange = resolveAgendaWindowRange(anchor, 0)
		expect(guardedRange.start.day).toBe(11)
		expect(guardedRange.end.day).toBe(11)

		expect(resolveAgendaWindowStep('day')).toEqual({ amount: 1, unit: 'day' })
		expect(resolveAgendaWindowStep('week')).toEqual({ amount: 1, unit: 'week' })
		expect(resolveAgendaWindowStep('month')).toEqual({
			amount: 1,
			unit: 'month',
		})
		expect(resolveAgendaWindowStep(5)).toEqual({ amount: 5, unit: 'day' })
	})

	it('groups multi-day events using exclusive DTEND, sorts all-day first, and sets nowIndicatorPercent', () => {
		const anchor = fromFields({ year: 2026, month: 3, day: 10 }, 'UTC')
		const events: CalendarEvent[] = [
			{
				id: 'timed-late',
				title: 'Late Call',
				start: '2026-03-10T15:00:00Z',
				end: '2026-03-10T16:00:00Z',
			},
			{
				id: 'all-day',
				title: 'Holiday',
				start: '2026-03-10T00:00:00Z',
				end: '2026-03-11T00:00:00Z',
				allDay: true,
			},
			{
				id: 'multi',
				title: 'Conference',
				start: '2026-03-10T09:00:00Z',
				end: '2026-03-13T00:00:00Z', // exclusive midnight -> Mar 10, 11, 12 (3 days)
			},
		]

		setSystemTime(new Date('2026-03-10T06:00:00.000Z'))
		try {
			const model = buildAgendaViewModel({
				currentDate: anchor,
				events,
				window: 5,
				timezone: 'UTC',
				nowIndicator: true,
			})

			expect(model.groups.map((g) => g.key)).toEqual([
				'2026-03-10',
				'2026-03-11',
				'2026-03-12',
			])

			const day1 = model.groups[0]
			expect(day1.isToday).toBe(true)
			expect(day1.nowIndicatorPercent).toBeCloseTo(25, 5)
			expect(day1.entries.map((e) => e.event.id)).toEqual([
				'all-day',
				'multi',
				'timed-late',
			])
			expect(day1.entries[1].dayIndex).toBe(1)
			expect(day1.entries[1].totalDays).toBe(3)
			expect(day1.entries[1].isFirstDay).toBe(true)
			expect(day1.entries[1].isAllDayLabel).toBe(false)

			const day2 = model.groups[1]
			expect(day2.isToday).toBe(false)
			expect(day2.nowIndicatorPercent).toBeNull()
			expect(day2.entries[0].dayIndex).toBe(2)
			expect(day2.entries[0].totalDays).toBe(3)
			expect(day2.entries[0].isAllDayLabel).toBe(true)

			const day3 = model.groups[2]
			expect(day3.entries[0].dayIndex).toBe(3)
			expect(day3.entries[0].isLastDay).toBe(true)
		} finally {
			setSystemTime()
		}
	})
})

describe('buildYearViewModel', () => {
	it('produces 12 months x 42 days with accurate counts, today, and selected flags', () => {
		const anchor = mustParse('2026-06-15T12:00:00Z')
		const events: CalendarEvent[] = [
			{
				id: 'e1',
				title: 'June Event',
				start: '2026-06-15T09:00:00Z',
				end: '2026-06-15T11:00:00Z',
			},
			{
				id: 'e2',
				title: 'June All Day',
				start: '2026-06-15T00:00:00Z',
				end: '2026-06-16T00:00:00Z',
				allDay: true,
			},
			{
				id: 'e3',
				title: 'Jan Event',
				start: '2026-01-05T10:00:00Z',
				end: '2026-01-05T12:00:00Z',
			},
		]

		setSystemTime(new Date('2026-06-10T08:00:00.000Z'))
		try {
			const model = buildYearViewModel({
				currentDate: anchor,
				events,
				firstDayOfWeek: 1,
				timezone: 'UTC',
				locale: 'en-US',
			})

			expect(model.year).toBe(2026)
			expect(model.weekdayHeaders).toHaveLength(7)
			expect(model.weekdayHeaders[0].id).toBe('1')
			expect(model.months).toHaveLength(12)

			for (const month of model.months) {
				expect(month.days).toHaveLength(42)
			}

			const jan = model.months[0]
			expect(jan.monthKey).toBe('01')
			expect(jan.yearMonthKey).toBe('2026-01')
			expect(jan.eventCount).toBe(1)

			const june = model.months[5]
			expect(june.monthKey).toBe('06')
			expect(june.yearMonthKey).toBe('2026-06')
			expect(june.eventCount).toBe(2)

			const selectedDay = june.days.find((d) => d.dayKey === '2026-06-15')
			expect(selectedDay?.isSelected).toBe(true)
			expect(selectedDay?.isInCurrentMonth).toBe(true)
			expect(selectedDay?.eventCount).toBe(2)

			const todayDay = june.days.find((d) => d.dayKey === '2026-06-10')
			expect(todayDay?.isToday).toBe(true)

			const june16 = june.days.find((d) => d.dayKey === '2026-06-16')
			expect(june16?.eventCount).toBe(0)
		} finally {
			setSystemTime()
		}
	})
})
