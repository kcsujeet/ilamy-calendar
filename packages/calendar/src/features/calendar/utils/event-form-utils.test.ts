import { describe, expect, test } from 'bun:test'
import type { BusinessHours } from '@ilamy/types'
import {
	dayKey,
	elapsedDiff,
	parseDate,
	toDate,
	toUtcIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import {
	buildDateTime,
	buildEndDateTime,
	type FormSchedule,
	getTimeConstraints,
	keepEndAfterStart,
	openedLengthMinutes,
} from './event-form-utils'

const mustParse = (iso: string, zone = 'UTC'): ZonedDate => {
	const parsed = parseDate(iso, zone)
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const pad2 = (value: number): string => String(value).padStart(2, '0')
const pad3 = (value: number): string => String(value).padStart(3, '0')

const wallYmdHm = (iso: string, zone = 'UTC'): string => {
	const parsed = mustParse(iso, zone)
	return `${dayKey(parsed)} ${pad2(parsed.hour)}:${pad2(parsed.minute)}`
}

const wallYmdHmsMs = (iso: string, zone = 'UTC'): string => {
	const parsed = mustParse(iso, zone)
	return `${wallYmdHm(iso, zone)}:${pad2(parsed.second)}.${pad3(parsed.millisecond)}`
}

const wallHmsMs = (iso: string, zone = 'UTC'): string =>
	wallYmdHmsMs(iso, zone).slice(11)

describe('event-form-utils', () => {
	const testDate = new Date('2025-01-15T00:00:00.000Z') // Wednesday
	const dirtyDate = new Date('2025-01-15T10:44:32.123Z')

	describe('buildDateTime', () => {
		test('combines date and time correctly', () => {
			const result = buildDateTime(testDate, '14:30', false, 'UTC')
			expect(wallYmdHm(result)).toBe('2025-01-15 14:30')
		})

		test('sets time to 00:00 if isAllDay is true', () => {
			const result = buildDateTime(testDate, '14:30', true, 'UTC')
			expect(wallYmdHm(result)).toBe('2025-01-15 00:00')
		})

		test('drops seconds and milliseconds carried by the date', () => {
			const result = buildDateTime(dirtyDate, '14:30', false, 'UTC')
			expect(wallYmdHmsMs(result)).toBe('2025-01-15 14:30:00.000')
		})

		test('drops seconds and milliseconds for an all-day start', () => {
			const result = buildDateTime(dirtyDate, '14:30', true, 'UTC')
			expect(wallHmsMs(result)).toBe('00:00:00.000')
		})
	})

	describe('buildEndDateTime', () => {
		test('combines date and time correctly', () => {
			const result = buildEndDateTime(testDate, '15:45', false, 'UTC')
			expect(wallYmdHm(result)).toBe('2025-01-15 15:45')
		})

		test('stores an all-day end as the following midnight', () => {
			const result = buildEndDateTime(testDate, '15:45', true, 'UTC')
			expect(wallYmdHm(result)).toBe('2025-01-16 00:00')
		})

		test('drops seconds and milliseconds carried by the date', () => {
			const result = buildEndDateTime(dirtyDate, '15:45', false, 'UTC')
			expect(wallYmdHmsMs(result)).toBe('2025-01-15 15:45:00.000')
		})

		test('drops seconds and milliseconds for an all-day end', () => {
			const result = buildEndDateTime(dirtyDate, '15:45', true, 'UTC')
			expect(wallHmsMs(result)).toBe('00:00:00.000')
		})
	})

	describe('midnight to midnight (#248)', () => {
		test('is exactly 24h even when the start date carries residue', () => {
			const start = mustParse(buildDateTime(dirtyDate, '00:00', false, 'UTC'))
			const end = mustParse(
				buildEndDateTime(
					new Date('2025-01-16T00:00:00.000Z'),
					'00:00',
					false,
					'UTC'
				)
			)

			expect(elapsedDiff(end, start, 'millisecond') / 1000).toBe(86_400)
			expect(elapsedDiff(end, start, 'day')).toBe(1)
		})
	})

	describe('getTimeConstraints', () => {
		test('returns full day range when no businessHours provided', () => {
			const result = getTimeConstraints(testDate, undefined, 'UTC')
			expect(result).toEqual({ min: '00:00', max: '23:59' })
		})

		test('returns configured business hours for matching day', () => {
			const businessHours: BusinessHours = {
				daysOfWeek: ['wednesday'],
				startTime: 9,
				endTime: 17,
			}
			const result = getTimeConstraints(testDate, businessHours, 'UTC')
			expect(result).toEqual({ min: '09:00', max: '16:45' })
		})

		test('returns full day range when day does not match business hours', () => {
			const businessHours: BusinessHours = {
				daysOfWeek: ['monday'],
				startTime: 9,
				endTime: 17,
			}
			const result = getTimeConstraints(testDate, businessHours, 'UTC')
			expect(result).toEqual({ min: '00:00', max: '23:59' })
		})

		test('handles array of business hours', () => {
			const businessHours: BusinessHours[] = [
				{
					daysOfWeek: ['monday'],
					startTime: 8,
					endTime: 12,
				},
				{
					daysOfWeek: ['wednesday'],
					startTime: 10,
					endTime: 18,
				},
			]
			const result = getTimeConstraints(testDate, businessHours, 'UTC')
			expect(result).toEqual({ min: '10:00', max: '17:45' })
		})

		test('uses default start/end times if not provided in config', () => {
			const businessHours: BusinessHours = {
				daysOfWeek: ['wednesday'],
			}
			const result = getTimeConstraints(testDate, businessHours, 'UTC')
			expect(result).toEqual({ min: '09:00', max: '16:45' })
		})

		test('offers the full evening when business hours end at midnight', () => {
			const untilMidnight: BusinessHours = {
				daysOfWeek: ['wednesday'],
				startTime: 0,
				endTime: 0,
			}

			const result = getTimeConstraints(testDate, untilMidnight, 'UTC')

			expect(result).toEqual({ min: '00:00', max: '23:45' })
		})

		test('treats endTime 24 the same as endTime 0', () => {
			const asTwentyFour: BusinessHours = {
				daysOfWeek: ['wednesday'],
				startTime: 0,
				endTime: 24,
			}

			const result = getTimeConstraints(testDate, asTwentyFour, 'UTC')

			expect(result).toEqual({ min: '00:00', max: '23:45' })
		})

		test('handles multiple rules for the same day (split shifts)', () => {
			const businessHours: BusinessHours[] = [
				{
					daysOfWeek: ['wednesday'],
					startTime: 10,
					endTime: 12,
				},
				{
					daysOfWeek: ['wednesday'],
					startTime: 14,
					endTime: 16,
				},
			]
			const result = getTimeConstraints(testDate, businessHours, 'UTC')
			expect(result).toEqual({ min: '10:00', max: '15:45' })
		})
	})
})

describe('building times on the 2025 clock-change days', () => {
	const clockChanges = [
		{
			zone: 'America/New_York',
			changeDay: '2025-03-09',
			nextDay: '2025-03-10',
		},
		{
			zone: 'America/New_York',
			changeDay: '2025-11-02',
			nextDay: '2025-11-03',
		},
		{ zone: 'Europe/London', changeDay: '2025-03-30', nextDay: '2025-03-31' },
		{ zone: 'Europe/London', changeDay: '2025-10-26', nextDay: '2025-10-27' },
		{
			zone: 'Australia/Sydney',
			changeDay: '2025-04-06',
			nextDay: '2025-04-07',
		},
		{
			zone: 'Australia/Sydney',
			changeDay: '2025-10-05',
			nextDay: '2025-10-06',
		},
	]

	for (const { zone, changeDay, nextDay } of clockChanges) {
		describe(`${zone}, ${changeDay}`, () => {
			const wallClock = (day: string, time: string) =>
				mustParse(`${day}T${time}:00`, zone)
			const midnightOfChangeDay = () => toDate(wallClock(changeDay, '00:00'))

			test('9:00 is 9:00 on the day', () => {
				const built = buildDateTime(midnightOfChangeDay(), '09:00', false, zone)
				expect(toUtcIso(mustParse(built, zone))).toBe(
					toUtcIso(wallClock(changeDay, '09:00'))
				)
			})

			test('an all-day start is the midnight of the day', () => {
				const built = buildDateTime(midnightOfChangeDay(), '09:00', true, zone)
				expect(toUtcIso(mustParse(built, zone))).toBe(
					toUtcIso(wallClock(changeDay, '00:00'))
				)
			})

			test('an all-day end is the midnight of the next day', () => {
				const built = buildEndDateTime(
					midnightOfChangeDay(),
					'23:59',
					true,
					zone
				)
				expect(toUtcIso(mustParse(built, zone))).toBe(
					toUtcIso(wallClock(nextDay, '00:00'))
				)
			})

			test('a timed end is that time on the day', () => {
				const built = buildEndDateTime(
					midnightOfChangeDay(),
					'17:30',
					false,
					zone
				)
				expect(toUtcIso(mustParse(built, zone))).toBe(
					toUtcIso(wallClock(changeDay, '17:30'))
				)
			})
		})
	}

	test('a time inside the skipped hour lands after the gap', () => {
		const zone = 'America/New_York'
		const midnight = toDate(mustParse('2025-03-09T00:00:00', zone))
		const built = buildDateTime(midnight, '02:30', false, zone)
		expect(toUtcIso(mustParse(built, zone))).toBe('2025-03-09T07:30:00.000Z')
	})
})

describe('buildEndDateTime on a machine whose winter offset is 0, no calendar zone', () => {
	const endOnMachineIn = (machineZone: string): string => {
		const script = `
			import { buildEndDateTime } from '${import.meta.dir}/event-form-utils.ts'
			const lastDay = new Date(2025, 2, 30)
			console.log(new Date(buildEndDateTime(lastDay, '00:00', true)).toISOString())
		`
		const child = Bun.spawnSync(['bun', '-e', script], {
			env: { ...process.env, TZ: machineZone },
		})
		return child.stdout.toString().trim()
	}

	test.each(['Europe/London', 'Europe/Lisbon', 'Europe/Dublin'])(
		'an all-day event whose last day is the 30th of March ends at the next midnight, 00:00 BST (%s)',
		(machineZone) => {
			expect(endOnMachineIn(machineZone)).toBe('2025-03-30T23:00:00.000Z')
		}
	)
})

describe('keepEndAfterStart', () => {
	const day = new Date('2025-01-15T00:00:00.000Z')
	const nextDay = new Date('2025-01-16T00:00:00.000Z')
	const hourLong: FormSchedule = {
		startDate: day,
		startTime: '09:00',
		endDate: day,
		endTime: '10:00',
	}
	const times = (schedule: FormSchedule) => [
		dayKey(mustParse(schedule.startDate.toISOString(), 'UTC')),
		schedule.startTime,
		dayKey(mustParse(schedule.endDate.toISOString(), 'UTC')),
		schedule.endTime,
	]

	test('leaves an end that is later than the start alone', () => {
		expect(keepEndAfterStart(hourLong, 'start', 60, 'UTC')).toBe(hourLong)
	})

	test('moves the end to keep the length when the start reaches it', () => {
		const moved = keepEndAfterStart(
			{ ...hourLong, startTime: '10:00' },
			'start',
			90,
			'UTC'
		)

		expect(times(moved)).toEqual(['2025-01-15', '10:00', '2025-01-15', '11:30'])
	})

	test('moves the end to keep the length when the start passes it', () => {
		const moved = keepEndAfterStart(
			{ ...hourLong, startTime: '14:00' },
			'start',
			60,
			'UTC'
		)

		expect(times(moved)).toEqual(['2025-01-15', '14:00', '2025-01-15', '15:00'])
	})

	test('moves the start to keep the length when the end reaches it', () => {
		const moved = keepEndAfterStart(
			{ ...hourLong, endTime: '09:00' },
			'end',
			60,
			'UTC'
		)

		expect(times(moved)).toEqual(['2025-01-15', '08:00', '2025-01-15', '09:00'])
	})

	test('carries the end over midnight', () => {
		const moved = keepEndAfterStart(
			{ ...hourLong, startTime: '23:30' },
			'start',
			60,
			'UTC'
		)

		expect(times(moved)).toEqual(['2025-01-15', '23:30', '2025-01-16', '00:30'])
	})

	test('carries the start back over midnight', () => {
		const moved = keepEndAfterStart(
			{ ...hourLong, endTime: '00:15' },
			'end',
			60,
			'UTC'
		)

		expect(times(moved)).toEqual(['2025-01-14', '23:15', '2025-01-15', '00:15'])
	})

	test('treats an end on a later day as later whatever the clock times say', () => {
		const spansDays = { ...hourLong, endDate: nextDay, endTime: '08:00' }

		expect(keepEndAfterStart(spansDays, 'end', 60, 'UTC')).toBe(spansDays)
	})
})

describe('openedLengthMinutes', () => {
	test('is the length the event opened with', () => {
		const length = openedLengthMinutes(
			'2025-01-15T09:00:00.000Z',
			'2025-01-15T10:30:00.000Z',
			'UTC'
		)

		expect(length).toBe(90)
	})

	test('falls back to an hour for an event whose end is not after its start', () => {
		const sameInstant = '2025-01-15T09:00:00.000Z'

		expect(openedLengthMinutes(sameInstant, sameInstant, 'UTC')).toBe(60)
	})
})
