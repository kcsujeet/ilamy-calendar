import type {
	CalendarView,
	SlotDuration,
	TimeFormat,
	WeekDays,
} from '@ilamy/calendar'
import type { AgendaWindow } from '@ilamy/calendar/plugins/agenda'

// The single react-hook-form shape backing the demo settings panel. Every
// control in CalendarSettings reads/writes one of these fields.
export interface DemoSettingsValues {
	calendarType: 'regular' | 'resource'
	orientation: 'horizontal' | 'vertical'
	weekViewGranularity: 'hourly' | 'daily'
	firstDayOfWeek: WeekDays
	initialView: CalendarView
	agendaWindow: AgendaWindow
	// ISO string (or undefined for "today"). Stored as a string rather than a
	// Dayjs because react-hook-form's typing can't resolve the Dayjs class.
	initialDate: string | undefined
	locale: string
	timezone: string
	calendarHeight: string
	dayMaxEvents: number
	eventHeight: number
	timeFormat: TimeFormat
	slotDuration: SlotDuration
	// 'none' (no auto-scroll) or an ISO-ish 'HH:00:00'. Mapped to undefined for
	// the calendar's `scrollTime` prop in the display.
	scrollTime: string
	businessStartTime: number
	businessEndTime: number
	hiddenDays: WeekDays[]
	stickyViewHeader: boolean
	hideNonBusinessHours: boolean
	useCustomEventRenderer: boolean
	useCustomTimeIndicator: boolean
	useCustomHourRenderer: boolean
	useCustomOnDateClick: boolean
	useCustomOnEventClick: boolean
	disableCellClick: boolean
	disableEventClick: boolean
	disableDragAndDrop: boolean
	useCustomClasses: boolean
}

export const defaultSettings: DemoSettingsValues = {
	calendarType: 'regular',
	orientation: 'horizontal',
	weekViewGranularity: 'hourly',
	firstDayOfWeek: 'sunday',
	initialView: 'month',
	agendaWindow: 'week',
	initialDate: undefined,
	locale: 'en',
	timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	calendarHeight: '600px',
	dayMaxEvents: 3,
	eventHeight: 24,
	timeFormat: '12-hour',
	slotDuration: 60,
	scrollTime: 'none',
	businessStartTime: 9,
	businessEndTime: 17,
	hiddenDays: [],
	stickyViewHeader: true,
	hideNonBusinessHours: false,
	useCustomEventRenderer: false,
	useCustomTimeIndicator: false,
	useCustomHourRenderer: false,
	useCustomOnDateClick: false,
	useCustomOnEventClick: false,
	disableCellClick: false,
	disableEventClick: false,
	disableDragAndDrop: false,
	useCustomClasses: false,
}
