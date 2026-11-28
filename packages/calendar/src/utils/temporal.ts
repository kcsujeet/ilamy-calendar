import { getISO } from 'temporal-polyfill/fns/Calendar'
import {
	fromEpochMilliseconds as instantFromEpochMs,
	fromString as instantFromString,
	toZonedDateTimeISO as instantToZonedDateTime,
} from 'temporal-polyfill/fns/Instant'
import { timeZoneId as getSystemTimeZoneId } from 'temporal-polyfill/fns/Now'
import { toString as plainDateToString } from 'temporal-polyfill/fns/PlainDate'
import {
	fromString as plainDateTimeFromString,
	toZonedDateTime as plainDateTimeToZonedDateTime,
} from 'temporal-polyfill/fns/PlainDateTime'
import {
	addDays,
	addHours,
	addMilliseconds,
	addMinutes,
	addMonths,
	addSeconds,
	addWeeks,
	addYears,
	daysInMonth as getDaysInMonth,
	dayOfWeek as getIsoDayOfWeek,
	offset as getOffset,
	offsetNanoseconds as getOffsetNanoseconds,
	getTimeZoneTransition,
	isRecord as isZonedDate,
	roundToHour,
	roundToMinute,
	startOfDay,
	toPlainDate,
	withTimeZone,
	type Record as ZonedDateTimeRecord,
	fromFields as zdtFromFields,
	toString as zdtToString,
	withFields as zdtWithFields,
} from 'temporal-polyfill/fns/ZonedDateTime'

/** Immutable, timezone-aware instant in the ISO 8601 calendar. */
export interface ZonedDate {
	readonly calendarId: string
	readonly epochMilliseconds: number
	readonly epochNanoseconds: bigint
	readonly timeZoneId: string
	readonly era: string | undefined
	readonly eraYear: number | undefined
	readonly year: number
	readonly month: number
	readonly monthCode: string
	readonly day: number
	readonly hour: number
	readonly minute: number
	readonly second: number
	readonly millisecond: number
	readonly microsecond: number
	readonly nanosecond: number
	toJSON(): string
}

const isZonedDateValue = (value: unknown): value is ZonedDate =>
	isZonedDate(value)

const toZdtRecord = (date: ZonedDate): ZonedDateTimeRecord => {
	if (isZonedDate(date)) {
		return date
	}
	return instantToZonedDateTime(
		instantFromEpochMs(date.epochMilliseconds),
		date.timeZoneId
	)
}

export type DateInput = ZonedDate | Date | string | number

export type DateUnit =
	| 'year'
	| 'month'
	| 'week'
	| 'day'
	| 'hour'
	| 'minute'
	| 'second'
	| 'millisecond'

export type BoundaryUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute'

export interface DateFieldsInput {
	year: number
	month: number
	day: number
	hour?: number
	minute?: number
	second?: number
	millisecond?: number
}

export interface TimeFieldsInput {
	hour?: number
	minute?: number
	second?: number
	millisecond?: number
}

export interface DateFields {
	year: number
	month: number
	day: number
	hour: number
	minute: number
	second: number
	millisecond: number
	/** 0 = Sunday .. 6 = Saturday, matching JS `Date.getDay()`. */
	dayOfWeek: number
	daysInMonth: number
}

export interface ZonedInterval {
	start: ZonedDate
	end: ZonedDate
}

const NANOSECONDS_PER_MINUTE = 60_000_000_000
const MILLISECONDS_PER_MINUTE = 60_000
const MILLISECONDS_PER_HOUR = 3_600_000
const MILLISECONDS_PER_DAY = 86_400_000
const DAYS_PER_WEEK = 7
const SUNDAY_ISO_DAY = 7
const EXPLICIT_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i
const DISAMBIGUATION_COMPATIBLE = { disambiguation: 'compatible' as const }

const hasExplicitOffset = (value: string): boolean => {
	const timePart = value.split(/[Tt\s]/).at(1)
	if (!timePart) {
		return false
	}
	return EXPLICIT_OFFSET.test(timePart)
}

/** Returns `timezone` when provided, otherwise the runtime's IANA time zone. */
export const resolveZone = (timezone?: string): string =>
	timezone ?? getSystemTimeZoneId()

/**
 * Current instant in `timezone` (or the runtime's time zone).
 * Reads `Date.now()` rather than `Temporal.Now` so fake clocks in Playwright
 * (`page.clock.install`), Vitest, Jest, and Bun control the calendar's clock.
 */
export const now = (timezone?: string): ZonedDate =>
	instantToZonedDateTime(instantFromEpochMs(Date.now()), resolveZone(timezone))

/**
 * Parses an ISO string, `Date`, epoch ms, or `ZonedDate` into `timezone`.
 *
 * Follows RFC 5545 §3.3.5 and FullCalendar's `timeZone` rule:
 * - Offset-carrying strings, `Date`, numbers, and `ZonedDate` keep their
 *   instant and display in `zone`.
 * - Offset-less strings (`'2026-03-02'`, `'2026-03-02T09:00'`) are anchored in
 *   `zone` with `disambiguation: 'compatible'` (repeated autumn time → first
 *   occurrence; skipped spring time → shifted forward by the gap).
 * - Missing or unparseable inputs return `undefined` without throwing.
 */
export const parseDate = (
	input: DateInput | undefined,
	timezone?: string
): ZonedDate | undefined => {
	if (input === undefined) {
		return undefined
	}
	const zone = resolveZone(timezone)

	if (isZonedDateValue(input)) {
		if (input.timeZoneId === zone) {
			return input
		}
		return withTimeZone(toZdtRecord(input), zone)
	}

	if (input instanceof Date) {
		const ms = input.getTime()
		if (!Number.isFinite(ms)) {
			return undefined
		}
		return instantToZonedDateTime(instantFromEpochMs(ms), zone)
	}

	if (typeof input === 'number') {
		if (!Number.isFinite(input)) {
			return undefined
		}
		return instantToZonedDateTime(instantFromEpochMs(input), zone)
	}

	const trimmed = input.trim()
	if (trimmed.length === 0) {
		return undefined
	}

	try {
		if (hasExplicitOffset(trimmed)) {
			const instant = instantFromString(trimmed)
			return instantToZonedDateTime(instant, zone)
		}
		const plain = plainDateTimeFromString(trimmed, getISO)
		return plainDateTimeToZonedDateTime(plain, zone, DISAMBIGUATION_COMPATIBLE)
	} catch {
		return undefined
	}
}

/** Builds a `ZonedDate` from calendar/clock fields in `timezone`. */
export const fromFields = (
	fields: DateFieldsInput,
	timezone?: string
): ZonedDate =>
	zdtFromFields(
		{
			year: fields.year,
			month: fields.month,
			day: fields.day,
			hour: fields.hour ?? 0,
			minute: fields.minute ?? 0,
			second: fields.second ?? 0,
			millisecond: fields.millisecond ?? 0,
			timeZone: resolveZone(timezone),
		},
		DISAMBIGUATION_COMPATIBLE
	)

/** Converts `date` to display in `timezone` without moving its instant. */
export const withZone = (date: ZonedDate, timezone: string): ZonedDate => {
	if (date.timeZoneId === timezone) {
		return date
	}
	return withTimeZone(toZdtRecord(date), timezone)
}

const ADD_BY_UNIT: Record<
	DateUnit,
	(d: ZonedDateTimeRecord, n: number) => ZonedDateTimeRecord
> = {
	year: addYears,
	month: addMonths,
	week: addWeeks,
	day: addDays,
	hour: addHours,
	minute: addMinutes,
	second: addSeconds,
	millisecond: addMilliseconds,
}

export const add = (
	date: ZonedDate,
	amount: number,
	unit: DateUnit
): ZonedDate => ADD_BY_UNIT[unit](toZdtRecord(date), amount)

export const subtract = (
	date: ZonedDate,
	amount: number,
	unit: DateUnit
): ZonedDate => ADD_BY_UNIT[unit](toZdtRecord(date), -amount)

/** Replaces clock fields on `date`'s calendar day in its own timezone. */
export const withTime = (date: ZonedDate, time: TimeFieldsInput): ZonedDate =>
	zdtWithFields(
		toZdtRecord(date),
		{
			hour: time.hour ?? date.hour,
			minute: time.minute ?? date.minute,
			second: time.second ?? date.second,
			millisecond: time.millisecond ?? date.millisecond,
		},
		DISAMBIGUATION_COMPATIBLE
	)

/** Converts ISO day-of-week (1=Mon..7=Sun) to JS day-of-week (0=Sun..6=Sat). */
const toJsDayOfWeek = (date: ZonedDate): number =>
	getIsoDayOfWeek(toZdtRecord(date)) % SUNDAY_ISO_DAY

/** Start of `unit` in `date`'s timezone (`weekStart`: 0 = Sun .. 6 = Sat). */
export const startOf = (
	date: ZonedDate,
	unit: BoundaryUnit,
	weekStart = 0
): ZonedDate => {
	const rec = toZdtRecord(date)
	if (unit === 'day') {
		return startOfDay(rec)
	}
	if (unit === 'hour') {
		return roundToHour(rec, 'floor')
	}
	if (unit === 'minute') {
		return roundToMinute(rec, 'floor')
	}
	if (unit === 'week') {
		const normalizedWeekStart =
			((weekStart % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK
		const offsetFromWeekStart =
			(toJsDayOfWeek(date) - normalizedWeekStart + DAYS_PER_WEEK) %
			DAYS_PER_WEEK
		return startOfDay(addDays(rec, -offsetFromWeekStart))
	}
	if (unit === 'month') {
		return startOfDay(
			toZdtRecord(
				fromFields(
					{ year: date.year, month: date.month, day: 1 },
					date.timeZoneId
				)
			)
		)
	}
	return startOfDay(
		toZdtRecord(
			fromFields({ year: date.year, month: 1, day: 1 }, date.timeZoneId)
		)
	)
}

/** Last millisecond of `unit` in `date`'s timezone. */
export const endOf = (
	date: ZonedDate,
	unit: BoundaryUnit,
	weekStart = 0
): ZonedDate => {
	const unitStart = startOf(date, unit, weekStart)
	const nextUnitStart = add(unitStart, 1, unit)
	return addMilliseconds(toZdtRecord(nextUnitStart), -1)
}

export const getFields = (date: ZonedDate): DateFields => ({
	year: date.year,
	month: date.month,
	day: date.day,
	hour: date.hour,
	minute: date.minute,
	second: date.second,
	millisecond: date.millisecond,
	dayOfWeek: toJsDayOfWeek(date),
	daysInMonth: getDaysInMonth(toZdtRecord(date)),
})

export const toEpochMs = (date: ZonedDate): number => date.epochMilliseconds

export const toDate = (date: ZonedDate): Date =>
	new Date(date.epochMilliseconds)

export const toUtcIso = (date: ZonedDate): string =>
	new Date(date.epochMilliseconds).toISOString()

export const toOffsetIso = (date: ZonedDate): string =>
	zdtToString(toZdtRecord(date), { timeZoneName: 'never' })

/** `YYYY-MM-DD` in `date`'s own timezone: the stable per-day key. */
export const dayKey = (date: ZonedDate): string =>
	plainDateToString(toPlainDate(toZdtRecord(date)))

export const offsetMinutes = (date: ZonedDate): number =>
	getOffsetNanoseconds(toZdtRecord(date)) / NANOSECONDS_PER_MINUTE

/** Formatted UTC offset string such as `'+09:00'` or `'-05:00'`. */
export const getOffsetString = (date: ZonedDate): string =>
	getOffset(toZdtRecord(date))

/** Returns the next or previous DST transition instant in `date`'s zone, or `null`. */
export const getTransition = (
	date: ZonedDate,
	direction: 'next' | 'previous'
): ZonedDate | null => getTimeZoneTransition(toZdtRecord(date), direction)

/** Whether `zone` is a valid IANA time zone identifier accepted by `Intl`. */
export const isValidTimeZone = (zone: string): boolean => {
	try {
		new Intl.DateTimeFormat(undefined, { timeZone: zone })
		return true
	} catch {
		return false
	}
}

export const isBefore = (
	a: ZonedDate,
	b: ZonedDate,
	unit?: BoundaryUnit
): boolean => {
	if (unit) {
		return startOf(a, unit).epochNanoseconds < startOf(b, unit).epochNanoseconds
	}
	return a.epochNanoseconds < b.epochNanoseconds
}

export const isAfter = (
	a: ZonedDate,
	b: ZonedDate,
	unit?: BoundaryUnit
): boolean => {
	if (unit) {
		return startOf(a, unit).epochNanoseconds > startOf(b, unit).epochNanoseconds
	}
	return a.epochNanoseconds > b.epochNanoseconds
}

export const isSameInstant = (a: ZonedDate, b: ZonedDate): boolean =>
	a.epochNanoseconds === b.epochNanoseconds

export const isSameOrBefore = (
	a: ZonedDate,
	b: ZonedDate,
	unit?: BoundaryUnit
): boolean => {
	if (unit) {
		return (
			startOf(a, unit).epochNanoseconds <= startOf(b, unit).epochNanoseconds
		)
	}
	return a.epochNanoseconds <= b.epochNanoseconds
}

export const isSameOrAfter = (
	a: ZonedDate,
	b: ZonedDate,
	unit?: BoundaryUnit
): boolean => {
	if (unit) {
		return (
			startOf(a, unit).epochNanoseconds >= startOf(b, unit).epochNanoseconds
		)
	}
	return a.epochNanoseconds >= b.epochNanoseconds
}

export const isSameDay = (a: ZonedDate, b: ZonedDate): boolean =>
	dayKey(a) === dayKey(b)

/**
 * Whether `interval` overlaps `[start, end]`, with `start` inclusive and `end`
 * exclusive (RFC 5545 DTEND). Zero-duration intervals are placed by `start`.
 */
export const overlapsRange = (
	interval: ZonedInterval,
	start: ZonedDate,
	end: ZonedDate
): boolean => {
	const startsInRange =
		isSameOrAfter(interval.start, start) && isSameOrBefore(interval.start, end)
	const endsInRange =
		isAfter(interval.end, start) && isSameOrBefore(interval.end, end)
	const spansRange =
		isBefore(interval.start, start) && isAfter(interval.end, end)
	return startsInRange || endsInRange || spansRange
}

const MS_PER_DIFF_UNIT: Record<
	'day' | 'hour' | 'minute' | 'millisecond',
	number
> = {
	day: MILLISECONDS_PER_DAY,
	hour: MILLISECONDS_PER_HOUR,
	minute: MILLISECONDS_PER_MINUTE,
	millisecond: 1,
}

/** Elapsed time difference (`end - start`) in `unit`. */
export const elapsedDiff = (
	end: ZonedDate,
	start: ZonedDate,
	unit: 'day' | 'hour' | 'minute' | 'millisecond'
): number =>
	(end.epochMilliseconds - start.epochMilliseconds) / MS_PER_DIFF_UNIT[unit]

/**
 * Wall-clock difference (`end - start`) as a clock face reads it, for placing
 * events on a grid labelled by clock hour across DST transitions.
 */
export const wallClockDiff = (
	end: ZonedDate,
	start: ZonedDate,
	unit: 'day' | 'hour' | 'minute'
): number => {
	const endWallMs = Date.UTC(
		end.year,
		end.month - 1,
		end.day,
		end.hour,
		end.minute,
		end.second,
		end.millisecond
	)
	const startWallMs = Date.UTC(
		start.year,
		start.month - 1,
		start.day,
		start.hour,
		start.minute,
		start.second,
		start.millisecond
	)
	return (endWallMs - startWallMs) / MS_PER_DIFF_UNIT[unit]
}

export const minDate = (a: ZonedDate, b: ZonedDate): ZonedDate =>
	isBefore(a, b) ? a : b

export const maxDate = (a: ZonedDate, b: ZonedDate): ZonedDate =>
	isAfter(a, b) ? a : b

const formatterCache = new Map<string, Intl.DateTimeFormat>()

const getFormatter = (
	timeZone: string,
	options: Intl.DateTimeFormatOptions,
	locale?: string
): Intl.DateTimeFormat => {
	const resolvedOptions: Intl.DateTimeFormatOptions = {
		...options,
		timeZone,
	}
	const key = `${locale ?? ''}|${JSON.stringify(resolvedOptions)}`
	let formatter = formatterCache.get(key)
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(locale, resolvedOptions)
		formatterCache.set(key, formatter)
	}
	return formatter
}

/**
 * Formats `date` using `Intl.DateTimeFormat`, always passing `date.timeZoneId`
 * explicitly so output never depends on the machine's timezone.
 */
export const formatDate = (
	date: ZonedDate,
	options: Intl.DateTimeFormatOptions,
	locale?: string
): string =>
	getFormatter(date.timeZoneId, options, locale).format(date.epochMilliseconds)

/**
 * Formats a start–end date range using `Intl.DateTimeFormat.prototype.formatRange`,
 * always passing `start.timeZoneId` explicitly.
 */
export const formatDateRange = (
	start: ZonedDate,
	end: ZonedDate,
	options: Intl.DateTimeFormatOptions,
	locale?: string
): string =>
	getFormatter(start.timeZoneId, options, locale).formatRange(
		start.epochMilliseconds,
		end.epochMilliseconds
	)

/**
 * Wall-clock difference as whole calendar days plus wall-clock time-of-day
 * delta in milliseconds (FullCalendar `diffDayAndTime`, `marker.ts:48-58`, v7.1.1).
 */
export const diffDayAndTime = (
	before: ZonedDate,
	after: ZonedDate
): { days: number; milliseconds: number } => {
	const beforeDay = startOfDay(toZdtRecord(before))
	const afterDay = startOfDay(toZdtRecord(after))
	const days = Math.round(wallClockDiff(afterDay, beforeDay, 'day'))
	const beforeTimeMs =
		((before.hour * 60 + before.minute) * 60 + before.second) * 1000 +
		before.millisecond
	const afterTimeMs =
		((after.hour * 60 + after.minute) * 60 + after.second) * 1000 +
		after.millisecond
	return { days, milliseconds: afterTimeMs - beforeTimeMs }
}

const THURSDAY_INDEX = 4
const ISO_WEEK_FIRST_DAY = 1
const ISO_WEEK_MINIMAL_DAYS = 4

const dayNumberFromYmd = (year: number, month: number, day: number): number =>
	Math.floor(Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY)

const weekdayOfDayNumber = (dayNumber: number): number =>
	(((dayNumber + THURSDAY_INDEX) % DAYS_PER_WEEK) + DAYS_PER_WEEK) %
	DAYS_PER_WEEK

const countCalendarWeeks = (
	date: ZonedDate,
	firstDayOfWeek: number,
	firstDayOfYear: number
): number => {
	const day = dayNumberFromYmd(date.year, date.month, date.day)

	const firstWeekStart = (ofYear: number): number => {
		const anchor = dayNumberFromYmd(ofYear, 1, firstDayOfYear)
		const daysIntoWeek =
			(weekdayOfDayNumber(anchor) - firstDayOfWeek + DAYS_PER_WEEK) %
			DAYS_PER_WEEK
		return anchor - daysIntoWeek
	}

	const weeksSince = (startDayNumber: number): number =>
		Math.floor((day - startDayNumber) / DAYS_PER_WEEK) + 1

	if (day >= firstWeekStart(date.year + 1)) {
		return 1
	}
	if (day < firstWeekStart(date.year)) {
		return weeksSince(firstWeekStart(date.year - 1))
	}
	return weeksSince(firstWeekStart(date.year))
}

const readMinimalDays = (info: object, firstDay: number): number => {
	if ('minimalDays' in info && typeof info.minimalDays === 'number') {
		return info.minimalDays
	}
	return firstDay === ISO_WEEK_FIRST_DAY ? 4 : 1
}

const getLocaleWeekParams = (
	locale?: string
): { firstDayOfWeek: number; firstDayOfYear: number } => {
	try {
		const intlLocale = new Intl.Locale(locale ?? 'en-US')
		const info = intlLocale.getWeekInfo()
		const firstDayOfWeek = info.firstDay % SUNDAY_ISO_DAY
		const firstDayOfYear = readMinimalDays(info, info.firstDay)
		return { firstDayOfWeek, firstDayOfYear }
	} catch {
		// Fall back to Sunday / Jan 1 for unrecognized locale tags
	}
	return { firstDayOfWeek: 0, firstDayOfYear: 1 }
}

/**
 * Computes the calendar week number for `date`:
 * - `'ISO'`: ISO 8601 (Monday-first, week 1 contains Jan 4).
 * - `'local'`: locale's week rules via `Intl.Locale.prototype.getWeekInfo()`.
 */
export const getWeekNumber = (
	date: ZonedDate,
	calculation: 'local' | 'ISO',
	locale?: string
): number => {
	if (calculation === 'ISO') {
		return countCalendarWeeks(date, ISO_WEEK_FIRST_DAY, ISO_WEEK_MINIMAL_DAYS)
	}
	const { firstDayOfWeek, firstDayOfYear } = getLocaleWeekParams(locale)
	return countCalendarWeeks(date, firstDayOfWeek, firstDayOfYear)
}
