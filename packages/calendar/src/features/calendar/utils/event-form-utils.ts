import type { BusinessHours } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { calculateBusinessHoursRange } from '@/features/calendar/utils/business-hours'
import { atTimeOfDay } from '@/utils/date-utils'

/**
 * `time` on the calendar day `date` falls on, built from a zoneless wall-clock
 * string, which dayjs anchors in the calendar's zone on parse.
 *
 * The `.hour()` and `.minute()` setters hold the clock face but keep the UTC
 * offset of `date`, so on a day the clocks change a `date` from before the
 * change saved an instant an hour off: 9:00 became 10:00, midnight became 23:00
 * the day before. A string re-derives the offset for the target time. A time
 * the clocks skip is read with the offset in effect before the gap, and a
 * repeated one is its first occurrence, as RFC 5545 section 3.3.5 says, so
 * 02:30 on a spring-forward day is 03:30.
 *
 * The form only ever offers hours and minutes, so anything finer that rode in on
 * `date` is not something the user chose. It has to be cleared: `start` is seeded
 * from the calendar's `currentDate`, which comes from `dayjs()` and carries the
 * seconds and milliseconds of page load, while a date picked from the calendar
 * arrives clean. Mixing the two made a midnight-to-next-midnight event 23:59:27
 * long, which `layoutHorizontal` then read as a single-day event because
 * `end.diff(start, 'day')` truncates below 24h (#248).
 */
const atTime = (date: Date, time: string): Dayjs =>
	atTimeOfDay(dayjs(date), `${time}:00.000`)

const MIDNIGHT = '00:00'

export const buildDateTime = (
	date: Date,
	time: string,
	isAllDay: boolean
): Dayjs => atTime(date, isAllDay ? MIDNIGHT : time)

/**
 * `date` is the LAST day an all-day event covers, which is what the picker shows
 * the user. It is stored as the following midnight, because `end` is exclusive
 * (#248): RFC 5545 calls DTEND "the non-inclusive end of the event", and the
 * Google Calendar API documents `end` the same way. `event-form` converts back
 * for display.
 */
export const buildEndDateTime = (
	date: Date,
	time: string,
	isAllDay: boolean
): Dayjs => {
	if (!isAllDay) {
		return atTime(date, time)
	}
	// `startOf('day')` re-anchors after `add`, which keeps the receiver's offset.
	return atTime(date, MIDNIGHT).add(1, 'day').startOf('day')
}

export const getTimeConstraints = (
	date: Date,
	businessHours?: BusinessHours | BusinessHours[]
) => {
	if (!businessHours) return { min: '00:00', max: '23:59' }

	const dayjsDate = dayjs(date)

	const { minStart, maxEnd, hasBusinessHours } = calculateBusinessHoursRange({
		allDates: [dayjsDate],
		businessHours,
		hideNonBusinessHours: false,
	})

	if (!hasBusinessHours) {
		return { min: '00:00', max: '23:59' }
	}

	return {
		min: `${minStart.toString().padStart(2, '0')}:00`,
		max: `${(maxEnd - 1).toString().padStart(2, '0')}:45`,
	}
}

/** The form's four schedule fields: a day and a clock time for each edge. */
export interface FormSchedule {
	startDate: Date
	startTime: string
	endDate: Date
	endTime: string
}

const MS_PER_MINUTE = 60_000
const FALLBACK_LENGTH_MINUTES = 60

/**
 * A day and clock time as minutes on a line with no clock changes: the digits
 * are read as UTC, so adding minutes never skips or repeats an hour. Only the
 * ordering and the length of the two edges are asked of it, never an instant.
 */
const wallMinutes = (date: Date, time: string): number => {
	const day = dayjs(date).format('YYYY-MM-DD')
	return Date.parse(`${day}T${time}:00.000Z`) / MS_PER_MINUTE
}

const fromWallMinutes = (minutes: number): { date: Date; time: string } => {
	const wall = new Date(minutes * MS_PER_MINUTE).toISOString()
	const day = wall.slice(0, 10)
	return {
		date: dayjs(`${day}T00:00:00.000`).toDate(),
		time: wall.slice(11, 16),
	}
}

/**
 * The length, in clock minutes, the form keeps an event at when one edge is
 * moved past the other: the length it opened with, or an hour when that was
 * not a positive length (a new event, or one stored with end == start).
 */
export const openedLengthMinutes = (start: Dayjs, end: Dayjs): number => {
	const startMinutes = wallMinutes(start.toDate(), start.format('HH:mm'))
	const endMinutes = wallMinutes(end.toDate(), end.format('HH:mm'))
	const length = endMinutes - startMinutes
	return length > 0 ? length : FALLBACK_LENGTH_MINUTES
}

/**
 * `schedule` with an end that is later than its start. RFC 5545 section 3.8.2.2:
 * DTEND "MUST be later in time than" DTSTART, and an event whose end equals its
 * start is not drawn. When the edge the user just moved (`movedEdge`) reaches or
 * passes the other, the OTHER edge follows so the event keeps `lengthMinutes`,
 * as Google Calendar's form moves the end with the start (unverified against
 * its source). The edge the user chose is never overridden.
 */
export const keepEndAfterStart = (
	schedule: FormSchedule,
	movedEdge: 'start' | 'end',
	lengthMinutes: number
): FormSchedule => {
	const start = wallMinutes(schedule.startDate, schedule.startTime)
	const end = wallMinutes(schedule.endDate, schedule.endTime)
	if (end > start) {
		return schedule
	}
	if (movedEdge === 'start') {
		const movedEnd = fromWallMinutes(start + lengthMinutes)
		return { ...schedule, endDate: movedEnd.date, endTime: movedEnd.time }
	}
	const movedStart = fromWallMinutes(end - lengthMinutes)
	return { ...schedule, startDate: movedStart.date, startTime: movedStart.time }
}
