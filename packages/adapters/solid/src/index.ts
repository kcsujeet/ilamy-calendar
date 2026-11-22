import {
	createCalendarController,
	type HeadlessCalendarActions,
	type HeadlessCalendarController,
	type HeadlessCalendarOptions,
	type HeadlessCalendarState,
	pickControllerActions,
} from '@ilamy/core'
import {
	type DomCalendarOptions,
	type MountedCalendar,
	mountCalendar,
} from '@ilamy/dom'
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
} from 'solid-js'

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

export type SolidCalendarOptionsInput =
	DomCalendarOptions | Accessor<DomCalendarOptions>

const resolveOptions = (
	input: SolidCalendarOptionsInput
): DomCalendarOptions => (typeof input === 'function' ? input() : input)

/**
 * Mounts the full-parity `@ilamy/calendar` UI inside a Solid 2.0 reactive scope.
 * Accepts either a plain `DomCalendarOptions` object or a reactive `Accessor<DomCalendarOptions>`
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
				mounted.update(nextOptions)
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
	props: DomCalendarOptions & { ref?: (cal: MountedCalendar) => void }
): HTMLDivElement => {
	const host = document.createElement('div')
	host.style.width = '100%'
	host.style.height = '100%'

	const readSnapshot = (): DomCalendarOptions => ({
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
		nowIndicator: props.nowIndicator,
		displayEventTime: props.displayEventTime,
		displayEventEnd: props.displayEventEnd,
		weekNumbers: props.weekNumbers,
		weekNumberCalculation: props.weekNumberCalculation,
		orientation: props.orientation,
		weekViewGranularity: props.weekViewGranularity,
		enableDragToCreate: props.enableDragToCreate,
		enableIcalExport: props.enableIcalExport,
		enableYearView: props.enableYearView,
		enableAgendaView: props.enableAgendaView,
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
