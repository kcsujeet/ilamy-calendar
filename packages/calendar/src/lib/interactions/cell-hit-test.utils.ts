import {
	getFractionAlong,
	getSnapBucket,
	type TimeAxis,
} from '../../utils/helpers'
import {
	add,
	elapsedDiff,
	isAfter,
	parseDate,
	resolveZone,
	type ZonedDate,
} from '../../utils/temporal'
import type { PointerPoint, Rect } from './rect.utils'

/** Parsed DOM cell metadata shared across pointer hit-testing and snapping. */
export interface RawCell {
	start: ZonedDate
	end: ZonedDate
	resourceId?: string
	allDay: boolean
	isAllDaySlot?: boolean
	snapMinutes?: number
	axis?: TimeAxis
	element: HTMLElement
}

/** Normalized fraction bounds within a subdivided time cell. */
export interface CellSlice {
	from: number
	to: number
}

/** Cell refined to an optional sub-slot slice under the pointer. */
export interface SnappedCell extends RawCell {
	slice?: CellSlice
}

/** Normalized date/resource range produced by drag-to-create selection. */
export interface DragSelection {
	start: ZonedDate
	end: ZonedDate
	allDay: boolean
	resourceId?: string
}

/** Entry measured during live binary slot hit-testing inside a column. */
export interface SlotRectEntry<T> {
	data: T
	element: Pick<HTMLElement, 'getBoundingClientRect'>
}

const containsPoint = (rect: DOMRect, point: PointerPoint): boolean =>
	rect.top <= point.clientY &&
	point.clientY <= rect.bottom &&
	rect.left <= point.clientX &&
	point.clientX <= rect.right

const hasMeasuredSize = (rect: DOMRect): boolean =>
	rect.width > 0 || rect.height > 0

const collectMatchingElements = (
	point: PointerPoint,
	selector: string
): HTMLElement[] => {
	let stack: Element[]
	if (typeof document.elementsFromPoint === 'function') {
		stack = document.elementsFromPoint(point.clientX, point.clientY)
	} else {
		const hit = document.elementFromPoint(point.clientX, point.clientY)
		stack = hit ? [hit] : []
	}
	const seen = new Set<HTMLElement>()
	const matches: HTMLElement[] = []
	for (const node of stack) {
		if (!(node instanceof Element)) continue
		const match = node.matches(selector)
			? (node as HTMLElement)
			: node.closest<HTMLElement>(selector)
		if (match && !seen.has(match)) {
			seen.add(match)
			matches.push(match)
		}
	}
	return matches
}

/**
 * Finds the calendar cell element under `point`, disambiguating Blink's
 * `[py, py + 1)` subpixel hit-test bleed and shared integer cell edges so
 * the cell whose rendered box actually contains `point` wins.
 */
export const cellElementAt = (
	point: PointerPoint,
	selector = '[data-start]'
): Element | null => {
	const matches = collectMatchingElements(point, selector)
	if (matches.length === 0) return null

	const measured = matches.map((el) => ({
		el,
		rect: el.getBoundingClientRect(),
	}))
	const anyMeasured = measured.some((entry) => hasMeasuredSize(entry.rect))
	if (!anyMeasured) {
		return matches[0] ?? null
	}

	const containing = measured.filter((entry) =>
		containsPoint(entry.rect, point)
	)
	if (containing.length > 0) {
		return containing.at(-1)?.el ?? null
	}
	return matches[0] ?? null
}

/** Reads calendar metadata attributes from a cell (or its descendant). */
export const readCell = (
	el: Element | null | undefined,
	timezone?: string
): RawCell | null => {
	const cell = el?.closest<HTMLElement>('[data-start]')
	if (!cell || cell.dataset.disabled === 'true') {
		return null
	}
	const startIso = cell.dataset.start
	const endIso = cell.dataset.end
	if (!startIso || !endIso) {
		return null
	}
	const zone = resolveZone(timezone)
	const start = parseDate(startIso, zone)
	const end = parseDate(endIso, zone)
	if (!(start && end)) {
		return null
	}
	const snapMinutes = cell.dataset.snapMinutes
	const axis = cell.dataset.timeAxis
	const isAllDay = cell.dataset.allDay === 'true'
	return {
		start,
		end,
		resourceId: cell.dataset.resourceId,
		allDay: isAllDay,
		isAllDaySlot: isAllDay && cell.dataset.ilamyPart === 'all-day-cell',
		snapMinutes: snapMinutes === undefined ? undefined : Number(snapMinutes),
		axis: axis === 'vertical' || axis === 'horizontal' ? axis : undefined,
		element: cell,
	}
}

/** Narrows a time cell to the `snapMinutes` slice under `point`. */
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

/** Live bounding rectangle for a snapped cell slice or whole cell. */
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

/** Whether `start` and `candidate` stay in the same allDay/resource band. */
export const isSameRegion = (start: RawCell, candidate: RawCell): boolean =>
	start.allDay === candidate.allDay && start.resourceId === candidate.resourceId

/** Builds an ordered `[start, end)` selection range across `a` and `b`. */
export const computeSelectionRange = (
	a: RawCell,
	b: RawCell
): DragSelection => {
	const reversed = isAfter(a.start, b.start)
	const first = reversed ? b : a
	const second = reversed ? a : b
	return {
		start: first.start,
		end: second.end,
		allDay: first.allDay,
		resourceId: first.resourceId,
	}
}

const getEntryRect = <T>(
	slots: Array<SlotRectEntry<T> | undefined>,
	index: number
): DOMRect | undefined => {
	if (index < 0 || index >= slots.length) {
		return undefined
	}
	return slots.at(index)?.element.getBoundingClientRect()
}

/**
 * Binary-searches live measured column slots to find the entry under `pointerY`,
 * attributing 1px gaps and exact shared edges to the earlier slot.
 */
export const findSlotAtPointer = <T>(
	slots: Array<SlotRectEntry<T> | undefined>,
	pointerY: number | undefined
): { slot: T | undefined; rect: DOMRect | undefined } => {
	if (slots.length === 0) {
		return { slot: undefined, rect: undefined }
	}
	const y = pointerY ?? Number.NEGATIVE_INFINITY
	let first = 0
	let last = slots.length - 1
	while (first < last) {
		const middle = Math.ceil((first + last) / 2)
		const middleTop =
			getEntryRect(slots, middle)?.top ?? Number.POSITIVE_INFINITY
		if (middleTop <= y) {
			first = middle
		} else {
			last = middle - 1
		}
	}
	const startsAtPointer = getEntryRect(slots, first)?.top === y
	const earlierBottom = getEntryRect(slots, first - 1)?.bottom ?? Number.NaN
	const index = startsAtPointer && earlierBottom >= y ? first - 1 : first
	return {
		slot: slots.at(index)?.data,
		rect: getEntryRect(slots, index),
	}
}
