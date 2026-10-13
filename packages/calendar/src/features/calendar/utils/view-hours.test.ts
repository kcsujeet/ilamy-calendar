import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import type { BusinessHours, WeekDays } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { getViewHours } from './view-hours'

describe('getViewHours', () => {
	const referenceDate = dayjs('2025-01-01T00:00:00.000Z') // A Wednesday

	test('returns 24 hours when hideNonBusinessHours is false', () => {
		const hours = getViewHours({
			referenceDate,
			hideNonBusinessHours: false,
		})
		expect(hours.length).toBe(24)
		expect(hours[0].hour()).toBe(0)
		expect(hours[23].hour()).toBe(23)
	})

	test('returns 24 hours when businessHours is not provided', () => {
		const hours = getViewHours({
			referenceDate,
			hideNonBusinessHours: true,
		})
		expect(hours.length).toBe(24)
	})

	test('filters hours based on simple businessHours', () => {
		const businessHours = {
			startTime: 9,
			endTime: 17,
		}
		const hours = getViewHours({
			referenceDate,
			businessHours,
			hideNonBusinessHours: true,
		})
		expect(hours.length).toBe(8) // 9, 10, 11, 12, 13, 14, 15, 16
		expect(hours[0].hour()).toBe(9)
		expect(hours[7].hour()).toBe(16)
	})

	test('handles multiple days with different business hours', () => {
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const tuesday = dayjs('2025-01-07T00:00:00.000Z')
		const businessHours = [
			{ daysOfWeek: ['monday'] as WeekDays[], startTime: 8, endTime: 12 },
			{ daysOfWeek: ['tuesday'] as WeekDays[], startTime: 14, endTime: 18 },
		]

		const hours = getViewHours({
			referenceDate: monday,
			allDates: [monday, tuesday],
			businessHours,
			hideNonBusinessHours: true,
		})

		// Range should be earliest start (8) to latest end (18)
		expect(hours.length).toBe(10) // 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
		expect(hours[0].hour()).toBe(8)
		expect(hours[9].hour()).toBe(17)
	})

	test('falls back to 9-17 if startTime/endTime are missing in config', () => {
		const businessHours = { daysOfWeek: ['wednesday'] as WeekDays[] }
		const hours = getViewHours({
			referenceDate,
			businessHours,
			hideNonBusinessHours: true,
		})
		expect(hours[0].hour()).toBe(9)
		expect(hours[7].hour()).toBe(16)
	})

	test('falls back to global business hours range if no config found for the specific date', () => {
		const sunday = dayjs('2025-01-05T00:00:00.000Z')
		const businessHours = [
			{ daysOfWeek: ['monday'] as WeekDays[], startTime: 10, endTime: 18 },
		]
		const hours = getViewHours({
			referenceDate: sunday,
			businessHours,
			hideNonBusinessHours: true,
		})
		// Should use the 10-18 range from Monday since Sunday has no config
		expect(hours.length).toBe(8)
		expect(hours[0].hour()).toBe(10)
		expect(hours[7].hour()).toBe(17)
	})

	test('merges global and resource-specific business hours', () => {
		const globalBH = { startTime: 10, endTime: 16 }
		const resourceBH = [
			{
				daysOfWeek: ['wednesday'] as WeekDays[],
				startTime: 8,
				endTime: 12,
			},
			{
				daysOfWeek: ['wednesday'] as WeekDays[],
				startTime: 14,
				endTime: 18,
			},
		]
		const hours = getViewHours({
			referenceDate,
			businessHours: globalBH,
			resourceBusinessHours: [resourceBH],
			hideNonBusinessHours: true,
		})
		// Earliest start: 8, Latest end: 18
		expect(hours[0].hour()).toBe(8)
		expect(hours[hours.length - 1].hour()).toBe(17)
		expect(hours.length).toBe(10)
	})

	test('handles multiple overlapping or separate rules (user-reported split shifts)', () => {
		const businessHours: BusinessHours[] = [
			{
				daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
				startTime: 10,
				endTime: 12,
			},
			{
				daysOfWeek: ['tuesday'],
				startTime: 14,
				endTime: 16,
			},
		]

		const hours = getViewHours({
			referenceDate: dayjs('2025-01-07T00:00:00.000Z'), // Tuesday
			businessHours,
			hideNonBusinessHours: true,
		})

		// Should show range from earliest start (10) to latest end (16)
		expect(hours[0].hour()).toBe(10)
		expect(hours[hours.length - 1].hour()).toBe(15)
		expect(hours.length).toBe(6) // 10, 11, 12, 13, 14, 15
	})

	test('keeps partially-business boundary hours visible for sub-hour boundaries', () => {
		const businessHours: BusinessHours = {
			startTime: '09:15',
			endTime: '17:15',
		}

		const hours = getViewHours({
			referenceDate,
			businessHours,
			hideNonBusinessHours: true,
		})

		// The 9:00 row hosts the 9:15 start and the 17:00 row the 17:15 end.
		expect(hours).toHaveLength(9) // 9 .. 17
		expect(hours.at(0)?.hour()).toBe(9)
		expect(hours.at(-1)?.hour()).toBe(17)
	})

	/**
	 * An empty range is one whose end does not follow its start. It can no longer
	 * be written as `0` to `0`: an `endTime` of 0 means midnight at the END of the
	 * day, so that config now describes a full 24 hours.
	 */
	test('returns no hours when business range is empty', () => {
		const businessHours: BusinessHours = {
			daysOfWeek: ['wednesday'],
			startTime: 9,
			endTime: 9,
		}

		const hours = getViewHours({
			referenceDate,
			businessHours,
			hideNonBusinessHours: true,
		})

		expect(hours).toHaveLength(0)
	})
})

/**
 * `slotMinTime` / `slotMaxTime` choose the clock range an hour grid shows,
 * independently of business hours. `slotMaxTime` is exclusive, as in
 * FullCalendar (v7.1.1 `options.ts:499-500`).
 */
describe('getViewHours with slotMinTime / slotMaxTime', () => {
	const referenceDate = dayjs('2025-01-01T00:00:00.000Z')
	const getVisibleHours = (slotMinTime?: string, slotMaxTime?: string) =>
		getViewHours({ referenceDate, slotMinTime, slotMaxTime }).map((h) =>
			h.hour()
		)

	test('shows 08:00 to 18:00 as ten hourly rows, the end exclusive', () => {
		expect(getVisibleHours('08:00', '18:00')).toEqual([
			8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
		])
	})

	test('shows all 24 hours when neither is set or they name the whole day', () => {
		expect(getVisibleHours()).toHaveLength(24)
		expect(getVisibleHours('00:00', '24:00')).toHaveLength(24)
	})

	test('accepts a lone slotMinTime or slotMaxTime', () => {
		expect(getVisibleHours('20:00')).toEqual([20, 21, 22, 23])
		expect(getVisibleHours(undefined, '03:00')).toEqual([0, 1, 2])
	})

	test('accepts HH:mm:ss', () => {
		expect(getVisibleHours('08:00:00', '10:00:00')).toEqual([8, 9])
	})

	test('rounds a sub-hour bound outward so the hour hosting it stays visible', () => {
		expect(getVisibleHours('08:30', '10:30')).toEqual([8, 9, 10])
	})

	test.each([
		['an unparseable min', 'banana', '18:00'],
		['an unparseable max', '08:00', 'late'],
		['a min past 24:00', '25:00', undefined],
		['a max past 24:00', undefined, '25:00'],
		['minutes past 59', '08:75', '18:00'],
		['a max that is not after the min', '18:00', '08:00'],
		['a max equal to the min', '08:00', '08:00'],
	])('falls back to all 24 hours for %s', (_name, min, max) => {
		expect(getVisibleHours(min, max)).toHaveLength(24)
	})

	test('intersects with hideNonBusinessHours rather than overriding it', () => {
		const hours = getViewHours({
			referenceDate,
			businessHours: { startTime: 9, endTime: 17 },
			hideNonBusinessHours: true,
			slotMinTime: '12:00',
			slotMaxTime: '20:00',
		})
		expect(hours.map((h) => h.hour())).toEqual([12, 13, 14, 15, 16])
	})

	test('leaves business-hours filtering untouched when no slot range is set', () => {
		const hours = getViewHours({
			referenceDate,
			businessHours: { startTime: 9, endTime: 17 },
			hideNonBusinessHours: true,
		})
		expect(hours).toHaveLength(8)
	})

	describe('when the business hours do not overlap the window', () => {
		let warnSpy: ReturnType<typeof spyOn>
		beforeEach(() => {
			warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
		})
		afterEach(() => {
			warnSpy.mockRestore()
		})

		const getEveningWindowHours = (slotMinTime: string) =>
			getViewHours({
				referenceDate,
				businessHours: { startTime: 9, endTime: 17 },
				hideNonBusinessHours: true,
				slotMinTime,
				slotMaxTime: '24:00',
			}).map((h) => h.hour())

		test('falls back to the slot window alone instead of an empty grid', () => {
			expect(getEveningWindowHours('18:00')).toEqual([18, 19, 20, 21, 22, 23])
		})

		test('warns once, naming both props, however often it is asked', () => {
			getEveningWindowHours('19:00')
			getEveningWindowHours('19:00')

			expect(warnSpy).toHaveBeenCalledTimes(1)
			const message = String(warnSpy.mock.calls.at(0)?.at(0))
			expect(message).toContain('slotMinTime')
			expect(message).toContain('hideNonBusinessHours')
		})

		test('does not warn when the ranges overlap', () => {
			getEveningWindowHours('12:00')

			expect(warnSpy).not.toHaveBeenCalled()
		})
	})

	describe('on a day the clocks change', () => {
		const originalTz = dayjs.tz.guess()
		beforeEach(() => {
			dayjs.tz.setDefault('America/New_York')
		})
		afterEach(() => {
			dayjs.tz.setDefault(originalTz)
		})

		test.each([
			['spring forward', '2025-03-09'],
			['fall back', '2025-11-02'],
		])('keeps one wall-clock row per hour on %s', (_name, day) => {
			const hours = getViewHours({
				referenceDate: dayjs(day),
				slotMinTime: '08:00',
				slotMaxTime: '18:00',
			})
			expect(hours.map((h) => h.hour())).toEqual([
				8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
			])
		})

		test('keeps the same number of rows when the window spans the skipped hour', () => {
			const hours = getViewHours({
				referenceDate: dayjs('2025-03-09'),
				slotMinTime: '01:00',
				slotMaxTime: '04:00',
			})
			expect(hours).toHaveLength(3)
		})
	})
})
