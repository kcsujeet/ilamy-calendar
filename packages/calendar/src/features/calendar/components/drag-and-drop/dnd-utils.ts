import type { DragEndEvent } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import {
	type GrabOffset,
	NO_GRAB_OFFSET,
} from '@/features/calendar/utils/grab-offset'

export interface DropCellData {
	type?: string
	date?: Dayjs
	hour?: number
	minute?: number
	/**
	 * Length of the slot a cell with a `minute` covers. An hour cell (no
	 * `minute`) is always an hour, and a day cell has no slot.
	 */
	slotDurationMinutes?: number
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
	const eventDuration = activeEvent.end.diff(activeEvent.start, 'second')

	// An end landing on midnight is kept: `end` is exclusive (#248), so it is a
	// legitimate end and the layout paints it on the day it actually covers.
	// Snapping it back to the previous 23:59:59.999, as this used to, resized
	// the event on every drag.
	const withDuration = (start: Dayjs) => ({
		start,
		end: start.add(eventDuration, 'second'),
	})

	if (isTimeSlotDrop(data)) {
		const slotTime = dayjs(date).hour(hour).minute(minute)
		const grabbedSlot = slotTime.subtract(grabOffset.minutes, 'minute')
		return { ...withDuration(grabbedSlot), allDay: false }
	}

	// A drop changes an event's kind only when it crosses between a timed area
	// and an all-day one (FullCalendar, interaction/src/interactions/
	// EventDragging.ts:450, v6.1.21). A time slot (above) makes it timed and an
	// all-day cell makes it all-day; a whole-day cell (month, resource day grid)
	// is neither, so the event keeps its own kind. Those cells report
	// `allDay: false`, which is why this must not read `false` as "timed" (#322).
	const targetDate = dayjs(date).subtract(grabOffset.days, 'day')
	const droppedOnAllDayCell = allDay === true
	const eventIsAllDay = Boolean(activeEvent.allDay)
	const staysAllDay = droppedOnAllDayCell || eventIsAllDay

	if (staysAllDay) {
		return { ...withDuration(targetDate.startOf('day')), allDay: true }
	}

	// Rebuilt from a zoneless string rather than with `.hour()/.minute()`
	// setters. The setters hold the clock face but carry the SOURCE day's UTC
	// offset, so landing on a DST transition day serialises an hour out: the
	// grid shows 10:00 while the consumer is handed 15:00Z, where New York
	// 10:00 is 14:00Z. A string with no offset is anchored in the configured
	// zone on parse, which re-derives the offset for the TARGET day
	// (`docs/timezones.md`).
	const targetDay = targetDate.format('YYYY-MM-DD')
	const timeOfDay = activeEvent.start.format('HH:mm:ss.SSS')
	const keptTimeOfDay = dayjs(`${targetDay}T${timeOfDay}`)
	return { ...withDuration(keptTimeOfDay), allDay: false }
}

export type ResizeEdge = 'start' | 'end'

const MINUTES_PER_HOUR = 60

/**
 * A wall-clock time on a day, built from a zoneless string for the reason
 * `calculateDropTimes` gives: the setters would carry the source day's UTC
 * offset onto a day where the clocks change.
 */
const atTimeOfDay = (day: Dayjs, timeOfDay: string): Dayjs =>
	dayjs(`${day.format('YYYY-MM-DD')}T${timeOfDay}`)

const MIDNIGHT = '00:00:00.000'
const TIME_OF_DAY_FORMAT = 'HH:mm:ss.SSS'

/** The span of the time slot a pointer is over; undefined without a date. */
const getSlotSpan = (data: DropCellData) => {
	const { date, hour = 0, minute, slotDurationMinutes } = data
	if (!date) {
		return undefined
	}
	const isHourCell = minute === undefined
	const slotMinutes = isHourCell
		? MINUTES_PER_HOUR
		: (slotDurationMinutes ?? MINUTES_PER_HOUR)
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
	grabOffset: GrabOffset = NO_GRAB_OFFSET
) => {
	const { active, over } = event

	if (!active || !over || !activeEvent) {
		return null
	}

	const data = (over.data.current || {}) as DropCellData
	// Released on a cell that refuses drops: commit nothing, so the event
	// reverts to where it started.
	if (data.disabled) {
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
