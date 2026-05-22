import type { ByWeekday, Weekday } from 'rrule'
import { RRule } from 'rrule'
import type { RRuleOptions } from '@/features/recurrence/types'
import { getWeekdayPositionInMonth } from '@/features/recurrence/utils/recurrence-preset-utils'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'

export type MonthlyMode = 'bymonthday' | 'byweekday'
export type YearlyMode = 'bymonthday' | 'byweekday'
export type OnTheDaySelection =
	| 'DAY'
	| 'WEEKDAY'
	| 'WEEKEND'
	| 'SU'
	| 'MO'
	| 'TU'
	| 'WE'
	| 'TH'
	| 'FR'
	| 'SA'

export type OnThePosition = 1 | 2 | 3 | 4 | -1

export interface MonthlyPatchInput {
	dayOfMonth: number
	onTheDay: OnTheDaySelection
	position: OnThePosition
}

export interface YearlyPatchInput extends MonthlyPatchInput {
	month: number
}

const WEEKDAY_BY_KEY: Record<
	Exclude<OnTheDaySelection, 'DAY' | 'WEEKDAY' | 'WEEKEND'>,
	typeof RRule.MO
> = {
	SU: RRule.SU,
	MO: RRule.MO,
	TU: RRule.TU,
	WE: RRule.WE,
	TH: RRule.TH,
	FR: RRule.FR,
	SA: RRule.SA,
}

const DAYJS_TO_RRULE = [
	RRule.SU,
	RRule.MO,
	RRule.TU,
	RRule.WE,
	RRule.TH,
	RRule.FR,
	RRule.SA,
] as const

const WEEKDAY_INDEX_KEYS: Exclude<
	OnTheDaySelection,
	'DAY' | 'WEEKDAY' | 'WEEKEND'
>[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

const ON_THE_DAY_SELECTIONS: ReadonlySet<OnTheDaySelection> = new Set([
	'DAY',
	'WEEKDAY',
	'WEEKEND',
	'SU',
	'MO',
	'TU',
	'WE',
	'TH',
	'FR',
	'SA',
])

export const POSITION_SELECT_LAST = 'last'

// Coerces arbitrary select values to a valid "on the" day selection.
export const normalizeOnTheDaySelection = (
	day: string | undefined | null
): OnTheDaySelection => {
	if (day && ON_THE_DAY_SELECTIONS.has(day as OnTheDaySelection)) {
		return day as OnTheDaySelection
	}
	return 'MO'
}

// Parses position select values ("1"…"4", "last") into rrule nth positions.
export const parsePositionFromSelect = (value: string): OnThePosition => {
	if (value === POSITION_SELECT_LAST) {
		return -1
	}
	const parsed = Number.parseInt(value, 10)
	if (parsed === -1) {
		return -1
	}
	if (parsed >= 1 && parsed <= 4) {
		return parsed as OnThePosition
	}
	return 1
}

// Encodes an nth position for use as a select item value.
export const formatPositionForSelect = (position: OnThePosition): string =>
	position === -1 ? POSITION_SELECT_LAST : String(position)

// Returns the first entry when an RRULE field may be a scalar or array.
const firstNumber = (value?: number | number[] | null): number | undefined => {
	if (value === undefined || value === null) {
		return undefined
	}
	return Array.isArray(value) ? value[0] : value
}

// Returns true when the value is a non-empty number or number array.
const hasNumberValues = (value?: number | number[] | null): boolean => {
	if (value === undefined || value === null) {
		return false
	}
	return Array.isArray(value) ? value.length > 0 : true
}

// Narrows ByWeekday entries to Weekday objects (excludes plain numeric weekdays).
const isWeekdayObject = (value: ByWeekday): value is Weekday =>
	typeof value !== 'number'

// Normalizes byweekday to Weekday objects for parsing and building.
export const normalizeByweekday = (
	byweekday?: ByWeekday | ByWeekday[] | null
): Weekday[] => {
	if (!byweekday) {
		return []
	}
	const list = Array.isArray(byweekday) ? byweekday : [byweekday]
	return list.filter(isWeekdayObject)
}

// Returns true when the weekday uses an nth occurrence (monthly/yearly "on the").
const hasNth = (weekday: Weekday): boolean => {
	const withN = weekday as Weekday & { n?: number }
	return withN.n !== undefined && withN.n !== null
}

// Reads the nth position from a weekday instance.
const getNth = (weekday: Weekday): number => {
	return (weekday as Weekday & { n: number }).n
}

// Returns true when every weekday in the list shares the same nth value.
const isSameNth = (days: Weekday[]): boolean => {
	if (days.length === 0) {
		return true
	}
	const firstN = getNth(days[0])
	return days.every((day) => getNth(day) === firstN)
}

// Detects whether options use bymonthday or positional byweekday for monthly rules.
export const parseMonthlyMode = (opts: Partial<RRuleOptions>): MonthlyMode => {
	if (hasNumberValues(opts.bymonthday)) {
		return 'bymonthday'
	}
	const days = normalizeByweekday(opts.byweekday)
	if (days.some(hasNth)) {
		return 'byweekday'
	}
	return 'bymonthday'
}

// Detects whether options use bymonthday or positional byweekday for yearly rules.
export const parseYearlyMode = (opts: Partial<RRuleOptions>): YearlyMode => {
	if (hasNumberValues(opts.bymonthday)) {
		return 'bymonthday'
	}
	const days = normalizeByweekday(opts.byweekday)
	if (days.some(hasNth)) {
		return 'byweekday'
	}
	return 'bymonthday'
}

// Infers the "on the" day selection from an existing byweekday list.
export const parseOnTheDaySelection = (
	byweekday?: ByWeekday | ByWeekday[] | null
): OnTheDaySelection => {
	const days = normalizeByweekday(byweekday).filter(hasNth)
	if (days.length === 0) {
		return 'MO'
	}

	if (days.length === 7 && isSameNth(days)) {
		return 'DAY'
	}

	const indices = days.map((day) => day.weekday).sort((a, b) => a - b)
	const weekdayIndices = [0, 1, 2, 3, 4]
	if (
		days.length === 5 &&
		isSameNth(days) &&
		indices.every((index, idx) => index === weekdayIndices[idx])
	) {
		return 'WEEKDAY'
	}

	if (days.length === 2 && isSameNth(days)) {
		const sorted = [...indices].sort((a, b) => a - b)
		if (sorted[0] === 5 && sorted[1] === 6) {
			return 'WEEKEND'
		}
	}

	if (days.length === 1) {
		return WEEKDAY_INDEX_KEYS[days[0].weekday] ?? 'MO'
	}

	return 'MO'
}

// Reads the shared nth position from a byweekday list.
export const parseOnThePosition = (
	byweekday?: ByWeekday | ByWeekday[] | null
): OnThePosition => {
	const days = normalizeByweekday(byweekday).filter(hasNth)
	if (days.length === 0) {
		return 1
	}
	const n = getNth(days[0])
	if (n === -1) {
		return -1
	}
	if (n >= 1 && n <= 4) {
		return n as OnThePosition
	}
	return 1
}

// Builds byweekday entries for monthly/yearly "on the" rules.
export const expandOnTheDay = (
	day: OnTheDaySelection | string,
	position: OnThePosition
): Weekday[] => {
	const normalizedDay = normalizeOnTheDaySelection(day)
	if (normalizedDay === 'DAY') {
		return [
			RRule.SU,
			RRule.MO,
			RRule.TU,
			RRule.WE,
			RRule.TH,
			RRule.FR,
			RRule.SA,
		].map((weekday) => weekday.nth(position))
	}
	if (normalizedDay === 'WEEKDAY') {
		return [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR].map((weekday) =>
			weekday.nth(position)
		)
	}
	if (normalizedDay === 'WEEKEND') {
		return [RRule.SA, RRule.SU].map((weekday) => weekday.nth(position))
	}
	const weekday = WEEKDAY_BY_KEY[normalizedDay]
	return [weekday.nth(position)]
}

// Builds partial RRULE options for a monthly recurrence pattern.
export const buildMonthlyPatch = (
	mode: MonthlyMode,
	input: MonthlyPatchInput
): Partial<RRuleOptions> => {
	if (mode === 'bymonthday') {
		return {
			bymonthday: [input.dayOfMonth],
			byweekday: undefined,
			bymonth: undefined,
		}
	}
	return {
		bymonthday: undefined,
		bymonth: undefined,
		byweekday: expandOnTheDay(input.onTheDay, input.position),
	}
}

// Builds partial RRULE options for a yearly recurrence pattern.
export const buildYearlyPatch = (
	mode: YearlyMode,
	input: YearlyPatchInput
): Partial<RRuleOptions> => {
	const base = { bymonth: [input.month] }
	if (mode === 'bymonthday') {
		return {
			...base,
			bymonthday: [input.dayOfMonth],
			byweekday: undefined,
		}
	}
	return {
		...base,
		bymonthday: undefined,
		byweekday: expandOnTheDay(input.onTheDay, input.position),
	}
}

// Strips incompatible BY* fields when the user changes recurrence frequency.
export const sanitizeOptionsForFreq = (
	freq: number,
	opts: RRuleOptions,
	referenceDate?: Date
): RRuleOptions => {
	const ref = referenceDate ? dayjs(referenceDate) : dayjs()
	const preserved: RRuleOptions = {
		freq,
		interval: opts.interval ?? 1,
		dtstart: opts.dtstart,
		count: opts.count,
		until: opts.until,
	}

	if (freq === RRule.DAILY) {
		return {
			...preserved,
			byweekday: undefined,
			bymonthday: undefined,
			bymonth: undefined,
		}
	}

	if (freq === RRule.WEEKLY) {
		const existing = normalizeByweekday(opts.byweekday)
		const plainWeekdays = existing.filter((day) => !hasNth(day))
		const defaultDay = DAYJS_TO_RRULE[ref.day()]
		return {
			...preserved,
			byweekday: plainWeekdays.length > 0 ? plainWeekdays : [defaultDay],
			bymonthday: undefined,
			bymonth: undefined,
		}
	}

	if (freq === RRule.MONTHLY) {
		const mode = parseMonthlyMode(opts)
		if (mode === 'bymonthday' && hasNumberValues(opts.bymonthday)) {
			return {
				...preserved,
				bymonthday: opts.bymonthday,
				byweekday: undefined,
				bymonth: undefined,
			}
		}
		if (
			mode === 'byweekday' &&
			normalizeByweekday(opts.byweekday).some(hasNth)
		) {
			return {
				...preserved,
				byweekday: opts.byweekday,
				bymonthday: undefined,
				bymonth: undefined,
			}
		}
		return {
			...preserved,
			bymonthday: [ref.date()],
			byweekday: undefined,
			bymonth: undefined,
		}
	}

	if (freq === RRule.YEARLY) {
		const mode = parseYearlyMode(opts)
		const month = firstNumber(opts.bymonth) ?? ref.month() + 1
		if (mode === 'bymonthday' && hasNumberValues(opts.bymonthday)) {
			return {
				...preserved,
				bymonth: [month],
				bymonthday: opts.bymonthday,
				byweekday: undefined,
			}
		}
		if (
			mode === 'byweekday' &&
			normalizeByweekday(opts.byweekday).some(hasNth)
		) {
			return {
				...preserved,
				bymonth: [month],
				byweekday: opts.byweekday,
				bymonthday: undefined,
			}
		}
		return {
			...preserved,
			bymonth: [month],
			bymonthday: [ref.date()],
			byweekday: undefined,
		}
	}

	return { ...opts, freq }
}

const DAYJS_DAY_TO_ON_THE: OnTheDaySelection[] = [
	'SU',
	'MO',
	'TU',
	'WE',
	'TH',
	'FR',
	'SA',
]

// Derives default monthly/yearly field values from a reference event start date.
export const getRecurrenceDefaultsFromReference = (referenceDate?: Date) => {
	const ref = referenceDate ? dayjs(referenceDate) : dayjs()
	return {
		dayOfMonth: ref.date(),
		month: ref.month() + 1,
		onTheDay: DAYJS_DAY_TO_ON_THE[ref.day()] ?? 'MO',
		position: 1 as OnThePosition,
		weeklyDay: DAYJS_TO_RRULE[ref.day()],
	}
}

// Converts local Dayjs to floating UTC used by RRule (matches recurrence-handler).
const toFloatingDate = (value: Dayjs): Date =>
	new Date(
		Date.UTC(
			value.year(),
			value.month(),
			value.date(),
			value.hour(),
			value.minute(),
			value.second(),
			value.millisecond()
		)
	)

// Maps a floating UTC Date back onto a reference Dayjs timezone context.
const fromFloatingDate = (date: Date, reference: Dayjs): Dayjs =>
	reference
		.year(date.getUTCFullYear())
		.month(date.getUTCMonth())
		.date(date.getUTCDate())
		.hour(date.getUTCHours())
		.minute(date.getUTCMinutes())
		.second(date.getUTCSeconds())
		.millisecond(date.getUTCMilliseconds())

// Keeps the event time-of-day while moving to another calendar date.
const preserveTimeOfDay = (start: Dayjs, date: Dayjs): Dayjs =>
	date
		.hour(start.hour())
		.minute(start.minute())
		.second(start.second())
		.millisecond(start.millisecond())

// Returns the rrule.js weekday index for a dayjs day-of-week (0 = Sunday).
const rruleWeekdayIndex = (dayjsDay: number): number =>
	DAYJS_TO_RRULE[dayjsDay].weekday

// Returns true when a calendar date satisfies the RRULE BY* constraints (ignoring dtstart).
export const occurrenceMatchesByRules = (
	date: Dayjs,
	opts: RRuleOptions
): boolean => {
	const { freq } = opts

	if (freq === RRule.DAILY) {
		return true
	}

	if (freq === RRule.WEEKLY) {
		const days = normalizeByweekday(opts.byweekday).filter(
			(day) => !hasNth(day)
		)
		if (days.length === 0) {
			return true
		}
		const weekday = rruleWeekdayIndex(date.day())
		return days.some((day) => day.weekday === weekday)
	}

	if (freq === RRule.MONTHLY || freq === RRule.YEARLY) {
		if (freq === RRule.YEARLY) {
			const month = firstNumber(opts.bymonth)
			if (month !== undefined && date.month() + 1 !== month) {
				return false
			}
		}

		const mode =
			freq === RRule.YEARLY ? parseYearlyMode(opts) : parseMonthlyMode(opts)

		if (mode === 'bymonthday') {
			const dayOfMonth = firstNumber(opts.bymonthday)
			return dayOfMonth !== undefined && date.date() === dayOfMonth
		}

		const position = parseOnThePosition(opts.byweekday)
		const onTheDay = parseOnTheDaySelection(opts.byweekday)
		const positionInMonth = getWeekdayPositionInMonth(date.toDate())

		if (positionInMonth !== position) {
			return false
		}

		if (onTheDay === 'DAY') {
			return true
		}

		if (onTheDay === 'WEEKDAY') {
			return date.day() >= 1 && date.day() <= 5
		}

		if (onTheDay === 'WEEKEND') {
			return date.day() === 0 || date.day() === 6
		}

		return rruleWeekdayIndex(date.day()) === WEEKDAY_BY_KEY[onTheDay].weekday
	}

	return true
}

// Returns true when the event start date matches the customize RRULE pattern.
export const isStartCompatibleWithRRule = (
	start: Dayjs,
	opts: RRuleOptions
): boolean => occurrenceMatchesByRules(start, opts)

// Finds the next weekly BYDAY match on or after the given start date.
const alignWeeklyStart = (start: Dayjs, opts: RRuleOptions): Dayjs => {
	const cursor = start.startOf('day')
	for (let offset = 0; offset < 7; offset += 1) {
		const candidate = cursor.add(offset, 'day')
		if (occurrenceMatchesByRules(candidate, opts)) {
			return preserveTimeOfDay(start, candidate)
		}
	}
	return start
}

// Finds a matching occurrence inside a calendar month for monthly rules.
const findMonthlyOccurrence = (
	monthStart: Dayjs,
	opts: RRuleOptions,
	start: Dayjs
): Dayjs | null => {
	const rule = new RRule({
		...opts,
		dtstart: toFloatingDate(monthStart),
		until: undefined,
		count: undefined,
	})
	const occurrences = rule.between(
		toFloatingDate(monthStart),
		toFloatingDate(monthStart.endOf('month')),
		true
	)
	const matches = occurrences
		.map((occurrence) => fromFloatingDate(occurrence, start))
		.filter((occurrence) => occurrenceMatchesByRules(occurrence, opts))

	if (matches.length === 0) {
		return null
	}

	const onOrAfter = matches.find(
		(occurrence) => !occurrence.isBefore(start, 'day')
	)
	return onOrAfter ?? null
}

// Finds a matching occurrence inside a calendar year for yearly rules.
const findYearlyOccurrence = (
	yearStart: Dayjs,
	opts: RRuleOptions,
	start: Dayjs
): Dayjs | null => {
	const rule = new RRule({
		...opts,
		dtstart: toFloatingDate(yearStart),
		until: undefined,
		count: undefined,
	})
	const occurrences = rule.between(
		toFloatingDate(yearStart),
		toFloatingDate(yearStart.endOf('year')),
		true
	)
	const matches = occurrences
		.map((occurrence) => fromFloatingDate(occurrence, start))
		.filter((occurrence) => occurrenceMatchesByRules(occurrence, opts))

	if (matches.length === 0) {
		return null
	}

	const onOrAfter = matches.find(
		(occurrence) => !occurrence.isBefore(start, 'day')
	)
	return onOrAfter ?? null
}

// Snaps the event start to a date that satisfies customize RRULE BY* rules.
export const alignStartWithRRule = (
	start: Dayjs,
	opts: RRuleOptions
): Dayjs => {
	if (isStartCompatibleWithRRule(start, opts)) {
		return start
	}

	if (opts.freq === RRule.WEEKLY) {
		return alignWeeklyStart(start, opts)
	}

	if (opts.freq === RRule.MONTHLY) {
		let monthCursor = start.startOf('month')
		for (let monthOffset = 0; monthOffset < 24; monthOffset += 1) {
			const match = findMonthlyOccurrence(monthCursor, opts, start)
			if (match) {
				return preserveTimeOfDay(start, match)
			}
			monthCursor = monthCursor.add(1, 'month').startOf('month')
		}
		return start
	}

	if (opts.freq === RRule.YEARLY) {
		let yearCursor = start.startOf('year')
		for (let yearOffset = 0; yearOffset < 5; yearOffset += 1) {
			const match = findYearlyOccurrence(yearCursor, opts, start)
			if (match) {
				return preserveTimeOfDay(start, match)
			}
			yearCursor = yearCursor.add(1, 'year').startOf('year')
		}
		return start
	}

	return start
}
