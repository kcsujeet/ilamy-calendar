import {
	getCellMinutes,
	getSnapBucket,
	resolveSnapDuration,
	type TimeAxis,
} from '@ilamy/utils/helpers'

/** What snapping needs to know about a cell, whatever else it carries. */
export interface SnappableCell {
	/** Present on a cell of an hour grid; a day cell has none. */
	hour?: number
	minute?: number
	/**
	 * Length of the slot a cell with a `minute` covers. An hour cell (no
	 * `minute`) is always an hour, and a day cell has no slot.
	 */
	slotDurationMinutes?: number
	/** The size a drag, resize or selection snaps to inside this cell. */
	snapMinutes?: number
	/** The axis time runs along in the grid that drew this cell. */
	axis?: TimeAxis
}

/** Whether a drag snaps to something finer than the time cell itself. */
export const hasFinerSnapThanCell = (cell: SnappableCell): boolean => {
	if (cell.hour === undefined) {
		return false
	}
	const cellMinutes = getCellMinutes(cell.minute, cell.slotDurationMinutes)
	const snapMinutes = resolveSnapDuration(cell.snapMinutes, cellMinutes)
	return snapMinutes < cellMinutes
}

/**
 * The snap-sized piece of a time cell that a pointer `fractionIntoCell` (0..1)
 * along the cell's time axis is over, as a cell of its own. FullCalendar snaps
 * the hit to `snapDuration` within the slot (`TimeGridCols.tsx:163`, v7.1.1).
 * A cell with no finer snap, or a day cell, is returned as it is.
 */
export const snapDropCell = <Cell extends SnappableCell>(
	cell: Cell,
	fractionIntoCell: number
): Cell => {
	if (!hasFinerSnapThanCell(cell)) {
		return cell
	}
	const cellMinutes = getCellMinutes(cell.minute, cell.slotDurationMinutes)
	const snapMinutes = resolveSnapDuration(cell.snapMinutes, cellMinutes)
	const { index } = getSnapBucket(fractionIntoCell, cellMinutes, snapMinutes)
	const minute = (cell.minute ?? 0) + index * snapMinutes
	return { ...cell, minute, slotDurationMinutes: snapMinutes }
}
