import { calculateBusinessHoursRange } from '@ilamy/core'
import type { BusinessHours } from '@ilamy/types'
import {
	add,
	dayKey,
	now,
	parseDate,
	resolveZone,
	startOf,
	toDate,
	toOffsetIso,
	wallClockDiff,
	type ZonedDate,
} from '@ilamy/utils/temporal'

const MIDNIGHT = '00:00'
const MS_PER_MINUTE = 60_000
const FALLBACK_LENGTH_MINUTES = 60

const pad2 = (value: number): string => String(value).padStart(2, '0')

const atTime = (date: Date, time: string, timezone?: string): ZonedDate => {
	const zone = resolveZone(timezone)
	const zonedDay = parseDate(date, zone)
	let datePrefix: string
	if (zonedDay) {
		datePrefix = dayKey(zonedDay)
	} else {
		datePrefix = date.toISOString().slice(0, 10)
	}
	const parsed = parseDate(`${datePrefix}T${time}:00`, zone)
	if (parsed) {
		return parsed
	}
	return zonedDay ?? parseDate(date.getTime(), zone) ?? now(zone)
}

export const buildDateTime = (
	date: Date,
	time: string,
	isAllDay: boolean,
	timezone?: string
): string => toOffsetIso(atTime(date, isAllDay ? MIDNIGHT : time, timezone))

/**
 * `date` is the LAST day an all-day event covers (shown in the picker);
 * stored as the following midnight because `end` is exclusive (RFC 5545 DTEND).
 */
export const buildEndDateTime = (
	date: Date,
	time: string,
	isAllDay: boolean,
	timezone?: string
): string => {
	if (!isAllDay) {
		return toOffsetIso(atTime(date, time, timezone))
	}
	const startMidnight = atTime(date, MIDNIGHT, timezone)
	return toOffsetIso(startOf(add(startMidnight, 1, 'day'), 'day'))
}

export const getTimeConstraints = (
	date: Date,
	businessHours?: BusinessHours | BusinessHours[],
	timezone?: string
) => {
	if (!businessHours) return { min: '00:00', max: '23:59' }

	const zonedDate = parseDate(date, timezone)
	if (!zonedDate) return { min: '00:00', max: '23:59' }

	const { minStart, maxEnd, hasBusinessHours } = calculateBusinessHoursRange({
		allDates: [zonedDate],
		businessHours,
		hideNonBusinessHours: false,
	})

	if (!hasBusinessHours) {
		return { min: '00:00', max: '23:59' }
	}

	const minHour = Math.floor(minStart)
	const minMinute = Math.round((minStart - minHour) * 60)
	const maxTotalMinutes = Math.max(0, Math.round(maxEnd * 60) - 15)
	const maxHour = Math.floor(maxTotalMinutes / 60)
	const maxMinute = maxTotalMinutes % 60

	return {
		min: `${pad2(minHour)}:${pad2(minMinute)}`,
		max: `${pad2(maxHour)}:${pad2(maxMinute)}`,
	}
}

export interface FormSchedule {
	startDate: Date
	startTime: string
	endDate: Date
	endTime: string
}

const wallMinutes = (date: Date, time: string, timezone?: string): number => {
	const zoned = parseDate(date, timezone)
	const day = zoned ? dayKey(zoned) : date.toISOString().slice(0, 10)
	return Date.parse(`${day}T${time}:00.000Z`) / MS_PER_MINUTE
}

const fromWallMinutes = (
	minutes: number,
	timezone?: string
): { date: Date; time: string } => {
	const wall = new Date(minutes * MS_PER_MINUTE).toISOString()
	const day = wall.slice(0, 10)
	const parsed = parseDate(`${day}T00:00:00`, timezone)
	return {
		date: parsed ? toDate(parsed) : new Date(`${day}T00:00:00.000Z`),
		time: wall.slice(11, 16),
	}
}

/** Clock minutes between `start` and `end`, or 60 when non-positive. */
export const openedLengthMinutes = (
	startIso: string,
	endIso: string,
	timezone?: string
): number => {
	const start = parseDate(startIso, timezone)
	const end = parseDate(endIso, timezone)
	if (!start || !end) return FALLBACK_LENGTH_MINUTES
	const length = Math.round(wallClockDiff(end, start, 'minute'))
	return length > 0 ? length : FALLBACK_LENGTH_MINUTES
}

/**
 * Ensures `schedule` ends strictly after it starts (RFC 5545 §3.8.2.2),
 * shifting the unmoved edge by `lengthMinutes` when edges cross.
 */
export const keepEndAfterStart = (
	schedule: FormSchedule,
	movedEdge: 'start' | 'end',
	lengthMinutes: number,
	timezone?: string
): FormSchedule => {
	const start = wallMinutes(schedule.startDate, schedule.startTime, timezone)
	const end = wallMinutes(schedule.endDate, schedule.endTime, timezone)
	if (end > start) {
		return schedule
	}
	if (movedEdge === 'start') {
		const movedEnd = fromWallMinutes(start + lengthMinutes, timezone)
		return { ...schedule, endDate: movedEnd.date, endTime: movedEnd.time }
	}
	const movedStart = fromWallMinutes(end - lengthMinutes, timezone)
	return { ...schedule, startDate: movedStart.date, startTime: movedStart.time }
}
