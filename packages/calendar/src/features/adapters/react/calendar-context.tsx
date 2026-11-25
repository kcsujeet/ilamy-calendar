/** @jsxImportSource react */
import {
	type Context,
	createContext,
	createElement,
	type ReactNode,
	useContext,
	useMemo,
	useSyncExternalStore,
} from 'react'
import {
	createPluginRuntime,
	createTranslator,
	getResourceEvents,
	type HeadlessCalendarController,
	type MountedCalendar,
	type MountedCalendarSnapshot,
	overlapsRange,
	parseDate,
	type PublicDateInput,
	pickControllerActions,
} from '../../../index'
import type { IlamyCalendarApi, IlamyCalendarProps } from './types'

export interface CalendarContextSource {
	controller: HeadlessCalendarController
	getMounted: () => MountedCalendar | undefined
	getOptions: () => Partial<IlamyCalendarProps>
	subscribeAll: (listener: () => void) => () => void
	getSnapshotKey: () => string
}

export const CalendarContext: Context<CalendarContextSource | null> =
	createContext<CalendarContextSource | null>(null)

const EMPTY_PLUGIN_SLOTS: ReactNode[] = []

const renderPluginSlotElements = (
	props: Partial<IlamyCalendarProps>,
	slotName: string,
	context: unknown
): ReactNode[] => {
	const runtime = createPluginRuntime(props.plugins)
	const nodes: ReactNode[] = []
	for (const plugin of runtime.plugins) {
		const mountSlot = plugin.mountSlot
		if (!mountSlot) continue
		nodes.push(
			createElement('div', {
				key: `${slotName}:${plugin.name}`,
				style: { display: 'contents' },
				ref: (el: HTMLElement | null) => {
					if (!el) return undefined
					el.replaceChildren()
					const handle = mountSlot(slotName, el, context)
					return () => {
						handle?.destroy()
					}
				},
			})
		)
	}
	return nodes.length > 0 ? nodes : EMPTY_PLUGIN_SLOTS
}

const readSnapshot = (
	source: CalendarContextSource
): MountedCalendarSnapshot => {
	const state = source.controller.getState()
	const mounted = source.getMounted()
	if (mounted) return mounted.getSnapshot()
	return {
		isEventFormOpen: false,
		selectedEvent: null,
		selectedDate: null,
		rawEvents: state.events,
		visibleEvents: state.events,
		timeFormat: source.getOptions().timeFormat ?? '12-hour',
	}
}

export const buildIlamyCalendarApi = (
	source: CalendarContextSource
): IlamyCalendarApi => {
	const { controller, getMounted, getOptions } = source
	const actions = pickControllerActions(controller)

	const getPluginRuntime = () => createPluginRuntime(getOptions().plugins)

	return {
		get currentDate() {
			return controller.getState().currentDate
		},
		get currentRange() {
			return controller.getState().visibleRange
		},
		get view() {
			return controller.getState().view
		},
		get events() {
			return [...readSnapshot(source).visibleEvents]
		},
		get rawEvents() {
			return [...readSnapshot(source).rawEvents]
		},
		refetchEvents: () => getMounted()?.refetchEvents(),
		scrollToTime: (time) => getMounted()?.scrollToTime(time),
		refetchResources: () => getMounted()?.refetchResources(),
		get isEventFormOpen() {
			return readSnapshot(source).isEventFormOpen
		},
		get selectedEvent() {
			return readSnapshot(source).selectedEvent
		},
		get selectedDate() {
			return readSnapshot(source).selectedDate
		},
		get firstDayOfWeek() {
			return controller.getState().firstDayOfWeek
		},
		get resources() {
			return controller.getState().resources
		},
		get hasResourceAxis() {
			return controller.getState().resources.length > 0
		},
		get orientation() {
			return getOptions().orientation ?? 'horizontal'
		},
		setCurrentDate: actions.setCurrentDate,
		selectDate: actions.selectDate,
		setView: actions.setView,
		nextPeriod: actions.nextPeriod,
		prevPeriod: actions.prevPeriod,
		today: actions.today,
		addEvent: (evt) => {
			const mounted = getMounted()
			if (mounted) {
				mounted.addEvent(evt)
				return
			}
			controller.addEvent(evt)
		},
		updateEvent: (eventId, updates) => {
			const mounted = getMounted()
			if (mounted) {
				mounted.updateEvent(eventId, updates)
				return
			}
			controller.updateEvent(eventId, updates)
		},
		deleteEvent: (eventId) => {
			const mounted = getMounted()
			if (mounted) {
				mounted.deleteEvent(eventId)
				return
			}
			controller.deleteEvent(eventId)
		},
		openEventForm: (input) => getMounted()?.openEventForm(input),
		closeEventForm: () => getMounted()?.closeEventForm(),
		onEventClick: (event) => {
			const opts = getOptions()
			if (!opts.disableEventClick) {
				opts.onEventClick?.(event)
			}
		},
		get renderEvent() {
			return getOptions().renderEvent
		},
		get renderCurrentTimeIndicator() {
			return getOptions().renderCurrentTimeIndicator
		},
		getEventsForResource: (resourceId) =>
			getResourceEvents([...readSnapshot(source).visibleEvents], resourceId),
		get businessHours() {
			return getOptions().businessHours
		},
		get eventConstraint() {
			return getOptions().eventConstraint
		},
		get selectConstraint() {
			return getOptions().selectConstraint
		},
		get t() {
			const opts = getOptions()
			return createTranslator(
				opts.translations as Parameters<typeof createTranslator>[0],
				opts.translator
			)
		},
		get timeFormat() {
			return getOptions().timeFormat ?? '12-hour'
		},
		get timezone() {
			return controller.getState().timezone
		},
		get currentLocale() {
			return controller.getState().locale
		},
		getEventsForDateRange: (start: PublicDateInput, end: PublicDateInput) => {
			const state = controller.getState()
			const rs = parseDate(start, state.timezone)
			const re = parseDate(end, state.timezone)
			if (!(rs && re)) return []
			return readSnapshot(source).visibleEvents.filter((evt) => {
				const es = parseDate(evt.start, state.timezone)
				const ee = parseDate(evt.end, state.timezone)
				return Boolean(
					es && ee && overlapsRange({ start: es, end: ee }, rs, re)
				)
			})
		},
		applyScopedEdit: (event, updates, scope) => {
			getMounted()?.applyScopedEdit(event, updates, scope)
		},
		applyScopedDelete: (event, scope) => {
			getMounted()?.applyScopedDelete(event, scope)
		},
		getEventManager: (event) => {
			const mounted = getMounted()
			return mounted
				? mounted.getEventManager(event)
				: getPluginRuntime().getEventManager(event)
		},
		renderSlot: (slotName, context) =>
			renderPluginSlotElements(getOptions(), slotName, context),
		collect: (point, context) => {
			const mounted = getMounted()
			return mounted
				? mounted.collectPlugin(point, context)
				: getPluginRuntime().collect(point, context)
		},
		getViews: () => [
			{ name: 'day', label: 'day', supportsResources: true },
			{ name: 'week', label: 'week', supportsResources: true },
			{ name: 'month', label: 'month', supportsResources: true },
			...getPluginRuntime().getViews(),
		],
	}
}

/**
 * Returns the live reactive `IlamyCalendarApi` from `<IlamyCalendar>` context
 * or `<CalendarTestProvider>`. Throws when called outside a provider.
 */
export function useIlamyCalendarContext(): IlamyCalendarApi {
	const source = useContext(CalendarContext)
	if (!source) {
		throw new Error(
			'useIlamyCalendarContext must be used inside <IlamyCalendar>'
		)
	}
	const snapKey = useSyncExternalStore(
		source.subscribeAll,
		source.getSnapshotKey,
		source.getSnapshotKey
	)
	return useMemo(() => {
		void snapKey
		return buildIlamyCalendarApi(source)
	}, [source, snapKey])
}
