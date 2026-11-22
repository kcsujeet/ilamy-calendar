import type {
	BusinessHours,
	CalendarConstraint,
	CalendarEvent,
	CalendarEventInput,
	CalendarSlotProps,
	CalendarView,
	CellInfo,
	DateRange,
	EventDropInfo,
	EventSegment,
	EventsChange,
	IlamyPlugin,
	IsoDateString,
	PublicDateInput,
	Resource,
	SlotDuration,
	SnapDuration,
	TimeFormat,
	Translations,
	TranslatorFunction,
	WeekDays,
	WeekNumberCalculation,
} from '@ilamy/types'
import type {
	ButtonHTMLAttributes,
	ComponentType,
	CSSProperties,
	InputHTMLAttributes,
	LabelHTMLAttributes,
	ReactNode,
	Ref,
	TextareaHTMLAttributes,
} from 'react'
import type { IlamyCalendarApi } from '@/hooks/use-smart-calendar-context'

export interface EventFormProps {
	open?: boolean
	selectedEvent?: CalendarEvent | null
	onAdd?: (event: CalendarEvent) => void
	onUpdate?: (event: CalendarEvent) => void
	onDelete?: (event: CalendarEvent) => void
	onClose: () => void
}

export type {
	CalendarConstraint,
	CalendarSlotProps,
	CellInfo,
	DateRange,
	EventSegment,
	SlotDuration,
	SnapDuration,
	WeekNumberCalculation,
}

/** Public-facing event input accepting ISO strings or native `Date` objects. */
export type IlamyCalendarPropEvent = CalendarEventInput

/** Custom class names for overriding default calendar element styles. */
export interface CalendarClassesOverride {
	disabledCell?: string
}

/** Primitive button override props (implemented by shadcn, MUI, or custom UI kits). */
export interface CalendarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	ref?: Ref<HTMLButtonElement>
	variant?:
		'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
	size?: 'default' | 'sm' | 'lg' | 'icon'
}

export interface CalendarInputProps extends InputHTMLAttributes<HTMLInputElement> {
	ref?: Ref<HTMLInputElement>
}

export type CalendarTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export type CalendarLabelProps = LabelHTMLAttributes<HTMLLabelElement>

export interface CalendarCheckboxProps {
	id?: string
	checked: boolean
	onCheckedChange: (checked: boolean) => void
	disabled?: boolean
	className?: string
	'aria-label'?: string
}

export interface CalendarDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title?: ReactNode
	description?: ReactNode
	footer?: ReactNode
	className?: string
	onOpenAutoFocus?: () => void
	onCloseAutoFocus?: (event: Event) => void
	children: ReactNode
}

export interface CalendarSelectOption {
	value: string
	label: ReactNode
	disabled?: boolean
}

export interface CalendarSelectProps {
	id?: string
	value: string
	onValueChange: (value: string) => void
	options: CalendarSelectOption[]
	placeholder?: string
	disabled?: boolean
	className?: string
	'aria-label'?: string
}

export interface CalendarPopoverProps {
	open?: boolean
	onOpenChange?: (open: boolean) => void
	trigger: ReactNode
	content: ReactNode
	align?: 'start' | 'center' | 'end'
	className?: string
	contentStyle?: CSSProperties
}

/**
 * Swappable UI primitives so design systems (MUI, Chakra, custom kits) render
 * native dialogs, inputs, selects, and buttons without duplicating calendar views.
 */
export interface CalendarComponents {
	Button?: ComponentType<CalendarButtonProps>
	Input?: ComponentType<CalendarInputProps>
	Textarea?: ComponentType<CalendarTextareaProps>
	Label?: ComponentType<CalendarLabelProps>
	Checkbox?: ComponentType<CalendarCheckboxProps>
	Dialog?: ComponentType<CalendarDialogProps>
	Select?: ComponentType<CalendarSelectProps>
	Popover?: ComponentType<CalendarPopoverProps>
}

/** Theme bundle accepted via spread (`<IlamyCalendar {...muiTheme} />`). */
export interface CalendarThemeAdapter {
	unstyled?: boolean
	slotProps?: CalendarSlotProps
	components?: CalendarComponents
}

export type OpenEventFormInput = Partial<CalendarEvent> & {
	resource?: Resource
}

export interface RenderCurrentTimeIndicatorProps {
	/** Current time as an ISO 8601 string in the calendar's timezone. */
	currentTime: IsoDateString
	/** Start of the visible time range as an ISO 8601 string. */
	rangeStart: IsoDateString
	/** End of the visible time range as an ISO 8601 string. */
	rangeEnd: IsoDateString
	/** Progress percentage (0–100) representing position in the range. */
	progress: number
	axis?: 'vertical' | 'horizontal'
	resource?: Resource
	view: CalendarView
}

/**
 * Visible range handed to an `events` or `resources` fetcher.
 * `start` is inclusive and `end` is exclusive (RFC 5545 DTEND).
 */
export interface EventsFetchInfo {
	start: IsoDateString
	end: IsoDateString
	startStr: IsoDateString
	endStr: IsoDateString
	timezone?: string
}

export type EventsFetcher = (
	info: EventsFetchInfo,
	options: { signal: AbortSignal }
) => Promise<IlamyCalendarPropEvent[]>

export type ResourcesFetcher = (
	info: EventsFetchInfo,
	options: { signal: AbortSignal }
) => Promise<Resource[]>

export interface IlamyCalendarProps {
	ref?: Ref<IlamyCalendarApi>
	events?: IlamyCalendarPropEvent[] | EventsFetcher
	lazyFetching?: boolean
	loading?: (isLoading: boolean) => void
	onEventsError?: (error: unknown) => void
	firstDayOfWeek?: WeekDays
	initialView?: CalendarView
	initialDate?: PublicDateInput
	renderEvent?: (event: CalendarEvent, segment: EventSegment) => ReactNode
	onEventClick?: (event: CalendarEvent) => void
	onCellClick?: (info: CellInfo) => void
	isCellDisabled?: (info: CellInfo) => boolean
	getCellClassName?: (info: CellInfo) => string
	onViewChange?: (view: CalendarView) => void
	onEventAdd?: (event: CalendarEvent) => void
	onEventUpdate?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
	onEventsChange?: (change: EventsChange) => void
	onDateChange?: (date: IsoDateString, range: DateRange) => void
	locale?: string
	translations?: Translations
	translator?: TranslatorFunction
	timezone?: string
	disableCellClick?: boolean
	disableEventClick?: boolean
	/**
	 * Whether events can be moved and resized. Defaults to `false`, matching
	 * FullCalendar (`https://fullcalendar.io/docs/editable`).
	 * @default false
	 */
	editable?: boolean
	eventStartEditable?: boolean
	eventDurationEditable?: boolean
	eventResizableFromStart?: boolean
	eventAllow?: (dropInfo: EventDropInfo, draggedEvent: CalendarEvent) => boolean
	/**
	 * Constrains event moves and resizes (`'businessHours'` requires the whole
	 * moved/resized range to fit inside business hours; event form limits follow).
	 * Matches FullCalendar (`https://fullcalendar.io/docs/eventConstraint`).
	 */
	eventConstraint?: CalendarConstraint
	/**
	 * Constrains drag-to-create selections (`'businessHours'` requires the whole
	 * selected range to fit inside business hours; event form limits follow).
	 * Matches FullCalendar (`https://fullcalendar.io/docs/selectConstraint`).
	 */
	selectConstraint?: CalendarConstraint
	dayMaxEvents?: number
	eventSpacing?: number
	eventHeight?: number
	stickyViewHeader?: boolean
	viewHeaderClassName?: string
	headerComponent?: ReactNode
	headerClassName?: string
	businessHours?: BusinessHours | BusinessHours[]
	renderEventForm?: (props: EventFormProps) => ReactNode
	onMoreEventsClick?: (day: IsoDateString, events: CalendarEvent[]) => void
	timeFormat?: TimeFormat
	slotHeaderFormat?: Intl.DateTimeFormatOptions
	eventTimeFormat?: Intl.DateTimeFormatOptions
	/**
	 * Whether default event bars show the event's time. All-day events never do.
	 * Matches FullCalendar (`https://fullcalendar.io/docs/displayEventTime`).
	 * @default true
	 */
	displayEventTime?: boolean
	/**
	 * Whether default event bars also show the end time. When unset, defaults to
	 * `false` in month view and `true` in time-grid (week/day) views, matching
	 * FullCalendar (`https://fullcalendar.io/docs/displayEventEnd`).
	 */
	displayEventEnd?: boolean
	dayHeaderFormat?: Intl.DateTimeFormatOptions
	titleFormat?: Intl.DateTimeFormatOptions
	hideNonBusinessHours?: boolean
	slotMinTime?: string
	slotMaxTime?: string
	classesOverride?: CalendarClassesOverride
	/**
	 * Strips built-in Tailwind visual utility classes while keeping structural
	 * layout positioning intact, for custom design systems, MUI, or StyleX.
	 * @default false
	 */
	unstyled?: boolean
	/**
	 * Per-slot `{ className, style }` overrides for every semantic calendar part.
	 * Directly compatible with Tailwind, CSS Modules, MUI `useTheme()`, and
	 * StyleX `stylex.props(...)`.
	 */
	slotProps?: CalendarSlotProps
	/** Swappable UI primitives (Button, Dialog, Input, Select, Popover, etc.). */
	components?: CalendarComponents
	renderCurrentTimeIndicator?: (
		props: RenderCurrentTimeIndicatorProps
	) => ReactNode
	hiddenDays?: WeekDays[]
	weekends?: boolean
	renderHour?: (date: IsoDateString) => ReactNode
	slotDuration?: SlotDuration
	snapDuration?: SnapDuration
	scrollTime?: string
	scrollToNow?: boolean
	allDaySlot?: boolean
	/**
	 * Whether time grids draw the current-time line. Defaults to `false`,
	 * matching FullCalendar (`https://fullcalendar.io/docs/nowIndicator`).
	 * @default false
	 */
	nowIndicator?: boolean
	weekNumbers?: boolean
	weekNumberCalculation?: WeekNumberCalculation
	plugins?: IlamyPlugin[]
	resources?: Resource[] | ResourcesFetcher
	refetchResourcesOnNavigate?: boolean
	resourcesSet?: (resources: Resource[]) => void
	onResourcesError?: (error: unknown) => void
	renderResource?: (resource: Resource) => ReactNode
	orientation?: 'horizontal' | 'vertical'
	weekViewGranularity?: 'hourly' | 'daily'
}
