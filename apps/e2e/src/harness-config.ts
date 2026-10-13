import type {
	BusinessHours,
	EventDropInfo,
	SlotDuration,
	TimeFormat,
	WeekDays,
} from '@ilamy/calendar'

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
	scrollToNow?: boolean
	allDaySlot?: boolean
	nowIndicator?: boolean
	weekNumbers?: boolean
	weekNumberCalculation?: 'local' | 'ISO'
	dayMaxEvents?: number
	eventHeight?: number
	eventSpacing?: number
	firstDayOfWeek?: WeekDays
	hiddenDays?: WeekDays[]
	weekViewGranularity?: 'hourly' | 'daily'
	hideNonBusinessHours?: boolean
	/** Passed through as written, so an invalid value reaches the calendar. */
	slotMinTime?: string
	slotMaxTime?: string
	/**
	 * Weekday business hours, as `startHour-endHour` (e.g. `9-17`). Cells
	 * outside them are disabled, which is the only way to reach a disabled cell
	 * from the URL: a drag can then be driven across one.
	 */
	businessHours?: BusinessHours
	stickyViewHeader?: boolean
	disableDragAndDrop?: boolean
	editable?: boolean
	eventStartEditable?: boolean
	eventDurationEditable?: boolean
	eventResizableFromStart?: boolean
	/** Set from the `eventAllow` parameter, which names a predicate. */
	eventAllow?: (dropInfo: EventDropInfo) => boolean
	timeFormat?: TimeFormat
	slotHeaderFormat?: Intl.DateTimeFormatOptions
	eventTimeFormat?: Intl.DateTimeFormatOptions
	displayEventTime?: boolean
	displayEventEnd?: boolean
	dayHeaderFormat?: Intl.DateTimeFormatOptions
	titleFormat?: Intl.DateTimeFormatOptions
	locale?: string
	/** Harness-only: the height of the box the calendar is given. */
	height?: string
	/**
	 * Harness-only: a custom `renderEvent` to draw events with. `sticky-title`
	 * is the pattern the docs give consumers for keeping their own title in
	 * view, so the custom properties it reads are pinned as public contract.
	 */
	renderEventVariant?: 'sticky-title'
	/**
	 * Harness-only: act as a server that rejects every save. The harness
	 * persists nothing and calls `change.revert()` inside `onEventsChange`.
	 */
	revertChanges?: boolean
	/**
	 * Harness-only: keep the scenario's first N resources. Changed on a mounted
	 * calendar, it adds or removes a resource the way a consumer's filter does.
	 */
	resourceCount?: number
}

/** `dayjs().day()` for Sunday and Saturday. */
const WEEKEND_DAYS = [0, 6]

/**
 * The named `eventAllow` predicates a URL can pick. A URL cannot carry a
 * function, so a spec names one of these instead.
 */
const EVENT_ALLOW_PREDICATES = {
	/** Refuses any placement that starts on a Saturday or a Sunday. */
	'no-weekends': (dropInfo: EventDropInfo) =>
		!WEEKEND_DAYS.includes(dropInfo.start.day()),
	/**
	 * Refuses any placement whose last covered day is a Saturday or a Sunday.
	 * `end` is exclusive, so that day is the one before it. The start is left
	 * alone, which is what lets a resize reach a weekend without moving.
	 */
	'no-weekend-end': (dropInfo: EventDropInfo) =>
		!WEEKEND_DAYS.includes(dropInfo.end.subtract(1, 'millisecond').day()),
} as const

/** Raised for a value the URL got wrong, so the harness can show it rather than guess. */
export class ConfigError extends Error {}

const WEEKDAYS: WeekDays[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
]

/** `9-17` -> weekdays 09:00 to 17:00. Weekends are left non-business. */
const parseBusinessHours = (raw: string): BusinessHours => {
	const [startRaw, endRaw] = raw.split('-')
	const startTime = Number(startRaw)
	const endTime = Number(endRaw)
	const isWholeHour = (value: number) =>
		Number.isInteger(value) && value >= 0 && value <= 24
	if (!isWholeHour(startTime) || !isWholeHour(endTime)) {
		throw new ConfigError(
			`businessHours: expected startHour-endHour, e.g. 9-17, got "${raw}"`
		)
	}
	return { daysOfWeek: WEEKDAYS, startTime, endTime }
}

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

/** A JSON object, e.g. `{"hour":"2-digit","hour12":false}`, for an Intl options parameter. */
const parseIntlOptions = (
	key: string,
	raw: string
): Intl.DateTimeFormatOptions => {
	let parsed: unknown
	try {
		parsed = JSON.parse(raw)
	} catch {
		throw new ConfigError(`${key}: expected a JSON object, got "${raw}"`)
	}
	const isObjectType = typeof parsed === 'object'
	const isNotNull = parsed !== null
	const isNotArray = !Array.isArray(parsed)
	const isPlainObject = isObjectType && isNotNull && isNotArray
	if (!isPlainObject) {
		throw new ConfigError(`${key}: expected a JSON object, got "${raw}"`)
	}
	return parsed as Intl.DateTimeFormatOptions
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

	const slotMinTime = get('slotMinTime')
	if (slotMinTime !== null) {
		config.slotMinTime = slotMinTime
	}

	const slotMaxTime = get('slotMaxTime')
	if (slotMaxTime !== null) {
		config.slotMaxTime = slotMaxTime
	}

	const scrollToNow = get('scrollToNow')
	if (scrollToNow !== null) {
		config.scrollToNow = boolean('scrollToNow', scrollToNow)
	}

	const allDaySlot = get('allDaySlot')
	if (allDaySlot !== null) {
		config.allDaySlot = boolean('allDaySlot', allDaySlot)
	}

	const nowIndicator = get('nowIndicator')
	if (nowIndicator !== null) {
		config.nowIndicator = boolean('nowIndicator', nowIndicator)
	}

	const weekNumbers = get('weekNumbers')
	if (weekNumbers !== null) {
		config.weekNumbers = boolean('weekNumbers', weekNumbers)
	}

	const weekNumberCalculation = get('weekNumberCalculation')
	if (weekNumberCalculation !== null) {
		config.weekNumberCalculation = oneOf(
			'weekNumberCalculation',
			weekNumberCalculation,
			['local', 'ISO'] as const,
			String
		)
	}

	const stickyViewHeader = get('stickyViewHeader')
	if (stickyViewHeader !== null) {
		config.stickyViewHeader = boolean('stickyViewHeader', stickyViewHeader)
	}

	const businessHours = get('businessHours')
	if (businessHours !== null) {
		config.businessHours = parseBusinessHours(businessHours)
	}

	const disableDragAndDrop = get('disableDragAndDrop')
	if (disableDragAndDrop !== null) {
		config.disableDragAndDrop = boolean(
			'disableDragAndDrop',
			disableDragAndDrop
		)
	}

	const editable = get('editable')
	if (editable !== null) {
		config.editable = boolean('editable', editable)
	}

	const eventStartEditable = get('eventStartEditable')
	if (eventStartEditable !== null) {
		config.eventStartEditable = boolean(
			'eventStartEditable',
			eventStartEditable
		)
	}

	const eventDurationEditable = get('eventDurationEditable')
	if (eventDurationEditable !== null) {
		config.eventDurationEditable = boolean(
			'eventDurationEditable',
			eventDurationEditable
		)
	}

	const eventResizableFromStart = get('eventResizableFromStart')
	if (eventResizableFromStart !== null) {
		config.eventResizableFromStart = boolean(
			'eventResizableFromStart',
			eventResizableFromStart
		)
	}

	const eventAllow = get('eventAllow')
	if (eventAllow !== null) {
		const predicateName = oneOf(
			'eventAllow',
			eventAllow,
			Object.keys(EVENT_ALLOW_PREDICATES) as Array<
				keyof typeof EVENT_ALLOW_PREDICATES
			>,
			String
		)
		config.eventAllow = EVENT_ALLOW_PREDICATES[predicateName]
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

	const formatKeys = [
		'slotHeaderFormat',
		'eventTimeFormat',
		'dayHeaderFormat',
		'titleFormat',
	] as const
	for (const formatKey of formatKeys) {
		const rawFormat = get(formatKey)
		if (rawFormat !== null) {
			config[formatKey] = parseIntlOptions(formatKey, rawFormat)
		}
	}

	const displayEventTime = get('displayEventTime')
	if (displayEventTime !== null) {
		config.displayEventTime = boolean('displayEventTime', displayEventTime)
	}

	const displayEventEnd = get('displayEventEnd')
	if (displayEventEnd !== null) {
		config.displayEventEnd = boolean('displayEventEnd', displayEventEnd)
	}

	const locale = get('locale')
	if (locale !== null) {
		config.locale = locale
	}

	const height = get('height')
	if (height !== null) {
		config.height = height
	}

	const resourceCount = get('resourceCount')
	if (resourceCount !== null) {
		config.resourceCount = positiveInt('resourceCount', resourceCount)
	}

	const revertChanges = get('revertChanges')
	if (revertChanges !== null) {
		config.revertChanges = boolean('revertChanges', revertChanges)
	}

	const renderEventVariant = get('renderEventVariant')
	if (renderEventVariant !== null) {
		config.renderEventVariant = oneOf(
			'renderEventVariant',
			renderEventVariant,
			['sticky-title'] as const,
			String
		)
	}

	return config
}
