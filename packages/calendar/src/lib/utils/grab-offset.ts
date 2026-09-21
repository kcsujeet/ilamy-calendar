import type { ClientRect } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'

/**
 * How far into the event the user grabbed it, so the drop puts the GRABBED
 * point under the pointer rather than the event's start. FullCalendar moves an
 * event by a delta rather than re-anchoring it ("Delta Object that represents
 * the amount of time the event was moved by",
 * https://fullcalendar.io/docs/eventDrop); Google Calendar behaves the same.
 */
export interface GrabOffset {
	minutes: number
	days: number
}

export const NO_GRAB_OFFSET: GrabOffset = { minutes: 0, days: 0 }

/**
 * The bar the drag started from, as time. A grid draws an event clipped to the
 * range it shows, so the rendered rect covers THIS span, not the whole event.
 * Measuring a pointer fraction against the rect and then scaling it by the
 * event's full duration mixes two units and lands days off on a clipped bar.
 */
export interface DragSegment {
	/** First instant the bar covers (the event clamped to the grid's start). */
	start: Dayjs
	/** Exclusive end of what the bar covers (clamped to the grid's end). */
	end: Dayjs
	/** The axis time runs along in the grid that drew the bar. */
	axis: 'vertical' | 'horizontal'
}

/**
 * The span a rendered bar covers: the event as the grid clipped it to its own
 * range. Returns undefined when the grid has no range to clip against.
 */
export const getDragSegment = (
	event: { start: Dayjs; end: Dayjs },
	range: { start: Dayjs | undefined; end: Dayjs | undefined },
	axis: DragSegment['axis']
): DragSegment | undefined => {
	if (!range.start || !range.end) {
		return undefined
	}
	const start = event.start.isBefore(range.start) ? range.start : event.start
	const end = event.end.isAfter(range.end) ? range.end : event.end
	return { start, end, axis }
}

/** Where the pointer sat along an axis of the rect, as 0..1. */
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
	/** The grid's snap unit, so a grab lands on a droppable boundary. */
	slotDurationMinutes: number
}

/**
 * Resolves how far into the event the user grabbed it. The pointer fraction is
 * measured against the SEGMENT the bar draws (same unit as the rect), and the
 * instant that yields is then expressed relative to the EVENT's start, which is
 * what a drop subtracts from the target cell. A bar the grid clipped begins
 * mid-event, so the two are not the same reference point.
 *
 * A keyboard drag has no pointer coordinates; it grabs the event at its start,
 * which is the offset-free case.
 */
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

	// Each guard narrows the value it checks, so the call below needs no cast:
	// `(rectLength ?? 0) > 0` reads as a rect check but leaves `rectLength`
	// possibly undefined, which is what forced an `as number` here before.
	if (pointer === undefined || rectStart === undefined) {
		return NO_GRAB_OFFSET
	}
	if (rectLength === undefined || rectLength <= 0) {
		return NO_GRAB_OFFSET
	}

	const fraction = getFractionWithin(pointer, rectStart, rectLength)
	const segmentMinutes = segment.end.diff(segment.start, 'minute')
	const grabbedAt = segment.start.add(fraction * segmentMinutes, 'minute')
	// Time is linear in pixels down a time column, but NOT across a row of day
	// columns, so the two axes read the grabbed day differently.
	const columnDay = getGrabbedDayColumn(segment, fraction)
	const grabbedDayAt = isVertical ? grabbedAt : columnDay

	return {
		minutes: getGrabbedMinutesInto(activeEvent, grabbedAt, slotDurationMinutes),
		days: getGrabbedDaysInto(activeEvent, grabbedDayAt),
	}
}

/**
 * The day whose column the pointer grabbed, on a horizontal grid.
 *
 * Such a grid draws a multi-day bar across WHOLE, EQUAL columns, so a fraction
 * of the bar's width is a fraction of its COLUMNS. Reading it as a fraction of
 * elapsed time agrees only when the span is midnight-aligned: for a timed span
 * the first and last columns are full width but partial time, so the pointer
 * crosses into the next day's worth of minutes while still inside the previous
 * day's column, and the drop lands a day out. A Jan 1 09:00 -> Jan 4 17:00 bar
 * is wrong across 11% of its width this way, an 18:00 -> 06:00 one across 33%.
 */
const getGrabbedDayColumn = (segment: DragSegment, fraction: number): Dayjs => {
	const firstColumn = segment.start.startOf('day')
	// `end` is exclusive (#248), so back off an instant before taking the day.
	const lastColumn = segment.end.subtract(1, 'millisecond').startOf('day')
	const columnCount = lastColumn.diff(firstColumn, 'day') + 1
	const grabbedIndex = Math.floor(fraction * columnCount)
	const clampedIndex = Math.min(Math.max(0, grabbedIndex), columnCount - 1)
	return firstColumn.add(clampedIndex, 'day')
}

/**
 * The grab as whole slots into the event. Clamped to the last slot, so grabbing
 * the bar's final pixel grabs its final slot rather than one past the event.
 */
const getGrabbedMinutesInto = (
	activeEvent: CalendarEvent,
	grabbedAt: Dayjs,
	slotDurationMinutes: number
): number => {
	const eventMinutes = activeEvent.end.diff(activeEvent.start, 'minute')
	const lastSlotStart = Math.max(0, eventMinutes - slotDurationMinutes)
	const grabbedMinutes = grabbedAt.diff(activeEvent.start, 'minute')
	const snapped =
		Math.floor(grabbedMinutes / slotDurationMinutes) * slotDurationMinutes
	return Math.min(Math.max(0, snapped), lastSlotStart)
}

/**
 * The grab as whole days into the event. Counted between calendar days rather
 * than by elapsed hours, so a bar grabbed anywhere inside a day reports that
 * day. Clamped to the last day the event occupies: `end` is exclusive (#248),
 * so a Jan 1 -> Jan 4 event occupies Jan 1 through Jan 3.
 */
const getGrabbedDaysInto = (
	activeEvent: CalendarEvent,
	grabbedAt: Dayjs
): number => {
	const firstDay = activeEvent.start.startOf('day')
	const lastDay = activeEvent.end.subtract(1, 'millisecond').startOf('day')
	const occupiedDays = Math.max(0, lastDay.diff(firstDay, 'day'))
	const grabbedDays = grabbedAt.startOf('day').diff(firstDay, 'day')
	return Math.min(Math.max(0, grabbedDays), occupiedDays)
}
