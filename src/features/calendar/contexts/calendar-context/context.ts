import { createContext } from 'react'
import type { EventFormProps } from '@/components/event-form/event-form'
import type { BusinessHours, CalendarEvent } from '@/components/types'
import type {
	CalendarClassesOverride,
	CellInfo,
	RenderCurrentTimeIndicatorProps,
	SlotDuration,
} from '@/features/calendar/types'
import type { IlamyPlugin, PluginView } from '@/features/plugins/lib/types'
import type { RecurrenceEditOptions } from '@/features/plugins/recurrence/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import type { TranslatorFunction } from '@/lib/translations/types'
import type { CalendarView, TimeFormat } from '@/types'

export interface CalendarContextType {
	currentDate: Dayjs
	view: CalendarView
	events: CalendarEvent[]
	rawEvents: CalendarEvent[] // Unprocessed events for export
	isEventFormOpen: boolean
	selectedEvent: CalendarEvent | null
	selectedDate: Dayjs | null
	firstDayOfWeek: number // 0 for Sunday, 1 for Monday, etc.
	setCurrentDate: (date: Dayjs) => void
	selectDate: (date: Dayjs) => void
	setView: (view: CalendarView) => void
	nextPeriod: () => void
	prevPeriod: () => void
	today: () => void
	addEvent: (event: CalendarEvent) => void
	updateEvent: (eventId: string | number, event: Partial<CalendarEvent>) => void
	updateRecurringEvent: (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>,
		options: RecurrenceEditOptions
	) => void
	deleteEvent: (eventId: string | number) => void
	deleteRecurringEvent: (
		event: CalendarEvent,
		options: RecurrenceEditOptions
	) => void
	openEventForm: (eventData?: Partial<CalendarEvent>) => void
	closeEventForm: () => void
	getEventsForDateRange: (startDate: Dayjs, endDate: Dayjs) => CalendarEvent[]
	getEventManager: (event: CalendarEvent) => IlamyPlugin | undefined
	renderSlot: (slotName: string, context: unknown) => React.ReactNode[]
	collect: (point: string, context: unknown) => unknown[]
	findParentRecurringEvent: (event: CalendarEvent) => CalendarEvent | null
	getViews: () => PluginView[]
	renderEvent?: (event: CalendarEvent) => React.ReactNode
	onEventClick: (event: CalendarEvent) => void
	onCellClick: (info: CellInfo) => void
	isCellDisabled?: (info: CellInfo) => boolean
	currentLocale?: string
	timezone?: string
	disableCellClick?: boolean
	disableEventClick?: boolean
	disableDragAndDrop?: boolean
	dayMaxEvents: number
	eventSpacing: number
	eventHeight: number
	stickyViewHeader: boolean
	viewHeaderClassName: string
	headerComponent?: React.ReactNode // Optional custom header component
	headerClassName?: string // Optional custom header class
	businessHours?: BusinessHours | BusinessHours[]
	renderEventForm?: (props: EventFormProps) => React.ReactNode
	// Translation function
	t: TranslatorFunction
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
}

// CalendarContext is kept for internal Provider usage
export const CalendarContext: React.Context<CalendarContextType | undefined> =
	createContext<CalendarContextType | undefined>(undefined)
