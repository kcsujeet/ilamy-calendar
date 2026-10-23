import {
	type ClientRect,
	type CollisionDetection,
	type DroppableContainer,
	pointerWithin,
} from '@dnd-kit/core'

/**
 * `pointerWithin`, answering the same question with fewer reads, and refusing
 * a cell that is no longer where dnd-kit measured it.
 *
 * dnd-kit's `Rect` recomputes each edge from the live scroll offsets of every
 * scrollable ancestor whenever it is read, and `pointerWithin` reads all four
 * edges of every droppable on every pointer move. A grid has thousands of
 * cells, so that was most of a move's cost. Testing the edges one at a time
 * rules almost every cell out after one or two reads; the few that remain go
 * to `pointerWithin` itself, so which cells hit, and how they rank, is exactly
 * what it would have returned.
 *
 * Those same scroll offsets are wrong for a sticky element, which does not
 * scroll with its container: turn the wheel 120px during a drag and the sticky
 * all-day strip is measured 120px below where it is drawn, over a pointer that
 * is in fact on a time slot. Ranking by distance to the corners, a strip that
 * small beat a time column 1463px tall. So each remaining cell is checked once
 * more against where its element is drawn now.
 */
export const pointerWithinLazily: CollisionDetection = (args) => {
	const { droppableContainers, droppableRects, pointerCoordinates } = args
	if (!pointerCoordinates) {
		return []
	}
	const { x, y } = pointerCoordinates
	// Edge by edge, so a cell is ruled out on its first failing edge.
	const containsPointer = (rect: ClientRect | DOMRect) => {
		const isBelowTop = rect.top <= y
		if (!isBelowTop) {
			return false
		}
		const isAboveBottom = y <= rect.bottom
		if (!isAboveBottom) {
			return false
		}
		const isRightOfLeft = rect.left <= x
		if (!isRightOfLeft) {
			return false
		}
		const isLeftOfRight = x <= rect.right
		return isLeftOfRight
	}
	const isDrawnUnderPointer = (container: DroppableContainer) => {
		const drawnRect = container.node.current?.getBoundingClientRect()
		return drawnRect !== undefined && containsPointer(drawnRect)
	}
	const hits = droppableContainers.filter((container) => {
		const rect = droppableRects.get(container.id)
		return (
			rect !== undefined &&
			containsPointer(rect) &&
			isDrawnUnderPointer(container)
		)
	})
	return pointerWithin({ ...args, droppableContainers: hits })
}
