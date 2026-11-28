import { computed, type Signal, signal } from '@angular/core'
import {
	createCalendarController,
	type DomCalendarOptions,
	type HeadlessCalendarActions,
	type HeadlessCalendarController,
	type HeadlessCalendarOptions,
	type HeadlessCalendarState,
	type MountedCalendar,
	pickControllerActions,
} from '../../../index'
import { mountCalendar } from '../../../lib/renderer/index'

export interface AngularIlamyCalendarHandle extends HeadlessCalendarActions {
	readonly state: Signal<HeadlessCalendarState>
	readonly currentDate: Signal<HeadlessCalendarState['currentDate']>
	readonly view: Signal<HeadlessCalendarState['view']>
	readonly events: Signal<HeadlessCalendarState['events']>
	readonly resources: Signal<HeadlessCalendarState['resources']>
	readonly visibleRange: Signal<HeadlessCalendarState['visibleRange']>
	readonly controller: HeadlessCalendarController
	destroy: () => void
}

/**
 * Angular 22 native Signals store wrapping `@ilamy/core`'s headless calendar controller.
 * Works seamlessly in zoneless Angular 22 standalone components and services.
 */
export const createAngularCalendar = (
	options: HeadlessCalendarOptions = {}
): AngularIlamyCalendarHandle => {
	const controller = createCalendarController(options)
	const state = signal<HeadlessCalendarState>(controller.getState())
	const unsubscribe = controller.subscribe(() => {
		state.set(controller.getState())
	})

	return {
		...pickControllerActions(controller),
		state: state.asReadonly(),
		currentDate: computed(() => state().currentDate),
		view: computed(() => state().view),
		events: computed(() => state().events),
		resources: computed(() => state().resources),
		visibleRange: computed(() => state().visibleRange),
		controller,
		destroy: unsubscribe,
	}
}

/** Direct imperative mount helper for Angular `ElementRef` / `afterRenderEffect`. */
export const mountAngularCalendar = (
	container: HTMLElement,
	options: DomCalendarOptions = {}
): MountedCalendar => {
	container.dataset.ilamyFramework = 'angular'
	return mountCalendar(container, options)
}

const HtmlElementBase: typeof HTMLElement =
	typeof HTMLElement === 'undefined'
		? (class {} as typeof HTMLElement)
		: HTMLElement

/**
 * Standards-based `<ilamy-calendar>` Custom Element tailored for Angular 22
 * standalone components (`schemas: [CUSTOM_ELEMENTS_SCHEMA]`):
 *
 * Bind properties directly (`[options]`, `[events]`, `[timezone]`, `[unstyled]`,
 * `[slotProps]`) and listen to typed CustomEvents (`(eventsChange)`, `(eventUpdate)`,
 * `(viewChange)`, `(dateChange)`).
 */
export class IlamyCalendarElement extends HtmlElementBase {
	private calendarOptions: DomCalendarOptions = {}
	private mounted?: MountedCalendar

	// fallow-ignore-next-line unused-class-member
	get options(): DomCalendarOptions {
		return this.calendarOptions
	}

	// fallow-ignore-next-line unused-class-member
	set options(value: DomCalendarOptions) {
		this.calendarOptions = { ...value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set events(value: DomCalendarOptions['events']) {
		this.calendarOptions = { ...this.calendarOptions, events: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set resources(value: DomCalendarOptions['resources']) {
		this.calendarOptions = { ...this.calendarOptions, resources: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set initialView(value: DomCalendarOptions['initialView']) {
		this.calendarOptions = { ...this.calendarOptions, initialView: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set initialDate(value: DomCalendarOptions['initialDate']) {
		this.calendarOptions = { ...this.calendarOptions, initialDate: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set timezone(value: DomCalendarOptions['timezone']) {
		this.calendarOptions = { ...this.calendarOptions, timezone: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set locale(value: DomCalendarOptions['locale']) {
		this.calendarOptions = { ...this.calendarOptions, locale: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set editable(value: DomCalendarOptions['editable']) {
		this.calendarOptions = { ...this.calendarOptions, editable: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set unstyled(value: DomCalendarOptions['unstyled']) {
		this.calendarOptions = { ...this.calendarOptions, unstyled: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set slotProps(value: DomCalendarOptions['slotProps']) {
		this.calendarOptions = { ...this.calendarOptions, slotProps: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set slots(value: DomCalendarOptions['slots']) {
		this.calendarOptions = { ...this.calendarOptions, slots: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set allDaySlot(value: DomCalendarOptions['allDaySlot']) {
		this.calendarOptions = { ...this.calendarOptions, allDaySlot: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set scrollTime(value: DomCalendarOptions['scrollTime']) {
		this.calendarOptions = { ...this.calendarOptions, scrollTime: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set scrollToNow(value: DomCalendarOptions['scrollToNow']) {
		this.calendarOptions = { ...this.calendarOptions, scrollToNow: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set plugins(value: DomCalendarOptions['plugins']) {
		this.calendarOptions = { ...this.calendarOptions, plugins: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set eventHeight(value: DomCalendarOptions['eventHeight']) {
		this.calendarOptions = { ...this.calendarOptions, eventHeight: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	set eventSpacing(value: DomCalendarOptions['eventSpacing']) {
		this.calendarOptions = { ...this.calendarOptions, eventSpacing: value }
		this.syncMounted()
	}

	// fallow-ignore-next-line unused-class-member
	connectedCallback(): void {
		this.style.display = 'block'
		this.style.width = '100%'
		this.style.height = '100%'
		this.dataset.ilamyFramework = 'angular'
		if (!this.mounted) {
			this.mounted = mountCalendar(this, this.buildBridgedOptions())
		}
	}

	// fallow-ignore-next-line unused-class-member
	disconnectedCallback(): void {
		this.mounted?.destroy()
		this.mounted = undefined
	}

	// fallow-ignore-next-line unused-class-member
	nextPeriod(): void {
		this.mounted?.controller.nextPeriod()
	}

	// fallow-ignore-next-line unused-class-member
	prevPeriod(): void {
		this.mounted?.controller.prevPeriod()
	}

	// fallow-ignore-next-line unused-class-member
	today(): void {
		this.mounted?.controller.today()
	}

	// fallow-ignore-next-line unused-class-member
	setView(view: string): void {
		this.mounted?.controller.setView(view)
	}

	// fallow-ignore-next-line unused-class-member
	scrollToTime(time: string): void {
		this.mounted?.scrollToTime(time)
	}

	// fallow-ignore-next-line unused-class-member
	refetchEvents(): void {
		this.mounted?.refetchEvents()
	}

	// fallow-ignore-next-line unused-class-member
	refetchResources(): void {
		this.mounted?.refetchResources()
	}

	// fallow-ignore-next-line unused-class-member
	getController(): HeadlessCalendarController | undefined {
		return this.mounted?.controller
	}

	private syncMounted(): void {
		if (!this.mounted) return
		this.mounted.update(this.buildBridgedOptions())
	}

	private buildBridgedOptions(): DomCalendarOptions {
		const opts = this.calendarOptions
		const emit = (name: string, detail: unknown) => {
			this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
		}
		return {
			...opts,
			onEventAdd: (ev) => {
				opts.onEventAdd?.(ev)
				emit('eventAdd', ev)
			},
			onEventUpdate: (ev) => {
				opts.onEventUpdate?.(ev)
				emit('eventUpdate', ev)
			},
			onEventDelete: (ev) => {
				opts.onEventDelete?.(ev)
				emit('eventDelete', ev)
			},
			onEventsChange: (change) => {
				opts.onEventsChange?.(change)
				emit('eventsChange', change)
			},
			onEventClick: (ev) => {
				opts.onEventClick?.(ev)
				emit('eventClick', ev)
			},
			onCellClick: (cell) => {
				opts.onCellClick?.(cell)
				emit('cellClick', cell)
			},
			onRangeSelect: (range) => {
				opts.onRangeSelect?.(range)
				emit('rangeSelect', range)
			},
			onViewChange: (view) => {
				opts.onViewChange?.(view)
				emit('viewChange', view)
			},
			onDateChange: (date, range) => {
				opts.onDateChange?.(date, range)
				emit('dateChange', { date, range })
			},
		}
	}
}

/**
 * Registers the `<ilamy-calendar>` Custom Element (idempotent — safe to call
 * in Angular module/bootstrap code or SSR environments).
 */
export const registerIlamyCalendarElement = (
	tagName = 'ilamy-calendar'
): typeof IlamyCalendarElement => {
	if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
		customElements.define(tagName, IlamyCalendarElement)
	}
	return IlamyCalendarElement
}
