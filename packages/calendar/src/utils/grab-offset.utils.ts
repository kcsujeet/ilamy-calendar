import type { ClientRect } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import {
	add,
	elapsedDiff,
	getFields,
	isAfter,
	isBefore,
	parseDate,
	startOf,
	wallClockDiff,
	type ZonedDate,
} from '@ilamy/utils/temporal'

export interface GrabOffset {
	minutes: number
	days: number
}

export const NO_GRAB_OFFSET: GrabOffset = { minutes: 0, days: 0 }

export interface DragSegment {
	start: ZonedDate
	end: ZonedDate
	axis: 'vertical' | 'horizontal'
	hiddenDays?: Set<number>
}

export const getDragSegment = (
	event: { start: string; end: string },
	range: { start: ZonedDate | undefined; end: ZonedDate | undefined },
	axis: DragSegment['axis'],
	hiddenDays?: Set<number>
): DragSegment | undefined => {
	if (!range.start || !range.end) {
		return undefined
	}
	const zone = range.start.timeZoneId
	const eventStart = parseDate(event.start, zone)
	const eventEnd = parseDate(event.end, zone)
	if (!eventStart || !eventEnd) {
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

interface GrabOffsetInput {
	activeEvent: CalendarEvent
	initialRect: ClientRect | null
	activatorEvent: Event
	segment: DragSegment
	slotDurationMinutes: number
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
	const isDrawn = (day: ZonedDate) =>
		!segment.hiddenDays?.has(getFields(day).dayOfWeek)
	const columns = spannedColumns.filter(isDrawn)
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

/** Resolves how far into the event the user grabbed it. */
export const calculateGrabOffset = ({
	activeEvent,
	initialRect,
	activatorEvent,
	segment,
	slotDurationMinutes,
}: GrabOffsetInput): GrabOffset => {
	const { clientX, clientY } = activatorEvent as Partial<MouseEvent>
	const isVertical = segment.axis === 'vertical'
	const pointer = isVertical ? clientY : clientX
	const rectStart = isVertical ? initialRect?.top : initialRect?.left
	const rectLength = isVertical ? initialRect?.height : initialRect?.width

	if (pointer === undefined || rectStart === undefined) {
		return NO_GRAB_OFFSET
	}
	if (rectLength === undefined || rectLength <= 0) {
		return NO_GRAB_OFFSET
	}

	const zone = segment.start.timeZoneId
	const eventStart = parseDate(activeEvent.start, zone)
	const eventEnd = parseDate(activeEvent.end, zone)
	if (!eventStart || !eventEnd) {
		return NO_GRAB_OFFSET
	}

	const fraction = getFractionWithin(pointer, rectStart, rectLength)
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
