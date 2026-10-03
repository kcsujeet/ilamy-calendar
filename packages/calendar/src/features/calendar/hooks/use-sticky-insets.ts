import { type RefObject, useLayoutEffect } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { keys } from '@/features/calendar/utils/keys'

/**
 * Marks a grid's own sticky column (`left`) or header (`top`). Set it only
 * while the element actually sticks: a header that scrolls away covers
 * nothing, so it must not push anything down.
 */
const STICKY_INSET_ATTRIBUTE = 'data-sticky-inset'

export type StickyInsetSide = 'left' | 'top'

/** A view header marks itself only while it sticks; one that scrolls away covers nothing. */
export const getHeaderStickyInset = (
	isSticky: boolean
): StickyInsetSide | undefined => (isSticky ? 'top' : undefined)

/**
 * The CSS custom properties a grid publishes on its scroll viewport. Anything
 * sticky inside the grid offsets itself by these to reach the first pixel the
 * reader can actually see: past the grid's own sticky column and header,
 * which share the scroller with the events (a title at `left: 0` would stick
 * UNDER the resource column), and past whatever hides the grid from outside.
 */
const STICKY_INSET_PROPERTY = {
	left: '--ilamy-sticky-left',
	top: '--ilamy-sticky-top',
} as const satisfies Record<StickyInsetSide, string>

/**
 * `overflow` values that clip what is outside an element's box. `clip` hides
 * as surely as `hidden` does, so it counts here even though it is not a
 * scroll container (https://developer.mozilla.org/en-US/docs/Web/CSS/overflow).
 */
const CLIPPING_OVERFLOW = new Set([
	'hidden',
	'scroll',
	'auto',
	'overlay',
	'clip',
])

/**
 * The ancestors that can hide part of the grid when they scroll, innermost
 * first. Found once per subscription: walking them reads computed style,
 * which is too costly to repeat on every scroll event.
 */
const findClippingAncestors = (root: HTMLElement): HTMLElement[] => {
	const ancestors: HTMLElement[] = []
	for (
		let element = root.parentElement;
		element;
		element = element.parentElement
	) {
		const { overflowX, overflowY } = getComputedStyle(element)
		if (CLIPPING_OVERFLOW.has(overflowX) || CLIPPING_OVERFLOW.has(overflowY)) {
			ancestors.push(element)
		}
	}
	return ancestors
}

/**
 * How far into its viewport, from the top and from the left, the grid is
 * hidden from the reader. Three things hide it, and the furthest one wins:
 *
 * - The grid's own sticky column and header (`data-sticky-inset`), inside
 *   the viewport or, for a regular grid's header, just outside it.
 * - That outside header once `stickyViewHeader` pins it to the window: a page
 *   scrolled past the grid's top slides the events under it. Its far edge,
 *   measured from the viewport, is exactly how far it reaches in.
 * - The window and every clipping ancestor: a grid scrolled partly out of
 *   them is hidden above and left of their edges.
 *
 * Measured as positions against the viewport's own edges. A sticky element
 * inside the viewport stays pinned to those edges however far the grid
 * itself is scrolled, so only a scroll OUTSIDE the grid moves the answer.
 */
const measureStickyInsets = (
	root: HTMLElement,
	viewport: HTMLElement,
	clippingAncestors: HTMLElement[]
): Record<StickyInsetSide, number> => {
	const viewportRect = viewport.getBoundingClientRect()
	// The window's own top-left edge, at 0 in viewport coordinates.
	const insets = { left: -viewportRect.left, top: -viewportRect.top }

	for (const ancestor of clippingAncestors) {
		const rect = ancestor.getBoundingClientRect()
		insets.left = Math.max(insets.left, rect.left - viewportRect.left)
		insets.top = Math.max(insets.top, rect.top - viewportRect.top)
	}

	const marked = root.querySelectorAll<HTMLElement>(
		`[${STICKY_INSET_ATTRIBUTE}]`
	)
	for (const element of marked) {
		const side = element.getAttribute(STICKY_INSET_ATTRIBUTE)
		const rect = element.getBoundingClientRect()
		if (side === 'left') {
			insets.left = Math.max(insets.left, rect.right - viewportRect.left)
		}
		if (side === 'top') {
			insets.top = Math.max(insets.top, rect.bottom - viewportRect.top)
		}
	}

	return { left: Math.max(0, insets.left), top: Math.max(0, insets.top) }
}

/**
 * Publishes the grid's sticky insets on its viewport as CSS custom properties,
 * and keeps them current as the marked elements resize (an all-day row that
 * grows, a resource column at a new breakpoint) and as anything around the
 * grid scrolls (the page under a pinned header, a scrolling panel).
 *
 * `rootRef` is the whole grid, a regular grid's header included; `viewportRef`
 * is its scroll viewport, which the properties are set on.
 *
 * `laneCount` is how many rows or columns the grid draws. The marked elements
 * are replaced when it, the view, the date or `stickyViewHeader` changes, and
 * a ResizeObserver never hears about an element that mounted after it
 * subscribed, so any of them re-subscribes.
 */
export const useStickyInsets = (
	rootRef: RefObject<HTMLElement | null>,
	viewportRef: RefObject<HTMLElement | null>,
	laneCount: number
) => {
	const { currentDate, view, stickyViewHeader } = useSmartCalendarContext(
		(state) => ({
			currentDate: state.currentDate,
			view: state.view,
			stickyViewHeader: state.stickyViewHeader,
		})
	)
	const remeasureKey = keys.stickyInsets(
		view,
		currentDate,
		stickyViewHeader,
		laneCount
	)

	// Layout effect: the offsets must land before the first paint, or a title
	// already scrolled past renders under the column for a frame.
	// biome-ignore lint/correctness/useExhaustiveDependencies: remeasureKey is read by nothing inside; re-running on it is its whole job, re-subscribing to elements that replaced the observed ones.
	useLayoutEffect(() => {
		const root = rootRef.current
		const viewport = viewportRef.current
		if (!root || !viewport) {
			return
		}
		const clippingAncestors = findClippingAncestors(root)

		const publish = () => {
			const insets = measureStickyInsets(root, viewport, clippingAncestors)
			viewport.style.setProperty(STICKY_INSET_PROPERTY.left, `${insets.left}px`)
			viewport.style.setProperty(STICKY_INSET_PROPERTY.top, `${insets.top}px`)
		}
		publish()

		// Coalesced to one measurement per frame. A frame requested from a
		// scroll event runs before that frame paints, so the title never trails.
		let pendingFrame: number | undefined
		const schedulePublish = () => {
			if (pendingFrame !== undefined) {
				return
			}
			pendingFrame = requestAnimationFrame(() => {
				pendingFrame = undefined
				publish()
			})
		}
		const outerScrollers: Array<HTMLElement | Window> = [
			...clippingAncestors,
			window,
		]
		for (const scroller of outerScrollers) {
			scroller.addEventListener('scroll', schedulePublish, { passive: true })
		}
		window.addEventListener('resize', schedulePublish, { passive: true })

		const observer =
			typeof ResizeObserver === 'undefined'
				? undefined
				: new ResizeObserver(publish)
		observer?.observe(viewport)
		for (const element of root.querySelectorAll(
			`[${STICKY_INSET_ATTRIBUTE}]`
		)) {
			observer?.observe(element)
		}

		return () => {
			for (const scroller of outerScrollers) {
				scroller.removeEventListener('scroll', schedulePublish)
			}
			window.removeEventListener('resize', schedulePublish)
			observer?.disconnect()
			if (pendingFrame !== undefined) {
				cancelAnimationFrame(pendingFrame)
			}
		}
	}, [rootRef, viewportRef, remeasureKey])
}
