import type { CalendarEvent, EventDropInfo } from '@ilamy/types'
import { type Context, createContext } from 'react'
import type { CalendarEngineReturn } from '@/hooks/use-calendar-engine'
import type { TimeFormat } from '@/types'
import type {
	CellInfo,
	IlamyCalendarProps,
	SlotDuration,
	WeekNumberCalculation,
} from '@/types/calendar.types'

/** One `scrollToTime(time)` call; a new object each call, so a repeat is a new request. */
export interface ScrollRequest {
	time: string
}

export interface CalendarContextType
	extends CalendarEngineReturn,
		Pick<
			IlamyCalendarProps,
			| 'renderEvent'
			| 'isCellDisabled'
			| 'getCellClassName'
			| 'locale'
			| 'timezone'
			| 'disableCellClick'
			| 'disableEventClick'
			| 'editable'
			| 'eventStartEditable'
			| 'eventDurationEditable'
			| 'eventResizableFromStart'
			| 'eventConstraint'
			| 'selectConstraint'
			| 'headerComponent'
			| 'headerClassName'
			| 'renderEventForm'
			| 'onMoreEventsClick'
			| 'slotHeaderFormat'
			| 'eventTimeFormat'
			| 'displayEventTime'
			| 'displayEventEnd'
			| 'dayHeaderFormat'
			| 'titleFormat'
			| 'classesOverride'
			| 'renderCurrentTimeIndicator'
			| 'renderHour'
			| 'hideNonBusinessHours'
			| 'scrollTime'
			| 'scrollToNow'
			| 'weekNumbers'
			| 'renderResource'
			| 'snapDuration'
			| 'slotMaxTime'
			| 'slotMinTime'
		> {
	onEventClick: (event: CalendarEvent) => void
	onCellClick: (info: CellInfo) => void
	eventAllow?: (
		dropInfo: EventDropInfo,
		draggedEvent: CalendarEvent
	) => boolean | undefined
	eventSpacing: number
	eventHeight: number
	stickyViewHeader: boolean
	viewHeaderClassName: string
	hiddenDays?: Set<number>
	timeFormat: TimeFormat
	explicitTimeFormat?: TimeFormat
	slotDuration: SlotDuration
	allDaySlot: boolean
	nowIndicator: boolean
	weekNumberCalculation: WeekNumberCalculation
	scrollRequest?: ScrollRequest
	scrollToTime: (time: string) => void
}

export const CalendarContext: Context<CalendarContextType | undefined> =
	createContext<CalendarContextType | undefined>(undefined)
