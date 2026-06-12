import type { Resource } from '@ilamy/types'
import { createContext } from 'react'
import type { CalendarEvent } from '@/components/types'
import type { EventFormProps } from '@/features/calendar/components/event-form/event-form'
import type { CalendarEngineReturn } from '@/features/calendar/hooks/use-calendar-engine'
import type {
	CalendarClassesOverride,
	CellInfo,
	RenderCurrentTimeIndicatorProps,
	SlotDuration,
} from '@/features/calendar/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import type { TimeFormat } from '@/types'

/**
 * The internal calendar context. Extends the engine's full return (state,
 * navigation, CRUD, plugin runtime) and adds the presentation/config props the
 * provider threads through from IlamyCalendar. The public, curated surface is
 * `IlamyCalendarApi` (see use-smart-calendar-context).
 */
export interface CalendarContextType extends CalendarEngineReturn {
	renderEvent?: (event: CalendarEvent) => React.ReactNode
	onEventClick: (event: CalendarEvent) => void
	onCellClick: (info: CellInfo) => void
	isCellDisabled?: (info: CellInfo) => boolean
	locale?: string
	timezone?: string
	disableCellClick?: boolean
	disableEventClick?: boolean
	disableDragAndDrop?: boolean
	eventSpacing: number
	eventHeight: number
	stickyViewHeader: boolean
	viewHeaderClassName: string
	headerComponent?: React.ReactNode // Optional custom header component
	headerClassName?: string // Optional custom header class
	renderEventForm?: (props: EventFormProps) => React.ReactNode
	timeFormat: TimeFormat
	classesOverride?: CalendarClassesOverride
	renderCurrentTimeIndicator?: (
		props: RenderCurrentTimeIndicatorProps
	) => React.ReactNode
	renderHour?: (date: Dayjs) => React.ReactNode
	hideNonBusinessHours?: boolean
	hideExportButton?: boolean
	hiddenDays?: Set<number>
	slotDuration: SlotDuration
	scrollTime?: string
	/** Custom render for resource header cells (resource axis presentation). */
	renderResource?: (resource: Resource) => React.ReactNode
}

// CalendarContext is kept for internal Provider usage
export const CalendarContext: React.Context<CalendarContextType | undefined> =
	createContext<CalendarContextType | undefined>(undefined)
