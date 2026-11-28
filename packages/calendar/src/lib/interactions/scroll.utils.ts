const SCROLLABLE_OVERFLOW = new Set(['auto', 'scroll', 'overlay'])

const isScrollable = (el: HTMLElement): boolean => {
	const style = getComputedStyle(el)
	const scrollsY =
		SCROLLABLE_OVERFLOW.has(style.overflowY) &&
		el.scrollHeight > el.clientHeight
	const scrollsX =
		SCROLLABLE_OVERFLOW.has(style.overflowX) && el.scrollWidth > el.clientWidth
	return scrollsY || scrollsX
}

/** Nearest scrollable ancestor of `start`, or `null` when none scrolls. */
export const findScrollContainer = (
	start: Element | null
): HTMLElement | null => {
	let node = start instanceof HTMLElement ? start : null
	while (node) {
		if (isScrollable(node)) {
			return node
		}
		node = node.parentElement
	}
	return null
}
