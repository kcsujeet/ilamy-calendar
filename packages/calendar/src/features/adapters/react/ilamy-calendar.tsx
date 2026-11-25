/** @jsxImportSource react */
import {
	type ReactNode,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import {
	createCalendarController,
	createPluginRuntime,
	type DomCalendarOptions,
	type IsoDateString,
	type MountedCalendar,
	normalizeEvent,
	type RenderCurrentTimeIndicatorProps,
} from '../../../index'
import { mountCalendar } from '../../../lib/renderer/index'
import {
	buildIlamyCalendarApi,
	CalendarContext,
	type CalendarContextSource,
} from './calendar-context'
import {
	createCallbackPortalBridge,
	createPortalRegistry,
	renderPortalEntry,
	resolveReactCalendarSlots,
	type SlotMountCache,
} from './portal-registry'
import type { IlamyCalendarProps } from './types'

const shallowEqualOptions = (
	a: DomCalendarOptions,
	b: DomCalendarOptions
): boolean => {
	const aKeys = Object.keys(a) as Array<keyof DomCalendarOptions>
	const bKeys = Object.keys(b) as Array<keyof DomCalendarOptions>
	if (aKeys.length !== bKeys.length) return false
	for (const key of aKeys) {
		if (!Object.is(a[key], b[key])) return false
	}
	return true
}

const buildSnapshotVersionKey = (
	controller: ReturnType<typeof createCalendarController>,
	mounted: MountedCalendar | undefined,
	version: number
): string => {
	const st = controller.getState()
	const snap = mounted?.getSnapshot()
	return `${version}:${st.currentDate}:${st.view}:${st.timezone}:${st.locale}:${st.events.length}:${st.resources.length}:${snap?.isEventFormOpen ?? false}:${snap?.rawEvents.length ?? 0}:${snap?.visibleEvents.length ?? 0}`
}

/**
 * Thin React 19 calendar component wrapping the shared Preact DOM renderer,
 * forwarding all state, ref methods, Context API, and region portals via `createPortal`.
 */
const createReactController = (
	domProps: Omit<
		IlamyCalendarProps,
		| 'ref'
		| 'slots'
		| 'renderEvent'
		| 'headerComponent'
		| 'renderResource'
		| 'renderEventForm'
		| 'renderHour'
		| 'renderCurrentTimeIndicator'
		| 'children'
	>,
	latestPropsRef: { current: IlamyCalendarProps }
) => {
	const runtime = createPluginRuntime(domProps.plugins)
	const timezone = domProps.timezone ?? 'UTC'
	const initialEvents = Array.isArray(domProps.events)
		? domProps.events.map((ev) =>
				normalizeEvent(runtime.normalizeEvent(ev, timezone), timezone)
			)
		: undefined
	return createCalendarController({
		initialDate: domProps.initialDate,
		initialView: domProps.initialView ?? 'month',
		events: initialEvents,
		resources: Array.isArray(domProps.resources)
			? domProps.resources
			: undefined,
		timezone: domProps.timezone,
		locale: domProps.locale,
		firstDayOfWeek: domProps.firstDayOfWeek,
		hiddenDays: domProps.hiddenDays,
		weekends: domProps.weekends,
		pluginViews: runtime.getViews(),
		onDateChange: (date, range) =>
			latestPropsRef.current.onDateChange?.(date, range),
		onViewChange: (view) => latestPropsRef.current.onViewChange?.(view),
	})
}

function useResolvedReactSlots({
	slots,
	headerComponent,
	renderEvent,
	renderResource,
	renderEventForm,
	slotCache,
	registry,
	portalCounter,
}: {
	slots: IlamyCalendarProps['slots']
	headerComponent: IlamyCalendarProps['headerComponent']
	renderEvent: IlamyCalendarProps['renderEvent']
	renderResource: IlamyCalendarProps['renderResource']
	renderEventForm: IlamyCalendarProps['renderEventForm']
	slotCache: SlotMountCache
	registry: ReturnType<typeof createPortalRegistry>
	portalCounter: { current: number }
}) {
	const slotHeader = slots?.header
	const slotEvent = slots?.event
	const slotResource = slots?.resource
	const slotEventForm = slots?.eventForm
	const slotMoreEvents = slots?.moreEventsDialog
	const slotScopeDialog = slots?.recurrenceScopeDialog
	const hasHeaderComponent = headerComponent !== undefined
	const hasRenderEvent = Boolean(renderEvent)
	const hasRenderResource = Boolean(renderResource)
	const hasRenderEventForm = Boolean(renderEventForm)

	return useMemo(
		() =>
			resolveReactCalendarSlots({
				slots: {
					header: slotHeader,
					event: slotEvent,
					resource: slotResource,
					eventForm: slotEventForm,
					moreEventsDialog: slotMoreEvents,
					recurrenceScopeDialog: slotScopeDialog,
				},
				hasHeaderComponent,
				hasRenderEvent,
				hasRenderResource,
				hasRenderEventForm,
				cache: slotCache,
				registry,
				counter: portalCounter,
			}),
		[
			slotHeader,
			slotEvent,
			slotResource,
			slotEventForm,
			slotMoreEvents,
			slotScopeDialog,
			hasHeaderComponent,
			hasRenderEvent,
			hasRenderResource,
			hasRenderEventForm,
			slotCache,
			registry,
			portalCounter,
		]
	)
}

function useCalendarMountSync({
	hostRef,
	mountedRef,
	appliedOptionsRef,
	controller,
	nextDomOptions,
	notifyAll,
	registry,
}: {
	hostRef: { current: HTMLDivElement | null }
	mountedRef: { current: MountedCalendar | undefined }
	appliedOptionsRef: { current: DomCalendarOptions | null }
	controller: ReturnType<typeof createCalendarController>
	nextDomOptions: DomCalendarOptions
	notifyAll: () => void
	registry: ReturnType<typeof createPortalRegistry>
}) {
	const [initialDomOptions] = useState<DomCalendarOptions>(() => nextDomOptions)

	useEffect(() => {
		const host = hostRef.current
		if (!host) return
		const initial = { ...initialDomOptions }
		appliedOptionsRef.current = initial
		const mounted = mountCalendar(host, initial)
		mountedRef.current = mounted
		const unsubCtrl = controller.subscribe(notifyAll)
		const unsubSnap = mounted.subscribeSnapshot(notifyAll)
		notifyAll()
		return () => {
			unsubCtrl()
			unsubSnap()
			mountedRef.current = undefined
			appliedOptionsRef.current = null
			mounted.destroy()
			registry.clear()
		}
	}, [
		hostRef,
		mountedRef,
		appliedOptionsRef,
		controller,
		initialDomOptions,
		notifyAll,
		registry,
	])

	useEffect(() => {
		const mounted = mountedRef.current
		if (!mounted) return
		const prev = appliedOptionsRef.current
		if (prev && shallowEqualOptions(prev, nextDomOptions)) return
		appliedOptionsRef.current = nextDomOptions
		mounted.update(nextDomOptions)
	})
}

function createReactCalendarRuntime(
	domProps: DomCalendarOptions,
	latestPropsRef: { current: IlamyCalendarProps }
) {
	const registry = createPortalRegistry()
	const slotCache: SlotMountCache = {}
	const portalCounter = { current: 0 }
	return {
		controller: createReactController(domProps, latestPropsRef),
		registry,
		slotCache,
		portalCounter,
		hourBridge: createCallbackPortalBridge<IsoDateString>(
			registry,
			portalCounter,
			'legacyHour'
		),
		nowBridge: createCallbackPortalBridge<RenderCurrentTimeIndicatorProps>(
			registry,
			portalCounter,
			'legacyNowIndicator'
		),
	}
}

function useCalendarContextSource(
	controller: ReturnType<typeof createCalendarController>,
	mountedRef: { current: MountedCalendar | undefined },
	latestPropsRef: { current: IlamyCalendarProps }
) {
	const [versionRef] = useState(() => ({ current: 0 }))
	const [listeners] = useState(() => new Set<() => void>())
	const notifyAll = useCallback(() => {
		versionRef.current += 1
		for (const listener of listeners) {
			listener()
		}
	}, [listeners, versionRef])

	const contextSource = useMemo<CalendarContextSource>(
		() => ({
			controller,
			getMounted: () => mountedRef.current,
			getOptions: () => latestPropsRef.current,
			subscribeAll: (listener) => {
				listeners.add(listener)
				return () => {
					listeners.delete(listener)
				}
			},
			getSnapshotKey: () =>
				buildSnapshotVersionKey(
					controller,
					mountedRef.current,
					versionRef.current
				),
		}),
		[controller, listeners, mountedRef, latestPropsRef, versionRef]
	)

	return { contextSource, notifyAll }
}

export const IlamyCalendar = (props: IlamyCalendarProps): ReactNode => {
	const {
		ref,
		slots,
		renderEvent,
		headerComponent,
		renderResource,
		renderEventForm,
		renderHour,
		renderCurrentTimeIndicator,
		children,
		...domProps
	} = props

	const hostRef = useRef<HTMLDivElement>(null)
	const mountedRef = useRef<MountedCalendar | undefined>(undefined)
	const appliedOptionsRef = useRef<DomCalendarOptions | null>(null)
	const latestPropsRef = useRef(props)
	latestPropsRef.current = props

	const [runtime] = useState(() =>
		createReactCalendarRuntime(domProps, latestPropsRef)
	)
	const { contextSource, notifyAll } = useCalendarContextSource(
		runtime.controller,
		mountedRef,
		latestPropsRef
	)

	const resolvedSlots = useResolvedReactSlots({
		slots,
		headerComponent,
		renderEvent,
		renderResource,
		renderEventForm,
		slotCache: runtime.slotCache,
		registry: runtime.registry,
		portalCounter: runtime.portalCounter,
	})

	const nextDomOptions: DomCalendarOptions = {
		...domProps,
		controller: runtime.controller,
		slots: resolvedSlots,
		renderHour: renderHour ? runtime.hourBridge : undefined,
		renderCurrentTimeIndicator: renderCurrentTimeIndicator
			? runtime.nowBridge
			: undefined,
	}

	useCalendarMountSync({
		hostRef,
		mountedRef,
		appliedOptionsRef,
		controller: runtime.controller,
		nextDomOptions,
		notifyAll,
		registry: runtime.registry,
	})

	useImperativeHandle(ref, () => buildIlamyCalendarApi(contextSource), [
		contextSource,
	])

	const portals = useSyncExternalStore(
		runtime.registry.subscribe,
		runtime.registry.getSnapshot,
		runtime.registry.getServerSnapshot
	)

	return (
		<CalendarContext.Provider value={contextSource}>
			<div
				data-ilamy-framework="react"
				style={{ width: '100%', height: '100%' }}
			>
				<div ref={hostRef} style={{ display: 'contents' }} />
				{portals.map((entry) =>
					renderPortalEntry(entry, {
						slots,
						headerComponent,
						renderEvent,
						renderResource,
						renderEventForm,
						renderHour,
						renderCurrentTimeIndicator,
					})
				)}
				{children}
			</div>
		</CalendarContext.Provider>
	)
}
