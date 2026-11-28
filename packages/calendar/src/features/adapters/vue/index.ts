import {
	type ComputedRef,
	computed,
	type DefineComponent,
	defineComponent,
	h,
	onBeforeUnmount,
	onMounted,
	onScopeDispose,
	type PropType,
	render,
	type ShallowRef,
	shallowRef,
	type VNode,
	watch,
} from 'vue'
import {
	type CalendarSlots,
	createCalendarController,
	type DomCalendarEvent,
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

export interface VueIlamyCalendarHandle extends HeadlessCalendarActions {
	state: ShallowRef<HeadlessCalendarState>
	currentDate: ComputedRef<HeadlessCalendarState['currentDate']>
	view: ComputedRef<HeadlessCalendarState['view']>
	events: ComputedRef<HeadlessCalendarState['events']>
	resources: ComputedRef<HeadlessCalendarState['resources']>
	visibleRange: ComputedRef<HeadlessCalendarState['visibleRange']>
	controller: HeadlessCalendarController
}

/**
 * Vue 3.5+ composable wrapping `@ilamy/calendar`'s headless calendar controller.
 * Automatically unsubscribes when the enclosing component or `effectScope` disposes.
 */
export const useIlamyCalendar = (
	options: HeadlessCalendarOptions = {}
): VueIlamyCalendarHandle => {
	const controller = createCalendarController(options)
	const state = shallowRef<HeadlessCalendarState>(controller.getState())
	const unsubscribe = controller.subscribe(() => {
		state.value = controller.getState()
	})
	onScopeDispose(unsubscribe)

	return {
		...pickControllerActions(controller),
		state,
		currentDate: computed(() => state.value.currentDate),
		view: computed(() => state.value.view),
		events: computed(() => state.value.events),
		resources: computed(() => state.value.resources),
		visibleRange: computed(() => state.value.visibleRange),
		controller,
	}
}

/**
 * Wraps a Vue scoped slot renderer into a persistent `SlotMount<P>` backed by
 * `shallowRef` so Preact context updates refresh Vue slot content in place
 * without unmounting or losing DOM state.
 */
export const createVueSlotMount = <P>(
	getSlotFn: () => ((ctx: P) => VNode[]) | undefined
): SlotMount<P> => ({
	mount: (host, initialProps) => {
		const propsRef = shallowRef<P>(initialProps)
		const SlotBridge = defineComponent({
			name: 'IlamyVueSlotBridge',
			setup() {
				return () => {
					const fn = getSlotFn()
					return h(
						'div',
						{ style: { display: 'contents' } },
						fn ? fn(propsRef.value) : []
					)
				}
			},
		})
		render(h(SlotBridge), host)
		return {
			update: (nextProps) => {
				propsRef.value = nextProps
			},
			destroy: () => {
				render(null, host)
			},
		}
	},
})

const VUE_SLOT_BINDINGS: ReadonlyArray<{
	region: SlotName
	vueName: string
}> = [
	{ region: 'header', vueName: 'header' },
	{ region: 'event', vueName: 'event' },
	{ region: 'resource', vueName: 'resource' },
	{ region: 'eventForm', vueName: 'event-form' },
	{ region: 'moreEventsDialog', vueName: 'more-events-dialog' },
	{ region: 'recurrenceScopeDialog', vueName: 'recurrence-scope-dialog' },
]

export interface VueIlamyCalendarProps extends DomCalendarOptions {
	options?: DomCalendarOptions
	calendarClass?: string
}

export interface VueIlamyCalendarExposed {
	nextPeriod: () => void
	prevPeriod: () => void
	today: () => void
	setView: (view: string) => void
	selectDate: (date: string | Date) => void
	scrollToTime: (time: string) => void
	refetchEvents: () => void
	refetchResources: () => void
	getController: () => HeadlessCalendarController | undefined
}

/**
 * Ready-to-use Vue 3.5+ `<IlamyCalendar />` component with full feature parity,
 * reactive props, emits, `unstyled`/`slotProps`/StyleX support, and in-place
 * Vue scoped region slots (`#header`, `#event`, `#resource`, `#event-form`,
 * `#more-events-dialog`, `#recurrence-scope-dialog`).
 */
export const IlamyCalendar: DefineComponent<VueIlamyCalendarProps> =
	defineComponent({
		name: 'IlamyCalendar',
		props: {
			options: {
				type: Object as PropType<DomCalendarOptions>,
				default: undefined,
			},
			plugins: {
				type: Array as PropType<DomCalendarOptions['plugins']>,
				default: undefined,
			},
			events: {
				type: Array as PropType<DomCalendarOptions['events']>,
				default: undefined,
			},
			resources: {
				type: Array as PropType<DomCalendarOptions['resources']>,
				default: undefined,
			},
			initialView: {
				type: String as PropType<DomCalendarOptions['initialView']>,
				default: undefined,
			},
			initialDate: {
				type: [String, Date] as PropType<DomCalendarOptions['initialDate']>,
				default: undefined,
			},
			views: {
				type: Array as PropType<DomCalendarOptions['views']>,
				default: undefined,
			},
			firstDayOfWeek: {
				type: String as PropType<DomCalendarOptions['firstDayOfWeek']>,
				default: undefined,
			},
			hiddenDays: {
				type: Array as PropType<DomCalendarOptions['hiddenDays']>,
				default: undefined,
			},
			weekends: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			timezone: { type: String, default: undefined },
			locale: { type: String, default: undefined },
			timeFormat: {
				type: String as PropType<DomCalendarOptions['timeFormat']>,
				default: undefined,
			},
			dayMaxEvents: { type: Number, default: undefined },
			eventHeight: { type: Number, default: undefined },
			eventSpacing: { type: Number, default: undefined },
			slotDuration: {
				type: Number as PropType<DomCalendarOptions['slotDuration']>,
				default: undefined,
			},
			snapDuration: {
				type: Number as PropType<DomCalendarOptions['snapDuration']>,
				default: undefined,
			},
			slotMinTime: { type: String, default: undefined },
			slotMaxTime: { type: String, default: undefined },
			businessHours: {
				type: [Object, Array] as PropType<DomCalendarOptions['businessHours']>,
				default: undefined,
			},
			hideNonBusinessHours: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			eventConstraint: {
				type: String as PropType<DomCalendarOptions['eventConstraint']>,
				default: undefined,
			},
			selectConstraint: {
				type: String as PropType<DomCalendarOptions['selectConstraint']>,
				default: undefined,
			},
			editable: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			eventResizableFromStart: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			allDaySlot: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			scrollTime: { type: String, default: undefined },
			scrollToNow: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			orientation: {
				type: String as PropType<DomCalendarOptions['orientation']>,
				default: undefined,
			},
			weekViewGranularity: {
				type: String as PropType<DomCalendarOptions['weekViewGranularity']>,
				default: undefined,
			},
			stickyViewHeader: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			disableCellClick: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			disableEventClick: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			lazyFetching: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			slotHeaderFormat: {
				type: Object as PropType<DomCalendarOptions['slotHeaderFormat']>,
				default: undefined,
			},
			eventTimeFormat: {
				type: Object as PropType<DomCalendarOptions['eventTimeFormat']>,
				default: undefined,
			},
			dayHeaderFormat: {
				type: Object as PropType<DomCalendarOptions['dayHeaderFormat']>,
				default: undefined,
			},
			titleFormat: {
				type: Object as PropType<DomCalendarOptions['titleFormat']>,
				default: undefined,
			},
			translations: {
				type: Object as PropType<DomCalendarOptions['translations']>,
				default: undefined,
			},
			translator: {
				type: Function as PropType<DomCalendarOptions['translator']>,
				default: undefined,
			},
			slots: {
				type: Object as PropType<DomCalendarOptions['slots']>,
				default: undefined,
			},
			nowIndicator: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			displayEventTime: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			displayEventEnd: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			weekNumbers: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			unstyled: {
				type: Boolean as PropType<boolean | undefined>,
				default: undefined,
			},
			slotProps: {
				type: Object as PropType<DomCalendarOptions['slotProps']>,
				default: undefined,
			},
			calendarClass: { type: String, default: undefined },
		},
		emits: [
			'event-add',
			'event-update',
			'event-delete',
			'events-change',
			'event-click',
			'cell-click',
			'range-select',
			'view-change',
			'date-change',
		],
		setup(props, { emit, slots, expose }) {
			const hostRef = shallowRef<HTMLElement | null>(null)
			let mounted: MountedCalendar | undefined
			const slotCache: Partial<Record<SlotName, SlotMount<never>>> = {}
			const latestSlotFns: Partial<
				Record<SlotName, ((ctx: unknown) => VNode[]) | undefined>
			> = {}

			const resolveMergedSlots = (
				baseSlots: CalendarSlots | undefined
			): CalendarSlots => {
				const merged: CalendarSlots = { ...baseSlots }
				for (const { region, vueName } of VUE_SLOT_BINDINGS) {
					const vueFn = slots[vueName] as
						((ctx: unknown) => VNode[]) | undefined
					latestSlotFns[region] = vueFn
					if (!vueFn) continue
					if (!slotCache[region]) {
						slotCache[region] = createVueSlotMount<
							SlotContextMap[typeof region]
						>(
							() =>
								latestSlotFns[region] as
									((ctx: SlotContextMap[typeof region]) => VNode[]) | undefined
						) as SlotMount<never>
					}
					Object.assign(merged, { [region]: slotCache[region] })
				}
				return merged
			}

			const buildOptions = (): DomCalendarOptions => {
				const base: DomCalendarOptions = { ...(props.options ?? {}) }
				const assignIfDefined = <K extends keyof DomCalendarOptions>(
					key: K,
					value: DomCalendarOptions[K]
				) => {
					if (value !== undefined) {
						base[key] = value
					}
				}

				assignIfDefined('events', props.events)
				assignIfDefined('resources', props.resources)
				assignIfDefined('initialView', props.initialView)
				assignIfDefined('initialDate', props.initialDate)
				assignIfDefined('views', props.views)
				assignIfDefined('firstDayOfWeek', props.firstDayOfWeek)
				assignIfDefined('hiddenDays', props.hiddenDays)
				assignIfDefined('weekends', props.weekends)
				assignIfDefined('timezone', props.timezone)
				assignIfDefined('locale', props.locale)
				assignIfDefined('timeFormat', props.timeFormat)
				assignIfDefined('dayMaxEvents', props.dayMaxEvents)
				assignIfDefined('eventHeight', props.eventHeight)
				assignIfDefined('eventSpacing', props.eventSpacing)
				assignIfDefined('slotDuration', props.slotDuration)
				assignIfDefined('snapDuration', props.snapDuration)
				assignIfDefined('slotMinTime', props.slotMinTime)
				assignIfDefined('slotMaxTime', props.slotMaxTime)
				assignIfDefined('businessHours', props.businessHours)
				assignIfDefined('hideNonBusinessHours', props.hideNonBusinessHours)
				assignIfDefined('eventConstraint', props.eventConstraint)
				assignIfDefined('selectConstraint', props.selectConstraint)
				assignIfDefined('editable', props.editable)
				assignIfDefined(
					'eventResizableFromStart',
					props.eventResizableFromStart
				)
				assignIfDefined('allDaySlot', props.allDaySlot)
				assignIfDefined('scrollTime', props.scrollTime)
				assignIfDefined('scrollToNow', props.scrollToNow)
				assignIfDefined('orientation', props.orientation)
				assignIfDefined('weekViewGranularity', props.weekViewGranularity)
				assignIfDefined('stickyViewHeader', props.stickyViewHeader)
				assignIfDefined('disableCellClick', props.disableCellClick)
				assignIfDefined('disableEventClick', props.disableEventClick)
				assignIfDefined('lazyFetching', props.lazyFetching)
				assignIfDefined('slotHeaderFormat', props.slotHeaderFormat)
				assignIfDefined('eventTimeFormat', props.eventTimeFormat)
				assignIfDefined('dayHeaderFormat', props.dayHeaderFormat)
				assignIfDefined('titleFormat', props.titleFormat)
				assignIfDefined('translations', props.translations)
				assignIfDefined('translator', props.translator)
				assignIfDefined('slots', props.slots)
				assignIfDefined('nowIndicator', props.nowIndicator)
				assignIfDefined('displayEventTime', props.displayEventTime)
				assignIfDefined('displayEventEnd', props.displayEventEnd)
				assignIfDefined('plugins', props.plugins)
				assignIfDefined('weekNumbers', props.weekNumbers)
				assignIfDefined('unstyled', props.unstyled)
				assignIfDefined('slotProps', props.slotProps)
				assignIfDefined('className', props.calendarClass)

				return {
					...base,
					slots: resolveMergedSlots(base.slots),
					onEventAdd: (ev: DomCalendarEvent) => {
						base.onEventAdd?.(ev)
						emit('event-add', ev)
					},
					onEventUpdate: (ev: DomCalendarEvent) => {
						base.onEventUpdate?.(ev)
						emit('event-update', ev)
					},
					onEventDelete: (ev: DomCalendarEvent) => {
						base.onEventDelete?.(ev)
						emit('event-delete', ev)
					},
					onEventsChange: (change) => {
						base.onEventsChange?.(change)
						emit('events-change', change)
					},
					onEventClick: (ev: DomCalendarEvent) => {
						base.onEventClick?.(ev)
						emit('event-click', ev)
					},
					onCellClick: (cell) => {
						base.onCellClick?.(cell)
						emit('cell-click', cell)
					},
					onRangeSelect: (range) => {
						base.onRangeSelect?.(range)
						emit('range-select', range)
					},
					onViewChange: (view) => {
						base.onViewChange?.(view)
						emit('view-change', view)
					},
					onDateChange: (date, range) => {
						base.onDateChange?.(date, range)
						emit('date-change', date, range)
					},
				}
			}

			onMounted(() => {
				if (!hostRef.value) return
				mounted = mountCalendar(hostRef.value, buildOptions())
			})

			watch(
				() => props,
				() => {
					mounted?.update(buildOptions())
				},
				{ deep: true }
			)

			onBeforeUnmount(() => {
				mounted?.destroy()
				mounted = undefined
			})

			expose<VueIlamyCalendarExposed>({
				nextPeriod: () => mounted?.controller.nextPeriod(),
				prevPeriod: () => mounted?.controller.prevPeriod(),
				today: () => mounted?.controller.today(),
				setView: (view) => mounted?.controller.setView(view),
				selectDate: (date) => mounted?.controller.selectDate(date),
				scrollToTime: (time) => mounted?.scrollToTime(time),
				refetchEvents: () => mounted?.refetchEvents(),
				refetchResources: () => mounted?.refetchResources(),
				getController: () => mounted?.controller,
			})

			return () =>
				h('div', {
					ref: hostRef,
					'data-ilamy-framework': 'vue',
					style: { width: '100%', height: '100%' },
				})
		},
	}) as unknown as DefineComponent<VueIlamyCalendarProps>
