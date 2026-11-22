import { getEventResourceIds } from '@ilamy/core'
import type {
	BusinessHours,
	CalendarEvent,
	DateRange,
	IlamyPlugin,
	IsoDateString,
	PluginView,
	PublicDateInput,
	Translations,
	TranslatorFunction,
} from '@ilamy/types'
import {
	now,
	parseDate,
	resolveZone,
	toOffsetIso,
	withZone,
} from '@ilamy/utils/temporal'
import {
	type ComponentType,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import {
	type CalendarDataOptions,
	type CalendarDataSlice,
	useCalendarData,
} from '@/hooks/calendar-data/use-calendar-data'
import { useLatestHandler } from '@/hooks/use-latest-handler'
import { createPluginRuntime } from '@/lib/plugins/create-plugin-runtime'
import type { CalendarView } from '@/types'
import type { CellInfo } from '@/types/calendar.types'
import {
	type CalendarConfigSlice,
	useCalendarConfig,
} from './use-calendar-config'
import {
	type CalendarInteractionSlice,
	useCalendarInteraction,
} from './use-calendar-interaction'
import {
	type CalendarNavigationSlice,
	useCalendarNavigation,
} from './use-calendar-navigation'

const EMPTY_PLUGINS: IlamyPlugin[] = []

interface CalendarEngineConfig extends CalendarDataOptions {
	firstDayOfWeek: number
	initialView?: CalendarView
	initialDate?: PublicDateInput
	dayMaxEvents?: number
	businessHours?: BusinessHours | BusinessHours[]
	onDateChange?: (date: IsoDateString, range: DateRange) => void
	onViewChange?: (view: CalendarView) => void
	locale?: string
	translations?: Translations
	translator?: TranslatorFunction
	plugins?: IlamyPlugin[]
	onEventClick?: (event: CalendarEvent) => void
	onCellClick?: (info: CellInfo) => void
	disableEventClick?: boolean
	disableCellClick?: boolean
	orientation?: 'horizontal' | 'vertical'
	weekViewGranularity?: 'hourly' | 'daily'
	hiddenDays?: Set<number>
	defaultViews?: PluginView[]
}

export interface CalendarEngineReturn
	extends
		Omit<CalendarConfigSlice, 'setCurrentLocale'>,
		Omit<CalendarNavigationSlice, 'getCurrentViewRange' | 'getAllViews'>,
		Omit<CalendarDataSlice, 'setCurrentEvents'>,
		Omit<CalendarInteractionSlice, 'handleEventClick' | 'handleDateClick'> {
	getViews: () => PluginView[]
	getEventManager: (event: CalendarEvent) => IlamyPlugin | undefined
	renderSlot: (slotName: string, context: unknown) => ReactNode[]
	collect: (point: string, context: unknown) => unknown[]
	getProviders: () => Array<ComponentType<{ children: ReactNode }>>
	getEventResourceIds: (event: CalendarEvent) => (string | number)[]
	currentRange: DateRange
}

interface CalendarEngineHandlers {
	handleEventClick: (event: CalendarEvent) => void
	handleDateClick: (info: CellInfo) => void
}

const anchorInitialDate = (
	initialDate: PublicDateInput | undefined,
	timezone: string | undefined
): IsoDateString => {
	const zone = resolveZone(timezone)
	const parsed = parseDate(initialDate, zone) ?? now(zone)
	return toOffsetIso(parsed)
}

const projectIsoToZone = (iso: string, zone: string): string => {
	const parsed = parseDate(iso, zone)
	return parsed ? toOffsetIso(withZone(parsed, zone)) : iso
}

const useStableConfigHandlers = (config: CalendarEngineConfig) => ({
	onEventAdd: useLatestHandler(config.onEventAdd),
	onEventUpdate: useLatestHandler(config.onEventUpdate),
	onEventDelete: useLatestHandler(config.onEventDelete),
	onEventsChange: useLatestHandler(config.onEventsChange),
	onDateChange: useLatestHandler(config.onDateChange),
	onViewChange: useLatestHandler(config.onViewChange),
	onEventClick: useLatestHandler(config.onEventClick),
	onCellClick: useLatestHandler(config.onCellClick),
})

export const useCalendarEngine = (
	config: CalendarEngineConfig
): CalendarEngineReturn & CalendarEngineHandlers => {
	const {
		events,
		eventsFetcher,
		lazyFetching,
		loading,
		onEventsError,
		resourcesFetcher,
		refetchResourcesOnNavigate,
		resourcesSet,
		onResourcesError,
		firstDayOfWeek = 0,
		initialView = 'month',
		initialDate,
		dayMaxEvents,
		businessHours,
		locale,
		timezone,
		translations,
		translator,
		disableEventClick,
		disableCellClick,
		resources,
		orientation,
		weekViewGranularity,
		hiddenDays,
		defaultViews,
	} = config

	const {
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onEventsChange,
		onDateChange,
		onViewChange,
		onEventClick,
		onCellClick,
	} = useStableConfigHandlers(config)

	const { plugins = EMPTY_PLUGINS } = config

	const configSlice = useCalendarConfig({
		firstDayOfWeek,
		dayMaxEvents,
		businessHours,
		locale,
		translations,
		translator,
		orientation,
		weekViewGranularity,
	})

	const pluginRuntime = useMemo(() => createPluginRuntime(plugins), [plugins])

	const [anchoredInitialDate] = useState(() =>
		anchorInitialDate(initialDate, timezone)
	)

	const navigation = useCalendarNavigation({
		initialDate: anchoredInitialDate,
		initialView,
		firstDayOfWeek,
		timezone,
		hiddenDays,
		onDateChange,
		onViewChange,
		pluginRuntime,
		defaultViews,
	})

	const data = useCalendarData({
		events,
		eventsFetcher,
		lazyFetching,
		loading,
		onEventsError,
		resourcesFetcher,
		refetchResourcesOnNavigate,
		resourcesSet,
		onResourcesError,
		timezone,
		pluginRuntime,
		getCurrentViewRange: navigation.getCurrentViewRange,
		resources,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onEventsChange,
	})

	const interaction = useCalendarInteraction({
		currentDate: navigation.currentDate,
		timezone,
		t: configSlice.t,
		disableEventClick,
		disableCellClick,
		onEventClick,
		onCellClick,
	})

	const { setCurrentLocale } = configSlice
	const { setCurrentDate } = navigation
	const { setCurrentEvents } = data

	const lastLocaleProp = useRef(locale)
	useEffect(() => {
		if (locale && locale !== lastLocaleProp.current) {
			setCurrentLocale(locale)
			lastLocaleProp.current = locale
		}
	}, [locale, setCurrentLocale])

	// Zero global timezone state: if `timezone` changes dynamically after mount,
	// re-project held ISO dates to the new zone's offset (keeping instants fixed).
	const lastTimezoneProp = useRef(timezone)
	useEffect(() => {
		if (timezone !== lastTimezoneProp.current) {
			const nextZone = resolveZone(timezone)
			setCurrentDate((prev) => projectIsoToZone(prev, nextZone))
			setCurrentEvents((prev) =>
				prev.map((event) => ({
					...event,
					start: projectIsoToZone(event.start, nextZone),
					end: projectIsoToZone(event.end, nextZone),
				}))
			)
			lastTimezoneProp.current = timezone
		}
	}, [timezone, setCurrentDate, setCurrentEvents])

	return useMemo(() => {
		const { setCurrentLocale: _configInternal, ...configValues } = configSlice
		const {
			getCurrentViewRange: _navigationInternal,
			getAllViews,
			...navigationValues
		} = navigation
		const { setCurrentEvents: _dataInternal, ...dataValues } = data

		return {
			...configValues,
			...navigationValues,
			...dataValues,
			...interaction,
			getViews: getAllViews,
			getEventManager: pluginRuntime.getEventManager,
			renderSlot: pluginRuntime.renderSlot,
			collect: pluginRuntime.collect,
			getProviders: pluginRuntime.getProviders,
			getEventResourceIds,
			currentRange: navigation.getCurrentViewRange(),
		}
	}, [configSlice, navigation, data, interaction, pluginRuntime])
}
