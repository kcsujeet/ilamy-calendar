import { describe, expect, it } from 'bun:test'
import { RRule } from 'rrule'
import type { RRuleOptions } from '@/features/recurrence/types'
import {
	buildPresetOptions,
	detectPresetFromOptions,
	getWeekdayPositionInMonth,
} from './recurrence-preset-utils'

const REF = new Date('2025-05-16T09:00:00.000Z')

describe('recurrence-preset-utils', () => {
	it('builds daily preset', () => {
		const opts = buildPresetOptions('daily', REF)
		expect(opts?.freq).toBe(RRule.DAILY)
		expect(opts?.interval).toBe(1)
	})

	it('builds weekdays preset with Mon–Fri', () => {
		const opts = buildPresetOptions('weekdays', REF)
		expect(opts?.freq).toBe(RRule.WEEKLY)
		expect(opts?.byweekday).toHaveLength(5)
	})

	it('builds weekly on Friday for a Friday reference date', () => {
		const opts = buildPresetOptions('weeklyOnDay', REF)
		expect(opts?.freq).toBe(RRule.WEEKLY)
		expect(opts?.byweekday).toHaveLength(1)
	})

	it('builds monthly on day 16', () => {
		const opts = buildPresetOptions('monthlyOnDay', REF)
		expect(opts?.freq).toBe(RRule.MONTHLY)
		expect(opts?.bymonthday).toEqual([16])
	})

	it('detects once for null options', () => {
		expect(detectPresetFromOptions(null, REF)).toBe('once')
	})

	it('detects daily preset round-trip', () => {
		const built = buildPresetOptions('daily', REF) as RRuleOptions
		expect(detectPresetFromOptions(built, REF)).toBe('daily')
	})

	it('detects weekdays preset round-trip', () => {
		const built = buildPresetOptions('weekdays', REF) as RRuleOptions
		expect(detectPresetFromOptions(built, REF)).toBe('weekdays')
	})

	it('detects customize when interval is not 1', () => {
		expect(
			detectPresetFromOptions(
				{ freq: RRule.DAILY, interval: 2, dtstart: REF },
				REF
			)
		).toBe('customize')
	})

	it('computes third Friday for mid-month Friday', () => {
		const thirdFriday = new Date('2025-05-16T09:00:00.000Z')
		expect(getWeekdayPositionInMonth(thirdFriday)).toBe(3)
	})
})
