import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import { wallClockMs } from '@ilamy/core'
import type { CalendarEvent } from '@ilamy/types'
import { getCellMinutes, getFractionAlong } from '@ilamy/utils/helpers'
import {
	add,
	fromFields,
	isAfter,
	isSameInstant,
	parseDate,
	startOf,
	toOffsetIso,
	withTime,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import {
	type GrabOffset,
	NO_GRAB_OFFSET,
} from '@/features/calendar/utils/grab-offset'
import {
	hasFinerSnapThanCell,
	type SnappableCell,
	snapDropCell,
} from '@/features/calendar/utils/snap-drop-cell'

export interface DropCellData extends SnappableCell {
	type?: string
	date?: ZonedDate
	resourceId?: string | number
	/** True when this cell belongs to the time-grid all-day row band. */
	allDay?: boolean
	/** True when `isCellDisabled` refuses drops on this cell. */
	disabled?: boolean
}

type ResourceId = string | number

export const isTimeSlotDrop = (data: DropCellData): boolean =>
	data.hour !== undefined

export interface Pointer {
	x: number
	y: number
}

export interface DropSlot {
	data: DropCellData
	element: Pick<HTMLElement, 'getBoundingClientRect'>
}

export interface DropColumnData {
	slots: Array<DropSlot | undefined>
}

interface DropRect {
	top: number
	left: number
	width: number
	height: number
}

const isDropColumn = (
	data: DropCellData | DropColumnData
): data is DropColumnData => 'slots' in data

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

const getSlotRect = (
	slots: DropColumnData['slots'],
	index: number
): DOMRect | undefined => {
	const isInColumn = index >= 0 && index < slots.length
	if (!isInColumn) {
		return undefined
	}
	return slots.at(index)?.element.getBoundingClientRect()
}

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

const isOnEdgeSharedWithEarlier = (
	slots: DropColumnData['slots'],
	index: number,
	pointerY: number
): boolean => {
	const startsAtPointer = getSlotRect(slots, index)?.top === pointerY
	const earlierBottom = getSlotRect(slots, index - 1)?.bottom ?? Number.NaN
	return startsAtPointer && earlierBottom >= pointerY
}

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

/** Resolves the droppable cell under `pointer`, snapped to `snapDuration`. */
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

const HOUR_MS = 3_600_000
const DEFAULT_TIMED_DURATION_MS = HOUR_MS

const getWallClockLength = (start: ZonedDate, end: ZonedDate): number =>
	wallClockMs(end) - wallClockMs(start)

/** Adds a wall-clock millisecond length to `start`, anchored in `start`'s timezone. */
const addWallClockLength = (
	start: ZonedDate,
	wallClockLength: number
): ZonedDate => {
	const endWall = new Date(wallClockMs(start) + wallClockLength)
	return fromFields(
		{
			year: endWall.getUTCFullYear(),
			month: endWall.getUTCMonth() + 1,
			day: endWall.getUTCDate(),
			hour: endWall.getUTCHours(),
			minute: endWall.getUTCMinutes(),
			second: endWall.getUTCSeconds(),
			millisecond: endWall.getUTCMilliseconds(),
		},
		start.timeZoneId
	)
}

/**
 * Calculates candidate `start`, `end`, and `allDay` when an event is dragged
 * over a cell, preserving wall-clock length and grab offset (FullCalendar
 * `EventDragging.ts`, v7.1.1).
 */
export const calculateDropTimes = (
	activeEvent: CalendarEvent,
	data: DropCellData,
	grabOffset: GrabOffset = NO_GRAB_OFFSET
): { start: ZonedDate; end: ZonedDate; allDay: boolean } => {
	const { date, hour = 0, minute = 0, allDay } = data
	const zone = date?.timeZoneId
	const eventStart = parseDate(activeEvent.start, zone)
	const eventEnd = parseDate(activeEvent.end, zone)
	if (!date || !eventStart || !eventEnd) {
		throw new Error('Cannot calculate drop times without valid date and event')
	}

	const eventIsAllDay = Boolean(activeEvent.allDay)
	const wallClockLength = getWallClockLength(eventStart, eventEnd)

	const keepingLength = (start: ZonedDate) => ({
		start,
		end: addWallClockLength(start, wallClockLength),
	})

	if (isTimeSlotDrop(data)) {
		const slotTime = withTime(date, { hour, minute, second: 0, millisecond: 0 })
		if (eventIsAllDay) {
			const end = addWallClockLength(slotTime, DEFAULT_TIMED_DURATION_MS)
			return { start: slotTime, end, allDay: false }
		}
		const grabbedSlot = add(slotTime, -grabOffset.minutes, 'minute')
		return { ...keepingLength(grabbedSlot), allDay: false }
	}

	const targetDate = add(date, -grabOffset.days, 'day')
	const droppedOnAllDayCell = allDay === true
	const staysAllDay = droppedOnAllDayCell || eventIsAllDay

	if (staysAllDay) {
		const dayStart = startOf(targetDate, 'day')
		const becomesAllDay = !eventIsAllDay
		if (becomesAllDay) {
			const nextMidnight = startOf(add(targetDate, 1, 'day'), 'day')
			return { start: dayStart, end: nextMidnight, allDay: true }
		}
		return { ...keepingLength(dayStart), allDay: true }
	}

	const keptTimeOfDay = withTime(targetDate, {
		hour: eventStart.hour,
		minute: eventStart.minute,
		second: eventStart.second,
		millisecond: eventStart.millisecond,
	})
	return { ...keepingLength(keptTimeOfDay), allDay: false }
}

export type ResizeEdge = 'start' | 'end'

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

const getSlotSpan = (
	data: DropCellData
): { start: ZonedDate; end: ZonedDate } | undefined => {
	const { date, hour = 0, minute, slotDurationMinutes } = data
	if (!date) {
		return undefined
	}
	const slotMinutes = getCellMinutes(minute, slotDurationMinutes)
	const start = withTime(date, {
		hour,
		minute: minute ?? 0,
		second: 0,
		millisecond: 0,
	})
	return { start, end: add(start, slotMinutes, 'minute') }
}

export const getCellSpan = (
	data: DropCellData
): { start: ZonedDate; end: ZonedDate } | undefined => {
	const { date } = data
	if (!date) {
		return undefined
	}
	if (isTimeSlotDrop(data)) {
		return getSlotSpan(data)
	}
	const start = startOf(date, 'day')
	return { start, end: startOf(add(date, 1, 'day'), 'day') }
}

const copyTimeOntoDate = (date: ZonedDate, source: ZonedDate): ZonedDate =>
	withTime(date, {
		hour: source.hour,
		minute: source.minute,
		second: source.second,
		millisecond: source.millisecond,
	})

const resolveDayResizeRange = (
	event: CalendarEvent,
	date: ZonedDate,
	edge: ResizeEdge,
	eventStart: ZonedDate,
	eventEnd: ZonedDate
): { start: ZonedDate; end: ZonedDate } => {
	if (edge === 'end') {
		const endsAtMidnight = isSameInstant(eventEnd, startOf(eventEnd, 'day'))
		const endsAtDayBoundary = Boolean(event.allDay) || endsAtMidnight
		let end: ZonedDate
		if (endsAtDayBoundary) {
			end = startOf(add(date, 1, 'day'), 'day')
		} else {
			end = copyTimeOntoDate(date, eventEnd)
		}
		return { start: eventStart, end }
	}
	let start: ZonedDate
	if (event.allDay) {
		start = startOf(date, 'day')
	} else {
		start = copyTimeOntoDate(date, eventStart)
	}
	return { start, end: eventEnd }
}

/**
 * Calculates candidate `start` and `end` when resizing an edge over a cell, or
 * `null` when the resulting span would be empty (FullCalendar `EventResizing.ts:249-300`).
 */
export const calculateResizeTimes = (
	event: CalendarEvent,
	data: DropCellData,
	edge: ResizeEdge
): { start: ZonedDate; end: ZonedDate } | null => {
	const { date } = data
	if (!date) {
		return null
	}
	const zone = date.timeZoneId
	const eventStart = parseDate(event.start, zone)
	const eventEnd = parseDate(event.end, zone)
	if (!eventStart || !eventEnd) {
		return null
	}

	const slot = getSlotSpan(data)
	let next: { start: ZonedDate; end: ZonedDate }
	if (isTimeSlotDrop(data) && slot) {
		if (edge === 'end') {
			next = { start: eventStart, end: slot.end }
		} else {
			next = { start: slot.start, end: eventEnd }
		}
	} else {
		next = resolveDayResizeRange(event, date, edge, eventStart, eventEnd)
	}

	if (!isAfter(next.end, next.start)) {
		return null
	}
	return next
}

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
	if (!data || data.disabled || !data.date) {
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

	const prevStart = parseDate(activeEvent.start, data.date.timeZoneId)
	const prevEnd = parseDate(activeEvent.end, data.date.timeZoneId)
	const isSameSpan =
		prevStart !== undefined &&
		prevEnd !== undefined &&
		isSameInstant(start, prevStart) &&
		isSameInstant(end, prevEnd)
	const isSameKind = allDay === Boolean(activeEvent.allDay)
	const isSameResource = Object.keys(resourceUpdates).length === 0
	if (isSameSpan && isSameKind && isSameResource) {
		return null
	}

	const updates: Partial<CalendarEvent> = {
		start: toOffsetIso(start),
		end: toOffsetIso(end),
		...resourceUpdates,
		allDay,
	}
	return { activeEvent, updates }
}
