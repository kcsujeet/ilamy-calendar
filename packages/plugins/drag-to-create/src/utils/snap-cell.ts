import { getFractionAlong, getSnapBucket } from '@ilamy/utils/helpers'
import type { RawCell } from './read-cell'
import type { Rect } from './rect'

interface PointerPoint {
	clientX: number
	clientY: number
}

/** The snap-sized slice of a cell, as 0..1 along the cell's time axis. */
interface CellSlice {
	from: number
	to: number
}

/** A cell narrowed to the snap-sized slice a pointer is over. */
export interface SnappedCell extends RawCell {
	slice?: CellSlice
}

/**
 * A cell narrowed to the snap-sized slice of its time axis the pointer is over:
 * the 15 minutes under the pointer in a one-hour cell, for example. A cell that
 * does not name a finer snap is returned as it is.
 */
export const snapCellToPoint = (
	cell: RawCell,
	point: PointerPoint
): SnappedCell => {
	const { snapMinutes, axis } = cell
	if (snapMinutes === undefined || axis === undefined) {
		return cell
	}
	const box = cell.element.getBoundingClientRect()
	const isVertical = axis === 'vertical'
	const pointerAlongAxis = isVertical ? point.clientY : point.clientX
	const cellStart = isVertical ? box.top : box.left
	const cellLength = isVertical ? box.height : box.width
	const fractionIntoCell = getFractionAlong(
		pointerAlongAxis,
		cellStart,
		cellLength
	)
	const cellMinutes = cell.end.diff(cell.start, 'minute')
	const { index: slice, count: sliceCount } = getSnapBucket(
		fractionIntoCell,
		cellMinutes,
		snapMinutes
	)
	const start = cell.start.add(slice * snapMinutes, 'minute')
	return {
		...cell,
		start,
		end: start.add(snapMinutes, 'minute'),
		slice: { from: slice / sliceCount, to: (slice + 1) / sliceCount },
	}
}

/**
 * Where the cell, or the slice of it that was snapped to, is on screen right
 * now. Read from the element each time: the grid scrolls while a selection is
 * held, and a box kept from the press would be stale.
 */
export const getCellBounds = (cell: SnappedCell): Rect => {
	const box = cell.element.getBoundingClientRect()
	const { slice, axis } = cell
	if (!slice) {
		return {
			top: box.top,
			left: box.left,
			width: box.width,
			height: box.height,
		}
	}
	if (axis === 'horizontal') {
		return {
			top: box.top,
			left: box.left + box.width * slice.from,
			width: box.width * (slice.to - slice.from),
			height: box.height,
		}
	}
	return {
		top: box.top + box.height * slice.from,
		left: box.left,
		width: box.width,
		height: box.height * (slice.to - slice.from),
	}
}
