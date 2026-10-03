import type { CalendarEvent, Resource } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { type Context, createContext, type ReactNode } from 'react'
import type { EventFormProps } from '@/features/calendar/components/event-form/event-form'
import type { CalendarEngineReturn } from '@/features/calendar/hooks/use-calendar-engine'
import type {
	CalendarClassesOverride,
	CellInfo,
	EventSegment,
	RenderCurrentTimeIndicatorProps,
	SlotDuration,
} from '@/features/calendar/types'
import type { TimeFormat } from '@/types'

/**
 * The internal calendar context. Extends the engine's full return (state,
 * navigation, CRUD, plugin runtime) and adds the presentation/config props the
 * provider threads through from IlamyCalendar. The public, curated surface is
 * `IlamyCalendarApi` (see use-smart-calendar-context).
 */
export interface CalendarContextType extends CalendarEngineReturn {
	renderEvent?: (event: CalendarEvent, segment: EventSegment) => ReactNode
	onEventClick: (event: CalendarEvent) => void
	onCellClick: (info: CellInfo) => void
	isCellDisabled?: (info: CellInfo) => boolean
	getCellClassName?: (info: CellInfo) => string
	locale?: string
	timezone?: string
	disableCellClick?: boolean
	disableEventClick?: boolean
	disableDragAndDrop?: boolean
	eventSpacing: number
	eventHeight: number
	stickyViewHeader: boolean
	viewHeaderClassName: string
	headerComponent?: ReactNode // Optional custom header component
	headerClassName?: string // Optional custom header class
	renderEventForm?: (props: EventFormProps) => ReactNode
	onMoreEventsClick?: (day: Dayjs, events: CalendarEvent[]) => void
	timeFormat: TimeFormat
	classesOverride?: CalendarClassesOverride
	renderCurrentTimeIndicator?: (
		props: RenderCurrentTimeIndicatorProps
	) => ReactNode
	renderHour?: (date: Dayjs) => ReactNode
	hideNonBusinessHours?: boolean
	hideExportButton?: boolean
	hiddenDays?: Set<number>
	slotDuration: SlotDuration
	scrollTime?: string
	scrollToNow?: boolean
	/** Custom render for resource header cells (resource axis presentation). */
	renderResource?: (resource: Resource) => ReactNode
}

// CalendarContext is kept for internal Provider usage
export const CalendarContext: Context<CalendarContextType | undefined> =
	createContext<CalendarContextType | undefined>(undefined)
