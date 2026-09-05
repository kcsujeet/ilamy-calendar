import type {
	BusinessHours,
	CalendarEvent,
	IlamyPlugin,
	PluginView,
	Resource,
} from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import {
	type ComponentType,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import {
	type CalendarConfigSlice,
	useCalendarConfig,
} from '@/features/calendar/hooks/use-calendar-config'
import {
	type CalendarDataSlice,
	useCalendarData,
} from '@/features/calendar/hooks/use-calendar-data'
import {
	type CalendarInteractionSlice,
	useCalendarInteraction,
} from '@/features/calendar/hooks/use-calendar-interaction'
import {
	type CalendarNavigationSlice,
	useCalendarNavigation,
} from '@/features/calendar/hooks/use-calendar-navigation'
import type { CellInfo, DateRange } from '@/features/calendar/types'
import { createPluginRuntime } from '@/features/plugins/lib/create-plugin-runtime'
import { getEventResourceIds } from '@/lib/events/pipeline'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import type { CalendarView } from '@/types'

// Module constants, not per-render `?? []` defaults: keep the slice and
// plugin-runtime identities render-stable when the props are absent.
const EMPTY_RESOURCES: Resource[] = []
const EMPTY_PLUGINS: IlamyPlugin[] = []

interface CalendarEngineConfig {
	events: CalendarEvent[]
	firstDayOfWeek: number
	initialView?: CalendarView
	initialDate?: Dayjs
	/** Max stacked events per day in horizontal grids; the config slice defaults it. */
	dayMaxEvents?: number
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
	resources?: Resource[]
	orientation?: 'horizontal' | 'vertical'
	weekViewGranularity?: 'hourly' | 'daily'
}

/**
 * The engine's public surface, composed from the four slice contracts so each
 * signature is declared exactly once. Omitted members are slice-internal
 * (cross-cutting setters the composer wires, the handlers returned separately)
 * or renamed (`getAllViews` surfaces as `getViews`). The plugin-runtime
 * passthroughs and `getEventResourceIds` are the engine's own additions.
 */
export interface CalendarEngineReturn
	extends Omit<CalendarConfigSlice, 'setCurrentLocale'>,
		Omit<CalendarNavigationSlice, 'getCurrentViewRange' | 'getAllViews'>,
		Omit<CalendarDataSlice, 'setCurrentEvents'>,
		Omit<CalendarInteractionSlice, 'handleEventClick' | 'handleDateClick'> {
	/** The navigation slice's `getAllViews` under its public name. */
	getViews: () => PluginView[]
	getEventManager: (event: CalendarEvent) => IlamyPlugin | undefined
	renderSlot: (slotName: string, context: unknown) => ReactNode[]
	collect: (point: string, context: unknown) => unknown[]
	getProviders: () => Array<ComponentType<{ children: ReactNode }>>
	getEventResourceIds: (event: CalendarEvent) => (string | number)[]
	/** The active view's current visible date range (what is on screen). */
	currentRange: DateRange
}

/**
 * Click handlers the engine derives from the interaction slice. Returned
 * ALONGSIDE CalendarEngineReturn and destructured off by the provider before
 * the context spread, so the merged context value keeps its exact v1 shape
 * (the handlers surface as `onEventClick` / `onCellClick`).
 */
interface CalendarEngineHandlers {
	handleEventClick: (event: CalendarEvent) => void
	handleDateClick: (info: CellInfo) => void
}

/**
 * The date the calendar opens on, read on the calendar's clock rather than the
 * machine's.
 *
 * `initialDate` is parsed by the consumer's own module, or by `safeDate` in
 * `IlamyCalendar`, and both run before the zone is known — so the calendar was
 * opening on whichever day that date fell on where the browser happens to be.
 * For a reader far enough from the workspace that is the wrong day, which is
 * exactly the reader `timezone` exists for.
 *
 * The two cases are different questions and get different answers:
 *
 * - A date GIVEN is a calendar date. The consumer wrote 10 March; 10 March is
 *   what opens. Its wall clock is kept and read in the calendar's zone.
 * - NO date is "now". That is a moment, so the instant is kept and read on the
 *   calendar's clock — near midnight the calendar's today and the reader's are
 *   different days, and the calendar's is the one it should show.
 *
 * Called during render, which is safe: `dayjs.tz` with an explicit zone is a
 * pure call, unlike the `setDefault` below that has to wait for an effect.
 */
const anchorInitialDate = (
	initialDate: Dayjs | undefined,
	timezone: string | undefined
): Dayjs => {
	if (!timezone) {
		return initialDate ?? dayjs()
	}
	if (!initialDate) {
		return dayjs().tz(timezone)
	}
	return dayjs.tz(initialDate.format('YYYY-MM-DDTHH:mm:ss'), timezone)
}

export const useCalendarEngine = (
	config: CalendarEngineConfig
): CalendarEngineReturn & CalendarEngineHandlers => {
	const {
		events,
		firstDayOfWeek = 0,
		initialView = 'month',
		initialDate,
		dayMaxEvents,
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
		resources,
		orientation,
		weekViewGranularity,
	} = config

	const { plugins = EMPTY_PLUGINS } = config

	// Slices, composed in order: config → pluginRuntime → navigation → data →
	// interaction. pluginRuntime is the named fifth cross-cutting dependency
	// (data, navigation, AND the provider's renderSlot/getProviders consume it).
	const configSlice = useCalendarConfig({
		firstDayOfWeek,
		dayMaxEvents,
		businessHours,
		locale,
		translations,
		translator,
		resources,
		orientation,
		weekViewGranularity,
	})

	const pluginRuntime = useMemo(() => createPluginRuntime(plugins), [plugins])

	const navigation = useCalendarNavigation({
		initialDate: anchorInitialDate(initialDate, timezone),
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
		resources: configSlice.resources ?? EMPTY_RESOURCES,
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

	// The ref starts at `undefined`, NOT at `timezone`: seeding it with the prop
	// made this effect's own guard false on mount, so `setDefault` never ran at
	// all and the prop only worked if it later changed (#247).
	//
	// Applying the zone in an effect rather than during render is deliberate.
	// `dayjs.tz.setDefault` is a module-global write, and a component renders on
	// the server too — Next.js prerenders `'use client'` components — where one
	// global would be shared across concurrent requests. Effects never run during
	// SSR, so the write stays on the client. The cost is that mount renders once
	// in the machine's zone before this converts, which is why the conversion
	// below has to cover the dates the calendar is already holding, in BOTH
	// directions: dropping the prop returns them to the machine's zone instead of
	// stranding the view on the old clock. Instants never move, only the clock
	// they render on.
	const lastTimezoneProp = useRef<string | undefined>(undefined)
	useEffect(() => {
		if (timezone !== lastTimezoneProp.current) {
			dayjs.tz.setDefault(timezone)
			const toCalendarZone = (date: Dayjs): Dayjs =>
				timezone ? date.tz(timezone) : date.local()
			setCurrentDate((prevDate) => toCalendarZone(prevDate))
			setCurrentEvents((prev) =>
				prev.map((e) => ({
					...e,
					start: toCalendarZone(e.start),
					end: toCalendarZone(e.end),
				}))
			)
			lastTimezoneProp.current = timezone
		}
	}, [timezone, setCurrentDate, setCurrentEvents])

	// The memoized composition keeps the engine object referentially stable so
	// the provider's own `useMemo([engine, …])` can hold the context value
	// steady across re-renders with identical props. Slice-internal members are
	// destructured OFF; `getAllViews` surfaces under its public name.
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
