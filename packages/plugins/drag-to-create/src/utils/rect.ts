/** A viewport-relative rectangle (the shape of a DOMRect's box). */
export interface Rect {
	top: number
	left: number
	width: number
	height: number
}

/** The bounding box that encloses both rects (the mirror spans start..last cell). */
export const unionRect = (a: Rect, b: Rect): Rect => {
	const top = Math.min(a.top, b.top)
	const left = Math.min(a.left, b.left)
	const right = Math.max(a.left + a.width, b.left + b.width)
	const bottom = Math.max(a.top + a.height, b.top + b.height)
	return { top, left, width: right - left, height: bottom - top }
}

/**
 * The overlapping rect of `a` and `b`, or null when they don't overlap (touching
 * edges count as no overlap, zero area). Used to clip the mirror to the calendar
 * body so the overlay never paints outside the (possibly scrolled) calendar.
 */
export const intersectRect = (a: Rect, b: Rect): Rect | null => {
	const top = Math.max(a.top, b.top)
	const left = Math.max(a.left, b.left)
	const right = Math.min(a.left + a.width, b.left + b.width)
	const bottom = Math.min(a.top + a.height, b.top + b.height)
	const width = right - left
	const height = bottom - top
	if (width <= 0 || height <= 0) {
		return null
	}
	return { top, left, width, height }
}
