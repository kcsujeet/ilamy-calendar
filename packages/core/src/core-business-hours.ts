import {
	add,
	getFields,
	isBefore,
	startOf,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { WEEK_DAYS_NUMBER_MAP } from './core-date-grid'
import type { BusinessHours, WeekDays } from './core-types'

const TIME_STRING_PATTERN = /^(\d{1,2}):(\d{2})$/
const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR
const DEFAULT_START_HOUR = 9
const DEFAULT_END_HOUR = 17

/**
 * Standard Monday–Friday default for a single `BusinessHours` object omitting
 * `daysOfWeek`, matching FullCalendar (`structs/business-hours.ts`, v7.1.1).
 */
export const DEFAULT_BUSINESS_DAYS: readonly WeekDays[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
]

const toBoundaryMinutes = (
	value: number | string | undefined,
	fallbackHours: number
): number => {
	if (typeof value === 'number') {
		return Math.round(value) * MINUTES_PER_HOUR
	}

	const fallback = fallbackHours * MINUTES_PER_HOUR
	if (typeof value !== 'string') {
		return fallback
	}

	const match = value.match(TIME_STRING_PATTERN)
	if (!match) {
		return fallback
	}

	const hours = Number(match[1])
	const minutes = Number(match[2])
	const totalMinutes = hours * MINUTES_PER_HOUR + minutes
	if (minutes > 59 || totalMinutes > MINUTES_PER_DAY) {
		return fallback
	}

	return totalMinutes
}

const toEndBoundaryMinutes = (
	value: number | string | undefined,
	fallbackHours: number
): number => {
	const minutes = toBoundaryMinutes(value, fallbackHours)
	return minutes === 0 ? MINUTES_PER_DAY : minutes
}

const resolveConfigDays = (
	config: BusinessHours,
	isArrayForm: boolean
): readonly WeekDays[] | undefined => {
	if (config.daysOfWeek) return config.daysOfWeek
	return isArrayForm ? undefined : DEFAULT_BUSINESS_DAYS
}

/**
 * Resolves business-hours entries matching FullCalendar v7.1.1
 * (`core/src/structs/business-hours.ts`):
 * - Object form with omitted `daysOfWeek` defaults to Monday–Friday.
 * - Array form ignores any entry whose `daysOfWeek` is omitted.
 */
const processBusinessHours = (
	bh: BusinessHours | BusinessHours[] | undefined,
	options: {
		date?: ZonedDate
		onMatch: (config: BusinessHours) => void
	}
) => {
	const { date, onMatch } = options
	if (!bh) return

	const isArrayForm = Array.isArray(bh)
	const configs = isArrayForm ? bh : [bh]

	for (const config of configs) {
		const resolvedDays = resolveConfigDays(config, isArrayForm)
		if (!resolvedDays) {
			continue
		}

		if (!date) {
			onMatch(config)
			continue
		}

		const dayOfWeek = getFields(date).dayOfWeek
		const matchesDay = resolvedDays.some(
			(dayName) => WEEK_DAYS_NUMBER_MAP[dayName] === dayOfWeek
		)
		if (matchesDay) {
			onMatch(config)
		}
	}
}

/** Whether `date` falls on a configured business day. */
export const isBusinessDay = (
	date: ZonedDate,
	businessHours?: BusinessHours | BusinessHours[]
): boolean => {
	if (!businessHours) {
		return true
	}

	let hasMatch = false
	processBusinessHours(businessHours, {
		date,
		onMatch: () => {
			hasMatch = true
		},
	})
	return hasMatch
}

export interface IsBusinessHourOptions {
	date: ZonedDate
	hour?: number
	minute?: number
	/** When set, checks whole-slot containment `[hour:minute, +durationMinutes)`. */
	durationMinutes?: number
	businessHours?: BusinessHours | BusinessHours[]
}

/** Whether a specific time (or slot) on `date` falls within business hours. */
export const isBusinessHour = ({
	date,
	hour,
	minute = 0,
	durationMinutes,
	businessHours,
}: IsBusinessHourOptions): boolean => {
	if (!businessHours) {
		return true
	}

	if (hour === undefined) {
		return isBusinessDay(date, businessHours)
	}

	let isWithin = false
	const currentMinutes = hour * MINUTES_PER_HOUR + minute

	processBusinessHours(businessHours, {
		date,
		onMatch: (config) => {
			const startMinutes = toBoundaryMinutes(
				config.startTime,
				DEFAULT_START_HOUR
			)
			const endMinutes = toEndBoundaryMinutes(config.endTime, DEFAULT_END_HOUR)
			const startsInside = currentMinutes >= startMinutes
			let endsInside = currentMinutes < endMinutes
			if (durationMinutes) {
				endsInside = currentMinutes + durationMinutes <= endMinutes
			}

			if (startsInside && endsInside) {
				isWithin = true
			}
		},
	})

	return isWithin
}

/**
 * Checks whether an entire `[start, end)` range fits inside business hours,
 * matching FullCalendar's `eventConstraint: 'businessHours'` and
 * `selectConstraint: 'businessHours'` (`validation.ts:273-277, 307-319`, v7.1.1).
 *
 * - With no `businessHours` configured, returns `true`.
 * - For `allDay` ranges, every covered calendar day must be a business day.
 * - For timed ranges, every covered day slice must fit completely within at
 *   least one business-hours window for that day.
 */
const isAllDayRangeWithinBusinessHours = (
	start: ZonedDate,
	lastDayStart: ZonedDate,
	businessHours: BusinessHours | BusinessHours[]
): boolean => {
	let dayCursor = startOf(start, 'day')
	while (!isBefore(lastDayStart, dayCursor)) {
		if (!isBusinessDay(dayCursor, businessHours)) {
			return false
		}
		dayCursor = startOf(add(dayCursor, 1, 'day'), 'day')
	}
	return true
}

const isDaySliceWithinBusinessHours = (
	dayCursor: ZonedDate,
	nextDayStart: ZonedDate,
	start: ZonedDate,
	end: ZonedDate,
	businessHours: BusinessHours | BusinessHours[]
): boolean => {
	let sliceStartMinutes = 0
	if (isBefore(dayCursor, start)) {
		sliceStartMinutes = start.hour * MINUTES_PER_HOUR + start.minute
	}
	let sliceEndMinutes = MINUTES_PER_DAY
	if (isBefore(end, nextDayStart)) {
		sliceEndMinutes = end.hour * MINUTES_PER_HOUR + end.minute
	}
	const sliceDuration = sliceEndMinutes - sliceStartMinutes
	if (sliceDuration <= 0) {
		return true
	}
	return isBusinessHour({
		date: dayCursor,
		hour: Math.floor(sliceStartMinutes / MINUTES_PER_HOUR),
		minute: sliceStartMinutes % MINUTES_PER_HOUR,
		durationMinutes: sliceDuration,
		businessHours,
	})
}

const isTimedRangeWithinBusinessHours = (
	start: ZonedDate,
	end: ZonedDate,
	lastDayStart: ZonedDate,
	businessHours: BusinessHours | BusinessHours[]
): boolean => {
	let dayCursor = startOf(start, 'day')
	while (!isBefore(lastDayStart, dayCursor)) {
		const nextDayStart = startOf(add(dayCursor, 1, 'day'), 'day')
		const fitsDay = isDaySliceWithinBusinessHours(
			dayCursor,
			nextDayStart,
			start,
			end,
			businessHours
		)
		if (!fitsDay) {
			return false
		}
		dayCursor = nextDayStart
	}
	return true
}

export const isRangeWithinBusinessHours = (options: {
	start: ZonedDate
	end: ZonedDate
	allDay?: boolean
	businessHours?: BusinessHours | BusinessHours[]
}): boolean => {
	const { start, end, allDay = false, businessHours } = options
	if (!businessHours) {
		return true
	}

	const isEmptyRange = !isBefore(start, end)
	if (isEmptyRange) {
		if (allDay) {
			return isBusinessDay(start, businessHours)
		}
		return isBusinessHour({
			date: start,
			hour: start.hour,
			minute: start.minute,
			businessHours,
		})
	}

	const lastDayStart = startOf(add(end, -1, 'millisecond'), 'day')
	if (allDay) {
		return isAllDayRangeWithinBusinessHours(start, lastDayStart, businessHours)
	}
	return isTimedRangeWithinBusinessHours(
		start,
		end,
		lastDayStart,
		businessHours
	)
}

export interface BusinessHoursRange {
	minStart: number
	maxEnd: number
	hasBusinessHours: boolean
}

/** Calculates the union of business hours ranges across dates and/or resources. */
export const calculateBusinessHoursRange = (options: {
	allDates: ZonedDate[]
	businessHours?: BusinessHours | BusinessHours[]
	resourceBusinessHours?: (BusinessHours | BusinessHours[])[]
	hideNonBusinessHours?: boolean
}): BusinessHoursRange => {
	const {
		allDates,
		businessHours,
		resourceBusinessHours = [],
		hideNonBusinessHours,
	} = options

	let minStart = 24
	let maxEnd = 0
	let hasBusinessHours = false

	const onMatch = (config: BusinessHours) => {
		hasBusinessHours = true
		minStart = Math.min(
			minStart,
			toBoundaryMinutes(config.startTime, DEFAULT_START_HOUR) / MINUTES_PER_HOUR
		)
		maxEnd = Math.max(
			maxEnd,
			toEndBoundaryMinutes(config.endTime, DEFAULT_END_HOUR) / MINUTES_PER_HOUR
		)
	}

	const processAll = (date?: ZonedDate) => {
		processBusinessHours(businessHours, { date, onMatch })
		for (const resourceHours of resourceBusinessHours) {
			processBusinessHours(resourceHours, { date, onMatch })
		}
	}

	for (const date of allDates) {
		processAll(date)
	}

	if (!hasBusinessHours && hideNonBusinessHours) {
		processAll()
		if (!hasBusinessHours) {
			minStart = DEFAULT_START_HOUR
			maxEnd = DEFAULT_END_HOUR
			hasBusinessHours = true
		}
	}

	return { minStart, maxEnd, hasBusinessHours }
}
