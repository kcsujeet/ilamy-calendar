import type {
	CalendarView,
	SlotDuration,
	SnapDuration,
	TimeFormat,
	WeekDays,
	WeekNumberCalculation,
} from '@ilamy/calendar'
import type { AgendaWindow } from '@ilamy/calendar/plugins/agenda'

export type FrameworkId = 'react' | 'vue' | 'svelte' | 'solid' | 'angular'

export interface FrameworkOption {
	value: FrameworkId
	label: string
	version: string
}

export const FRAMEWORK_OPTIONS: FrameworkOption[] = [
	{ value: 'react', label: 'React', version: '19' },
	{ value: 'vue', label: 'Vue', version: '3.5' },
	{ value: 'svelte', label: 'Svelte', version: '5' },
	{ value: 'solid', label: 'Solid', version: '2' },
	{ value: 'angular', label: 'Angular', version: '22' },
]
export type CssMode = 'unstyled' | 'plain' | 'tailwind' | 'stylex'

export interface CssModeOption {
	value: CssMode
	label: string
	description: string
}

export const CSS_MODE_OPTIONS: CssModeOption[] = [
	{
		value: 'unstyled',
		label: 'Unstyled',
		description: 'base.css structure only (unstyled)',
	},
	{
		value: 'plain',
		label: 'Plain CSS',
		description: 'Built-in @ilamy/calendar/styles.css tokens',
	},
	{
		value: 'tailwind',
		label: 'Tailwind',
		description: 'unstyled + Tailwind utility slotProps.className',
	},
	{
		value: 'stylex',
		label: 'StyleX',
		description: 'StyleX tokens mapped into --ilamy-* variables',
	},
]

export type ComponentLibraryId = 'native' | 'shadcn' | 'mui' | 'custom-slot'

export interface ComponentLibraryOption {
	value: ComponentLibraryId
	label: string
	supportedFrameworks: readonly FrameworkId[]
	disabledReason?: string
}

export const COMPONENT_LIBRARY_OPTIONS: ComponentLibraryOption[] = [
	{
		value: 'native',
		label: 'Native',
		supportedFrameworks: ['react', 'vue', 'svelte', 'solid', 'angular'],
	},
	{
		value: 'shadcn',
		label: 'shadcn',
		supportedFrameworks: ['react'],
		disabledReason:
			'shadcn / Radix dialog slots require React; pick Native or Custom Slot',
	},
	{
		value: 'mui',
		label: 'MUI',
		supportedFrameworks: ['react'],
		disabledReason:
			'Material UI dialog slots require React; pick Native or Custom Slot',
	},
	{
		value: 'custom-slot',
		label: 'Custom Slot',
		supportedFrameworks: ['react', 'vue', 'svelte', 'solid', 'angular'],
	},
]

export type ThemeColorMode = 'auto' | 'light' | 'dark'
export type ThemeAccent = 'indigo' | 'emerald' | 'rose' | 'amber'
export type CalendarMode = 'regular' | 'resource' | 'multi-zone'

// The single react-hook-form shape backing the playground settings panel.
export interface PlaygroundSettings {
	// Active UI framework runtime (v4.0)
	framework: FrameworkId

	// Calendar mode + resource axis
	calendarType: CalendarMode
	orientation: 'horizontal' | 'vertical'
	weekViewGranularity: 'hourly' | 'daily'

	// Styling & component library axes (v4.0)
	cssMode: CssMode
	componentLibrary: ComponentLibraryId
	themeMode: ThemeColorMode
	themeAccent: ThemeAccent
	useCustomSlotProps: boolean

	// Opt-in plugins (v4.0)
	enableRecurrencePlugin: boolean
	enableAgendaPlugin: boolean
	enableDragToCreatePlugin: boolean
	enableYearPlugin: boolean
	enableIcalPlugin: boolean

	// View + date
	firstDayOfWeek: WeekDays
	initialView: CalendarView
	agendaWindow: AgendaWindow
	initialDate: string | undefined
	initialDateRevision: number

	// Locale / format / multi-zone
	locale: string
	timezone: string
	secondaryTimezone: string
	timeFormat: TimeFormat

	// Layout / sizing
	calendarHeight: string
	dayMaxEvents: number
	eventHeight: number
	eventSpacing: number
	slotDuration: SlotDuration
	snapDuration: SnapDuration | 0
	slotMinTime: string
	slotMaxTime: string
	scrollTime: string
	stickyViewHeader: boolean
	scrollToNow: boolean
	hideExportButton: boolean
	hiddenDays: WeekDays[]
	weekends: boolean
	allDaySlot: boolean
	nowIndicator: boolean
	weekNumbers: 'default' | 'show' | 'hide'
	weekNumberCalculation: WeekNumberCalculation
	showEventTimes: boolean
	showEventEnd: boolean

	// Business hours & constraints (v4.0)
	enableBusinessHours: boolean
	businessHoursDays: WeekDays[]
	businessHoursStart: number
	businessHoursEnd: number
	hideNonBusinessHours: boolean
	constrainEventsToBusinessHours: boolean
	constrainSelectToBusinessHours: boolean

	// Custom renderers
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
	useCustomOnMoreEventsClick: boolean
	useEventLifecycleCallbacks: boolean
	disableCellClick: boolean
	disableEventClick: boolean
	disableDragAndDrop: boolean
	eventResizableFromStart: boolean
}

export const defaultSettings: PlaygroundSettings = {
	framework: 'react',
	calendarType: 'regular',
	orientation: 'horizontal',
	weekViewGranularity: 'hourly',
	cssMode: 'plain',
	componentLibrary: 'native',
	themeMode: 'auto',
	themeAccent: 'indigo',
	useCustomSlotProps: false,
	enableRecurrencePlugin: true,
	enableAgendaPlugin: true,
	enableDragToCreatePlugin: true,
	enableYearPlugin: true,
	enableIcalPlugin: true,
	firstDayOfWeek: 'sunday',
	initialView: 'month',
	agendaWindow: 'week',
	initialDate: undefined,
	initialDateRevision: 0,
	locale: 'en',
	timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	secondaryTimezone: 'Asia/Tokyo',
	timeFormat: '12-hour',
	calendarHeight: '600px',
	dayMaxEvents: 3,
	eventHeight: 24,
	eventSpacing: 1,
	slotDuration: 60,
	snapDuration: 0,
	slotMinTime: '00:00',
	slotMaxTime: '24:00',
	scrollTime: 'none',
	stickyViewHeader: true,
	scrollToNow: true,
	hideExportButton: false,
	hiddenDays: [],
	weekends: true,
	allDaySlot: true,
	nowIndicator: true,
	weekNumbers: 'default',
	weekNumberCalculation: 'local',
	showEventTimes: true,
	showEventEnd: false,
	// Off by default; when enabled in v4.0 business hours shade non-business
	// cells without blocking drops unless eventConstraint/selectConstraint is on.
	enableBusinessHours: false,
	businessHoursDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
	businessHoursStart: 9,
	businessHoursEnd: 17,
	hideNonBusinessHours: false,
	constrainEventsToBusinessHours: false,
	constrainSelectToBusinessHours: false,
	useCustomEventRenderer: false,
	useCustomResourceRenderer: false,
	useCustomCalendarHeader: false,
	useCustomEventForm: false,
	useCustomCurrentTimeIndicator: false,
	useCustomHourRenderer: false,
	useCustomClasses: false,
	useCustomOnDateClick: false,
	useCustomOnEventClick: false,
	useCustomOnMoreEventsClick: false,
	useEventLifecycleCallbacks: true,
	disableCellClick: false,
	disableEventClick: false,
	disableDragAndDrop: false,
	eventResizableFromStart: false,
}
