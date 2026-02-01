import { createContext } from 'react'
import type { EventFormProps } from '@/components/event-form/event-form'
import type { BusinessHours, CalendarEvent } from '@/components/types'
import type {
	CalendarClassesOverride,
	CellClickInfo,
	RenderCurrentTimeIndicatorProps,
} from '@/features/calendar/types'
import type { RecurrenceEditOptions } from '@/features/recurrence/types'
import type dayjs from '@/lib/configs/dayjs-config'
import type { TranslationKey } from '@/lib/translations/types'
import type { CalendarView, TimeFormat } from '@/types'

export interface CalendarContextType {
	currentDate: dayjs.Dayjs
	view: CalendarView
	events: CalendarEvent[]
	rawEvents: CalendarEvent[] // Unprocessed events for export
	isEventFormOpen: boolean
	selectedEvent: CalendarEvent | null
	selectedDate: dayjs.Dayjs | null
	firstDayOfWeek: number // 0 for Sunday, 1 for Monday, etc.
	setCurrentDate: (date: dayjs.Dayjs) => void
	selectDate: (date: dayjs.Dayjs) => void
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
	getEventsForDateRange: (
		startDate: dayjs.Dayjs,
		endDate: dayjs.Dayjs
	) => CalendarEvent[]
	findParentRecurringEvent: (event: CalendarEvent) => CalendarEvent | null
	renderEvent?: (event: CalendarEvent) => React.ReactNode
	onEventClick: (event: CalendarEvent) => void
	onCellClick: (info: CellClickInfo) => void
	currentLocale?: string
	disableCellClick?: boolean
	disableEventClick?: boolean
	disableDragAndDrop?: boolean
	dayMaxEvents: number
	eventSpacing: number
	stickyViewHeader: boolean
	viewHeaderClassName: string
	headerComponent?: React.ReactNode // Optional custom header component
	headerClassName?: string // Optional custom header class
	businessHours?: BusinessHours | BusinessHours[]
	renderEventForm?: (props: EventFormProps) => React.ReactNode
	// Translation function
	t: (key: TranslationKey) => string
	timeFormat: TimeFormat
	classesOverride?: CalendarClassesOverride
	renderCurrentTimeIndicator?: (
		props: RenderCurrentTimeIndicatorProps
	) => React.ReactNode
	hideNonBusinessHours?: boolean
}

// CalendarContext is kept for internal Provider usage
export const CalendarContext: React.Context<CalendarContextType | undefined> =
	createContext<CalendarContextType | undefined>(undefined)
