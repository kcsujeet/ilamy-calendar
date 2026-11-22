import { type Context, createContext } from 'react'
import type { CalendarContextType } from '@/stores/calendar-context'

export type CalendarCellContextType = Pick<
	CalendarContextType,
	| 'currentDate'
	| 'view'
	| 'timezone'
	| 'eventSpacing'
	| 'businessHours'
	| 'getResourceById'
	| 'onCellClick'
	| 'isCellDisabled'
	| 'getCellClassName'
	| 'disableCellClick'
	| 'classesOverride'
	| 'snapDuration'
>

export const CalendarCellContext: Context<CalendarCellContextType | undefined> =
	createContext<CalendarCellContextType | undefined>(undefined)
