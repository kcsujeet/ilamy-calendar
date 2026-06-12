import { describe, expect, it } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { keys } from './keys'

const monday = dayjs('2025-10-13T00:00:00.000Z')

describe('keys.col', () => {
	it('returns stable constants for time/date columns', () => {
		expect(keys.col.time).toBe('time-col')
		expect(keys.col.date).toBe('date-col')
	})

	it('generates a day column id (no resource)', () => {
		expect(keys.col.day(monday)).toBe('day-col-2025-10-13')
	})

	it('generates a day column id with resource', () => {
		expect(keys.col.day(monday, 'r1')).toBe('day-col-2025-10-13-resource-r1')
		expect(keys.col.day(monday, 42)).toBe('day-col-2025-10-13-resource-42')
	})

	it('generates a resource column id per scope', () => {
		expect(keys.col.resource('week', 'r1')).toBe('week-col-resource-r1')
		expect(keys.col.resource('month', 'r1')).toBe('month-col-resource-r1')
	})

	it('generates an all-day column id (day + index, YYYY-MM-DD format)', () => {
		expect(keys.col.allDay(monday, 0)).toBe('all-day-col-2025-10-13-0')
		expect(keys.col.allDay(monday, 3)).toBe('all-day-col-2025-10-13-3')
	})
})

describe('keys.cell', () => {
	it('generates a day-cell id (no hour)', () => {
		expect(keys.cell.day(monday)).toBe('day-cell-2025-10-13')
	})

	it('generates a day-cell id with hour/minute, zero-padded', () => {
		expect(keys.cell.day(monday, 9, 0)).toBe('day-cell-2025-10-13-09-00')
		expect(keys.cell.day(monday, 14, 30)).toBe('day-cell-2025-10-13-14-30')
	})

	it('defaults minute to 0 when only hour is provided', () => {
		expect(keys.cell.day(monday, 9)).toBe('day-cell-2025-10-13-09-00')
	})

	it('generates a vertical time id with padding', () => {
		expect(keys.cell.verticalTime(0)).toBe('vertical-time-00')
		expect(keys.cell.verticalTime(23)).toBe('vertical-time-23')
	})

	it('generates a vertical cell id with optional resource (resource- marker)', () => {
		expect(keys.cell.vertical(monday, 9, 0)).toBe(
			'vertical-cell-2025-10-13-09-00'
		)
		expect(keys.cell.vertical(monday, 9, 30, 'r1')).toBe(
			'vertical-cell-2025-10-13-09-30-resource-r1'
		)
	})
})

describe('keys.container', () => {
	it('vertical.col id', () => {
		expect(keys.container.vertical.col('time-col')).toBe(
			'vertical-col-time-col'
		)
	})

	it('horizontal ids', () => {
		expect(keys.container.horizontal.row('r1')).toBe('horizontal-row-r1')
		expect(keys.container.horizontal.rowLabel('r1')).toBe(
			'horizontal-row-label-r1'
		)
		expect(keys.container.horizontal.event('evt-1')).toBe(
			'horizontal-event-evt-1'
		)
	})

	it('events-layer id by orientation', () => {
		expect(keys.container.eventsLayer('vertical', 'day-col-x')).toBe(
			'vertical-events-day-col-x'
		)
		expect(keys.container.eventsLayer('horizontal', 'day-col-x')).toBe(
			'horizontal-events-day-col-x'
		)
	})
})

describe('keys.header', () => {
	it('resource headers', () => {
		expect(keys.header.resource.weekDay).toBe('resource-week-day-header')
		expect(keys.header.resource.timeLabel('week', 0)).toBe(
			'resource-week-time-label-00'
		)
		expect(keys.header.resource.timeLabel('day', 9)).toBe(
			'resource-day-time-label-09'
		)
	})

	it('weekday header per view', () => {
		expect(keys.header.weekday('week', 'Monday')).toBe(
			'week-header-weekday-monday'
		)
		expect(keys.header.weekday('month', 'Mon')).toBe('month-header-weekday-mon')
	})

	it('week headers', () => {
		expect(keys.header.week.day(monday)).toBe(
			'week-header-day-2025-10-13T00:00:00.000Z'
		)
		expect(keys.header.week.hour(monday, 'r1')).toBe(
			'week-header-hour-2025-10-13T00:00:00.000Z-r1'
		)
		expect(keys.header.week.resource('r1')).toBe('week-header-resource-r1')
	})

	it('year month card parts', () => {
		expect(keys.header.year.month('01')).toBe('year-month-01')
		expect(keys.header.year.month('01', 'title')).toBe('year-month-title-01')
		expect(keys.header.year.month('01', 'count')).toBe('year-month-count-01')
		expect(keys.header.year.month('01', 'mini')).toBe('year-month-mini-01')
	})

	it('year day cell id (monthKey scopes dayKey for duplicate adjacent-month days)', () => {
		expect(keys.header.year.day('2025-01', '2025-01-15')).toBe(
			'year-day-2025-01-2025-01-15'
		)
	})
})

describe('keys.allDayRow', () => {
	it('resource-scoped all-day row id', () => {
		expect(keys.allDayRow('r1')).toBe('allday-row-r1')
	})

	it('allDayRow falls back to "main" when no resource id is given', () => {
		expect(keys.allDayRow()).toBe('allday-row-main')
		expect(keys.allDayRow(undefined)).toBe('allday-row-main')
	})
})

describe('keys.dayNumber (DayNumber component testid)', () => {
	it('returns "day-number-{D}" for any non-today date', () => {
		expect(keys.dayNumber(monday)).toBe('day-number-13')
		expect(keys.dayNumber(dayjs('2025-10-05T00:00:00.000Z'))).toBe(
			'day-number-5'
		)
	})

	it('returns "day-number-today" when the date is today', () => {
		expect(keys.dayNumber(dayjs())).toBe('day-number-today')
	})
})

describe('keys.timePicker', () => {
	it('builds a named time-picker testid', () => {
		expect(keys.timePicker('start')).toBe('time-picker-start')
		expect(keys.timePicker('end')).toBe('time-picker-end')
	})
})

describe('keys.listKey (generic iteration key composer)', () => {
	it('joins string + number parts with hyphens', () => {
		expect(keys.listKey('col-1', 0)).toBe('col-1-0')
		expect(keys.listKey('time-col', 2, '09')).toBe('time-col-2-09')
		expect(keys.listKey('month', '01')).toBe('month-01')
		expect(keys.listKey('header', '01', 'mon')).toBe('header-01-mon')
	})
})

describe('keys.droppable (dnd-kit registry)', () => {
	it('uses drop- prefix + ISO timestamp for unique day-cell droppable ids', () => {
		expect(keys.droppable.dayCell(monday)).toBe(
			'drop-day-cell-2025-10-13T00:00:00.000Z'
		)
	})

	it('appends -allday marker', () => {
		expect(keys.droppable.dayCell(monday, { allDay: true })).toBe(
			'drop-day-cell-2025-10-13T00:00:00.000Z-allday'
		)
	})

	it('appends resource marker', () => {
		expect(keys.droppable.dayCell(monday, { resourceId: 'r1' })).toBe(
			'drop-day-cell-2025-10-13T00:00:00.000Z-resource-r1'
		)
	})

	it('appends both markers in the expected order (allday before resource)', () => {
		expect(
			keys.droppable.dayCell(monday, { allDay: true, resourceId: 'r1' })
		).toBe('drop-day-cell-2025-10-13T00:00:00.000Z-allday-resource-r1')
	})
})
