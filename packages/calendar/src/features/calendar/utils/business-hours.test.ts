import { describe, expect, it } from 'bun:test'
import type { BusinessHours } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { isBusinessHour } from './business-hours'

describe('isBusinessHour', () => {
	const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday
	const sunday = dayjs('2025-01-05T00:00:00.000Z') // Sunday

	it('should return true when businessHours is undefined', () => {
		expect(isBusinessHour({ date: monday, hour: 10, minute: 0 })).toBe(true)
	})

	it('should respect custom businessHours object', () => {
		const config: BusinessHours = {
			daysOfWeek: ['monday'], // Monday only
			startTime: 10,
			endTime: 14,
		}
		expect(
			isBusinessHour({
				date: monday,
				hour: 11,
				minute: 0,
				businessHours: config,
			})
		).toBe(true)
		expect(
			isBusinessHour({
				date: monday,
				hour: 9,
				minute: 0,
				businessHours: config,
			})
		).toBe(false)
		expect(
			isBusinessHour({
				date: monday,
				hour: 14,
				minute: 0,
				businessHours: config,
			})
		).toBe(false)
		expect(
			isBusinessHour({
				date: sunday,
				hour: 11,
				minute: 0,
				businessHours: config,
			})
		).toBe(false)
	})

	it('should handle minutes correctly', () => {
		// Note: With integer hours, we can't specify 9:30 start time in config anymore
		// But we can test if 9:30 falls within 9-17 range
		const config: BusinessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		expect(
			isBusinessHour({
				date: monday,
				hour: 8,
				minute: 59,
				businessHours: config,
			})
		).toBe(false) // 8:59 -> false
		expect(
			isBusinessHour({
				date: monday,
				hour: 9,
				minute: 0,
				businessHours: config,
			})
		).toBe(true) // 9:00 -> true
		expect(
			isBusinessHour({
				date: monday,
				hour: 9,
				minute: 30,
				businessHours: config,
			})
		).toBe(true) // 9:30 -> true
		expect(
			isBusinessHour({
				date: monday,
				hour: 16,
				minute: 59,
				businessHours: config,
			})
		).toBe(true) // 16:59 -> true
		expect(
			isBusinessHour({
				date: monday,
				hour: 17,
				minute: 0,
				businessHours: config,
			})
		).toBe(false) // 17:00 -> false
	})

	it('should work correctly regardless of firstDayOfWeek setting', () => {
		// This test verifies that isBusinessHour relies on the absolute date,
		// not on any relative week index.
		// We simulate this by checking a Sunday and a Monday.
		// Sunday is day 0, Monday is day 1 in dayjs.

		const sundayDate = dayjs('2025-01-05T00:00:00.000Z') // Sunday
		const mondayDate = dayjs('2025-01-06T00:00:00.000Z') // Monday

		const config: BusinessHours = {
			daysOfWeek: ['monday'], // Only Monday is business day
			startTime: 9,
			endTime: 17,
		}

		expect(
			isBusinessHour({
				date: sundayDate,
				hour: 10,
				minute: 0,
				businessHours: config,
			})
		).toBe(false)
		expect(
			isBusinessHour({
				date: mondayDate,
				hour: 10,
				minute: 0,
				businessHours: config,
			})
		).toBe(true)

		// Even if we had a config that included Sunday
		const sundayConfig: BusinessHours = {
			daysOfWeek: ['sunday'],
			startTime: 9,
			endTime: 17,
		}
		expect(
			isBusinessHour({
				date: sundayDate,
				hour: 10,
				minute: 0,
				businessHours: sundayConfig,
			})
		).toBe(true)
		expect(
			isBusinessHour({
				date: mondayDate,
				hour: 10,
				minute: 0,
				businessHours: sundayConfig,
			})
		).toBe(false)
	})

	it('should check only day if hour is undefined', () => {
		const config: BusinessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		// Monday is a business day -> true
		expect(isBusinessHour({ date: monday, businessHours: config })).toBe(true)

		// Sunday is not a business day -> false
		expect(isBusinessHour({ date: sunday, businessHours: config })).toBe(false)
	})

	describe('sub-hour boundaries', () => {
		const mondayHours = (
			startTime: number | string,
			endTime: number | string
		): BusinessHours => ({
			daysOfWeek: ['monday'],
			startTime,
			endTime,
		})
		const check = (
			businessHours: BusinessHours,
			hour: number,
			minute = 0,
			durationMinutes?: number
		) =>
			isBusinessHour({
				date: monday,
				hour,
				minute,
				durationMinutes,
				businessHours,
			})

		it('accepts HH:mm strings for startTime and endTime', () => {
			const config = mondayHours('09:15', '17:15')
			const results = [
				check(config, 9, 0),
				check(config, 9, 15),
				check(config, 17, 0),
				check(config, 17, 15),
			]
			expect(results).toEqual([false, true, true, false])
		})

		it('rounds fractional numbers to the nearest whole hour', () => {
			// Sub-hour boundaries are strings-only; 9.25 is NOT 9:15.
			const config = mondayHours(9.25, 16.75)
			const results = [
				check(config, 8, 59),
				check(config, 9, 0),
				check(config, 16, 59),
				check(config, 17, 0),
			]
			expect(results).toEqual([false, true, true, false])
		})

		it('treats a slot as business only when the whole slot fits (durationMinutes)', () => {
			const config = mondayHours('09:15', '17:15')
			// Hour slots: 9:00-10:00 crosses the 9:15 start, 17:00-18:00 the 17:15 end.
			const hourSlots = [
				check(config, 9, 0, 60),
				check(config, 10, 0, 60),
				check(config, 16, 0, 60),
				check(config, 17, 0, 60),
			]
			expect(hourSlots).toEqual([false, true, true, false])
			// 15-minute slots align exactly with the boundaries.
			const quarterSlots = [
				check(config, 9, 0, 15),
				check(config, 9, 15, 15),
				check(config, 17, 0, 15),
				check(config, 17, 15, 15),
			]
			expect(quarterSlots).toEqual([false, true, true, false])
		})

		it('keeps whole-slot containment identical to the point check for integer configs', () => {
			const config = mondayHours(9, 17)
			const hourSlots = [
				check(config, 8, 0, 60),
				check(config, 9, 0, 60),
				check(config, 16, 0, 60),
				check(config, 17, 0, 60),
			]
			expect(hourSlots).toEqual([false, true, true, false])
		})

		it('falls back to the 9-17 defaults for malformed time strings', () => {
			const config = mondayHours('9am', 'bogus')
			const results = [
				check(config, 8, 59),
				check(config, 9, 0),
				check(config, 16, 59),
				check(config, 17, 0),
			]
			expect(results).toEqual([false, true, true, false])
		})

		it('falls back to the 9-17 defaults for out-of-range time strings', () => {
			const config = mondayHours('9:99', '25:00')
			const results = [
				check(config, 8, 59),
				check(config, 9, 0),
				check(config, 16, 59),
				check(config, 17, 0),
			]
			expect(results).toEqual([false, true, true, false])
		})

		describe('slot duration × boundary matrix', () => {
			// Each slot tuple is [hour, minute, expectedBusiness] for the given
			// slot duration. Whole-slot containment: enabled iff
			// slotStart >= start AND slotStart + duration <= end for some config.
			interface MatrixCase {
				name: string
				config: BusinessHours | BusinessHours[]
				duration: number
				slots: [number, number, boolean][]
			}

			const cases: MatrixCase[] = [
				// --- 15-minute slots ---
				{
					name: '15-min slots, :15 boundaries (09:15-17:15)',
					config: mondayHours('09:15', '17:15'),
					duration: 15,
					slots: [
						[9, 0, false],
						[9, 15, true],
						[17, 0, true],
						[17, 15, false],
					],
				},
				{
					name: '15-min slots, :30 boundaries (09:30-16:30)',
					config: mondayHours('09:30', '16:30'),
					duration: 15,
					slots: [
						[9, 15, false],
						[9, 30, true],
						[16, 15, true],
						[16, 30, false],
					],
				},
				{
					name: '15-min slots, whole-hour boundaries (9-17)',
					config: mondayHours(9, 17),
					duration: 15,
					slots: [
						[8, 45, false],
						[9, 0, true],
						[16, 45, true],
						[17, 0, false],
					],
				},
				// --- 30-minute slots ---
				{
					name: '30-min slots, :15 boundaries lose both partial slots (09:15-17:15)',
					config: mondayHours('09:15', '17:15'),
					duration: 30,
					slots: [
						[9, 0, false], // crosses the 9:15 start
						[9, 30, true],
						[16, 30, true], // ends 17:00 <= 17:15
						[17, 0, false], // ends 17:30 > 17:15
					],
				},
				{
					name: '30-min slots, :30 boundaries align exactly (09:30-16:30)',
					config: mondayHours('09:30', '16:30'),
					duration: 30,
					slots: [
						[9, 0, false],
						[9, 30, true],
						[16, 0, true],
						[16, 30, false],
					],
				},
				{
					name: '30-min slots, whole-hour boundaries (9-17)',
					config: mondayHours(9, 17),
					duration: 30,
					slots: [
						[8, 30, false],
						[9, 0, true],
						[16, 30, true],
						[17, 0, false],
					],
				},
				// --- 60-minute slots ---
				{
					name: '60-min slots, :30 boundaries round inward a full hour (09:30-16:30)',
					config: mondayHours('09:30', '16:30'),
					duration: 60,
					slots: [
						[9, 0, false],
						[10, 0, true],
						[15, 0, true], // ends 16:00 <= 16:30
						[16, 0, false], // ends 17:00 > 16:30
					],
				},
				// --- misaligned 16-minute slots (pathological duration) ---
				{
					name: '16-min slots, whole-hour boundaries (9-17)',
					config: mondayHours(9, 17),
					duration: 16,
					slots: [
						[8, 48, false], // starts before 9:00
						[9, 0, true],
						[16, 44, true], // ends exactly 17:00
						[16, 45, false], // ends 17:01 > 17:00
					],
				},
				{
					name: '16-min slots, :15 boundaries (09:15-17:15)',
					config: mondayHours('09:15', '17:15'),
					duration: 16,
					slots: [
						[9, 0, false],
						[9, 15, true],
						[16, 59, true], // ends exactly 17:15
						[17, 0, false], // ends 17:16 > 17:15
					],
				},
				// --- odd sub-hour boundaries (:25, :50, :55) ---
				{
					name: '15-min slots, odd boundaries snap inward (09:25-16:50)',
					config: mondayHours('09:25', '16:50'),
					duration: 15,
					slots: [
						[9, 15, false], // starts before 9:25
						[9, 30, true], // first slot fully inside
						[16, 30, true], // ends 16:45 <= 16:50
						[16, 45, false], // ends 17:00 > 16:50
					],
				},
				{
					name: '30-min slots, odd boundaries (09:25-16:55)',
					config: mondayHours('09:25', '16:55'),
					duration: 30,
					slots: [
						[9, 0, false],
						[9, 30, true],
						[16, 0, true], // ends 16:30 <= 16:55
						[16, 30, false], // ends 17:00 > 16:55
					],
				},
				{
					name: '60-min slots, :55 start loses nearly the whole first hour (09:55-17:00)',
					config: mondayHours('09:55', '17:00'),
					duration: 60,
					slots: [
						[9, 0, false],
						[10, 0, true],
						[16, 0, true],
						[17, 0, false],
					],
				},
				// --- degenerate and boundary-of-day ranges ---
				{
					name: 'zero-width range disables everything (09:15-09:15)',
					config: mondayHours('09:15', '09:15'),
					duration: 15,
					slots: [
						[9, 0, false],
						[9, 15, false],
						[9, 30, false],
					],
				},
				{
					name: 'inverted range disables everything (17:00-09:00)',
					config: mondayHours('17:00', '09:00'),
					duration: 15,
					slots: [
						[8, 0, false],
						[12, 0, false],
						[18, 0, false],
					],
				},
				{
					name: 'range narrower than the slot disables the slot (09:15-09:30 @ 60min)',
					config: mondayHours('09:15', '09:30'),
					duration: 60,
					slots: [
						[9, 0, false],
						[9, 15, false],
					],
				},
				{
					name: 'range equal to one slot enables exactly that slot (09:15-09:30 @ 15min)',
					config: mondayHours('09:15', '09:30'),
					duration: 15,
					slots: [
						[9, 0, false],
						[9, 15, true],
						[9, 30, false],
					],
				},
				{
					name: 'full-day range with 24:00 end (0-24:00 @ 60min)',
					config: mondayHours(0, '24:00'),
					duration: 60,
					slots: [
						[0, 0, true],
						[23, 0, true],
					],
				},
				// --- multiple configs on the same day ---
				{
					name: 'split shifts with sub-hour boundaries and a gap (09:15-12:15, 13:45-17:45 @ 30min)',
					config: [
						{ daysOfWeek: ['monday'], startTime: '09:15', endTime: '12:15' },
						{ daysOfWeek: ['monday'], startTime: '13:45', endTime: '17:45' },
					],
					duration: 30,
					slots: [
						[9, 30, true], // inside the morning shift
						[12, 0, false], // crosses the 12:15 morning end
						[12, 30, false], // in the gap
						[13, 30, false], // crosses the 13:45 afternoon start
						[14, 0, true], // inside the afternoon shift
					],
				},
				{
					name: 'adjacent ranges do not merge: a slot spanning the seam is non-business (09:30-12:30, 12:30-17:30 @ 60min)',
					// Containment is per config; the union of touching ranges is not
					// considered, so the 12:00 hour slot straddling the seam fails both.
					config: [
						{ daysOfWeek: ['monday'], startTime: '09:30', endTime: '12:30' },
						{ daysOfWeek: ['monday'], startTime: '12:30', endTime: '17:30' },
					],
					duration: 60,
					slots: [
						[11, 0, true], // fully inside the first range
						[12, 0, false], // straddles the seam
						[13, 0, true], // fully inside the second range
					],
				},
				// --- point checks (no duration) with odd boundaries ---
				{
					name: 'point check honors odd boundaries exactly (09:25-16:50)',
					config: mondayHours('09:25', '16:50'),
					duration: 0,
					slots: [
						[9, 24, false],
						[9, 25, true],
						[16, 49, true],
						[16, 50, false],
					],
				},
			]

			for (const matrixCase of cases) {
				it(matrixCase.name, () => {
					const results = matrixCase.slots.map(([hour, minute]) =>
						isBusinessHour({
							date: monday,
							hour,
							minute,
							durationMinutes: matrixCase.duration || undefined,
							businessHours: matrixCase.config,
						})
					)
					const expected = matrixCase.slots.map(
						([, , isBusiness]) => isBusiness
					)
					expect(results).toEqual(expected)
				})
			}
		})
	})

	describe('Array of BusinessHours', () => {
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const tuesday = dayjs('2025-01-07T00:00:00.000Z')
		const wednesday = dayjs('2025-01-08T00:00:00.000Z')
		const thursday = dayjs('2025-01-09T00:00:00.000Z')
		const friday = dayjs('2025-01-10T00:00:00.000Z')
		const saturday = dayjs('2025-01-11T00:00:00.000Z')
		const sunday = dayjs('2025-01-05T00:00:00.000Z')

		it('should handle array with different hours for different days', () => {
			const configs: BusinessHours[] = [
				{
					daysOfWeek: ['monday', 'wednesday', 'friday'],
					startTime: 9,
					endTime: 17,
				},
				{
					daysOfWeek: ['tuesday', 'thursday'],
					startTime: 10,
					endTime: 18,
				},
			]

			// Monday: 9-17
			expect(
				isBusinessHour({
					date: monday,
					hour: 9,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)
			expect(
				isBusinessHour({
					date: monday,
					hour: 17,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
			expect(
				isBusinessHour({
					date: monday,
					hour: 8,
					minute: 59,
					businessHours: configs,
				})
			).toBe(false)

			// Tuesday: 10-18
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 10,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 9,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 17,
					minute: 30,
					businessHours: configs,
				})
			).toBe(true)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 18,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)

			// Wednesday: 9-17
			expect(
				isBusinessHour({
					date: wednesday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)

			// Thursday: 10-18
			expect(
				isBusinessHour({
					date: thursday,
					hour: 16,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)

			// Friday: 9-17
			expect(
				isBusinessHour({
					date: friday,
					hour: 14,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)
		})

		it('should return false for days not in any config', () => {
			const configs: BusinessHours[] = [
				{
					daysOfWeek: ['monday', 'wednesday', 'friday'],
					startTime: 9,
					endTime: 17,
				},
				{
					daysOfWeek: ['tuesday', 'thursday'],
					startTime: 10,
					endTime: 18,
				},
			]

			// Saturday and Sunday not in any config
			expect(
				isBusinessHour({
					date: saturday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
			expect(
				isBusinessHour({
					date: sunday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
		})

		it('should check only day if hour is undefined with array', () => {
			const configs: BusinessHours[] = [
				{
					daysOfWeek: ['monday'],
					startTime: 9,
					endTime: 17,
				},
				{
					daysOfWeek: ['tuesday'],
					startTime: 10,
					endTime: 18,
				},
			]

			// Monday is a business day
			expect(isBusinessHour({ date: monday, businessHours: configs })).toBe(
				true
			)

			// Tuesday is a business day
			expect(isBusinessHour({ date: tuesday, businessHours: configs })).toBe(
				true
			)

			// Sunday is not a business day
			expect(isBusinessHour({ date: sunday, businessHours: configs })).toBe(
				false
			)
		})

		it('should handle empty array', () => {
			const configs: BusinessHours[] = []

			// Empty array means no business hours configured
			expect(
				isBusinessHour({
					date: monday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
		})

		it('should work with single-element array', () => {
			const configs: BusinessHours[] = [
				{
					daysOfWeek: ['monday'],
					startTime: 9,
					endTime: 17,
				},
			]

			expect(
				isBusinessHour({
					date: monday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
		})

		it('should handle multiple overlapping or separate rules for the same day', () => {
			const configs: BusinessHours[] = [
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

			// Tuesday 11:00 should be true (Rule 1)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 11,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)

			// Tuesday 15:00 should be true (Rule 2)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 15,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)

			// Tuesday 13:00 should be false (Gap between rules)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 13,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
		})
	})
})
