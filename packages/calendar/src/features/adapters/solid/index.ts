import {
	type Accessor,
	createEffect,
	createMemo,
	createRoot,
	createSignal,
	onCleanup,
} from 'solid-js'
import {
	type CalendarSlots,
	createCalendarController,
	type DomCalendarOptions,
	type HeadlessCalendarActions,
	type HeadlessCalendarController,
	type HeadlessCalendarOptions,
	type HeadlessCalendarState,
	type MountedCalendar,
	pickControllerActions,
	type SlotContextMap,
	type SlotMount,
	type SlotName,
} from '../../../index'
import { mountCalendar } from '../../../lib/renderer/index'

export interface SolidIlamyCalendarHandle extends HeadlessCalendarActions {
	state: Accessor<HeadlessCalendarState>
	currentDate: Accessor<HeadlessCalendarState['currentDate']>
	view: Accessor<HeadlessCalendarState['view']>
	events: Accessor<HeadlessCalendarState['events']>
	resources: Accessor<HeadlessCalendarState['resources']>
	visibleRange: Accessor<HeadlessCalendarState['visibleRange']>
	controller: HeadlessCalendarController
}

/**
 * Wraps a Solid 2.0 component/render function `(props: Accessor<P>) => Node`
 * into a persistent `SlotMount<P>` so Preact updates reactively refresh the
 * existing Solid DOM subtree without unmounting.
 */
export const createSolidSlotMount = <P>(
	renderSlot: (props: Accessor<P>) => Node
): SlotMount<P> => ({
	mount: (host, initialProps) => {
		let setBox!: (next: { value: P }) => void
		let disposeRoot!: () => void
		let renderedNode: Node | undefined

		createRoot((dispose) => {
			disposeRoot = dispose
			const [box, setter] = createSignal<{ value: P }>({
				value: initialProps,
			})
			setBox = setter
			const node = renderSlot(() => box().value)
			renderedNode = node
			host.appendChild(node)
		})

		return {
			update: (nextProps) => {
				setBox({ value: nextProps })
			},
			destroy: () => {
				disposeRoot()
				if (renderedNode && renderedNode.parentNode === host) {
					host.removeChild(renderedNode)
				}
			},
		}
	},
})

export type SolidCalendarSlots = Partial<{
	[K in SlotName]:
		| ((props: Accessor<SlotContextMap[K]>) => Node)
		| SlotMount<SlotContextMap[K]>
}>

/**
 * Solid 2.0 signal-backed headless calendar primitive.
 * Automatically unsubscribes via `onCleanup` when its Solid owner disposes.
 */
export const createIlamyCalendar = (
	options: HeadlessCalendarOptions = {}
): SolidIlamyCalendarHandle => {
	const controller = createCalendarController(options)
	const [state, setState] = createSignal<HeadlessCalendarState>(
		controller.getState()
	)
	const unsubscribe = controller.subscribe(() => {
		setState(controller.getState())
	})
	onCleanup(unsubscribe)

	return {
		...pickControllerActions(controller),
		state,
		currentDate: createMemo(() => state().currentDate),
		view: createMemo(() => state().view),
		events: createMemo(() => state().events),
		resources: createMemo(() => state().resources),
		visibleRange: createMemo(() => state().visibleRange),
		controller,
	}
}

export interface SolidDomCalendarOptions extends Omit<
	DomCalendarOptions,
	'slots'
> {
	slots?: SolidCalendarSlots | CalendarSlots
}

export type SolidCalendarOptionsInput =
	SolidDomCalendarOptions | Accessor<SolidDomCalendarOptions>

const SOLID_SLOT_NAMES: readonly SlotName[] = [
	'header',
	'event',
	'resource',
	'eventForm',
	'moreEventsDialog',
	'recurrenceScopeDialog',
]

const assignSolidSlot = <K extends SlotName>(
	slots: SolidCalendarSlots | CalendarSlots,
	out: CalendarSlots,
	key: K
): void => {
	const entry = slots[key]
	if (!entry) return
	const mountEntry =
		typeof entry === 'function'
			? createSolidSlotMount(
					entry as (props: Accessor<SlotContextMap[K]>) => Node
				)
			: entry
	Object.assign(out, { [key]: mountEntry })
}

const resolveSolidSlots = (
	slots: SolidCalendarSlots | CalendarSlots | undefined
): CalendarSlots | undefined => {
	if (!slots) return undefined
	const out: CalendarSlots = {}
	for (const key of SOLID_SLOT_NAMES) {
		assignSolidSlot(slots, out, key)
	}
	return out
}

const resolveOptions = (
	input: SolidCalendarOptionsInput
): DomCalendarOptions => {
	const resolved = typeof input === 'function' ? input() : input
	return {
		...resolved,
		slots: resolveSolidSlots(resolved.slots),
	}
}

/**
 * Mounts the full-parity `@ilamy/calendar` UI inside a Solid 2.0 reactive scope.
 * Accepts either a plain `DomCalendarOptions` object or a reactive `Accessor`
 * and syncs updates via Solid 2's two-argument `createEffect` + `onCleanup`.
 */
export const mountSolidCalendar = (
	container: HTMLElement,
	options: SolidCalendarOptionsInput = {}
): MountedCalendar => {
	container.dataset.ilamyFramework = 'solid'
	const mounted = mountCalendar(container, resolveOptions(options))

	if (typeof options === 'function') {
		let initialized = false
		createEffect(
			() => options(),
			(nextOptions) => {
				if (!initialized) {
					initialized = true
					return
				}
				mounted.update({
					...nextOptions,
					slots: resolveSolidSlots(nextOptions.slots),
				})
			}
		)
	}

	onCleanup(() => {
		mounted.destroy()
	})

	return mounted
}

/**
 * Solid 2.0 component returning a mounted `HTMLDivElement` calendar node.
 * Works directly in Solid 2 JSX (`<IlamyCalendar events={events()} editable />`)
 * or programmatic Solid 2 roots.
 */
export const IlamyCalendar = (
	props: SolidDomCalendarOptions & { ref?: (cal: MountedCalendar) => void }
): HTMLDivElement => {
	const host = document.createElement('div')
	host.style.width = '100%'
	host.style.height = '100%'

	const readSnapshot = (): SolidDomCalendarOptions => ({
		plugins: props.plugins,
		events: props.events,
		resources: props.resources,
		initialView: props.initialView,
		initialDate: props.initialDate,
		views: props.views,
		firstDayOfWeek: props.firstDayOfWeek,
		hiddenDays: props.hiddenDays,
		weekends: props.weekends,
		timezone: props.timezone,
		locale: props.locale,
		timeFormat: props.timeFormat,
		dayMaxEvents: props.dayMaxEvents,
		eventHeight: props.eventHeight,
		eventSpacing: props.eventSpacing,
		slotDuration: props.slotDuration,
		snapDuration: props.snapDuration,
		slotMinTime: props.slotMinTime,
		slotMaxTime: props.slotMaxTime,
		businessHours: props.businessHours,
		hideNonBusinessHours: props.hideNonBusinessHours,
		eventConstraint: props.eventConstraint,
		selectConstraint: props.selectConstraint,
		editable: props.editable,
		eventStartEditable: props.eventStartEditable,
		eventDurationEditable: props.eventDurationEditable,
		eventResizableFromStart: props.eventResizableFromStart,
		allDaySlot: props.allDaySlot,
		scrollTime: props.scrollTime,
		scrollToNow: props.scrollToNow,
		slotHeaderFormat: props.slotHeaderFormat,
		eventTimeFormat: props.eventTimeFormat,
		dayHeaderFormat: props.dayHeaderFormat,
		titleFormat: props.titleFormat,
		translations: props.translations,
		translator: props.translator,
		lazyFetching: props.lazyFetching,
		loading: props.loading,
		onEventsError: props.onEventsError,
		refetchResourcesOnNavigate: props.refetchResourcesOnNavigate,
		resourcesSet: props.resourcesSet,
		onResourcesError: props.onResourcesError,
		onMoreEventsClick: props.onMoreEventsClick,
		slots: props.slots,
		nowIndicator: props.nowIndicator,
		displayEventTime: props.displayEventTime,
		displayEventEnd: props.displayEventEnd,
		weekNumbers: props.weekNumbers,
		weekNumberCalculation: props.weekNumberCalculation,
		orientation: props.orientation,
		weekViewGranularity: props.weekViewGranularity,
		stickyViewHeader: props.stickyViewHeader,
		disableCellClick: props.disableCellClick,
		disableEventClick: props.disableEventClick,
		unstyled: props.unstyled,
		slotProps: props.slotProps,
		className: props.className,
		eventAllow: props.eventAllow,
		isCellDisabled: props.isCellDisabled,
		getCellClassName: props.getCellClassName,
		renderEvent: props.renderEvent,
		renderHeader: props.renderHeader,
		renderResource: props.renderResource,
		renderEventForm: props.renderEventForm,
		onEventClick: props.onEventClick,
		onCellClick: props.onCellClick,
		onEventAdd: props.onEventAdd,
		onEventUpdate: props.onEventUpdate,
		onEventDelete: props.onEventDelete,
		onEventsChange: props.onEventsChange,
		onRangeSelect: props.onRangeSelect,
		onViewChange: props.onViewChange,
		onDateChange: props.onDateChange,
	})

	const mounted = mountSolidCalendar(host, readSnapshot)
	props.ref?.(mounted)
	return host
}
