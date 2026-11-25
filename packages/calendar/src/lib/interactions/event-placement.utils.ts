import type {
	BusinessHours,
	CalendarConstraint,
	CalendarEditFlags,
	CalendarEvent,
	CellInfo,
	EventDropInfo,
	Resource,
} from '../../types/calendar.types'
import { isRangeWithinBusinessHours } from '../../utils/core-business-hours.utils'
import {
	resolveDurationEditable,
	resolveStartEditable,
} from '../../utils/core-editability.utils'
import { getCellMinutes, type TimeAxis } from '../../utils/helpers'
import {
	add,
	elapsedDiff,
	fromFields,
	getFields,
	isAfter,
	isBefore,
	isSameInstant,
	parseDate,
	startOf,
	wallClockDiff,
	withTime,
	type ZonedDate,
} from '../../utils/temporal'
import { wallClockMs } from '../layout/core-layout-columns.utils'
import type { Rect } from './rect.utils'

/** Grab offset from event start into the pressed drag segment. */
export interface GrabOffset {
	minutes: number
	days: number
}

/** Zero grab offset (preserves exact cell start on drop). */
export const NO_GRAB_OFFSET: GrabOffset = { minutes: 0, days: 0 }

/** Segment bounds and axis along which a bar was grabbed. */
export interface DragSegment {
	start: ZonedDate
	end: ZonedDate
	axis: TimeAxis
	hiddenDays?: Set<number>
}

/** Resize handle edge identifier. */
export type ResizeEdge = 'start' | 'end'

/** Resize granularity matching grid representation. */
export type ResizeGranularity = 'slot' | 'day'

/** Target cell descriptor accepted by move and resize placement helpers. */
export interface PlacementCell {
	date?: ZonedDate
	hour?: number
	minute?: number
	slotDurationMinutes?: number
	snapMinutes?: number
	axis?: TimeAxis
	allDay?: boolean
	isAllDaySlot?: boolean
	resourceId?: string | number
}

/** Options evaluated when checking drag/resize/selection constraints. */
export interface ConstraintCheckOptions extends CalendarEditFlags {
	businessHours?: BusinessHours | BusinessHours[]
	eventConstraint?: CalendarConstraint
	selectConstraint?: CalendarConstraint
	disableCellClick?: boolean
	isCellDisabled?: (cell: CellInfo) => boolean
	eventAllow?: (dropInfo: EventDropInfo, event: CalendarEvent) => boolean
}

const HOUR_MS = 3_600_000
const DEFAULT_TIMED_DURATION_MS = HOUR_MS

/** Whether `cell` identifies a time-grid slot rather than a whole-day cell. */
export const isTimeSlotDrop = (cell: PlacementCell): boolean =>
	cell.hour !== undefined

/** Clips an event range to a visible segment bounds and axis for grab math. */
export const getDragSegment = (
	event: { start: string; end: string },
	range: { start: ZonedDate | undefined; end: ZonedDate | undefined },
	axis: DragSegment['axis'],
	hiddenDays?: Set<number>
): DragSegment | undefined => {
	if (!(range.start && range.end)) {
		return undefined
	}
	const zone = range.start.timeZoneId
	const eventStart = parseDate(event.start, zone)
	const eventEnd = parseDate(event.end, zone)
	if (!(eventStart && eventEnd)) {
		return undefined
	}
	const start = isBefore(eventStart, range.start) ? range.start : eventStart
	const end = isAfter(eventEnd, range.end) ? range.end : eventEnd
	return { start, end, axis, hiddenDays }
}

const getFractionWithin = (
	pointer: number,
	rectStart: number,
	rectLength: number
): number => {
	const offset = Math.max(0, pointer - rectStart)
	return Math.min(1, offset / rectLength)
}

const getGrabbedDayColumn = (
	segment: DragSegment,
	fraction: number
): ZonedDate => {
	const firstColumn = startOf(segment.start, 'day')
	const lastColumn = startOf(add(segment.end, -1, 'millisecond'), 'day')
	const spanDays = Math.max(
		1,
		Math.round(wallClockDiff(lastColumn, firstColumn, 'day')) + 1
	)
	const spannedColumns = Array.from({ length: spanDays }, (_, offset) =>
		startOf(add(firstColumn, offset, 'day'), 'day')
	)
	const columns = spannedColumns.filter(
		(day) => !segment.hiddenDays?.has(getFields(day).dayOfWeek)
	)
	const grabbedIndex = Math.floor(fraction * columns.length)
	const clampedIndex = Math.min(Math.max(0, grabbedIndex), columns.length - 1)
	return columns.at(clampedIndex) ?? firstColumn
}

const getGrabbedMinutesInto = (
	eventStart: ZonedDate,
	eventEnd: ZonedDate,
	grabbedAt: ZonedDate,
	slotDurationMinutes: number
): number => {
	const eventMinutes = elapsedDiff(eventEnd, eventStart, 'minute')
	const lastSlotStart = Math.max(0, eventMinutes - slotDurationMinutes)
	const grabbedMinutes = elapsedDiff(grabbedAt, eventStart, 'minute')
	const snapped =
		Math.floor(grabbedMinutes / slotDurationMinutes) * slotDurationMinutes
	return Math.min(Math.max(0, snapped), lastSlotStart)
}

const getGrabbedDaysInto = (
	eventStart: ZonedDate,
	eventEnd: ZonedDate,
	grabbedAt: ZonedDate
): number => {
	const firstDay = startOf(eventStart, 'day')
	const lastDay = startOf(add(eventEnd, -1, 'millisecond'), 'day')
	const occupiedDays = Math.max(
		0,
		Math.round(wallClockDiff(lastDay, firstDay, 'day'))
	)
	const grabbedDays = Math.round(
		wallClockDiff(startOf(grabbedAt, 'day'), firstDay, 'day')
	)
	return Math.min(Math.max(0, grabbedDays), occupiedDays)
}

/** Input parameters for `computeGrabOffset`. */
export interface GrabOffsetInput {
	activeEvent: CalendarEvent
	initialRect: Rect | null
	pointer: { x: number; y: number }
	segment: DragSegment
	slotDurationMinutes: number
}

/** Computes how far into the dragged event the pointer pressed it. */
export const computeGrabOffset = ({
	activeEvent,
	initialRect,
	pointer,
	segment,
	slotDurationMinutes,
}: GrabOffsetInput): GrabOffset => {
	const isVertical = segment.axis === 'vertical'
	const coord = isVertical ? pointer.y : pointer.x
	const rectStart = isVertical ? initialRect?.top : initialRect?.left
	const rectLength = isVertical ? initialRect?.height : initialRect?.width

	if (rectStart === undefined || rectLength === undefined || rectLength <= 0) {
		return NO_GRAB_OFFSET
	}

	const zone = segment.start.timeZoneId
	const eventStart = parseDate(activeEvent.start, zone)
	const eventEnd = parseDate(activeEvent.end, zone)
	if (!(eventStart && eventEnd)) {
		return NO_GRAB_OFFSET
	}

	const fraction = getFractionWithin(coord, rectStart, rectLength)
	const segmentMinutes = elapsedDiff(segment.end, segment.start, 'minute')
	const grabbedAt = add(
		segment.start,
		Math.round(fraction * segmentMinutes),
		'minute'
	)
	const columnDay = getGrabbedDayColumn(segment, fraction)
	const drawsDayColumns = !isVertical || Boolean(segment.hiddenDays)
	const grabbedDayAt = drawsDayColumns ? columnDay : grabbedAt

	return {
		minutes: getGrabbedMinutesInto(
			eventStart,
			eventEnd,
			grabbedAt,
			slotDurationMinutes
		),
		days: getGrabbedDaysInto(eventStart, eventEnd, grabbedDayAt),
	}
}

const getWallClockLength = (start: ZonedDate, end: ZonedDate): number =>
	wallClockMs(end) - wallClockMs(start)

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
 * Calculates candidate `start`, `end`, and `allDay` for moving `activeEvent`
 * onto `cell`, preserving wall-clock span and `grabOffset`.
 */
export const calculateMovePlacement = (
	activeEvent: CalendarEvent,
	cell: PlacementCell,
	grabOffset: GrabOffset = NO_GRAB_OFFSET
): { start: ZonedDate; end: ZonedDate; allDay: boolean } => {
	const { date, hour = 0, minute = 0, allDay } = cell
	const zone = date?.timeZoneId
	const eventStart = parseDate(activeEvent.start, zone)
	const eventEnd = parseDate(activeEvent.end, zone)
	if (!(date && eventStart && eventEnd)) {
		throw new Error('Cannot calculate drop times without valid date and event')
	}

	const eventIsAllDay = Boolean(activeEvent.allDay)
	const wallClockLength = getWallClockLength(eventStart, eventEnd)
	const keepingLength = (start: ZonedDate) => ({
		start,
		end: addWallClockLength(start, wallClockLength),
	})

	if (isTimeSlotDrop(cell)) {
		const slotTime = withTime(date, { hour, minute, second: 0, millisecond: 0 })
		if (eventIsAllDay) {
			return {
				start: slotTime,
				end: addWallClockLength(slotTime, DEFAULT_TIMED_DURATION_MS),
				allDay: false,
			}
		}
		const grabbedSlot = add(slotTime, -grabOffset.minutes, 'minute')
		return { ...keepingLength(grabbedSlot), allDay: false }
	}

	const targetDate = add(date, -grabOffset.days, 'day')
	const dropsOnAllDayRow =
		cell.isAllDaySlot !== undefined ? cell.isAllDaySlot : allDay === true
	const staysAllDay = dropsOnAllDayRow || eventIsAllDay
	if (staysAllDay) {
		const dayStart = startOf(targetDate, 'day')
		if (!eventIsAllDay) {
			return {
				start: dayStart,
				end: startOf(add(targetDate, 1, 'day'), 'day'),
				allDay: true,
			}
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

/** Reads `start` or `end` resize handle edge from an activator event target. */
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
	cell: PlacementCell
): { start: ZonedDate; end: ZonedDate } | undefined => {
	const { date, hour = 0, minute, slotDurationMinutes } = cell
	if (!date) return undefined
	const slotMinutes = getCellMinutes(minute, slotDurationMinutes)
	const start = withTime(date, {
		hour,
		minute: minute ?? 0,
		second: 0,
		millisecond: 0,
	})
	return { start, end: add(start, slotMinutes, 'minute') }
}

/** Returns the `[start, end)` zoned bounds represented by a placement cell. */
export const getCellSpan = (
	cell: PlacementCell
): { start: ZonedDate; end: ZonedDate } | undefined => {
	if (!cell.date) return undefined
	if (isTimeSlotDrop(cell)) {
		return getSlotSpan(cell)
	}
	const start = startOf(cell.date, 'day')
	return { start, end: startOf(add(cell.date, 1, 'day'), 'day') }
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
		const end = endsAtDayBoundary
			? startOf(add(date, 1, 'day'), 'day')
			: copyTimeOntoDate(date, eventEnd)
		return { start: eventStart, end }
	}
	const start = event.allDay
		? startOf(date, 'day')
		: copyTimeOntoDate(date, eventStart)
	return { start, end: eventEnd }
}

/**
 * Calculates candidate `start` and `end` when resizing an edge over `cell`,
 * returning `null` if start resizing is disallowed or the resulting span is empty.
 */
export const calculateResizePlacement = (
	event: CalendarEvent,
	cell: PlacementCell,
	edge: ResizeEdge,
	options?: { resizableFromStart?: boolean }
): { start: ZonedDate; end: ZonedDate } | null => {
	if (edge === 'start' && options?.resizableFromStart === false) {
		return null
	}
	const { date } = cell
	if (!date) return null
	const zone = date.timeZoneId
	const eventStart = parseDate(event.start, zone)
	const eventEnd = parseDate(event.end, zone)
	if (!(eventStart && eventEnd)) return null

	const slot = getSlotSpan(cell)
	let next: { start: ZonedDate; end: ZonedDate }
	if (isTimeSlotDrop(cell) && slot) {
		next =
			edge === 'end'
				? { start: eventStart, end: slot.end }
				: { start: slot.start, end: eventEnd }
	} else {
		next = resolveDayResizeRange(event, date, edge, eventStart, eventEnd)
	}

	return isAfter(next.end, next.start) ? next : null
}

type ResourceId = string | number

/** Computes `resourceId` or `resourceIds` update when moving across resource lanes. */
export const getResourceUpdates = (
	activeEvent: CalendarEvent,
	fromResourceId: ResourceId | undefined,
	toResourceId: ResourceId | undefined
): Partial<CalendarEvent> => {
	if (toResourceId === undefined || fromResourceId === toResourceId) {
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

/** Whether `event` may be moved given calendar and event editability flags. */
export const canDragEvent = (
	event: CalendarEvent,
	options: CalendarEditFlags
): boolean => resolveStartEditable(event, options)

/** Whether `event` may be resized given calendar and event editability flags. */
export const canResizeEvent = (
	event: CalendarEvent,
	options: CalendarEditFlags
): boolean => resolveDurationEditable(event, options)

/** Evaluates disabled cell, business-hours constraint, and `eventAllow` for a drop. */
export const isPlacementAllowed = (
	event: CalendarEvent,
	dropInfo: EventDropInfo,
	options: ConstraintCheckOptions,
	timezone: string,
	resource?: Resource
): boolean => {
	const start = parseDate(dropInfo.start, timezone)
	const end = parseDate(dropInfo.end, timezone)
	if (!(start && end)) return false

	if (
		options.isCellDisabled?.({
			start: dropInfo.start,
			end: dropInfo.end,
			resource,
			allDay: dropInfo.allDay,
		})
	) {
		return false
	}

	if (options.eventConstraint === 'businessHours') {
		const effectiveHours = resource?.businessHours ?? options.businessHours
		const withinHours = isRangeWithinBusinessHours({
			start,
			end,
			allDay: dropInfo.allDay,
			businessHours: effectiveHours,
		})
		if (!withinHours) {
			return false
		}
	}

	return !options.eventAllow || options.eventAllow(dropInfo, event)
}

/** Evaluates `disableCellClick`, `isCellDisabled`, and `selectConstraint` for a cell range. */
export const isSelectionAllowed = (
	cell: CellInfo,
	options: ConstraintCheckOptions,
	timezone: string
): boolean => {
	if (options.disableCellClick) return false
	if (options.isCellDisabled?.(cell)) return false
	if (options.selectConstraint !== 'businessHours') return true

	const start = parseDate(cell.start, timezone)
	const end = parseDate(cell.end, timezone)
	if (!(start && end)) return false
	const effectiveHours = cell.resource?.businessHours ?? options.businessHours
	return isRangeWithinBusinessHours({
		start,
		end,
		allDay: Boolean(cell.allDay),
		businessHours: effectiveHours,
	})
}
