import type { SlotDuration, TimeFormat, WeekDays } from '@ilamy/calendar'

/**
 * Settings the URL can set, on top of whatever a scenario pins.
 *
 * There are far too many combinations of calendar settings to write a fixture
 * for each, so none are written: a fixture supplies the *events*, and every
 * setting is a query parameter. Any combination is reachable by editing a URL,
 * which is what lets an agent explore states nobody thought to enumerate.
 */
export interface UrlConfig {
	slotDuration?: SlotDuration
	scrollTime?: string
	dayMaxEvents?: number
	eventHeight?: number
	eventSpacing?: number
	firstDayOfWeek?: WeekDays
	hiddenDays?: WeekDays[]
	weekViewGranularity?: 'hourly' | 'daily'
	hideNonBusinessHours?: boolean
	stickyViewHeader?: boolean
	disableDragAndDrop?: boolean
	timeFormat?: TimeFormat
	locale?: string
	/** Harness-only: the height of the box the calendar is given. */
	height?: string
}

/** Raised for a value the URL got wrong, so the harness can show it rather than guess. */
export class ConfigError extends Error {}

const oneOf = <T extends string | number>(
	key: string,
	raw: string,
	allowed: readonly T[],
	parse: (value: string) => string | number
): T => {
	const value = parse(raw) as T
	if (!allowed.includes(value)) {
		throw new ConfigError(
			`${key}: expected one of ${allowed.join(', ')}, got "${raw}"`
		)
	}
	return value
}

const positiveInt = (key: string, raw: string): number => {
	const value = Number(raw)
	if (!Number.isInteger(value) || value < 0) {
		throw new ConfigError(
			`${key}: expected a non-negative integer, got "${raw}"`
		)
	}
	return value
}

const boolean = (key: string, raw: string): boolean => {
	if (raw === 'true') return true
	if (raw === 'false') return false
	throw new ConfigError(`${key}: expected true or false, got "${raw}"`)
}

const WEEK_DAYS: readonly WeekDays[] = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
]

/**
 * Reads the settings the URL carries. Anything unrecognised raises rather than
 * being dropped: a typo that silently falls back to the default would make a
 * test look like it covered a setting it never applied.
 */
export const readUrlConfig = (params: URLSearchParams): UrlConfig => {
	const config: UrlConfig = {}
	const get = (key: string) => params.get(key)

	const slot = get('slot')
	if (slot !== null) {
		config.slotDuration = oneOf(
			'slot',
			slot,
			[15, 30, 60],
			Number
		) as SlotDuration
	}

	const scrollTime = get('scrollTime')
	if (scrollTime !== null) {
		if (!/^\d{2}:\d{2}$/.test(scrollTime)) {
			throw new ConfigError(`scrollTime: expected HH:mm, got "${scrollTime}"`)
		}
		config.scrollTime = scrollTime
	}

	const dayMaxEvents = get('dayMaxEvents')
	if (dayMaxEvents !== null) {
		config.dayMaxEvents = positiveInt('dayMaxEvents', dayMaxEvents)
	}

	const eventHeight = get('eventHeight')
	if (eventHeight !== null) {
		config.eventHeight = positiveInt('eventHeight', eventHeight)
	}

	const eventSpacing = get('eventSpacing')
	if (eventSpacing !== null) {
		config.eventSpacing = positiveInt('eventSpacing', eventSpacing)
	}

	const firstDayOfWeek = get('firstDayOfWeek')
	if (firstDayOfWeek !== null) {
		config.firstDayOfWeek = oneOf(
			'firstDayOfWeek',
			firstDayOfWeek,
			WEEK_DAYS,
			String
		)
	}

	const hiddenDays = get('hiddenDays')
	if (hiddenDays !== null && hiddenDays !== '') {
		config.hiddenDays = hiddenDays
			.split(',')
			.map((day) => oneOf('hiddenDays', day, WEEK_DAYS, String))
	}

	const granularity = get('granularity')
	if (granularity !== null) {
		config.weekViewGranularity = oneOf(
			'granularity',
			granularity,
			['hourly', 'daily'] as const,
			String
		)
	}

	const hideNonBusinessHours = get('hideNonBusinessHours')
	if (hideNonBusinessHours !== null) {
		config.hideNonBusinessHours = boolean(
			'hideNonBusinessHours',
			hideNonBusinessHours
		)
	}

	const stickyViewHeader = get('stickyViewHeader')
	if (stickyViewHeader !== null) {
		config.stickyViewHeader = boolean('stickyViewHeader', stickyViewHeader)
	}

	const disableDragAndDrop = get('disableDragAndDrop')
	if (disableDragAndDrop !== null) {
		config.disableDragAndDrop = boolean(
			'disableDragAndDrop',
			disableDragAndDrop
		)
	}

	const timeFormat = get('timeFormat')
	if (timeFormat !== null) {
		config.timeFormat = oneOf(
			'timeFormat',
			timeFormat,
			['12-hour', '24-hour'] as const,
			String
		)
	}

	const locale = get('locale')
	if (locale !== null) {
		config.locale = locale
	}

	const height = get('height')
	if (height !== null) {
		config.height = height
	}

	return config
}
