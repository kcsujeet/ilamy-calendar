import { type Context, createContext } from 'react'
import type { CalendarContextType } from '../calendar-context/calendar-context'

/**
 * The fields a grid cell draws from, and nothing else. A time grid has
 * thousands of cells (a 15-minute week over six rooms has ~4,000), and every
 * change to CalendarContext re-renders each of its consumers; so cells read
 * this narrower value, which changes only when one of these fields does. Adding
 * or moving an event, for one, changes none of them.
 */
export type CalendarCellContextType = Pick<
	CalendarContextType,
	| 'currentDate'
	| 'view'
	| 'eventSpacing'
	| 'businessHours'
	| 'getResourceById'
	| 'onCellClick'
	| 'isCellDisabled'
	| 'getCellClassName'
	| 'disableDragAndDrop'
	| 'disableCellClick'
	| 'classesOverride'
>

export const CalendarCellContext: Context<CalendarCellContextType | undefined> =
	createContext<CalendarCellContextType | undefined>(undefined)
