/** Viewport-relative bounding box matching DOMRect geometry fields. */
export interface Rect {
	top: number
	left: number
	width: number
	height: number
}

/** Pointer coordinates in client viewport pixels. */
export interface PointerPoint {
	clientX: number
	clientY: number
}

/** Configuration for container edge auto-scroll during an active drag. */
export interface EdgeScrollOptions {
	/** Distance (px) from a container edge that triggers auto-scroll. */
	edge: number
	/** Scroll step (px) applied per animation frame while in the edge zone. */
	speed: number
	/** Axis lock for auto-scroll ('y', 'x', or 'both'). Default 'both'. */
	axis?: 'x' | 'y' | 'both'
}

const DEFAULT_THRESHOLD_PX = 2

/** Whether pointer displacement `(dx, dy)` meets or exceeds `min` pixels. */
export const exceedsThreshold = (
	dx: number,
	dy: number,
	min: number = DEFAULT_THRESHOLD_PX
): boolean => min <= 0 || Math.hypot(dx, dy) >= min

/** Smallest rectangle enclosing both `a` and `b`. */
export const unionRect = (a: Rect, b: Rect): Rect => {
	const top = Math.min(a.top, b.top)
	const left = Math.min(a.left, b.left)
	const right = Math.max(a.left + a.width, b.left + b.width)
	const bottom = Math.max(a.top + a.height, b.top + b.height)
	return { top, left, width: right - left, height: bottom - top }
}

/** Overlapping area of `a` and `b`, or `null` when disjoint or edge-touching. */
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

/** Computes per-frame edge auto-scroll deltas for a pointer near `rect` edges. */
export const computeEdgeScroll = (
	point: PointerPoint,
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
	return {
		x: axis === 'y' ? 0 : x,
		y: axis === 'x' ? 0 : y,
	}
}
