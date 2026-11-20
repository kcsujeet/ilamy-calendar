import {
	add,
	formatDate,
	getFields,
	now,
	parseDate,
	resolveZone,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { RRule } from 'rrule'
import type { RRuleOptions } from '../types'

export type RecurrencePreset =
	| 'once'
	| 'daily'
	| 'weekdays'
	| 'weeklyOnDay'
	| 'monthlyOnDay'
	| 'monthlyOnWeekday'
	| 'customize'

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

const toZoned = (date: Date, timezone?: string): ZonedDate => {
	const zone = resolveZone(timezone)
	return parseDate(date, zone) ?? now(zone)
}

const getRRuleWeekday = (date: Date, timezone?: string) => {
	const ref = toZoned(date, timezone)
	return RRULE_WEEKDAYS.at(getFields(ref).dayOfWeek) ?? RRule.SU
}

export const getNthWeekdayOfMonth = (date: Date, timezone?: string): number => {
	const ref = toZoned(date, timezone)
	const nextWeek = add(ref, 7, 'day')
	const isLastOccurrence = nextWeek.month !== ref.month
	return isLastOccurrence ? -1 : Math.ceil(ref.day / 7)
}

type PresetPattern = (
	start: Date,
	timezone?: string
) => {
	freq: RRuleOptions['freq']
	byweekday?: RRuleOptions['byweekday']
	bymonthday?: RRuleOptions['bymonthday']
}
const PRESET_PATTERNS: Partial<Record<RecurrencePreset, PresetPattern>> = {
	daily: () => ({ freq: RRule.DAILY }),
	weekdays: () => ({ freq: RRule.WEEKLY, byweekday: WEEKDAY_PRESET }),
	weeklyOnDay: (start, timezone) => ({
		freq: RRule.WEEKLY,
		byweekday: [getRRuleWeekday(start, timezone)],
	}),
	monthlyOnDay: (start, timezone) => ({
		freq: RRule.MONTHLY,
		bymonthday: toZoned(start, timezone).day,
	}),
	monthlyOnWeekday: (start, timezone) => ({
		freq: RRule.MONTHLY,
		byweekday: [
			getRRuleWeekday(start, timezone).nth(
				getNthWeekdayOfMonth(start, timezone)
			),
		],
	}),
}

export const getPresetRRule = (
	preset: RecurrencePreset,
	start: Date,
	timezone?: string
): RRuleOptions | null => {
	const pattern = PRESET_PATTERNS[preset]
	if (!pattern) {
		return null
	}
	return { interval: 1, dtstart: start, ...pattern(start, timezone) }
}

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

export const detectPreset = (
	opts: RRuleOptions | null,
	reference: Date,
	timezone?: string
): RecurrencePreset => {
	if (!opts) {
		return 'once'
	}
	const hasCustomInterval = Boolean(opts.interval) && opts.interval !== 1
	if (hasCustomInterval) {
		return 'customize'
	}
	const match = SIMPLE_PRESETS.find((preset) =>
		isSamePattern(opts, getPresetRRule(preset, reference, timezone))
	)
	return match ?? 'customize'
}

export const getPresetLabel = (
	preset: RecurrencePreset,
	reference: Date,
	t: (key: string) => string,
	locale?: string,
	timezone?: string
) => {
	const ref = toZoned(reference, timezone)
	const dayName = formatDate(ref, { weekday: 'long' }, locale)
	const nth = getNthWeekdayOfMonth(reference, timezone)
	const ordinalKey = nth === -1 ? 'last' : (ORDINALS.at(nth - 1) ?? 'last')
	const ordinal = t(ordinalKey)
	const labels: Partial<Record<RecurrencePreset, string>> = {
		daily: t('daily'),
		weekdays: t('everyWeekday'),
		weeklyOnDay: `${t('weeklyOn')} ${dayName}`,
		monthlyOnDay: `${t('monthlyOnDay')} ${ref.day}`,
		monthlyOnWeekday: `${t('monthlyOnThe')} ${ordinal} ${dayName}`,
	}
	return labels[preset] ?? t('customRecurrence')
}

export const resolveByweekday = (value: RRuleOptions['byweekday']) => {
	if (Array.isArray(value)) {
		return value
	}
	return value ? [value] : []
}
