import type { DragEndEvent } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'

type ResourceId = string | number

export interface DropCellData {
	type: 'day-cell' | 'time-cell'
	start: Dayjs
	resourceId?: ResourceId
	allDay?: boolean
	disabled?: boolean
}

interface CalendarDragData {
	type: 'calendar-event'
	event: CalendarEvent
	sourceResourceId?: ResourceId
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
	dragOrigin: DropCellData | null
) => {
	const { active, over } = event
	const activeData = active.data.current as CalendarDragData | undefined
	const data = over?.data.current as DropCellData | undefined

	if (
		activeData?.type !== 'calendar-event' ||
		!activeData.event ||
		!data ||
		data.disabled
	) {
		return null
	}

	const activeEvent = activeData.event
	const isTimeCell = data.type === 'time-cell'
	const { resourceId, allDay } = data
	const targetStart = data.start

	let targetAllDay = activeEvent.allDay
	if (allDay !== undefined) {
		targetAllDay = allDay
	}
	if (isTimeCell) {
		targetAllDay = false
	}
	const originAllDay =
		dragOrigin?.type === 'time-cell'
			? false
			: (dragOrigin?.allDay ?? activeEvent.allDay)
	let newStart = targetStart

	if (dragOrigin && originAllDay === targetAllDay) {
		const cellDelta = targetStart.valueOf() - dragOrigin.start.valueOf()
		newStart = dayjs(activeEvent.start.valueOf() + cellDelta)
	}

	const eventDelta = newStart.valueOf() - activeEvent.start.valueOf()
	const newEnd = dayjs(activeEvent.end.valueOf() + eventDelta)

	// Update the event with new times and resource if changed
	const updates = {
		start: newStart,
		end: newEnd,
		...getResourceUpdates(activeEvent, activeData.sourceResourceId, resourceId),
		allDay: targetAllDay,
	}
	return { activeEvent, updates }
}
