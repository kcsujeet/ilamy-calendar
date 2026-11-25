/** @jsxImportSource preact */
import type { RefObject } from 'preact'
import { useLayoutEffect } from 'preact/hooks'

const STICKY_INSET_ATTRIBUTE = 'data-sticky-inset'
const STICKY_INSET_PROPERTY = {
	left: '--ilamy-sticky-left',
	top: '--ilamy-sticky-top',
} as const

const CLIPPING_OVERFLOW = new Set([
	'hidden',
	'scroll',
	'auto',
	'overlay',
	'clip',
])

const findClippingAncestors = (root: HTMLElement): HTMLElement[] => {
	const ancestors: HTMLElement[] = []
	for (let el = root.parentElement; el; el = el.parentElement) {
		const { overflowX, overflowY } = getComputedStyle(el)
		if (CLIPPING_OVERFLOW.has(overflowX) || CLIPPING_OVERFLOW.has(overflowY)) {
			ancestors.push(el)
		}
	}
	return ancestors
}

const measureStickyInsets = (
	root: HTMLElement,
	viewport: HTMLElement,
	clippingAncestors: HTMLElement[]
): { left: number; top: number } => {
	const viewportRect = viewport.getBoundingClientRect()
	const insets = { left: -viewportRect.left, top: -viewportRect.top }

	for (const ancestor of clippingAncestors) {
		const rect = ancestor.getBoundingClientRect()
		insets.left = Math.max(insets.left, rect.left - viewportRect.left)
		insets.top = Math.max(insets.top, rect.top - viewportRect.top)
	}

	for (const element of root.querySelectorAll<HTMLElement>(
		`[${STICKY_INSET_ATTRIBUTE}]`
	)) {
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
 * Publishes `--ilamy-sticky-left` and `--ilamy-sticky-top` CSS custom properties
 * on the scroll viewport so sticky content inside spanning event bars clears
 * sticky headers, sticky gutters, and outer scroll ancestors.
 */
export const useStickyInsets = (
	viewportRef: RefObject<HTMLElement | null>,
	remeasureKey: string
): void => {
	// biome-ignore lint/correctness/useExhaustiveDependencies: remeasureKey intentionally triggers re-subscription when grid headers/gutters change
	useLayoutEffect(() => {
		const viewport = viewportRef.current
		if (!viewport) return
		const root = viewport.closest<HTMLElement>('[data-ilamy-root]') ?? viewport
		const clippingAncestors = findClippingAncestors(root)

		const publish = () => {
			const insets = measureStickyInsets(root, viewport, clippingAncestors)
			viewport.style.setProperty(STICKY_INSET_PROPERTY.left, `${insets.left}px`)
			viewport.style.setProperty(STICKY_INSET_PROPERTY.top, `${insets.top}px`)
		}
		publish()

		let pendingFrame: number | undefined
		const schedulePublish = () => {
			if (pendingFrame !== undefined) return
			pendingFrame = requestAnimationFrame(() => {
				pendingFrame = undefined
				publish()
			})
		}

		const scrollers: Array<HTMLElement | Window> = [
			...clippingAncestors,
			window,
		]
		for (const scroller of scrollers) {
			scroller.addEventListener('scroll', schedulePublish, { passive: true })
		}
		window.addEventListener('resize', schedulePublish, { passive: true })

		const observer =
			typeof ResizeObserver === 'undefined'
				? undefined
				: new ResizeObserver(publish)
		observer?.observe(viewport)
		for (const el of root.querySelectorAll(`[${STICKY_INSET_ATTRIBUTE}]`)) {
			observer?.observe(el)
		}

		return () => {
			for (const scroller of scrollers) {
				scroller.removeEventListener('scroll', schedulePublish)
			}
			window.removeEventListener('resize', schedulePublish)
			observer?.disconnect()
			if (pendingFrame !== undefined) {
				cancelAnimationFrame(pendingFrame)
			}
		}
	}, [viewportRef, remeasureKey])
}
