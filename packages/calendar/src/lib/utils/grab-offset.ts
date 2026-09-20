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
export const dragSegmentFor = (
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
const fractionWithin = (
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

	const hasPointer = pointer !== undefined && rectStart !== undefined
	const hasRect = (rectLength ?? 0) > 0
	if (!hasPointer || !hasRect) {
		return NO_GRAB_OFFSET
	}

	const fraction = fractionWithin(pointer, rectStart, rectLength as number)
	const segmentMinutes = segment.end.diff(segment.start, 'minute')
	const grabbedAt = segment.start.add(fraction * segmentMinutes, 'minute')

	return {
		minutes: grabbedMinutesInto(activeEvent, grabbedAt, slotDurationMinutes),
		days: grabbedDaysInto(activeEvent, grabbedAt),
	}
}

/**
 * The grab as whole slots into the event. Clamped to the last slot, so grabbing
 * the bar's final pixel grabs its final slot rather than one past the event.
 */
const grabbedMinutesInto = (
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
const grabbedDaysInto = (
	activeEvent: CalendarEvent,
	grabbedAt: Dayjs
): number => {
	const firstDay = activeEvent.start.startOf('day')
	const lastDay = activeEvent.end.subtract(1, 'millisecond').startOf('day')
	const occupiedDays = Math.max(0, lastDay.diff(firstDay, 'day'))
	const grabbedDays = grabbedAt.startOf('day').diff(firstDay, 'day')
	return Math.min(Math.max(0, grabbedDays), occupiedDays)
}
