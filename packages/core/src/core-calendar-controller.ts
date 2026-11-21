import {
	add,
	now,
	overlapsRange,
	parseDate,
	resolveZone,
	toOffsetIso,
} from '@ilamy/utils/temporal'
import {
	getVisibleDateRange,
	skipHiddenDays,
	toHiddenDaysSet,
	WEEK_DAYS_NUMBER_MAP,
} from './core-date-grid'
import { normalizeEvent, normalizeEvents } from './core-normalize'
import type {
	CalendarEvent,
	CalendarEventInput,
	CalendarView,
	DateRange,
	HeadlessCalendarActions,
	HeadlessCalendarController,
	HeadlessCalendarOptions,
	HeadlessCalendarState,
	NavigationStep,
	PublicDateInput,
	Resource,
} from './core-types'

export const pickControllerActions = (
	controller: HeadlessCalendarController
): HeadlessCalendarActions => ({
	setCurrentDate: controller.setCurrentDate,
	selectDate: controller.selectDate,
	setView: controller.setView,
	nextPeriod: controller.nextPeriod,
	prevPeriod: controller.prevPeriod,
	today: controller.today,
	setEvents: controller.setEvents,
	addEvent: controller.addEvent,
	updateEvent: controller.updateEvent,
	deleteEvent: controller.deleteEvent,
	setResources: controller.setResources,
	updateConfig: controller.updateConfig,
	getEventsInRange: controller.getEventsInRange,
})

const mergeHiddenDays = (
	config: Partial<HeadlessCalendarOptions>,
	prev: Set<number> | undefined
): Set<number> | undefined => {
	const hasChange =
		config.hiddenDays !== undefined || config.weekends !== undefined
	return hasChange ? toHiddenDaysSet(config.hiddenDays, config.weekends) : prev
}

const resolveAnchoredDate = (
	dateIso: string,
	view: CalendarView,
	timezone: string,
	hiddenDays: Set<number> | undefined
): string => {
	const parsed = parseDate(dateIso, timezone) ?? now(timezone)
	const adjusted =
		view === 'day' ? skipHiddenDays(parsed, hiddenDays, 1) : parsed
	return toOffsetIso(adjusted)
}

const resolveUpdatedEvents = (
	configEvents: CalendarEventInput[] | undefined,
	currentEvents: CalendarEvent[],
	nextZone: string,
	prevZone: string
): CalendarEvent[] => {
	if (configEvents !== undefined) {
		return normalizeEvents(configEvents, nextZone)
	}
	if (nextZone !== prevZone) {
		return normalizeEvents(currentEvents, nextZone)
	}
	return currentEvents
}

const DEFAULT_VIEW_STEP: Record<string, NavigationStep> = {
	day: { amount: 1, unit: 'day' },
	week: { amount: 1, unit: 'week' },
	month: { amount: 1, unit: 'month' },
	year: { amount: 1, unit: 'year' },
}

const getDefaultStepForView = (view: CalendarView): NavigationStep =>
	DEFAULT_VIEW_STEP[view] ?? { amount: 1, unit: 'month' }

const computeRange = (
	dateIso: string,
	view: CalendarView,
	firstDayOfWeek: number,
	timezone: string,
	hiddenDays: Set<number> | undefined
): DateRange => {
	const zoned = parseDate(dateIso, timezone) ?? now(timezone)
	const { start, end } = getVisibleDateRange(
		zoned,
		view,
		firstDayOfWeek,
		hiddenDays
	)
	return { start: toOffsetIso(start), end: toOffsetIso(end) }
}

/**
 * Framework-agnostic headless calendar controller.
 *
 * Holds immutable state snapshots and notifies subscribers on changes so any
 * framework adapter (React `useSyncExternalStore`, Vue `ref`, Svelte runes,
 * Solid signals) can bind to the exact same state machine in ~20 lines.
 */
export const createCalendarController = (
	options: HeadlessCalendarOptions = {}
): HeadlessCalendarController => {
	const timezone = resolveZone(options.timezone)
	const locale = options.locale ?? 'en-US'
	const firstDayOfWeek =
		WEEK_DAYS_NUMBER_MAP[options.firstDayOfWeek ?? 'sunday']
	const hiddenDays = toHiddenDaysSet(options.hiddenDays, options.weekends)
	const initialView: CalendarView = options.initialView ?? 'month'
	const parsedInitial =
		parseDate(options.initialDate, timezone) ?? now(timezone)
	let anchoredInitial = parsedInitial
	if (initialView === 'day') {
		anchoredInitial = skipHiddenDays(parsedInitial, hiddenDays, 1)
	}
	const initialDateIso = toOffsetIso(anchoredInitial)

	let state: HeadlessCalendarState = {
		currentDate: initialDateIso,
		view: initialView,
		events: normalizeEvents(options.events, timezone),
		resources: options.resources ?? [],
		timezone,
		locale,
		firstDayOfWeek,
		hiddenDays,
		visibleRange: computeRange(
			initialDateIso,
			initialView,
			firstDayOfWeek,
			timezone,
			hiddenDays
		),
	}

	const callbacks = {
		onDateChange: options.onDateChange,
		onViewChange: options.onViewChange,
	}

	const listeners = new Set<() => void>()

	const emit = () => {
		for (const listener of listeners) {
			listener()
		}
	}

	const updateDate = (date: PublicDateInput, notifyCallback: boolean) => {
		const parsed = parseDate(date, state.timezone)
		if (!parsed) return
		const iso = toOffsetIso(parsed)
		const visibleRange = computeRange(
			iso,
			state.view,
			state.firstDayOfWeek,
			state.timezone,
			state.hiddenDays
		)
		state = { ...state, currentDate: iso, visibleRange }
		emit()
		if (notifyCallback) {
			callbacks.onDateChange?.(iso, visibleRange)
		}
	}

	const stepBy = (direction: 1 | -1, step?: NavigationStep) => {
		const current =
			parseDate(state.currentDate, state.timezone) ?? now(state.timezone)
		const resolved = step ?? getDefaultStepForView(state.view)
		let target = add(current, resolved.amount * direction, resolved.unit)
		if (state.view === 'day') {
			target = skipHiddenDays(target, state.hiddenDays, direction)
		}
		updateDate(toOffsetIso(target), true)
	}

	return {
		getState: () => state,

		subscribe: (listener) => {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},

		setCurrentDate: (date) => {
			updateDate(date, false)
		},

		selectDate: (date) => {
			updateDate(date, true)
		},

		setView: (view, date) => {
			const baseDate =
				parseDate(date ?? state.currentDate, state.timezone) ??
				now(state.timezone)
			let adjusted = baseDate
			if (view === 'day') {
				adjusted = skipHiddenDays(baseDate, state.hiddenDays, 1)
			}
			const iso = toOffsetIso(adjusted)
			const visibleRange = computeRange(
				iso,
				view,
				state.firstDayOfWeek,
				state.timezone,
				state.hiddenDays
			)
			state = { ...state, view, currentDate: iso, visibleRange }
			emit()
			callbacks.onViewChange?.(view)
			if (date !== undefined) {
				callbacks.onDateChange?.(iso, visibleRange)
			}
		},

		nextPeriod: (step) => {
			stepBy(1, step)
		},

		prevPeriod: (step) => {
			stepBy(-1, step)
		},

		today: () => {
			const todayDate = now(state.timezone)
			let adjusted = todayDate
			if (state.view === 'day') {
				adjusted = skipHiddenDays(todayDate, state.hiddenDays, 1)
			}
			updateDate(toOffsetIso(adjusted), true)
		},

		setEvents: (events) => {
			state = { ...state, events: normalizeEvents(events, state.timezone) }
			emit()
		},

		addEvent: (eventInput) => {
			const normalized = normalizeEvent(eventInput, state.timezone)
			state = { ...state, events: [...state.events, normalized] }
			emit()
			return normalized
		},

		updateEvent: (id, updates) => {
			let updatedEvent: CalendarEvent | undefined
			const nextEvents = state.events.map((existing) => {
				if (existing.id !== id) return existing
				const merged: CalendarEventInput = {
					...existing,
					...updates,
					start: updates.start ?? existing.start,
					end: updates.end ?? existing.end,
				}
				updatedEvent = normalizeEvent(merged, state.timezone)
				return updatedEvent
			})
			if (!updatedEvent) return undefined
			state = { ...state, events: nextEvents }
			emit()
			return updatedEvent
		},

		deleteEvent: (id) => {
			const target = state.events.find((event) => event.id === id)
			if (!target) return undefined
			state = {
				...state,
				events: state.events.filter((event) => event.id !== id),
			}
			emit()
			return target
		},

		setResources: (resources: Resource[]) => {
			state = { ...state, resources }
			emit()
		},

		updateConfig: (config) => {
			let nextZone = state.timezone
			if (config.timezone !== undefined) {
				nextZone = resolveZone(config.timezone)
			}
			let nextFirstDay = state.firstDayOfWeek
			if (config.firstDayOfWeek !== undefined) {
				nextFirstDay = WEEK_DAYS_NUMBER_MAP[config.firstDayOfWeek]
			}
			const nextHidden = mergeHiddenDays(config, state.hiddenDays)
			if ('onDateChange' in config) callbacks.onDateChange = config.onDateChange
			if ('onViewChange' in config) callbacks.onViewChange = config.onViewChange

			const nextDateIso = resolveAnchoredDate(
				state.currentDate,
				state.view,
				nextZone,
				nextHidden
			)
			state = {
				...state,
				timezone: nextZone,
				locale: config.locale ?? state.locale,
				firstDayOfWeek: nextFirstDay,
				hiddenDays: nextHidden,
				currentDate: nextDateIso,
				events: resolveUpdatedEvents(
					config.events,
					state.events,
					nextZone,
					state.timezone
				),
				resources: config.resources ?? state.resources,
				visibleRange: computeRange(
					nextDateIso,
					state.view,
					nextFirstDay,
					nextZone,
					nextHidden
				),
			}
			emit()
		},

		getEventsInRange: (startInput, endInput) => {
			const rangeStart = parseDate(startInput, state.timezone)
			const rangeEnd = parseDate(endInput, state.timezone)
			if (!rangeStart || !rangeEnd) return []
			return state.events.filter((event) => {
				const start = parseDate(event.start, state.timezone)
				const end = parseDate(event.end, state.timezone)
				if (!start || !end) return false
				return overlapsRange({ start, end }, rangeStart, rangeEnd)
			})
		},
	}
}
