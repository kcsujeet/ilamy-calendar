import type { Weekday } from 'rrule'
import { RRule } from 'rrule'
import type { RRuleOptions } from '@/features/recurrence/types'
import {
	expandOnTheDay,
	getRecurrenceDefaultsFromReference,
	type OnThePosition,
	parseMonthlyMode,
} from '@/features/recurrence/utils/rrule-editor-utils'
import dayjs from '@/lib/configs/dayjs-config'

export type RecurrencePreset =
	| 'once'
	| 'daily'
	| 'weekdays'
	| 'weeklyOnDay'
	| 'monthlyOnDay'
	| 'monthlyOnWeekday'
	| 'customize'

// rrule.js weekday indices: MO=0 … FR=4
const WEEKDAY_INDICES = [0, 1, 2, 3, 4] as const

const PRESET_ORDER: RecurrencePreset[] = [
	'once',
	'daily',
	'weekdays',
	'weeklyOnDay',
	'monthlyOnDay',
	'monthlyOnWeekday',
	'customize',
]

// Returns preset keys in display order for the header select.
export const getRecurrencePresetOrder = (): RecurrencePreset[] => PRESET_ORDER

// Narrows ByWeekday entries to Weekday objects (excludes plain numeric weekdays).
const isWeekdayObject = (value: unknown): value is Weekday =>
	typeof value === 'object' && value !== null && 'weekday' in value

// Normalizes byweekday to Weekday objects for preset matching.
const normalizeByweekday = (
	byweekday?: RRuleOptions['byweekday']
): Weekday[] => {
	if (!byweekday) {
		return []
	}
	const list = Array.isArray(byweekday) ? byweekday : [byweekday]
	return list.filter(isWeekdayObject)
}

// Returns true when the weekday uses an nth occurrence.
const hasNth = (weekday: Weekday): boolean => {
	const withN = weekday as Weekday & { n?: number }
	return withN.n !== undefined && withN.n !== null
}

// Reads the nth position from a weekday instance.
const getNth = (weekday: Weekday): number =>
	(weekday as Weekday & { n: number }).n

// Returns the first entry when an RRULE field may be a scalar or array.
const firstNumber = (value?: number | number[] | null): number | undefined => {
	if (value === undefined || value === null) {
		return undefined
	}
	return Array.isArray(value) ? value[0] : value
}

// Returns true when options use only preset-safe end rules (none).
const hasPresetEnd = (opts: RRuleOptions): boolean =>
	opts.count !== undefined || opts.until !== undefined

// Computes which occurrence (1–4 or last) a date is within its month for that weekday.
export const getWeekdayPositionInMonth = (
	referenceDate?: Date
): OnThePosition => {
	const ref = referenceDate ? dayjs(referenceDate) : dayjs()

	if (ref.add(7, 'day').month() !== ref.month()) {
		return -1
	}

	const weekday = ref.day()
	let occurrence = 0
	let cursor = ref.startOf('month')

	while (cursor.month() === ref.month()) {
		if (cursor.day() === weekday) {
			occurrence++
		}
		if (cursor.isSame(ref, 'day')) {
			break
		}
		cursor = cursor.add(1, 'day')
	}

	if (occurrence >= 5) {
		return -1
	}

	return occurrence as OnThePosition
}

// Maps nth position to a translation key for preset labels.
export const getPositionLabelKey = (
	position: OnThePosition
): 'first' | 'second' | 'third' | 'fourth' | 'last' => {
	if (position === -1) {
		return 'last'
	}
	if (position === 2) {
		return 'second'
	}
	if (position === 3) {
		return 'third'
	}
	if (position === 4) {
		return 'fourth'
	}
	return 'first'
}

// Builds RRULE options for a quick-recurrence preset from the event start date.
export const buildPresetOptions = (
	preset: RecurrencePreset,
	referenceDate?: Date
): RRuleOptions | null => {
	if (preset === 'once' || preset === 'customize') {
		return null
	}

	const defaults = getRecurrenceDefaultsFromReference(referenceDate)
	const dtstart = referenceDate ?? new Date()
	const base = {
		interval: 1,
		dtstart,
		count: undefined,
		until: undefined,
	} satisfies Pick<RRuleOptions, 'interval' | 'dtstart' | 'count' | 'until'>

	if (preset === 'daily') {
		return {
			...base,
			freq: RRule.DAILY,
			byweekday: undefined,
			bymonthday: undefined,
			bymonth: undefined,
		}
	}

	if (preset === 'weekdays') {
		return {
			...base,
			freq: RRule.WEEKLY,
			byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
			bymonthday: undefined,
			bymonth: undefined,
		}
	}

	if (preset === 'weeklyOnDay') {
		return {
			...base,
			freq: RRule.WEEKLY,
			byweekday: [defaults.weeklyDay],
			bymonthday: undefined,
			bymonth: undefined,
		}
	}

	if (preset === 'monthlyOnDay') {
		return {
			...base,
			freq: RRule.MONTHLY,
			bymonthday: [defaults.dayOfMonth],
			byweekday: undefined,
			bymonth: undefined,
		}
	}

	const position = getWeekdayPositionInMonth(referenceDate)
	return {
		...base,
		freq: RRule.MONTHLY,
		bymonthday: undefined,
		bymonth: undefined,
		byweekday: expandOnTheDay(defaults.onTheDay, position),
	}
}

// Builds default options shown in customize mode when no RRULE exists yet.
export const buildDefaultCustomizeOptions = (
	referenceDate?: Date
): RRuleOptions => {
	const preset = buildPresetOptions('daily', referenceDate)
	return (
		preset ?? {
			freq: RRule.DAILY,
			interval: 1,
			dtstart: referenceDate ?? new Date(),
		}
	)
}

// Returns true when all weekdays are Mon–Fri without nth qualifiers.
const isWeekdayPreset = (days: Weekday[]): boolean => {
	if (days.length !== 5 || days.some(hasNth)) {
		return false
	}
	const indices = days.map((day) => day.weekday).sort((a, b) => a - b)
	return WEEKDAY_INDICES.every((index, idx) => index === indices[idx])
}

// Infers which quick preset matches existing RRULE options, if any.
export const detectPresetFromOptions = (
	opts: RRuleOptions | null | undefined,
	referenceDate?: Date
): RecurrencePreset => {
	if (!opts) {
		return 'once'
	}

	if (hasPresetEnd(opts) || (opts.interval ?? 1) !== 1) {
		return 'customize'
	}

	const defaults = getRecurrenceDefaultsFromReference(referenceDate)
	const { freq } = opts

	if (freq === RRule.DAILY) {
		return 'daily'
	}

	if (freq === RRule.WEEKLY) {
		const days = normalizeByweekday(opts.byweekday)
		if (isWeekdayPreset(days)) {
			return 'weekdays'
		}
		if (
			days.length === 1 &&
			!hasNth(days[0]) &&
			days[0].weekday === defaults.weeklyDay.weekday
		) {
			return 'weeklyOnDay'
		}
		return 'customize'
	}

	if (freq === RRule.MONTHLY) {
		const monthDay = firstNumber(opts.bymonthday)
		if (
			parseMonthlyMode(opts) === 'bymonthday' &&
			monthDay === defaults.dayOfMonth
		) {
			return 'monthlyOnDay'
		}

		const days = normalizeByweekday(opts.byweekday).filter(hasNth)
		if (days.length === 1) {
			const expectedPosition = getWeekdayPositionInMonth(referenceDate)
			const dayMatches = days[0].weekday === defaults.weeklyDay.weekday
			const positionMatches = getNth(days[0]) === expectedPosition
			if (dayMatches && positionMatches) {
				return 'monthlyOnWeekday'
			}
		}

		return 'customize'
	}

	return 'customize'
}
