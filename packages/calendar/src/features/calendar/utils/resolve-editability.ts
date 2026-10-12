import type { CalendarEvent } from '@ilamy/types'

export interface CalendarEditFlags {
	editable?: boolean
	eventStartEditable?: boolean
	/**
	 * Deprecated alias of `editable={false}`. It only sets the `editable`
	 * default, so an explicit `eventStartEditable` still enables moving.
	 */
	disableDragAndDrop?: boolean
}

type EventEditFlags = Pick<CalendarEvent, 'editable' | 'startEditable'>

/**
 * Whether an event can be moved, resolved the way FullCalendar does (v7.1.1
 * `component-util/event-ui.ts:61-94`): within a level the specific flag beats
 * `editable`, and the event beats the calendar. Pass `{}` as the event to ask
 * about the calendar level alone.
 */
export const resolveStartEditable = (
	event: EventEditFlags,
	calendar: CalendarEditFlags
): boolean => {
	const isEditableByCalendar = calendar.editable ?? !calendar.disableDragAndDrop
	const isStartEditableByCalendar =
		calendar.eventStartEditable ?? isEditableByCalendar
	const isStartEditableByEvent = event.startEditable ?? event.editable
	return isStartEditableByEvent ?? isStartEditableByCalendar
}
