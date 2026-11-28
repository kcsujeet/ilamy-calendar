import { type Component, mount, unmount } from 'svelte'
import type { Action, ActionReturn } from 'svelte/action'
import type { Attachment } from 'svelte/attachments'
import { createSubscriber } from 'svelte/reactivity'
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

export interface SvelteIlamyCalendarHandle extends HeadlessCalendarActions {
	readonly state: HeadlessCalendarState
	readonly currentDate: HeadlessCalendarState['currentDate']
	readonly view: HeadlessCalendarState['view']
	readonly events: HeadlessCalendarState['events']
	readonly resources: HeadlessCalendarState['resources']
	readonly visibleRange: HeadlessCalendarState['visibleRange']
	readonly controller: HeadlessCalendarController
}

/** Svelte 5 region slot components or `SlotMount` objects keyed by region name. */
export type SvelteCalendarSlots = Partial<{
	[K in SlotName]: Component<SlotContextMap[K]> | SlotMount<SlotContextMap[K]>
}>

/** Svelte calendar mount options accepting Svelte components or `SlotMount` entries. */
export interface SvelteCalendarOptions extends Omit<
	DomCalendarOptions,
	'slots'
> {
	slots?: SvelteCalendarSlots | CalendarSlots
	context?: Map<unknown, unknown>
}

const SLOT_NAMES: readonly SlotName[] = [
	'header',
	'event',
	'resource',
	'eventForm',
	'moreEventsDialog',
	'recurrenceScopeDialog',
]

const isSlotMount = <P>(entry: unknown): entry is SlotMount<P> =>
	typeof entry === 'object' && entry !== null && 'mount' in entry

/**
 * Wraps a Svelte 5 component into a framework-agnostic `SlotMount` backed by
 * `createSubscriber` so Preact context updates refresh Svelte `$props()` in place
 * without unmounting or losing focus.
 */
export const createSvelteSlotMount = <P extends object>(
	SlotComponent: Component<P & Record<string, never>>,
	context?: Map<unknown, unknown>
): SlotMount<P> => ({
	mount: (host, initialProps) => {
		let currentProps = initialProps
		let notifyUpdate: (() => void) | undefined

		const subscribe = createSubscriber((update) => {
			notifyUpdate = update
			return () => {
				notifyUpdate = undefined
			}
		})

		const reactiveProps = {} as P & Record<string, never>
		const registeredKeys = new Set<string>()

		const defineGetter = (key: string) => {
			if (registeredKeys.has(key)) return
			registeredKeys.add(key)
			Object.defineProperty(reactiveProps, key, {
				enumerable: true,
				configurable: true,
				get: () => {
					subscribe()
					return (currentProps as Record<string, unknown>)[key]
				},
			})
		}

		for (const key of Object.keys(initialProps)) {
			defineGetter(key)
		}

		const instance = mount(SlotComponent, {
			target: host,
			props: reactiveProps,
			context,
		})

		return {
			update: (nextProps) => {
				for (const key of Object.keys(nextProps)) {
					defineGetter(key)
				}
				currentProps = nextProps
				notifyUpdate?.()
			},
			destroy: () => {
				void unmount(instance)
			},
		}
	},
})

interface CachedSvelteSlot<K extends SlotName = SlotName> {
	raw: Component<SlotContextMap[K]> | SlotMount<SlotContextMap[K]>
	context: Map<unknown, unknown> | undefined
	slotMount: SlotMount<SlotContextMap[K]>
}

const assignResolvedSlot = <K extends SlotName>(
	name: K,
	slots: SvelteCalendarSlots | CalendarSlots,
	cache: Map<SlotName, CachedSvelteSlot>,
	context: Map<unknown, unknown> | undefined,
	mapped: CalendarSlots
): void => {
	const entry = slots[name]
	if (!entry) {
		cache.delete(name)
		return
	}
	if (isSlotMount<SlotContextMap[K]>(entry)) {
		Object.assign(mapped, { [name]: entry })
		return
	}
	const cached = cache.get(name)
	if (cached && cached.raw === entry && cached.context === context) {
		Object.assign(mapped, { [name]: cached.slotMount })
		return
	}
	const slotMount = createSvelteSlotMount<SlotContextMap[K]>(
		entry as Component<SlotContextMap[K]>,
		context
	)
	cache.set(name, {
		raw: entry as Component<SlotContextMap[SlotName]>,
		context,
		slotMount: slotMount as SlotMount<SlotContextMap[SlotName]>,
	})
	Object.assign(mapped, { [name]: slotMount })
}

const createSvelteSlotResolver = () => {
	const cache = new Map<SlotName, CachedSvelteSlot>()

	const resolve = (
		slots: SvelteCalendarOptions['slots'],
		context: Map<unknown, unknown> | undefined
	): CalendarSlots | undefined => {
		if (!slots) {
			cache.clear()
			return undefined
		}
		const mapped: CalendarSlots = {}
		for (const name of SLOT_NAMES) {
			assignResolvedSlot(name, slots, cache, context, mapped)
		}
		return mapped
	}

	return { resolve, clear: () => cache.clear() }
}

const toDomOptions = (
	options: Partial<SvelteCalendarOptions>,
	resolver: ReturnType<typeof createSvelteSlotResolver>
): Partial<DomCalendarOptions> => {
	const { slots, context, ...rest } = options
	const dom: Partial<DomCalendarOptions> = { ...rest }
	if ('slots' in options) {
		dom.slots = resolver.resolve(slots, context)
	}
	return dom
}

/**
 * Svelte 5 reactive headless calendar primitive powered by `createSubscriber`
 * from `svelte/reactivity`. Reading `.state`, `.events`, `.view`, or `.currentDate`
 * inside `$derived` or `$effect` automatically subscribes and cleans up.
 */
export const createIlamyCalendar = (
	options: HeadlessCalendarOptions = {}
): SvelteIlamyCalendarHandle => {
	const controller = createCalendarController(options)
	const subscribe = createSubscriber((update) => controller.subscribe(update))

	const readState = (): HeadlessCalendarState => {
		subscribe()
		return controller.getState()
	}

	return {
		...pickControllerActions(controller),
		get state() {
			return readState()
		},
		get currentDate() {
			return readState().currentDate
		},
		get view() {
			return readState().view
		},
		get events() {
			return readState().events
		},
		get resources() {
			return readState().resources
		},
		get visibleRange() {
			return readState().visibleRange
		},
		controller,
	}
}

/**
 * Svelte 5 Attachment (`<div {@attach ilamyCalendar(options)} />`).
 * Mounts the full-parity `@ilamy/calendar` UI onto the element and tears down cleanly.
 */
export const ilamyCalendar = (
	options: SvelteCalendarOptions = {}
): Attachment<HTMLElement> => {
	return (element) => {
		element.dataset.ilamyFramework = 'svelte'
		const resolver = createSvelteSlotResolver()
		const mounted = mountCalendar(element, toDomOptions(options, resolver))
		return () => {
			resolver.clear()
			mounted.destroy()
		}
	}
}

/**
 * Svelte Action (`<div use:ilamyCalendarAction={options} />`) with reactive
 * in-place `update(nextOptions)` without unmounting the calendar DOM or slots.
 */
export const ilamyCalendarAction: Action<HTMLElement, SvelteCalendarOptions> = (
	node,
	options = {}
): ActionReturn<SvelteCalendarOptions> => {
	node.dataset.ilamyFramework = 'svelte'
	const resolver = createSvelteSlotResolver()
	const mounted = mountCalendar(node, toDomOptions(options, resolver))
	return {
		update(nextOptions = {}) {
			mounted.update(toDomOptions(nextOptions, resolver))
		},
		destroy() {
			resolver.clear()
			mounted.destroy()
		},
	}
}

export interface MountedSvelteCalendar extends Omit<MountedCalendar, 'update'> {
	update: (nextOptions: Partial<SvelteCalendarOptions>) => void
}

/** Direct imperative mount helper for Svelte 5 `$effect` / `onMount` blocks. */
export const mountIlamyCalendar = (
	element: HTMLElement,
	options: SvelteCalendarOptions = {}
): MountedSvelteCalendar => {
	element.dataset.ilamyFramework = 'svelte'
	const resolver = createSvelteSlotResolver()
	const mounted = mountCalendar(element, toDomOptions(options, resolver))
	return {
		...mounted,
		update: (nextOptions) => {
			mounted.update(toDomOptions(nextOptions, resolver))
		},
		destroy: () => {
			resolver.clear()
			mounted.destroy()
		},
	}
}
