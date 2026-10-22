import { afterEach, describe, expect, test } from 'bun:test'
import type { BusinessHours } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import {
	buildDateTime,
	buildEndDateTime,
	type FormSchedule,
	getTimeConstraints,
	keepEndAfterStart,
	openedLengthMinutes,
} from './event-form-utils'

describe('event-form-utils', () => {
	const testDate = new Date('2025-01-15T00:00:00.000Z') // Wednesday

	/**
	 * The form's `start` is seeded from the calendar's `currentDate`, which comes
	 * from `dayjs()` and so carries the seconds and milliseconds of page load,
	 * while an End Date picked from the calendar arrives clean. Every case above
	 * passes an already-clean date, which is why #248 went unnoticed: the builders
	 * only set hour and minute, so that residue survived into stored events.
	 */
	const dirtyDate = new Date('2025-01-15T10:44:32.123Z')

	describe('buildDateTime', () => {
		test('combines date and time correctly', () => {
			const result = buildDateTime(testDate, '14:30', false)
			expect(result.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 14:30')
		})

		test('sets time to 00:00 if isAllDay is true', () => {
			const result = buildDateTime(testDate, '14:30', true)
			expect(result.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 00:00')
		})

		test('drops seconds and milliseconds carried by the date', () => {
			const result = buildDateTime(dirtyDate, '14:30', false)
			expect(result.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe(
				'2025-01-15 14:30:00.000'
			)
		})

		test('drops seconds and milliseconds for an all-day start', () => {
			const result = buildDateTime(dirtyDate, '14:30', true)
			expect(result.format('HH:mm:ss.SSS')).toBe('00:00:00.000')
		})
	})

	describe('buildEndDateTime', () => {
		test('combines date and time correctly', () => {
			const result = buildEndDateTime(testDate, '15:45', false)
			expect(result.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 15:45')
		})

		/**
		 * #248. An all-day end is stored EXCLUSIVELY, as the following midnight,
		 * which is what RFC 5545, the Google Calendar API and FullCalendar all
		 * mean by `end`. The picker still shows the user the last day the event
		 * covers; `event-form` converts between the two.
		 */
		test('stores an all-day end as the following midnight', () => {
			const result = buildEndDateTime(testDate, '15:45', true)
			expect(result.format('YYYY-MM-DD HH:mm')).toBe('2025-01-16 00:00')
		})

		test('drops seconds and milliseconds carried by the date', () => {
			const result = buildEndDateTime(dirtyDate, '15:45', false)
			expect(result.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe(
				'2025-01-15 15:45:00.000'
			)
		})

		test('drops seconds and milliseconds for an all-day end', () => {
			const result = buildEndDateTime(dirtyDate, '15:45', true)
			expect(result.format('HH:mm:ss.SSS')).toBe('00:00:00.000')
		})
	})

	/**
	 * #248. The residue made a midnight-to-next-midnight event 23:59:27 long
	 * instead of 24h, and `layoutHorizontal` classifies a multi-day event with
	 * `end.diff(start, 'day') > 0`, which dayjs truncates to 0 below 24h. The
	 * event then rendered on one day instead of two, depending on the second the
	 * page happened to load. Asserted as a DURATION rather than a column count so
	 * this stays independent of the inclusive-versus-exclusive end question.
	 */
	describe('midnight to midnight (#248)', () => {
		test('is exactly 24h even when the start date carries residue', () => {
			const start = buildDateTime(dirtyDate, '00:00', false)
			const end = buildEndDateTime(
				new Date('2025-01-16T00:00:00.000Z'),
				'00:00',
				false
			)

			expect(end.diff(start, 'second')).toBe(86_400)
			expect(end.diff(start, 'day')).toBe(1)
		})
	})

	describe('getTimeConstraints', () => {
		test('returns full day range when no businessHours provided', () => {
			const result = getTimeConstraints(testDate, undefined)
			expect(result).toEqual({ min: '00:00', max: '23:59' })
		})

		test('returns configured business hours for matching day', () => {
			const businessHours: BusinessHours = {
				daysOfWeek: ['wednesday'],
				startTime: 9,
				endTime: 17,
			}
			const result = getTimeConstraints(testDate, businessHours)
			// endTime 17 -> maxTime 16:45
			expect(result).toEqual({ min: '09:00', max: '16:45' })
		})

		test('returns full day range when day does not match business hours', () => {
			const businessHours: BusinessHours = {
				daysOfWeek: ['monday'], // Not Wednesday
				startTime: 9,
				endTime: 17,
			}
			const result = getTimeConstraints(testDate, businessHours)
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
			const result = getTimeConstraints(testDate, businessHours)
			// Should match Wednesday config: 10:00 to 18:00 (max 17:45)
			expect(result).toEqual({ min: '10:00', max: '17:45' })
		})

		test('uses default start/end times if not provided in config', () => {
			const businessHours: BusinessHours = {
				daysOfWeek: ['wednesday'],
				// defaults: start 9, end 17
			}
			const result = getTimeConstraints(testDate, businessHours)
			expect(result).toEqual({ min: '09:00', max: '16:45' })
		})

		/**
		 * Business hours running to midnight. `endTime: 0` names the same instant
		 * as `24`, so the picker must offer the whole evening. It used to build its
		 * max as `(0 - 1):45`, an impossible `-1:45` that produced an empty option
		 * list and an "N/A" dropdown.
		 */
		test('offers the full evening when business hours end at midnight', () => {
			const untilMidnight: BusinessHours = {
				daysOfWeek: ['wednesday'],
				startTime: 0,
				endTime: 0,
			}

			const result = getTimeConstraints(testDate, untilMidnight)

			expect(result).toEqual({ min: '00:00', max: '23:45' })
		})

		test('treats endTime 24 the same as endTime 0', () => {
			const asTwentyFour: BusinessHours = {
				daysOfWeek: ['wednesday'],
				startTime: 0,
				endTime: 24,
			}

			const result = getTimeConstraints(testDate, asTwentyFour)

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
			const result = getTimeConstraints(testDate, businessHours)
			// Should take earliest start (10) and latest end (16 -> max 15:45)
			expect(result).toEqual({ min: '10:00', max: '15:45' })
		})
	})
})

/**
 * `.hour()` keeps the UTC offset of the date it is called on, so building a
 * time on a day the clocks change from a `date` that sits before the change
 * saved an instant an hour off. The form's `date` is what a picker hands over:
 * a day's midnight, in the offset of that midnight. Run under TZ=UTC and
 * TZ=America/New_York.
 */
describe('building times on the 2025 clock-change days', () => {
	afterEach(() => {
		dayjs.tz.setDefault()
	})

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
			const wallClock = (day: string, time: string) => {
				dayjs.tz.setDefault(zone)
				return dayjs(`${day}T${time}:00.000`)
			}
			const midnightOfChangeDay = () => wallClock(changeDay, '00:00').toDate()

			test('9:00 is 9:00 on the day', () => {
				const built = buildDateTime(midnightOfChangeDay(), '09:00', false)
				expect(built.toISOString()).toBe(
					wallClock(changeDay, '09:00').toISOString()
				)
			})

			test('an all-day start is the midnight of the day', () => {
				const built = buildDateTime(midnightOfChangeDay(), '09:00', true)
				expect(built.toISOString()).toBe(
					wallClock(changeDay, '00:00').toISOString()
				)
			})

			test('an all-day end is the midnight of the next day', () => {
				const built = buildEndDateTime(midnightOfChangeDay(), '23:59', true)
				expect(built.toISOString()).toBe(
					wallClock(nextDay, '00:00').toISOString()
				)
			})

			test('a timed end is that time on the day', () => {
				const built = buildEndDateTime(midnightOfChangeDay(), '17:30', false)
				expect(built.toISOString()).toBe(
					wallClock(changeDay, '17:30').toISOString()
				)
			})
		})
	}

	// RFC 5545 section 3.3.5: a time the clocks skip is read with the offset in
	// effect before the gap, so 02:30 on New York's spring-forward day is 03:30.
	test('a time inside the skipped hour lands after the gap', () => {
		dayjs.tz.setDefault('America/New_York')
		const midnight = dayjs('2025-03-09T00:00:00.000').toDate()
		const built = buildDateTime(midnight, '02:30', false)
		expect(built.toISOString()).toBe('2025-03-09T07:30:00.000Z')
	})
})

// Europe/London, Lisbon and Dublin read 0 in winter; with no `timezone` prop the
// form's end date was read as a UTC-flagged instance and stepped 24 hours.
describe('buildEndDateTime on a machine whose winter offset is 0, no calendar zone', () => {
	const endOnMachineIn = (machineZone: string): string => {
		const script = `
			import { buildEndDateTime } from '${import.meta.dir}/event-form-utils.ts'
			const lastDay = new Date(2025, 2, 30)
			console.log(buildEndDateTime(lastDay, '00:00', true).toISOString())
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
	// A picked day is midnight on the calendar's clock, whatever zone that is.
	const day = dayjs('2025-01-15T00:00:00.000').toDate()
	const nextDay = dayjs('2025-01-16T00:00:00.000').toDate()
	const hourLong: FormSchedule = {
		startDate: day,
		startTime: '09:00',
		endDate: day,
		endTime: '10:00',
	}
	const times = (schedule: FormSchedule) => [
		dayjs(schedule.startDate).format('YYYY-MM-DD'),
		schedule.startTime,
		dayjs(schedule.endDate).format('YYYY-MM-DD'),
		schedule.endTime,
	]

	test('leaves an end that is later than the start alone', () => {
		expect(keepEndAfterStart(hourLong, 'start', 60)).toBe(hourLong)
	})

	test('moves the end to keep the length when the start reaches it', () => {
		const moved = keepEndAfterStart(
			{ ...hourLong, startTime: '10:00' },
			'start',
			90
		)

		expect(times(moved)).toEqual(['2025-01-15', '10:00', '2025-01-15', '11:30'])
	})

	test('moves the end to keep the length when the start passes it', () => {
		const moved = keepEndAfterStart(
			{ ...hourLong, startTime: '14:00' },
			'start',
			60
		)

		expect(times(moved)).toEqual(['2025-01-15', '14:00', '2025-01-15', '15:00'])
	})

	test('moves the start to keep the length when the end reaches it', () => {
		const moved = keepEndAfterStart(
			{ ...hourLong, endTime: '09:00' },
			'end',
			60
		)

		expect(times(moved)).toEqual(['2025-01-15', '08:00', '2025-01-15', '09:00'])
	})

	test('carries the end over midnight', () => {
		const moved = keepEndAfterStart(
			{ ...hourLong, startTime: '23:30' },
			'start',
			60
		)

		expect(times(moved)).toEqual(['2025-01-15', '23:30', '2025-01-16', '00:30'])
	})

	test('carries the start back over midnight', () => {
		const moved = keepEndAfterStart(
			{ ...hourLong, endTime: '00:15' },
			'end',
			60
		)

		expect(times(moved)).toEqual(['2025-01-14', '23:15', '2025-01-15', '00:15'])
	})

	test('treats an end on a later day as later whatever the clock times say', () => {
		const spansDays = { ...hourLong, endDate: nextDay, endTime: '08:00' }

		expect(keepEndAfterStart(spansDays, 'end', 60)).toBe(spansDays)
	})
})

describe('openedLengthMinutes', () => {
	test('is the length the event opened with', () => {
		const length = openedLengthMinutes(
			dayjs('2025-01-15T09:00:00.000Z'),
			dayjs('2025-01-15T10:30:00.000Z')
		)

		expect(length).toBe(90)
	})

	test('falls back to an hour for an event whose end is not after its start', () => {
		const sameInstant = dayjs('2025-01-15T09:00:00.000Z')

		expect(openedLengthMinutes(sameInstant, sameInstant)).toBe(60)
	})
})
