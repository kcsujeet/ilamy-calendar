import { getFractionAlong, getSnapBucket } from '@ilamy/utils/helpers'
import { add, elapsedDiff } from '@ilamy/utils/temporal'
import type { RawCell } from './read-cell'
import type { Rect } from './rect'

interface PointerPoint {
	clientX: number
	clientY: number
}

interface CellSlice {
	from: number
	to: number
}

export interface SnappedCell extends RawCell {
	slice?: CellSlice
}

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
	const cellMinutes = elapsedDiff(cell.end, cell.start, 'minute')
	const { index: slice, count: sliceCount } = getSnapBucket(
		fractionIntoCell,
		cellMinutes,
		snapMinutes
	)
	const start = add(cell.start, slice * snapMinutes, 'minute')
	return {
		...cell,
		start,
		end: add(start, snapMinutes, 'minute'),
		slice: { from: slice / sliceCount, to: (slice + 1) / sliceCount },
	}
}

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
