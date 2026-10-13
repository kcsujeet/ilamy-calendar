import type { CalendarEvent, EventDropInfo } from '@ilamy/types'
import { type Context, createContext } from 'react'
import type { CalendarEngineReturn } from '@/features/calendar/hooks/use-calendar-engine'
import type {
	CellInfo,
	IlamyCalendarProps,
	SlotDuration,
	WeekNumberCalculation,
} from '@/features/calendar/types'
import type { TimeFormat } from '@/types'

/**
 * The internal calendar context. Extends the engine's full return (state,
 * navigation, CRUD, plugin runtime) and adds the presentation/config props the
 * provider threads through from IlamyCalendar. The public, curated surface is
 * `IlamyCalendarApi` (see use-smart-calendar-context).
 */
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
			| 'disableDragAndDrop'
			| 'editable'
			| 'eventStartEditable'
			| 'eventDurationEditable'
			| 'eventResizableFromStart'
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
			| 'hideExportButton'
			| 'scrollTime'
			| 'scrollToNow'
			| 'weekNumbers'
			| 'renderResource'
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
	/** `timeFormat` only when the consumer passed one; undefined lets the locale decide. */
	explicitTimeFormat?: TimeFormat
	slotDuration: SlotDuration
	allDaySlot: boolean
	nowIndicator: boolean
	weekNumberCalculation: WeekNumberCalculation
}

// CalendarContext is kept for internal Provider usage
export const CalendarContext: Context<CalendarContextType | undefined> =
	createContext<CalendarContextType | undefined>(undefined)
