// The public event model (CalendarEvent, WeekDays, BusinessHours) now lives in
// the shared `@ilamy/types` package, the lightweight contract a plugin depends
// on. Re-exported here so the existing `@/components/types` call sites across
// core stay unchanged. `ProcessedCalendarEvent` is internal to the layout
// engine and stays here.
export type {
	BusinessHours,
	CalendarEvent,
	WeekDays,
} from '@ilamy/types'

import type { CalendarEvent } from '@ilamy/types'

/**
 * Extended calendar event interface with calculated positioning properties.
 * Used internally by the calendar rendering engine to position events on the grid.
 *
 * @internal This interface is used by the calendar layout system and should not be used directly
 */
export interface ProcessedCalendarEvent extends CalendarEvent {
	/** Left position as a percentage of the container width (0-100) */
	left: number
	/** Width as a percentage of the container width (0-100) */
	width: number
	/** Top position as a percentage of the container height (0-100) */
	top: number
	/** Height as a percentage of the container height (0-100) */
	height: number
}
