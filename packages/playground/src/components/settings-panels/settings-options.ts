import type { WeekDays } from '@ilamy/calendar'
import type { AgendaWindow } from '@ilamy/calendar/plugins/agenda'
import type { ThemeColorMode } from '../../types/settings-form'

export interface SelectOption<T extends string = string> {
	value: T
	label: string
}

const ALL_TIMEZONES = Intl.supportedValuesOf('timeZone')
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

export const QUICK_TIMEZONES: SelectOption[] = [
	{ value: LOCAL_TIMEZONE, label: 'Local' },
	{ value: 'UTC', label: 'UTC' },
	{ value: 'America/New_York', label: 'New York' },
	{ value: 'Europe/London', label: 'London' },
	{ value: 'Asia/Tokyo', label: 'Tokyo' },
]

const WEEK_DAYS: WeekDays[] = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
]

export const ORIENTATION_OPTIONS: SelectOption[] = [
	{ value: 'horizontal', label: 'Horizontal' },
	{ value: 'vertical', label: 'Vertical' },
]

export const WEEK_VIEW_GRANULARITY_OPTIONS: SelectOption[] = [
	{ value: 'hourly', label: 'Hourly' },
	{ value: 'daily', label: 'Daily' },
]

export const THEME_MODE_OPTIONS: SelectOption<ThemeColorMode>[] = [
	{ value: 'auto', label: 'Auto' },
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
]

export const WEEKDAY_CHECKBOX_OPTIONS: SelectOption<WeekDays>[] = [
	{ value: 'monday', label: 'Mon' },
	{ value: 'tuesday', label: 'Tue' },
	{ value: 'wednesday', label: 'Wed' },
	{ value: 'thursday', label: 'Thu' },
	{ value: 'friday', label: 'Fri' },
	{ value: 'saturday', label: 'Sat' },
	{ value: 'sunday', label: 'Sun' },
]

export const HOUR_OPTIONS: SelectOption[] = Array.from({ length: 24 }).map(
	(_, hour) => {
		const pad = hour.toString().padStart(2, '0')
		const period = hour < 12 ? 'AM' : 'PM'
		const twelve = hour % 12 === 0 ? 12 : hour % 12
		return { value: String(hour), label: `${twelve} ${period} (${pad}:00)` }
	}
)

export const FIRST_DAY_OF_WEEK_OPTIONS: SelectOption[] = WEEK_DAYS.map(
	(day) => ({
		value: day,
		label: `${day.at(0)?.toUpperCase()}${day.slice(1)}`,
	})
)

export const BASE_VIEW_OPTIONS: SelectOption[] = [
	{ value: 'month', label: 'Month' },
	{ value: 'week', label: 'Week' },
	{ value: 'day', label: 'Day' },
]

export const AGENDA_WINDOW_OPTIONS: SelectOption[] = [
	{ value: 'day', label: 'Day' },
	{ value: 'week', label: 'Week' },
	{ value: 'month', label: 'Month' },
	{ value: '3', label: '3d' },
	{ value: '14', label: '14d' },
]

export const LOCALE_OPTIONS: SelectOption[] = [
	{ value: 'en', label: 'English' },
	{ value: 'cs', label: 'Čeština' },
	{ value: 'es', label: 'Español' },
	{ value: 'fr', label: 'Français' },
	{ value: 'de', label: 'Deutsch' },
	{ value: 'it', label: 'Italiano' },
	{ value: 'pt', label: 'Português' },
	{ value: 'ru', label: 'Русский' },
	{ value: 'zh', label: '中文' },
	{ value: 'ja', label: '日本語' },
	{ value: 'ko', label: '한국어' },
]

export const TIMEZONE_OPTIONS: SelectOption[] = ALL_TIMEZONES.map((tz) => ({
	value: tz,
	label: tz,
}))

export const CALENDAR_HEIGHT_OPTIONS: SelectOption[] = [
	{ value: 'auto', label: 'Auto' },
	{ value: '400px', label: '400px' },
	{ value: '600px', label: '600px' },
	{ value: '750px', label: '750px' },
	{ value: '900px', label: '900px' },
]

export const DAY_MAX_EVENTS_OPTIONS: SelectOption[] = [
	{ value: '2', label: '2 events' },
	{ value: '3', label: '3 events' },
	{ value: '4', label: '4 events' },
	{ value: '5', label: '5 events' },
	{ value: '999', label: 'No limit' },
]

export const EVENT_HEIGHT_OPTIONS: SelectOption[] = [
	{ value: '20', label: '20px' },
	{ value: '24', label: '24px' },
	{ value: '36', label: '36px' },
	{ value: '48', label: '48px' },
]

export const EVENT_SPACING_OPTIONS: SelectOption[] = [
	{ value: '0', label: '0px' },
	{ value: '1', label: '1px' },
	{ value: '2', label: '2px' },
	{ value: '4', label: '4px' },
]

export const TIME_FORMAT_OPTIONS: SelectOption[] = [
	{ value: '12-hour', label: '12-hour' },
	{ value: '24-hour', label: '24-hour' },
]

export const SLOT_DURATION_OPTIONS: SelectOption[] = [
	{ value: '60', label: '60 min' },
	{ value: '30', label: '30 min' },
	{ value: '15', label: '15 min' },
]

export const SNAP_DURATION_OPTIONS: SelectOption[] = [
	{ value: '0', label: 'Match slot' },
	{ value: '30', label: '30 min' },
	{ value: '15', label: '15 min' },
]

export const WEEK_NUMBER_OPTIONS: SelectOption[] = [
	{ value: 'default', label: 'Default' },
	{ value: 'show', label: 'Show All' },
	{ value: 'hide', label: 'Hide' },
]

export const WEEK_NUMBER_CALCULATION_OPTIONS: SelectOption[] = [
	{ value: 'local', label: 'Local' },
	{ value: 'ISO', label: 'ISO 8601' },
]

export const SLOT_MIN_TIME_OPTIONS: SelectOption[] = Array.from({
	length: 24,
}).map((_, hour) => {
	const time = `${String(hour).padStart(2, '0')}:00`
	return { value: time, label: time }
})

export const SLOT_MAX_TIME_OPTIONS: SelectOption[] = Array.from({
	length: 24,
}).map((_, index) => {
	const time = `${String(index + 1).padStart(2, '0')}:00`
	return { value: time, label: time }
})

export const SCROLL_TIME_OPTIONS: SelectOption[] = [
	{ value: 'none', label: 'None' },
	...Array.from({ length: 24 }).map((_, i) => {
		const hour = i.toString().padStart(2, '0')
		return { value: `${hour}:00:00`, label: `${hour}:00` }
	}),
]

export function parseAgendaWindow(value: string): AgendaWindow {
	if (value === 'day' || value === 'week' || value === 'month') {
		return value
	}
	const parsed = Number(value)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 'week'
}

const isSameLocalDay = (a: Date, b: Date): boolean =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate()

export function resolveInitialDateOption(
	initialDate: string | undefined
): string {
	if (initialDate === undefined) return 'today'
	const parsed = new Date(initialDate)
	if (Number.isNaN(parsed.getTime())) return 'custom'
	const now = new Date()
	if (isSameLocalDay(parsed, now)) {
		return 'today'
	}
	if (isSameLocalDay(parsed, new Date(now.getFullYear(), now.getMonth(), 1))) {
		return 'start-of-month'
	}
	if (isSameLocalDay(parsed, new Date(now.getFullYear(), 0, 1))) {
		return 'start-of-year'
	}
	const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
	if (
		parsed.getFullYear() === nextMonth.getFullYear() &&
		parsed.getMonth() === nextMonth.getMonth()
	) {
		return 'next-month'
	}
	return 'custom'
}

export function optionToInitialDate(option: string): string | undefined {
	const now = new Date()
	if (option === 'start-of-month') {
		return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
	}
	if (option === 'start-of-year') {
		return new Date(now.getFullYear(), 0, 1).toISOString()
	}
	if (option === 'next-month') {
		return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
	}
	return undefined
}
