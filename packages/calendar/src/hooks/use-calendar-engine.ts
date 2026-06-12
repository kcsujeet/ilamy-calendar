import {
	type ComponentType,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import type { BusinessHours, CalendarEvent } from '@/components/types'
import { useCalendarConfig } from '@/features/calendar/hooks/use-calendar-config'
import { useCalendarData } from '@/features/calendar/hooks/use-calendar-data'
import { useCalendarInteraction } from '@/features/calendar/hooks/use-calendar-interaction'
import { useCalendarNavigation } from '@/features/calendar/hooks/use-calendar-navigation'
import type { CellInfo, OpenEventFormInput } from '@/features/calendar/types'
import { createPluginRuntime } from '@/features/plugins/lib/create-plugin-runtime'
import type { IlamyPlugin, PluginView } from '@/features/plugins/lib/types'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import type { CalendarView } from '@/types'

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
	plugins?: IlamyPlugin[]
	onEventClick?: (event: CalendarEvent) => void
	onCellClick?: (info: CellInfo) => void
	disableEventClick?: boolean
	disableCellClick?: boolean
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
	deleteEvent: (eventId: string | number) => void
	applyScopedEdit: (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>,
		scope: unknown
	) => void
	applyScopedDelete: (event: CalendarEvent, scope: unknown) => void
	openEventForm: (eventData?: OpenEventFormInput) => void
	closeEventForm: () => void
	setSelectedEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>
	setIsEventFormOpen: React.Dispatch<React.SetStateAction<boolean>>
	setSelectedDate: React.Dispatch<React.SetStateAction<Dayjs | null>>
	getEventsForDateRange: (startDate: Dayjs, endDate: Dayjs) => CalendarEvent[]
	getEventManager: (event: CalendarEvent) => IlamyPlugin | undefined
	renderSlot: (slotName: string, context: unknown) => ReactNode[]
	collect: (point: string, context: unknown) => unknown[]
	getViews: () => PluginView[]
	getProviders: () => Array<ComponentType<{ children: ReactNode }>>
	t: TranslatorFunction
}

/**
 * Click handlers the engine derives from the interaction slice. Returned
 * ALONGSIDE CalendarEngineReturn and destructured off by the provider before
 * the context spread, so the merged context value keeps its exact v1 shape
 * (the handlers surface as `onEventClick` / `onCellClick`).
 */
export interface CalendarEngineHandlers {
	handleEventClick: (event: CalendarEvent) => void
	handleDateClick: (info: CellInfo) => void
}

export const useCalendarEngine = (
	config: CalendarEngineConfig
): CalendarEngineReturn & CalendarEngineHandlers => {
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
		onEventClick,
		onCellClick,
		disableEventClick,
		disableCellClick,
	} = config

	const { plugins = [] } = config

	// Slices, composed in order: config → pluginRuntime → navigation → data →
	// interaction. pluginRuntime is the named fifth cross-cutting dependency
	// (data, navigation, AND the provider's renderSlot/getProviders consume it).
	const configSlice = useCalendarConfig({
		firstDayOfWeek,
		businessHours,
		locale,
		translations,
		translator,
	})

	const pluginRuntime = useMemo(() => createPluginRuntime(plugins), [plugins])

	const navigation = useCalendarNavigation({
		initialDate,
		initialView,
		firstDayOfWeek,
		onDateChange,
		onViewChange,
		pluginRuntime,
	})

	const data = useCalendarData({
		events,
		pluginRuntime,
		getCurrentViewRange: navigation.getCurrentViewRange,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
	})

	const interaction = useCalendarInteraction({
		currentDate: navigation.currentDate,
		t: configSlice.t,
		disableEventClick,
		disableCellClick,
		onEventClick,
		onCellClick,
	})

	// Cross-cutting effects: a config-prop trigger mutates navigation AND data
	// state, so they live here in the composer, not inside any single slice.
	const { setCurrentLocale } = configSlice
	const { setCurrentDate } = navigation
	const { setCurrentEvents } = data

	const lastLocaleProp = useRef<string | undefined>(undefined)
	useEffect(() => {
		if (locale && locale !== lastLocaleProp.current) {
			setCurrentLocale(locale)
			dayjs.locale(locale)
			setCurrentDate((prevDate) => prevDate.locale(locale))
			lastLocaleProp.current = locale
		}
	}, [locale, setCurrentLocale, setCurrentDate])

	const lastTimezoneProp = useRef(timezone)
	useEffect(() => {
		if (timezone && timezone !== lastTimezoneProp.current) {
			dayjs.tz.setDefault(timezone)
			setCurrentDate((prev) => prev.tz(timezone))
			setCurrentEvents((prev) =>
				prev.map((e) => ({
					...e,
					start: e.start.tz(timezone),
					end: e.end.tz(timezone),
				}))
			)
			lastTimezoneProp.current = timezone
		}
	}, [timezone, setCurrentDate, setCurrentEvents])

	return {
		currentDate: navigation.currentDate,
		view: navigation.view,
		events: data.events,
		rawEvents: data.rawEvents,
		isEventFormOpen: interaction.isEventFormOpen,
		selectedEvent: interaction.selectedEvent,
		selectedDate: interaction.selectedDate,
		firstDayOfWeek,
		dayMaxEvents: configSlice.dayMaxEvents,
		currentLocale: configSlice.currentLocale,
		businessHours,
		setCurrentDate: navigation.setCurrentDate,
		selectDate: navigation.selectDate,
		setView: navigation.setView,
		nextPeriod: navigation.nextPeriod,
		prevPeriod: navigation.prevPeriod,
		today: navigation.today,
		addEvent: data.addEvent,
		updateEvent: data.updateEvent,
		applyScopedEdit: data.applyScopedEdit,
		applyScopedDelete: data.applyScopedDelete,
		deleteEvent: data.deleteEvent,
		openEventForm: interaction.openEventForm,
		closeEventForm: interaction.closeEventForm,
		setSelectedEvent: interaction.setSelectedEvent,
		setIsEventFormOpen: interaction.setIsEventFormOpen,
		setSelectedDate: interaction.setSelectedDate,
		getEventsForDateRange: data.getEventsForDateRange,
		getEventManager: pluginRuntime.getEventManager,
		renderSlot: pluginRuntime.renderSlot,
		collect: pluginRuntime.collect,
		getViews: navigation.getAllViews,
		getProviders: pluginRuntime.getProviders,
		t: configSlice.t,
		handleEventClick: interaction.handleEventClick,
		handleDateClick: interaction.handleDateClick,
	}
}
