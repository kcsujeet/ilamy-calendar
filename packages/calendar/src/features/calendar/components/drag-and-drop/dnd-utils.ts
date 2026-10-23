import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { getCellMinutes, getFractionAlong } from '@ilamy/utils/helpers'
import {
	type GrabOffset,
	NO_GRAB_OFFSET,
} from '@/features/calendar/utils/grab-offset'
import {
	hasFinerSnapThanCell,
	type SnappableCell,
	snapDropCell,
} from '@/features/calendar/utils/snap-drop-cell'
import { atTimeOfDay } from '@/utils/date-utils'

export interface DropCellData extends SnappableCell {
	type?: string
	date?: Dayjs
	resourceId?: string | number
	allDay?: boolean
	/**
	 * Whether this cell refuses drops. A disabled cell is still REGISTERED as a
	 * droppable so the pointer can be released there and the drag keeps a
	 * preview to refuse; validity is decided from it, the way FullCalendar
	 * separates "where would this land" from "is that allowed" (`eventAllow`,
	 * and the `fc-not-allowed` class it puts on the body).
	 */
	disabled?: boolean
}

type ResourceId = string | number

/**
 * An hour grid publishes the slot's `hour` on every cell it registers; a day
 * grid (month, all-day band) leaves it undefined. That, not the `type` field,
 * is what separates "dropped on a time slot" from "dropped on a day" — every
 * cell reports `type: 'day-cell'` (`grid-cell.tsx`), so branching on the type
 * silently sent hour-grid drops down the day path and discarded the hour.
 */
export const isTimeSlotDrop = (data: DropCellData): boolean =>
	data.hour !== undefined

/** The pointer's position in the viewport, as `clientX`/`clientY` report it. */
export interface Pointer {
	x: number
	y: number
}

/** A slot of a time column: what a drop reads from it, and the element it is drawn as. */
export interface DropSlot {
	data: DropCellData
	element: Pick<HTMLElement, 'getBoundingClientRect'>
}

/**
 * What a time column registers with dnd-kit: its slots, row after row. The
 * slot cells fill the array in themselves.
 *
 * One drop target per column, not one per slot, because dnd-kit copies its
 * whole droppable registry on every registration: a droppable per slot made
 * mounting a resource week O(slots²), 7 s for the 20,000 slots of 30 resources
 * at 15 minutes. The slot under the pointer is found from where the slots are
 * drawn instead (`findSlotInColumn`).
 */
export interface DropColumnData {
	slots: Array<DropSlot | undefined>
}

/** The box of a drop target. */
interface DropRect {
	top: number
	left: number
	width: number
	height: number
}

const isDropColumn = (
	data: DropCellData | DropColumnData
): data is DropColumnData => 'slots' in data

/** `cell`, narrowed to the snap-sized piece of `rect` that the pointer is over. */
const snapWithinCell = (
	cell: DropCellData | undefined,
	rect: DropRect,
	pointer: Pointer | undefined
): DropCellData | undefined => {
	if (!cell || !hasFinerSnapThanCell(cell)) {
		return cell
	}
	if (!pointer) {
		return snapDropCell(cell, 0)
	}
	const isHorizontal = cell.axis === 'horizontal'
	const pointerAlongAxis = isHorizontal ? pointer.x : pointer.y
	const cellStart = isHorizontal ? rect.left : rect.top
	const cellLength = isHorizontal ? rect.width : rect.height
	const fractionIntoCell = getFractionAlong(
		pointerAlongAxis,
		cellStart,
		cellLength
	)
	return snapDropCell(cell, fractionIntoCell)
}

const EMPTY_RECT: DropRect = { top: 0, left: 0, width: 0, height: 0 }

/** The box a slot is drawn in now; undefined for one that has not published itself. */
const getSlotRect = (
	slots: DropColumnData['slots'],
	index: number
): DOMRect | undefined => {
	const isInColumn = index >= 0 && index < slots.length
	return isInColumn
		? slots.at(index)?.element.getBoundingClientRect()
		: undefined
}

/**
 * The index of the last slot that starts at or above `pointerY`, or 0 when
 * none does: a binary search over where the slots are drawn now, so a handful
 * of reads however many slots there are. A slot that has not published itself
 * counts as starting below everything.
 */
const findLastSlotStartingAtOrAbove = (
	slots: DropColumnData['slots'],
	pointerY: number
): number => {
	let first = 0
	let last = slots.length - 1
	while (first < last) {
		const middle = Math.ceil((first + last) / 2)
		const middleTop =
			getSlotRect(slots, middle)?.top ?? Number.POSITIVE_INFINITY
		if (middleTop <= pointerY) {
			first = middle
		} else {
			last = middle - 1
		}
	}
	return first
}

/** Whether the pointer is exactly where the slot starts, and the slot above it ends there too. */
const isOnEdgeSharedWithEarlier = (
	slots: DropColumnData['slots'],
	index: number,
	pointerY: number
): boolean => {
	const startsAtPointer = getSlotRect(slots, index)?.top === pointerY
	const earlierBottom = getSlotRect(slots, index - 1)?.bottom ?? Number.NaN
	return startsAtPointer && earlierBottom >= pointerY
}

/**
 * The slot of a column the pointer is over, and the box it is drawn in. The
 * slots are not equal (the last of an hour gives 1px to the line below it) and
 * a slot's height is not its drop's to assume, so each is read from its own
 * element, as it is now (`findLastSlotStartingAtOrAbove`).
 *
 * The 1px gap between two rows belongs to the row above it: dnd-kit hit-tests
 * the whole-pixel coordinates of mouse events, which are never in a 1px gap, so
 * the cells this stands in for covered it; the pointer position read here is
 * fractional for a pointer event and can be. An edge shared by two slots
 * belongs to the earlier, as it did when each cell contained its own edges and
 * the first registered won a point on both.
 */
const findSlotInColumn = (
	{ slots }: DropColumnData,
	pointer: Pointer | undefined
): { slot: DropCellData | undefined; slotRect: DropRect } => {
	const pointerY = pointer ? pointer.y : Number.NEGATIVE_INFINITY
	const found = findLastSlotStartingAtOrAbove(slots, pointerY)
	const isSharedWithEarlier = isOnEdgeSharedWithEarlier(slots, found, pointerY)
	const index = isSharedWithEarlier ? found - 1 : found
	const slotRect = getSlotRect(slots, index) ?? EMPTY_RECT
	return { slot: slots.at(index)?.data, slotRect }
}

/**
 * The cell under the pointer, narrowed to the snap-sized piece the pointer is
 * over. This, not the raw cell, is what a drop or resize is computed from.
 *
 * `pointer` is the pointer's LIVE viewport position and `over.rect` is dnd-kit's
 * own live measurement of the cell, so the two are in one frame however far the
 * grid has scrolled. The drag event's `delta` must not stand in for the
 * pointer: dnd-kit hands handlers `scrollAdjustedTranslate` (core.esm.js,
 * `onDragMove`/`onDragEnd`: `delta: scrollAdjustedTranslate`), which already
 * includes the scroll since the drag began, and `over.rect` is re-measured
 * after that scroll too (`useDroppableMeasuring`), so the scroll would count
 * twice. A drag with no pointer (keyboard) keeps the start of the cell.
 *
 * Over a time column the cell is first picked from the column's slots by the
 * pointer's height against where each slot is drawn now (`findSlotInColumn`;
 * the column's own `over.rect` is not read), and a slot is then snapped like
 * any other cell.
 */
export const getSnappedOverData = (
	over: DragOverEvent['over'],
	pointer: Pointer | undefined
): DropCellData | undefined => {
	const dropped = over?.data.current as
		| DropCellData
		| DropColumnData
		| undefined
	if (!over || !dropped) {
		return undefined
	}
	if (isDropColumn(dropped)) {
		const { slot, slotRect } = findSlotInColumn(dropped, pointer)
		return snapWithinCell(slot, slotRect, pointer)
	}
	return snapWithinCell(dropped, over.rect, pointer)
}

const MIDNIGHT = '00:00:00.000'
const TIME_OF_DAY_FORMAT = 'HH:mm:ss.SSS'

const WALL_CLOCK_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS'
const HOUR_MS = 3_600_000

/**
 * FullCalendar's fixed defaults for an event that crosses the all-day
 * boundary: an all-day event dropped on a time slot becomes one hour long
 * (`defaultTimedEventDuration` '01:00:00', `options.ts:486`) and a timed event
 * dropped on the all-day row becomes one day long (`defaultAllDayEventDuration`
 * {day:1}, `options.ts:487`), because `allDayMaintainDuration` is false by
 * default (`options.ts:511`) and `event-mutation.ts:131-134` then resets the
 * end. They are fixed here, not options: no consumer has asked to change them.
 */
const DEFAULT_TIMED_DURATION_MS = HOUR_MS

/** A date's wall clock, read as if it were UTC so a length can be taken from it. */
const getWallClockMs = (date: Dayjs): number =>
	dayjs.utc(date.format(WALL_CLOCK_FORMAT)).valueOf()

/**
 * How long an event is on the clock, not on the stopwatch. A move applies one
 * delta to both edges (`event-mutation.ts:110-114`, `marker.ts:48-58`, v7.1.1),
 * so the event keeps its clock length and its elapsed length changes by an hour
 * across a clock change (`docs/timezones.md`).
 */
const getWallClockLength = (event: CalendarEvent): number =>
	getWallClockMs(event.end) - getWallClockMs(event.start)

/** `start` plus a clock length, anchored in the configured zone like a start. */
const addWallClockLength = (start: Dayjs, wallClockLength: number): Dayjs => {
	const endWallClock = dayjs.utc(getWallClockMs(start) + wallClockLength)
	return dayjs(endWallClock.format(WALL_CLOCK_FORMAT))
}

/**
 * Calculates candidate start, end, and allDay status when an event is dragged
 * over a cell, respecting the grab offset and preserving time of day when a
 * timed event moves between day cells (matching FullCalendar and Google
 * Calendar, which keep the clock and change only the date).
 */
export const calculateDropTimes = (
	activeEvent: CalendarEvent,
	data: DropCellData,
	grabOffset: GrabOffset = NO_GRAB_OFFSET
): { start: Dayjs; end: Dayjs; allDay: boolean } => {
	const { date, hour = 0, minute = 0, allDay } = data
	const eventIsAllDay = Boolean(activeEvent.allDay)
	const wallClockLength = getWallClockLength(activeEvent)

	// An end landing on midnight is kept: `end` is exclusive (#248), so it is a
	// legitimate end and the layout paints it on the day it actually covers.
	// Snapping it back to the previous 23:59:59.999, as this used to, resized
	// the event on every drag.
	const keepingLength = (start: Dayjs) => ({
		start,
		end: addWallClockLength(start, wallClockLength),
	})

	if (isTimeSlotDrop(data)) {
		const slotClock = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000`
		const slotTime = atTimeOfDay(dayjs(date), slotClock)
		if (eventIsAllDay) {
			// Across the all-day boundary the grab point does not matter: the start
			// is the slot (EventDragging.ts:447-460, v7.1.1).
			const end = addWallClockLength(slotTime, DEFAULT_TIMED_DURATION_MS)
			return { start: slotTime, end, allDay: false }
		}
		const grabbedSlot = slotTime.subtract(grabOffset.minutes, 'minute')
		return { ...keepingLength(grabbedSlot), allDay: false }
	}

	// A drop changes an event's kind only when it crosses between a timed area
	// and an all-day one (FullCalendar, interaction/src/interactions/
	// EventDragging.ts:450, v6.1.21). A time slot (above) makes it timed and an
	// all-day cell makes it all-day; a whole-day cell (month, resource day grid)
	// is neither, so the event keeps its own kind. Those cells report
	// `allDay: false`, which is why this must not read `false` as "timed" (#322).
	const targetDate = dayjs(date).subtract(grabOffset.days, 'day')
	const droppedOnAllDayCell = allDay === true
	const staysAllDay = droppedOnAllDayCell || eventIsAllDay

	if (staysAllDay) {
		const dayStart = atTimeOfDay(targetDate, MIDNIGHT)
		const becomesAllDay = !eventIsAllDay
		if (becomesAllDay) {
			// A timed event on the all-day row is one whole day long, ending at the
			// next midnight (RFC 5545 3.6.1; `defaultAllDayEventDuration`).
			const nextMidnight = atTimeOfDay(targetDate.add(1, 'day'), MIDNIGHT)
			return { start: dayStart, end: nextMidnight, allDay: true }
		}
		return { ...keepingLength(dayStart), allDay: true }
	}

	// Rebuilt from a zoneless string rather than with `.hour()/.minute()`
	// setters. The setters hold the clock face but carry the SOURCE day's UTC
	// offset, so landing on a DST transition day serialises an hour out: the
	// grid shows 10:00 while the consumer is handed 15:00Z, where New York
	// 10:00 is 14:00Z. A string with no offset is anchored in the configured
	// zone on parse, which re-derives the offset for the TARGET day
	// (`docs/timezones.md`).
	const timeOfDay = activeEvent.start.format(TIME_OF_DAY_FORMAT)
	const keptTimeOfDay = atTimeOfDay(targetDate, timeOfDay)
	return { ...keepingLength(keptTimeOfDay), allDay: false }
}

export type ResizeEdge = 'start' | 'end'

/**
 * The edge whose resize handle the press landed on, or undefined when it landed
 * anywhere else (a move). A bar is one draggable and its handles are plain
 * elements marked `data-resize-handle`, so the activator event's target is what
 * tells a resize from a move; FullCalendar decides the same way, from the
 * pointerdown target (`EventDragging.ts:110`, `EventResizing.ts:64`, v7.1.1).
 * A keyboard activator has no element target and so is always a move.
 */
export const getPressedResizeEdge = (
	activatorEvent: Event
): ResizeEdge | undefined => {
	const { target } = activatorEvent
	if (!(target instanceof Element)) {
		return undefined
	}
	const edge = target
		.closest('[data-resize-handle]')
		?.getAttribute('data-resize-handle')
	if (edge === 'start' || edge === 'end') {
		return edge
	}
	return undefined
}

/** The span of the time slot a pointer is over; undefined without a date. */
const getSlotSpan = (data: DropCellData) => {
	const { date, hour = 0, minute, slotDurationMinutes } = data
	if (!date) {
		return undefined
	}
	const slotMinutes = getCellMinutes(minute, slotDurationMinutes)
	const timeOfDay = `${String(hour).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}:00.000`
	const start = atTimeOfDay(date, timeOfDay)
	return { start, end: start.add(slotMinutes, 'minute') }
}

/**
 * The span a cell covers: its slot in an hour grid, its day otherwise.
 * Undefined for a cell that says nothing about its date.
 */
export const getCellSpan = (
	data: DropCellData
): { start: Dayjs; end: Dayjs } | undefined => {
	const { date } = data
	if (!date) {
		return undefined
	}
	if (isTimeSlotDrop(data)) {
		return getSlotSpan(data)
	}
	const start = atTimeOfDay(date, MIDNIGHT)
	return { start, end: atTimeOfDay(date.add(1, 'day'), MIDNIGHT) }
}

/**
 * Where an edge of an event lands when the pointer is over a cell, or null
 * when that would leave no span (end at or before start). FullCalendar makes
 * the same mutation null, so nothing changes (`EventResizing.ts:249-300`,
 * v7.1.1).
 *
 * A time slot snaps the edge to the slot's boundary: its end for the end
 * edge (exclusive, RFC 5545 DTEND), its start for the start edge. A day cell
 * snaps to whole days and keeps a timed block's time of day, so the end edge
 * of a block ending at 17:00 lands on 17:00 of the hovered day.
 */
export const calculateResizeTimes = (
	event: CalendarEvent,
	data: DropCellData,
	edge: ResizeEdge
): { start: Dayjs; end: Dayjs } | null => {
	const { date } = data
	if (!date) {
		return null
	}

	let start = event.start
	let end = event.end
	const slot = getSlotSpan(data)

	if (isTimeSlotDrop(data) && slot) {
		if (edge === 'end') {
			end = slot.end
		} else {
			start = slot.start
		}
	} else if (edge === 'end') {
		const endsAtMidnight = event.end.isSame(event.end.startOf('day'))
		const endsAtDayBoundary = Boolean(event.allDay) || endsAtMidnight
		end = endsAtDayBoundary
			? atTimeOfDay(date.add(1, 'day'), MIDNIGHT)
			: atTimeOfDay(date, event.end.format(TIME_OF_DAY_FORMAT))
	} else {
		const startTimeOfDay = event.allDay
			? MIDNIGHT
			: event.start.format(TIME_OF_DAY_FORMAT)
		start = atTimeOfDay(date, startTimeOfDay)
	}

	return end.isAfter(start) ? { start, end } : null
}

/**
 * The resource-axis half of a drop, mirroring FullCalendar's resource mutation
 * (`premium/packages/preact-scheduler/src/resource/EventDragging.ts`): the row
 * the drag STARTED from is removed from the membership and the drop target
 * takes its place, deduped; an event that was not in the source row is left
 * untouched. Writing only `resourceId` moved nothing for a cross-resource
 * event, because `getEventResourceIds` ignores `resourceId` whenever
 * `resourceIds` is present.
 *
 * Single-resource events take the target even when the drag reports no source
 * row (dragging out of the "all events" dialog, which has no resource axis).
 */
const getResourceUpdates = (
	activeEvent: CalendarEvent,
	fromResourceId: ResourceId | undefined,
	toResourceId: ResourceId | undefined
): Partial<CalendarEvent> => {
	const droppedOutsideResourceAxis = toResourceId === undefined
	if (droppedOutsideResourceAxis || fromResourceId === toResourceId) {
		return {}
	}

	if (!activeEvent.resourceIds) {
		return { resourceId: toResourceId }
	}

	const sourceIndex = activeEvent.resourceIds.indexOf(
		fromResourceId as ResourceId
	)
	if (sourceIndex === -1) {
		return {}
	}

	const resourceIds = activeEvent.resourceIds.slice()
	resourceIds.splice(sourceIndex, 1)
	if (!resourceIds.includes(toResourceId)) {
		resourceIds.push(toResourceId)
	}
	return { resourceIds }
}

export const getUpdatedEvent = (
	event: DragEndEvent,
	activeEvent: CalendarEvent | null,
	grabOffset: GrabOffset = NO_GRAB_OFFSET,
	pointer?: Pointer
) => {
	const { active, over } = event

	if (!active || !over || !activeEvent) {
		return null
	}

	const data = getSnappedOverData(over, pointer)
	// Released over no cell (a slot that has not published itself), or on one
	// that refuses drops: commit nothing, so the event reverts to where it
	// started.
	if (!data || data.disabled) {
		return null
	}
	const { resourceId } = data
	const { start, end, allDay } = calculateDropTimes(
		activeEvent,
		data,
		grabOffset
	)

	const sourceResourceId = (
		active.data.current as { sourceResourceId?: ResourceId } | undefined
	)?.sourceResourceId

	const resourceUpdates = getResourceUpdates(
		activeEvent,
		sourceResourceId,
		resourceId
	)
	const isSameSpan =
		start.isSame(activeEvent.start) && end.isSame(activeEvent.end)
	const isSameKind = allDay === Boolean(activeEvent.allDay)
	const isSameResource = Object.keys(resourceUpdates).length === 0
	// A drop that changes nothing commits nothing, so no callback fires:
	// FullCalendar fires no `eventChange` for it (`_noEventDrop`,
	// EventDragging.ts:374, v7.1.1).
	if (isSameSpan && isSameKind && isSameResource) {
		return null
	}

	const updates = { start, end, ...resourceUpdates, allDay }
	return { activeEvent, updates }
}
