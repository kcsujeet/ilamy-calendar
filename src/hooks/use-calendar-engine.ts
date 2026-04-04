import {
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { BusinessHours, CalendarEvent } from '@/components/types'
import type { RecurrenceEditOptions } from '@/features/recurrence/types'
import {
	deleteRecurringEvent as deleteRecurringEventImpl,
	generateRecurringEvents,
	updateRecurringEvent as updateRecurringEventImpl,
} from '@/features/recurrence/utils/recurrence-handler'
import dayjs, {
	type Dayjs,
	type ManipulateType,
} from '@/lib/configs/dayjs-config'
import { defaultTranslations } from '@/lib/translations/default'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import {
	getMonthWeeks,
	getWeekDays,
	isEventInRange,
} from '@/lib/utils/date-utils'
import { isDeepEqual } from '@/lib/utils/deep-equal'
import type { CalendarView } from '@/types'
import { DAY_MAX_EVENTS_DEFAULT } from '../lib/constants'

export interface CalendarEngineConfig {
	events: CalendarEvent[]
	firstDayOfWeek: number
	initialView?: CalendarView
	initialDate?: Dayjs
	businessHours?: BusinessHours | BusinessHours[]
	onEventAdd?: (event: CalendarEvent) => void
	onEventUpdate?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
	onDateChange?: (date: Dayjs, range: { start: Dayjs; end: Dayjs }) => void
	onViewChange?: (view: CalendarView) => void
	locale?: string
	timezone?: string
	translations?: Translations
	translator?: TranslatorFunction
}

export interface CalendarEngineReturn {
	currentDate: Dayjs
	view: CalendarView
	events: CalendarEvent[]
	rawEvents: CalendarEvent[]
	isEventFormOpen: boolean
	selectedEvent: CalendarEvent | null
	selectedDate: Dayjs | null
	firstDayOfWeek: number
	dayMaxEvents: number
	currentLocale: string
	businessHours?: BusinessHours | BusinessHours[]
	setCurrentDate: (date: Dayjs) => void
	selectDate: (date: Dayjs) => void
	setView: (view: CalendarView) => void
	nextPeriod: () => void
	prevPeriod: () => void
	today: () => void
	addEvent: (event: CalendarEvent) => void
	updateEvent: (eventId: string | number, event: Partial<CalendarEvent>) => void
	updateRecurringEvent: (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>,
		options: RecurrenceEditOptions
	) => void
	deleteEvent: (eventId: string | number) => void
	deleteRecurringEvent: (
		event: CalendarEvent,
		options: RecurrenceEditOptions
	) => void
	openEventForm: (eventData?: Partial<CalendarEvent>) => void
	closeEventForm: () => void
	setSelectedEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>
	setIsEventFormOpen: React.Dispatch<React.SetStateAction<boolean>>
	setSelectedDate: React.Dispatch<React.SetStateAction<Dayjs | null>>
	getEventsForDateRange: (startDate: Dayjs, endDate: Dayjs) => CalendarEvent[]
	findParentRecurringEvent: (event: CalendarEvent) => CalendarEvent | null
	t: TranslatorFunction
}

const VIEW_UNITS: Record<CalendarView, ManipulateType> = {
	day: 'day',
	week: 'week',
	month: 'month',
	year: 'year',
}

export const calculateViewRange = (
	date: Dayjs,
	view: CalendarView,
	firstDayOfWeek: number
): { start: Dayjs; end: Dayjs } => {
	if (view === 'day') {
		return {
			start: date.startOf('day'),
			end: date.endOf('day'),
		}
	}
	if (view === 'year') {
		return {
			start: date.startOf('year'),
			end: date.endOf('year'),
		}
	}
	if (view === 'week') {
		const weekDays = getWeekDays(date, firstDayOfWeek)
		return {
			start: weekDays[0].startOf('day'),
			end: weekDays[6].endOf('day'),
		}
	}
	// month view
	const weeks = getMonthWeeks(date, firstDayOfWeek)
	return { start: weeks[0][0].startOf('day'), end: weeks[5][6].endOf('day') }
}

export const useCalendarEngine = (
	config: CalendarEngineConfig
): CalendarEngineReturn => {
	const {
		events = [],
		firstDayOfWeek = 0,
		initialView = 'month',
		initialDate = dayjs(),
		businessHours,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onDateChange,
		onViewChange,
		locale,
		timezone,
		translations,
		translator,
	} = config

	const [currentDate, setCurrentDate] = useState<Dayjs>(() => {
		let date = dayjs.isDayjs(initialDate) ? initialDate : dayjs(initialDate)
		if (timezone) {
			dayjs.tz.setDefault(timezone)
			date = date.tz(timezone)
		}
		if (locale) {
			dayjs.locale(locale)
			date = date.locale(locale)
		}
		return date
	})
	const [view, setView] = useState<CalendarView>(initialView)
	const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>(() => {
		if (timezone) {
			return events.map((e) => ({
				...e,
				start: e.start.tz(timezone),
				end: e.end.tz(timezone),
			}))
		}
		return events
	})
	const [isEventFormOpen, setIsEventFormOpen] = useState(false)
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
	const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)
	const [currentLocale, setCurrentLocale] = useState(locale || 'en')
	const lastEventsProp = useRef(events)

	const t: TranslatorFunction = useMemo(() => {
		if (translator) {
			return translator
		}
		if (translations) {
			return (key: string) => translations[key as keyof Translations] || key
		}
		return (key: string) =>
			defaultTranslations[key as keyof Translations] || key
	}, [translations, translator])

	const getCurrentViewRange = useCallback(() => {
		return calculateViewRange(currentDate, view, firstDayOfWeek)
	}, [currentDate, view, firstDayOfWeek])

	// Expand recurring events once for the entire view range.
	// This is the expensive step (rrule evaluation) — do it once, not per cell.
	const processedEvents = useMemo(() => {
		const { start, end } = getCurrentViewRange()
		const allEvents: CalendarEvent[] = []

		for (const event of currentEvents) {
			if (event.rrule) {
				allEvents.push(
					...generateRecurringEvents({
						event,
						currentEvents,
						startDate: start,
						endDate: end,
					})
				)
			} else if (isEventInRange(event, start, end)) {
				allEvents.push(event)
			}
		}
		return allEvents
	}, [currentEvents, getCurrentViewRange])

	// Fast filter over the already-expanded processedEvents when the query
	// falls within the current view range; full rrule expansion otherwise.
	const viewRangeRef = useRef<{ start: Dayjs; end: Dayjs } | null>(null)
	viewRangeRef.current = getCurrentViewRange()

	const getEventsForDateRange = useCallback(
		(startDate: Dayjs, endDate: Dayjs): CalendarEvent[] => {
			const vr = viewRangeRef.current
			const withinView =
				vr &&
				startDate.isSameOrAfter(vr.start) &&
				endDate.isSameOrBefore(vr.end)

			if (withinView) {
				// Fast path — just filter the pre-expanded list
				return processedEvents.filter((event) =>
					isEventInRange(event, startDate, endDate)
				)
			}

			// Slow path — query extends beyond view range, need full expansion
			const allEvents: CalendarEvent[] = []
			for (const event of currentEvents) {
				if (event.rrule) {
					allEvents.push(
						...generateRecurringEvents({
							event,
							currentEvents,
							startDate,
							endDate,
						})
					)
				} else if (isEventInRange(event, startDate, endDate)) {
					allEvents.push(event)
				}
			}
			return allEvents
		},
		[processedEvents, currentEvents]
	)

	const isInitialMount = useRef(true)
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false
			return
		}
		if (events !== lastEventsProp.current) {
			if (!isDeepEqual(events, currentEvents)) {
				setCurrentEvents(events)
			}
			lastEventsProp.current = events
		}
	}, [events, currentEvents])

	const prevLocale = useRef(locale)
	useEffect(() => {
		if (locale && locale !== prevLocale.current) {
			prevLocale.current = locale
			setCurrentLocale(locale)
			dayjs.locale(locale)
			setCurrentDate((prevDate) => prevDate.locale(locale))
		}
	}, [locale])

	const prevTimezone = useRef(timezone)
	useEffect(() => {
		if (timezone && timezone !== prevTimezone.current) {
			prevTimezone.current = timezone
			dayjs.tz.setDefault(timezone)
			setCurrentDate((prev) => prev.tz(timezone))
			setCurrentEvents((prev) =>
				prev.map((e) => ({
					...e,
					start: e.start.tz(timezone),
					end: e.end.tz(timezone),
				}))
			)
		}
	}, [timezone])

	const selectDate = useCallback(
		(date: Dayjs) => {
			startTransition(() => {
				setCurrentDate(date)
			})
			const range = calculateViewRange(date, view, firstDayOfWeek)
			onDateChange?.(date, range)
		},
		[onDateChange, view, firstDayOfWeek]
	)

	const navigatePeriod = useCallback(
		(direction: 1 | -1) => {
			startTransition(() => {
				setCurrentDate((prev) => {
					const newDate =
						direction === 1
							? prev.add(1, VIEW_UNITS[view])
							: prev.subtract(1, VIEW_UNITS[view])
					const range = calculateViewRange(newDate, view, firstDayOfWeek)
					onDateChange?.(newDate, range)
					return newDate
				})
			})
		},
		[view, onDateChange, firstDayOfWeek]
	)

	const nextPeriod = useCallback(() => navigatePeriod(1), [navigatePeriod])
	const prevPeriod = useCallback(() => navigatePeriod(-1), [navigatePeriod])

	const today = useCallback(() => {
		const newDate = dayjs()
		startTransition(() => setCurrentDate(newDate))
		const range = calculateViewRange(newDate, view, firstDayOfWeek)
		onDateChange?.(newDate, range)
	}, [onDateChange, view, firstDayOfWeek])

	const addEvent = useCallback(
		(event: CalendarEvent) => {
			setCurrentEvents((prev) => [...prev, event])
			onEventAdd?.(event)
		},
		[onEventAdd]
	)

	const updateEvent = useCallback(
		(eventId: string | number, updates: Partial<CalendarEvent>) => {
			setCurrentEvents((prev) =>
				prev.map((event) => {
					if (event.id !== eventId) {
						return event
					}
					const newEvent = { ...event, ...updates }
					onEventUpdate?.(newEvent)
					return newEvent
				})
			)
		},
		[onEventUpdate]
	)

	const updateRecurringEvent = useCallback(
		(
			event: CalendarEvent,
			updates: Partial<CalendarEvent>,
			options: RecurrenceEditOptions
		) => {
			onEventUpdate?.({ ...event, ...updates })
			setCurrentEvents(
				updateRecurringEventImpl({
					targetEvent: event,
					updates,
					currentEvents,
					scope: options.scope,
				})
			)
		},
		[currentEvents, onEventUpdate]
	)

	const deleteRecurringEvent = useCallback(
		(event: CalendarEvent, options: RecurrenceEditOptions) => {
			onEventDelete?.(event)
			setCurrentEvents(
				deleteRecurringEventImpl({
					targetEvent: event,
					currentEvents,
					scope: options.scope,
				})
			)
		},
		[currentEvents, onEventDelete]
	)

	const deleteEvent = useCallback(
		(eventId: string | number) => {
			setCurrentEvents((prev) => {
				const eventToDelete = prev.find((e) => e.id === eventId)
				if (eventToDelete) {
					onEventDelete?.(eventToDelete)
				}
				return prev.filter((e) => e.id !== eventId)
			})
		},
		[onEventDelete]
	)

	const openEventForm = useCallback(
		(eventData?: Partial<CalendarEvent>) => {
			if (eventData?.start) {
				setSelectedDate(eventData.start)
			}
			const start = eventData?.start ?? currentDate
			setSelectedEvent({
				title: t('newEvent'),
				start,
				end: eventData?.end ?? start.add(1, 'hour'),
				resourceId: eventData?.resourceId,
				description: '',
				allDay: eventData?.allDay ?? false,
			} as CalendarEvent)
			setIsEventFormOpen(true)
		},
		[currentDate, t]
	)

	const closeEventForm = useCallback(() => {
		setSelectedDate(null)
		setSelectedEvent(null)
		setIsEventFormOpen(false)
	}, [])

	const handleViewChange = useCallback(
		(newView: CalendarView) => {
			startTransition(() => setView(newView))
			onViewChange?.(newView)
		},
		[onViewChange]
	)

	const findParentRecurringEvent = useCallback(
		(event: CalendarEvent): CalendarEvent | null => {
			const targetUID = event.uid
			return (
				currentEvents.find(
					(e) => (e.uid || `${e.id}@ilamy.calendar`) === targetUID && e.rrule
				) || null
			)
		},
		[currentEvents]
	)

	return {
		currentDate,
		view,
		events: processedEvents,
		rawEvents: currentEvents,
		isEventFormOpen,
		selectedEvent,
		selectedDate,
		firstDayOfWeek,
		dayMaxEvents: DAY_MAX_EVENTS_DEFAULT,
		currentLocale,
		businessHours,
		setCurrentDate,
		selectDate,
		setView: handleViewChange,
		nextPeriod,
		prevPeriod,
		today,
		addEvent,
		updateEvent,
		updateRecurringEvent,
		deleteEvent,
		deleteRecurringEvent,
		openEventForm,
		closeEventForm,
		setSelectedEvent,
		setIsEventFormOpen,
		setSelectedDate,
		getEventsForDateRange,
		findParentRecurringEvent,
		t,
	}
}
