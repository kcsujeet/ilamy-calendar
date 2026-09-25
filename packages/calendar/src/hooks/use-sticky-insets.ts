import { type RefObject, useLayoutEffect } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { keys } from '@/lib/utils/keys'

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
 * sticky inside the grid offsets itself by these to clear the grid's own
 * sticky column and header, which share the scroller with the events: a title
 * at `left: 0` would stick UNDER the resource column, not beside it.
 */
const STICKY_INSET_PROPERTY = {
	left: '--ilamy-sticky-left',
	top: '--ilamy-sticky-top',
} as const satisfies Record<StickyInsetSide, string>

/**
 * How far the grid's sticky elements reach into its viewport on each side:
 * the widest marked column and the tallest marked header. Sizes rather than
 * positions, so the answer does not depend on where the grid is scrolled.
 */
const measureStickyInsets = (
	viewport: HTMLElement
): Record<StickyInsetSide, number> => {
	const insets = { left: 0, top: 0 }
	const marked = viewport.querySelectorAll<HTMLElement>(
		`[${STICKY_INSET_ATTRIBUTE}]`
	)
	for (const element of marked) {
		const side = element.getAttribute(STICKY_INSET_ATTRIBUTE)
		const rect = element.getBoundingClientRect()
		if (side === 'left') {
			insets.left = Math.max(insets.left, rect.width)
		}
		if (side === 'top') {
			insets.top = Math.max(insets.top, rect.height)
		}
	}
	return insets
}

/**
 * Publishes the grid's sticky insets on its viewport as CSS custom properties,
 * and keeps them current as the marked elements resize (an all-day row that
 * grows, a resource column at a new breakpoint).
 *
 * `laneCount` is how many rows or columns the grid draws. The marked elements
 * are replaced when it, the view, the date or `stickyViewHeader` changes, and
 * a ResizeObserver never hears about an element that mounted after it
 * subscribed, so any of them re-subscribes.
 */
export const useStickyInsets = (
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
		const viewport = viewportRef.current
		if (!viewport) {
			return
		}

		const publish = () => {
			const insets = measureStickyInsets(viewport)
			viewport.style.setProperty(STICKY_INSET_PROPERTY.left, `${insets.left}px`)
			viewport.style.setProperty(STICKY_INSET_PROPERTY.top, `${insets.top}px`)
		}
		publish()

		if (typeof ResizeObserver === 'undefined') {
			return
		}
		const observer = new ResizeObserver(publish)
		observer.observe(viewport)
		const marked = viewport.querySelectorAll(`[${STICKY_INSET_ATTRIBUTE}]`)
		for (const element of marked) {
			observer.observe(element)
		}
		return () => observer.disconnect()
	}, [viewportRef, remeasureKey])
}
