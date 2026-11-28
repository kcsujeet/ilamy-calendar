import type {
	CalendarEvent,
	CalendarSlotProps,
	CalendarSlots,
	CalendarView,
	DateRange,
	DomCalendarOptions,
	EventsChange,
	IsoDateString,
	SlotDuration,
	SnapDuration,
	TimeFormat,
	Translations,
	WeekDays,
	WeekNumberCalculation,
} from '@ilamy/calendar'
import type {
	CalendarClassesOverride,
	EventFormProps,
	IlamyPlugin,
	ReactCalendarSlots,
	RenderCurrentTimeIndicatorProps,
} from '@ilamy/calendar/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import type { PlaygroundSettings } from '../../../types/settings-form.types'
import {
	handleDateClick,
	handleEventClick,
	handleMoreEventsClick,
} from '../../../utils/demo-data.utils'
import {
	CustomCalendarHeader,
	CustomEventForm,
	createRenderEvent,
	renderCurrentTimeIndicator,
	renderHour,
} from './custom-renderers'

type BusinessHours = {
	daysOfWeek: WeekDays[]
	startTime: number
	endTime: number
}[]

export type EventHandler = (event: CalendarEvent) => void

export type LifecycleHandlers = {
	onEventAdd: EventHandler
	onEventUpdate: EventHandler
	onEventDelete: EventHandler
	onEventsChange: (change: EventsChange) => void
	onDateNavigate: (date: IsoDateString, range: DateRange) => void
}

export interface SharedCalendarProps {
	businessHours: BusinessHours | undefined
	eventConstraint: 'businessHours' | undefined
	selectConstraint: 'businessHours' | undefined
	classesOverride: CalendarClassesOverride | undefined
	dayMaxEvents: number
	eventHeight: number
	eventSpacing: number
	plugins: IlamyPlugin[]
	disableCellClick: boolean
	editable: boolean
	eventResizableFromStart: boolean
	disableEventClick: boolean
	firstDayOfWeek: WeekDays
	hiddenDays: WeekDays[]
	hideNonBusinessHours: boolean
	initialDate: IsoDateString | undefined
	locale: string
	scrollTime: string | undefined
	scrollToNow: boolean
	slotDuration: SlotDuration
	snapDuration: SnapDuration | undefined
	slotMinTime: string
	slotMaxTime: string
	weekends: boolean
	allDaySlot: boolean
	nowIndicator: boolean
	weekNumbers: boolean | undefined
	weekNumberCalculation: WeekNumberCalculation
	displayEventTime: boolean
	displayEventEnd: boolean | undefined
	stickyViewHeader: boolean
	timeFormat: TimeFormat
	timezone: string
	translations: Translations
	unstyled: boolean
	slotProps: CalendarSlotProps | undefined
	slots: ReactCalendarSlots | undefined
	headerComponent: ReactNode
	onCellClick: ((info: import('@ilamy/calendar').CellInfo) => void) | undefined
	onMoreEventsClick:
		((day: IsoDateString, events: CalendarEvent[]) => void) | undefined
	onDateChange: (date: IsoDateString, range: DateRange) => void
	onViewChange: (view: CalendarView) => void
	onEventAdd: EventHandler | undefined
	onEventUpdate: EventHandler | undefined
	onEventDelete: EventHandler | undefined
	onEventsChange: (change: EventsChange) => void
	renderEvent: ((event: CalendarEvent) => ReactNode) | undefined
	renderEventForm: ((props: EventFormProps) => ReactNode) | undefined
	renderHour: ((date: IsoDateString) => ReactNode) | undefined
	renderCurrentTimeIndicator:
		((props: RenderCurrentTimeIndicatorProps) => ReactNode) | undefined
}

const CUSTOM_CALENDAR_CLASSES_OVERRIDE: CalendarClassesOverride = {
	disabledCell:
		'bg-red-50 dark:bg-red-950 text-red-400 dark:text-red-600 pointer-events-none opacity-50',
}

const WEEK_NUMBERS_PROP = {
	default: undefined,
	show: true,
	hide: false,
} as const

export function resolveSharedCalendarProps(
	values: PlaygroundSettings,
	plugins: IlamyPlugin[],
	translations: Translations,
	themeAdapter: {
		unstyled?: boolean
		slotProps?: CalendarSlotProps
	},
	slots: ReactCalendarSlots | undefined,
	onDateChange: (date: IsoDateString, range: DateRange) => void,
	onViewChange: (view: CalendarView) => void,
	lifecycle: LifecycleHandlers
): SharedCalendarProps {
	const lifecycleOn = values.useEventLifecycleCallbacks
	let businessHours: BusinessHours | undefined
	let eventConstraint: 'businessHours' | undefined
	let selectConstraint: 'businessHours' | undefined
	if (values.enableBusinessHours) {
		businessHours = [
			{
				daysOfWeek: values.businessHoursDays,
				startTime: values.businessHoursStart,
				endTime: values.businessHoursEnd,
			},
		]
		if (values.constrainEventsToBusinessHours) {
			eventConstraint = 'businessHours'
		}
		if (values.constrainSelectToBusinessHours) {
			selectConstraint = 'businessHours'
		}
	}

	let headerComponent: ReactNode
	if (values.useCustomCalendarHeader) {
		headerComponent = createElement(CustomCalendarHeader)
	}
	let classesOverride: CalendarClassesOverride | undefined
	if (values.useCustomClasses) {
		classesOverride = CUSTOM_CALENDAR_CLASSES_OVERRIDE
	}
	let onMoreEventsClick: SharedCalendarProps['onMoreEventsClick']
	if (values.useCustomOnMoreEventsClick) {
		onMoreEventsClick = handleMoreEventsClick
	}
	let renderEvent: SharedCalendarProps['renderEvent']
	if (values.useCustomEventRenderer) {
		renderEvent = createRenderEvent(values.eventHeight)
	}
	let renderEventForm: SharedCalendarProps['renderEventForm']
	if (values.useCustomEventForm) {
		renderEventForm = (props) => createElement(CustomEventForm, props)
	}
	let renderCurrentTimeIndicatorProp: SharedCalendarProps['renderCurrentTimeIndicator']
	if (values.useCustomCurrentTimeIndicator) {
		renderCurrentTimeIndicatorProp = renderCurrentTimeIndicator
	}

	return {
		businessHours,
		eventConstraint,
		selectConstraint,
		dayMaxEvents: values.dayMaxEvents,
		eventHeight: values.eventHeight,
		eventSpacing: values.eventSpacing,
		plugins,
		disableCellClick: values.disableCellClick,
		editable: !values.disableDragAndDrop,
		eventResizableFromStart: values.eventResizableFromStart,
		disableEventClick: values.disableEventClick,
		firstDayOfWeek: values.firstDayOfWeek,
		hiddenDays: values.hiddenDays,
		hideNonBusinessHours: values.hideNonBusinessHours,
		initialDate: values.initialDate,
		locale: values.locale,
		scrollTime: values.scrollTime === 'none' ? undefined : values.scrollTime,
		scrollToNow: values.scrollToNow,
		slotDuration: values.slotDuration,
		snapDuration: values.snapDuration === 0 ? undefined : values.snapDuration,
		slotMinTime: values.slotMinTime,
		slotMaxTime: values.slotMaxTime,
		weekends: values.weekends,
		allDaySlot: values.allDaySlot,
		nowIndicator: values.nowIndicator,
		weekNumbers: WEEK_NUMBERS_PROP[values.weekNumbers],
		weekNumberCalculation: values.weekNumberCalculation,
		displayEventTime: values.showEventTimes,
		displayEventEnd: values.showEventEnd ? true : undefined,
		stickyViewHeader: values.stickyViewHeader,
		timeFormat: values.timeFormat,
		timezone: values.timezone,
		translations,
		unstyled: Boolean(themeAdapter.unstyled),
		slotProps: themeAdapter.slotProps,
		slots,
		onDateChange,
		onViewChange,
		headerComponent,
		classesOverride,
		onCellClick: values.useCustomOnDateClick ? handleDateClick : undefined,
		onMoreEventsClick,
		onEventAdd: lifecycleOn ? lifecycle.onEventAdd : undefined,
		onEventUpdate: lifecycleOn ? lifecycle.onEventUpdate : undefined,
		onEventDelete: lifecycleOn ? lifecycle.onEventDelete : undefined,
		onEventsChange: lifecycle.onEventsChange,
		renderEvent,
		renderEventForm,
		renderHour: values.useCustomHourRenderer ? renderHour : undefined,
		renderCurrentTimeIndicator: renderCurrentTimeIndicatorProp,
	}
}

export function buildDomCalendarOptions(params: {
	values: PlaygroundSettings
	shared: SharedCalendarProps
	customEvents: CalendarEvent[]
	themeAdapter:
		{ unstyled?: boolean; slotProps?: CalendarSlotProps } | undefined
	domSlots?: CalendarSlots
	onDateChange: (date: IsoDateString, range: DateRange) => void
	onViewChange: (view: CalendarView) => void
	lifecycle: Pick<
		LifecycleHandlers,
		'onEventAdd' | 'onEventUpdate' | 'onEventDelete' | 'onEventsChange'
	>
	override?: Partial<DomCalendarOptions>
}): DomCalendarOptions {
	const {
		values,
		shared,
		customEvents,
		themeAdapter,
		domSlots,
		onDateChange,
		onViewChange,
		lifecycle,
		override = {},
	} = params
	const lifecycleOn = values.useEventLifecycleCallbacks

	return {
		events: customEvents,
		initialView: values.initialView,
		initialDate: values.initialDate,
		firstDayOfWeek: values.firstDayOfWeek,
		hiddenDays: values.hiddenDays,
		weekends: values.weekends,
		timezone: values.timezone,
		locale: values.locale,
		translations: shared.translations as Partial<Record<string, string>>,
		timeFormat: values.timeFormat,
		dayMaxEvents: values.dayMaxEvents,
		eventHeight: values.eventHeight,
		eventSpacing: values.eventSpacing,
		slotDuration: values.slotDuration,
		snapDuration: values.snapDuration === 0 ? undefined : values.snapDuration,
		slotMinTime: values.slotMinTime,
		slotMaxTime: values.slotMaxTime,
		scrollTime: shared.scrollTime,
		scrollToNow: values.scrollToNow,
		allDaySlot: values.allDaySlot,
		businessHours: shared.businessHours,
		hideNonBusinessHours: values.hideNonBusinessHours,
		eventConstraint: shared.eventConstraint,
		selectConstraint: shared.selectConstraint,
		editable: !values.disableDragAndDrop,
		eventResizableFromStart: values.eventResizableFromStart,
		nowIndicator: values.nowIndicator,
		displayEventTime: values.showEventTimes,
		displayEventEnd: values.showEventEnd,
		weekNumbers: shared.weekNumbers,
		weekNumberCalculation: values.weekNumberCalculation,
		orientation: values.orientation,
		weekViewGranularity: values.weekViewGranularity,
		plugins: shared.plugins,
		stickyViewHeader: values.stickyViewHeader,
		disableCellClick: values.disableCellClick,
		disableEventClick: values.disableEventClick,
		unstyled: Boolean(themeAdapter?.unstyled),
		slotProps: themeAdapter?.slotProps,
		slots: domSlots,
		onDateChange,
		onViewChange,
		onEventAdd: lifecycleOn ? lifecycle.onEventAdd : undefined,
		onEventUpdate: lifecycleOn ? lifecycle.onEventUpdate : undefined,
		onEventDelete: lifecycleOn ? lifecycle.onEventDelete : undefined,
		onEventsChange: lifecycle.onEventsChange,
		onCellClick: values.useCustomOnDateClick ? handleDateClick : undefined,
		onEventClick: values.useCustomOnEventClick ? handleEventClick : undefined,
		...override,
	}
}
