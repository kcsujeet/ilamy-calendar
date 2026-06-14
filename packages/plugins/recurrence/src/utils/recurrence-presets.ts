import dayjs from '@ilamy/utils/dayjs'
import { RRule } from 'rrule'
import type { RRuleOptions } from '../types'

// Google-Calendar-style quick presets. `once` is the absence of a rule; the
// `customize` option opens the detailed editor and has no rule of its own.
export type RecurrencePreset =
	| 'once'
	| 'daily'
	| 'weekdays'
	| 'weeklyOnDay'
	| 'monthlyOnDay'
	| 'monthlyOnWeekday'
	| 'customize'

// RRule weekday constants indexed by dayjs day-of-week (0 = Sunday … 6 = Saturday).
const RRULE_WEEKDAYS = [
	RRule.SU,
	RRule.MO,
	RRule.TU,
	RRule.WE,
	RRule.TH,
	RRule.FR,
	RRule.SA,
]
const WEEKDAY_PRESET = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR]
const ORDINALS = ['first', 'second', 'third', 'fourth']

const getRRuleWeekday = (date: Date) =>
	RRULE_WEEKDAYS.at(dayjs(date).day()) ?? RRule.SU

// Which occurrence of its own weekday a date is within its month: 1–4, or -1
// for the last one (no further same-weekday date remains that month).
export const getNthWeekdayOfMonth = (date: Date) => {
	const ref = dayjs(date)
	const isLastOccurrence = ref.add(7, 'day').month() !== ref.month()
	return isLastOccurrence ? -1 : Math.ceil(ref.date() / 7)
}

// The pattern (frequency + by-rules) for each concrete preset, anchored at
// `start`. `once`/`customize` are absent, so getPresetRRule returns null for them.
type PresetPattern = (start: Date) => {
	freq: RRuleOptions['freq']
	byweekday?: RRuleOptions['byweekday']
	bymonthday?: RRuleOptions['bymonthday']
}
const PRESET_PATTERNS: Partial<Record<RecurrencePreset, PresetPattern>> = {
	daily: () => ({ freq: RRule.DAILY }),
	weekdays: () => ({ freq: RRule.WEEKLY, byweekday: WEEKDAY_PRESET }),
	weeklyOnDay: (start) => ({
		freq: RRule.WEEKLY,
		byweekday: [getRRuleWeekday(start)],
	}),
	monthlyOnDay: (start) => ({
		freq: RRule.MONTHLY,
		bymonthday: dayjs(start).date(),
	}),
	monthlyOnWeekday: (start) => ({
		freq: RRule.MONTHLY,
		byweekday: [getRRuleWeekday(start).nth(getNthWeekdayOfMonth(start))],
	}),
}

// Map a high-level preset to a full rule anchored at `start`. `once`/`customize`
// produce no rule of their own.
export const getPresetRRule = (
	preset: RecurrencePreset,
	start: Date
): RRuleOptions | null => {
	const pattern = PRESET_PATTERNS[preset]
	if (!pattern) {
		return null
	}
	return { interval: 1, dtstart: start, ...pattern(start) }
}

// Normalize a byweekday value (Weekday, number, array, or absent) into a stable
// comparable key, e.g. "0:2" for "2nd Monday".
const getWeekdayKey = (value: RRuleOptions['byweekday']) => {
	if (value == null) {
		return ''
	}
	const list = Array.isArray(value) ? value : [value]
	return list
		.map((day) =>
			typeof day === 'object' ? `${day.weekday}:${day.n ?? ''}` : `${day}:`
		)
		.sort()
		.join(',')
}

// Two rules describe the same recurrence pattern (ignoring end conditions, which
// the editor handles independently of the preset).
const isSamePattern = (a: RRuleOptions, b: RRuleOptions | null) => {
	if (!b) {
		return false
	}
	const sameFreq = a.freq === b.freq
	const sameDays = getWeekdayKey(a.byweekday) === getWeekdayKey(b.byweekday)
	const sameMonthday = (a.bymonthday ?? null) === (b.bymonthday ?? null)
	return sameFreq && sameDays && sameMonthday
}

const SIMPLE_PRESETS: RecurrencePreset[] = [
	'daily',
	'weekdays',
	'weeklyOnDay',
	'monthlyOnDay',
	'monthlyOnWeekday',
]

// Identify which preset an existing rule represents so the picker can reflect a
// saved series. A non-1 interval or any unmatched pattern falls to `customize`;
// count/until are ignored (end conditions stay editable on any preset).
export const detectPreset = (
	opts: RRuleOptions | null,
	reference: Date
): RecurrencePreset => {
	if (!opts) {
		return 'once'
	}
	const hasCustomInterval = Boolean(opts.interval) && opts.interval !== 1
	if (hasCustomInterval) {
		return 'customize'
	}
	const match = SIMPLE_PRESETS.find((preset) =>
		isSamePattern(opts, getPresetRRule(preset, reference))
	)
	return match ?? 'customize'
}

// Human-readable label for a preset, anchored at `reference` (e.g. "Weekly on
// Monday", "Monthly on the second Tuesday").
export const getPresetLabel = (
	preset: RecurrencePreset,
	reference: Date,
	t: (key: string) => string
) => {
	const dayName = dayjs(reference).format('dddd')
	const nth = getNthWeekdayOfMonth(reference)
	const ordinalKey = nth === -1 ? 'last' : (ORDINALS.at(nth - 1) ?? 'last')
	const ordinal = t(ordinalKey)
	const labels: Partial<Record<RecurrencePreset, string>> = {
		daily: t('daily'),
		weekdays: t('everyWeekday'),
		weeklyOnDay: `${t('weeklyOn')} ${dayName}`,
		monthlyOnDay: `${t('monthlyOnDay')} ${dayjs(reference).date()}`,
		monthlyOnWeekday: `${t('monthlyOnThe')} ${ordinal} ${dayName}`,
	}
	return labels[preset] ?? t('customRecurrence')
}

// Normalize rrule's byweekday (a single value, an array, or absent) to an array.
export const resolveByweekday = (value: RRuleOptions['byweekday']) => {
	if (Array.isArray(value)) {
		return value
	}
	return value ? [value] : []
}
