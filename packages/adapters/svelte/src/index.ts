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
import type { Action, ActionReturn } from 'svelte/action'
import type { Attachment } from 'svelte/attachments'
import { createSubscriber } from 'svelte/reactivity'

export interface SvelteIlamyCalendarHandle extends HeadlessCalendarActions {
	readonly state: HeadlessCalendarState
	readonly currentDate: HeadlessCalendarState['currentDate']
	readonly view: HeadlessCalendarState['view']
	readonly events: HeadlessCalendarState['events']
	readonly resources: HeadlessCalendarState['resources']
	readonly visibleRange: HeadlessCalendarState['visibleRange']
	readonly controller: HeadlessCalendarController
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
	options: DomCalendarOptions = {}
): Attachment<HTMLElement> => {
	return (element) => {
		element.dataset.ilamyFramework = 'svelte'
		const mounted = mountCalendar(element, options)
		return () => {
			mounted.destroy()
		}
	}
}

/**
 * Svelte Action (`<div use:ilamyCalendarAction={options} />`) with reactive
 * in-place `update(nextOptions)` without unmounting the calendar DOM.
 */
export const ilamyCalendarAction: Action<HTMLElement, DomCalendarOptions> = (
	node,
	options = {}
): ActionReturn<DomCalendarOptions> => {
	node.dataset.ilamyFramework = 'svelte'
	const mounted = mountCalendar(node, options)
	return {
		update(nextOptions = {}) {
			mounted.update(nextOptions)
		},
		destroy() {
			mounted.destroy()
		},
	}
}

/** Direct imperative mount helper for Svelte 5 `$effect` blocks. */
export const mountIlamyCalendar = (
	element: HTMLElement,
	options: DomCalendarOptions = {}
): MountedCalendar => {
	element.dataset.ilamyFramework = 'svelte'
	return mountCalendar(element, options)
}

export type {
	DomCalendarEvent,
	DomCalendarEventInput,
	DomCalendarOptions,
	DomEventFormRenderContext,
	DomEventRenderContext,
	DomHeaderRenderContext,
	DomResourceRenderContext,
	MountedCalendar,
} from '@ilamy/dom'
