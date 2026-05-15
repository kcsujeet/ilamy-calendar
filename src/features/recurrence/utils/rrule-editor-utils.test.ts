import { describe, expect, it } from 'bun:test'
import { RRule } from 'rrule'
import type { RRuleOptions } from '@/features/recurrence/types'
import dayjs from '@/lib/configs/dayjs-config'
import {
	alignStartWithRRule,
	buildMonthlyPatch,
	buildYearlyPatch,
	expandOnTheDay,
	formatPositionForSelect,
	isStartCompatibleWithRRule,
	normalizeOnTheDaySelection,
	occurrenceMatchesByRules,
	parseMonthlyMode,
	parseOnTheDaySelection,
	parseOnThePosition,
	parsePositionFromSelect,
	parseYearlyMode,
	sanitizeOptionsForFreq,
} from './rrule-editor-utils'

const baseOpts = (partial: Partial<RRuleOptions>): RRuleOptions => ({
	freq: RRule.MONTHLY,
	interval: 1,
	dtstart: new Date('2025-05-30T16:00:00.000Z'),
	...partial,
})

describe('rrule-editor-utils', () => {
	it('parseMonthlyMode detects bymonthday vs byweekday nth', () => {
		expect(parseMonthlyMode({ bymonthday: [15] })).toBe('bymonthday')
		expect(parseMonthlyMode({ byweekday: [RRule.FR.nth(-1)] })).toBe(
			'byweekday'
		)
	})

	it('parseOnTheDaySelection detects DAY, WEEKDAY, WEEKEND, and single weekday', () => {
		expect(parseOnTheDaySelection([RRule.FR.nth(-1)])).toBe('FR')
		expect(parseOnTheDaySelection(expandOnTheDay('DAY', 2))).toBe('DAY')
		expect(parseOnTheDaySelection(expandOnTheDay('WEEKDAY', 2))).toBe('WEEKDAY')
		expect(parseOnTheDaySelection(expandOnTheDay('WEEKEND', -1))).toBe(
			'WEEKEND'
		)
	})

	it('parseOnThePosition reads nth from byweekday', () => {
		expect(parseOnThePosition([RRule.FR.nth(-1)])).toBe(-1)
		expect(parseOnThePosition([RRule.MO.nth(3)])).toBe(3)
	})

	it('buildMonthlyPatch builds bymonthday and byweekday nth', () => {
		expect(
			buildMonthlyPatch('bymonthday', {
				dayOfMonth: 15,
				onTheDay: 'MO',
				position: 1,
			})
		).toEqual({
			bymonthday: [15],
			byweekday: undefined,
			bymonth: undefined,
		})

		expect(
			buildMonthlyPatch('byweekday', {
				dayOfMonth: 15,
				onTheDay: 'FR',
				position: -1,
			})
		).toEqual({
			bymonthday: undefined,
			bymonth: undefined,
			byweekday: [RRule.FR.nth(-1)],
		})
	})

	it('buildYearlyPatch includes bymonth', () => {
		expect(
			buildYearlyPatch('bymonthday', {
				month: 6,
				dayOfMonth: 15,
				onTheDay: 'MO',
				position: 1,
			})
		).toEqual({
			bymonth: [6],
			bymonthday: [15],
			byweekday: undefined,
		})
	})

	it('sanitizeOptionsForFreq clears incompatible fields on frequency change', () => {
		const weeklyOpts = baseOpts({
			freq: RRule.WEEKLY,
			byweekday: [RRule.MO, RRule.WE],
		})
		const daily = sanitizeOptionsForFreq(
			RRule.DAILY,
			weeklyOpts,
			new Date('2025-05-15T10:00:00.000Z')
		)
		expect(daily.byweekday).toBeUndefined()
		expect(daily.bymonthday).toBeUndefined()

		const monthly = sanitizeOptionsForFreq(
			RRule.MONTHLY,
			weeklyOpts,
			new Date('2025-05-15T10:00:00.000Z')
		)
		expect(monthly.bymonthday).toEqual([15])
		expect(monthly.byweekday).toBeUndefined()
	})

	it('normalizeOnTheDaySelection rejects position-like values', () => {
		expect(normalizeOnTheDaySelection('-1')).toBe('MO')
		expect(normalizeOnTheDaySelection('last')).toBe('MO')
		expect(normalizeOnTheDaySelection('FR')).toBe('FR')
	})

	it('parsePositionFromSelect maps last to -1 without colliding with day keys', () => {
		expect(parsePositionFromSelect('last')).toBe(-1)
		expect(formatPositionForSelect(-1)).toBe('last')
		expect(formatPositionForSelect(2)).toBe('2')
	})

	it('expandOnTheDay does not throw for invalid day strings', () => {
		const result = expandOnTheDay('-1', -1)
		expect(result).toHaveLength(1)
		expect(result[0].weekday).toBe(RRule.MO.weekday)
	})

	it('buildMonthlyPatch handles event-22-style last Friday rule', () => {
		const patch = buildMonthlyPatch('byweekday', {
			dayOfMonth: 1,
			onTheDay: 'FR',
			position: -1,
		})
		expect(patch.byweekday).toEqual([RRule.FR.nth(-1)])
	})

	it('parseYearlyMode mirrors monthly detection', () => {
		expect(parseYearlyMode({ bymonth: [6], bymonthday: [15] })).toBe(
			'bymonthday'
		)
		expect(
			parseYearlyMode({ bymonth: [6], byweekday: [RRule.FR.nth(2)] })
		).toBe('byweekday')
	})

	it('occurrenceMatchesByRules validates weekly and monthly BY fields', () => {
		const wednesday = dayjs('2025-05-14T10:00:00.000Z')
		const thursday = dayjs('2025-05-15T10:00:00.000Z')

		expect(
			occurrenceMatchesByRules(wednesday, {
				freq: RRule.WEEKLY,
				interval: 1,
				byweekday: [RRule.WE],
				dtstart: wednesday.toDate(),
			})
		).toBe(true)
		expect(
			occurrenceMatchesByRules(thursday, {
				freq: RRule.WEEKLY,
				interval: 1,
				byweekday: [RRule.WE],
				dtstart: thursday.toDate(),
			})
		).toBe(false)

		expect(
			occurrenceMatchesByRules(dayjs('2025-05-20T10:00:00.000Z'), {
				freq: RRule.MONTHLY,
				interval: 1,
				bymonthday: [20],
				dtstart: new Date('2025-05-15T10:00:00.000Z'),
			})
		).toBe(true)
		expect(
			isStartCompatibleWithRRule(dayjs('2025-05-15T10:00:00.000Z'), {
				freq: RRule.MONTHLY,
				interval: 1,
				bymonthday: [20],
				dtstart: new Date('2025-05-15T10:00:00.000Z'),
			})
		).toBe(false)
	})

	it('alignStartWithRRule snaps customize monthly on day to same month', () => {
		const start = dayjs('2025-05-15T10:00:00.000Z')
		const aligned = alignStartWithRRule(start, {
			freq: RRule.MONTHLY,
			interval: 1,
			bymonthday: [20],
			dtstart: start.toDate(),
		})

		expect(aligned.date()).toBe(20)
		expect(aligned.month()).toBe(4)
		expect(aligned.hour()).toBe(10)
	})

	it('alignStartWithRRule snaps monthly last Friday to May 30 2025', () => {
		const start = dayjs('2025-05-15T10:00:00.000Z')
		const aligned = alignStartWithRRule(start, {
			freq: RRule.MONTHLY,
			interval: 1,
			byweekday: [RRule.FR.nth(-1)],
			dtstart: start.toDate(),
		})

		expect(aligned.format('YYYY-MM-DD')).toBe('2025-05-30')
	})

	it('alignStartWithRRule moves weekly BYDAY to the next matching weekday', () => {
		const start = dayjs('2025-05-15T10:00:00.000Z')
		const aligned = alignStartWithRRule(start, {
			freq: RRule.WEEKLY,
			interval: 1,
			byweekday: [RRule.FR],
			dtstart: start.toDate(),
		})

		expect(aligned.format('YYYY-MM-DD')).toBe('2025-05-16')
	})
})
