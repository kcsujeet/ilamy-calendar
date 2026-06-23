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

export interface EdgeScrollOptions {
	/** Distance (px) from a container edge that triggers auto-scroll. */
	edge: number
	/** Scroll step (px) applied per animation frame while in the edge zone. */
	speed: number
	/**
	 * Axis the scroll is locked to. 'y' zeroes horizontal scroll, 'x' zeroes
	 * vertical, 'both' (default) allows either. Locks a resource grid to the axis
	 * its resources lay out on so a drag can't scroll across resources.
	 */
	axis?: 'x' | 'y' | 'both'
}

/**
 * Per-axis scroll step for a pointer near a scroll container's edges, so a drag
 * can extend past the visible area. `{ x: 0, y: 0 }` when the pointer is away
 * from every edge. Negative scrolls up/left, positive down/right; works on both
 * axes (vertical time grids and horizontal resource grids).
 */
export const computeEdgeScroll = (
	point: { clientX: number; clientY: number },
	rect: Rect,
	opts: EdgeScrollOptions
): { x: number; y: number } => {
	let x = 0
	let y = 0
	if (point.clientY < rect.top + opts.edge) {
		y = -opts.speed
	} else if (point.clientY > rect.top + rect.height - opts.edge) {
		y = opts.speed
	}
	if (point.clientX < rect.left + opts.edge) {
		x = -opts.speed
	} else if (point.clientX > rect.left + rect.width - opts.edge) {
		x = opts.speed
	}
	const axis = opts.axis ?? 'both'
	const lockedX = axis === 'y' ? 0 : x
	const lockedY = axis === 'x' ? 0 : y
	return { x: lockedX, y: lockedY }
}
