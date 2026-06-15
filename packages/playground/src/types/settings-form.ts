import type {
	CalendarView,
	SlotDuration,
	TimeFormat,
	WeekDays,
} from '@ilamy/calendar'
import type { AgendaWindow } from '@ilamy/calendar/plugins/agenda'

// The single react-hook-form shape backing the playground settings panel. Every
// control in CalendarSettings reads/writes one of these fields.
export interface PlaygroundSettings {
	// Calendar type + resource axis
	calendarType: 'regular' | 'resource'
	orientation: 'horizontal' | 'vertical'
	weekViewGranularity: 'hourly' | 'daily'

	// View + date
	firstDayOfWeek: WeekDays
	initialView: CalendarView
	agendaWindow: AgendaWindow
	// ISO string (or undefined for "today"). Stored as a string rather than a
	// Dayjs because react-hook-form's typing can't resolve the Dayjs class.
	initialDate: string | undefined

	// Locale / format
	locale: string
	timezone: string
	timeFormat: TimeFormat

	// Layout / sizing
	calendarHeight: string
	dayMaxEvents: number
	eventHeight: number
	eventSpacing: number
	slotDuration: SlotDuration
	// 'none' (no auto-scroll) or an ISO-ish 'HH:00:00'. Mapped to undefined for
	// the calendar's `scrollTime` prop in the display.
	scrollTime: string
	stickyViewHeader: boolean
	hideExportButton: boolean
	hiddenDays: WeekDays[]

	// Business hours
	enableBusinessHours: boolean
	businessHoursDays: WeekDays[]
	businessHoursStart: number
	businessHoursEnd: number
	hideNonBusinessHours: boolean

	// Custom renderers / behaviors (each toggles a render-prop or callback demo)
	useCustomEventRenderer: boolean
	useCustomResourceRenderer: boolean
	useCustomCalendarHeader: boolean
	useCustomEventForm: boolean
	useCustomCurrentTimeIndicator: boolean
	useCustomHourRenderer: boolean
	useCustomClasses: boolean

	// Interaction handlers
	useCustomOnDateClick: boolean
	useCustomOnEventClick: boolean
	useEventLifecycleCallbacks: boolean
	disableCellClick: boolean
	disableEventClick: boolean
	disableDragAndDrop: boolean
}

export const defaultSettings: PlaygroundSettings = {
	calendarType: 'regular',
	orientation: 'horizontal',
	weekViewGranularity: 'hourly',
	firstDayOfWeek: 'sunday',
	initialView: 'month',
	agendaWindow: 'week',
	initialDate: undefined,
	locale: 'en',
	timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	timeFormat: '12-hour',
	calendarHeight: '600px',
	dayMaxEvents: 3,
	eventHeight: 24,
	eventSpacing: 1,
	slotDuration: 60,
	scrollTime: 'none',
	stickyViewHeader: true,
	hideExportButton: false,
	hiddenDays: [],
	enableBusinessHours: true,
	businessHoursDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
	businessHoursStart: 9,
	businessHoursEnd: 17,
	hideNonBusinessHours: false,
	useCustomEventRenderer: false,
	useCustomResourceRenderer: false,
	useCustomCalendarHeader: false,
	useCustomEventForm: false,
	useCustomCurrentTimeIndicator: false,
	useCustomHourRenderer: false,
	useCustomClasses: false,
	useCustomOnDateClick: false,
	useCustomOnEventClick: false,
	useEventLifecycleCallbacks: false,
	disableCellClick: false,
	disableEventClick: false,
	disableDragAndDrop: false,
}
