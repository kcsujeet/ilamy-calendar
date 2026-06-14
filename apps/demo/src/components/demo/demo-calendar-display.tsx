import type {
	CalendarClassesOverride,
	CalendarEvent,
	CalendarView,
	CellInfo,
	Dayjs,
	IlamyPlugin,
	RenderCurrentTimeIndicatorProps,
	Resource,
	SlotDuration,
	TimeFormat,
	WeekDays,
} from '@ilamy/calendar'
import { dayjs, IlamyCalendar } from '@ilamy/calendar'
import { Card, CardContent, CardHeader } from '@ilamy/ui/components/card'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import {
	createRenderEvent,
	renderCurrentTimeIndicator,
	renderHour,
} from './demo-custom-renderers'
import {
	createDemoPlugins,
	handleDateClick,
	handleEventAdd,
	handleEventClick,
	handleEventDelete,
	handleEventUpdate,
	handleResourceEventClick,
} from './demo-data'
import { type DemoSettingsValues, defaultSettings } from './demo-settings-form'

const customCalendarClassesOverride: CalendarClassesOverride = {
	disabledCell:
		'bg-red-50 dark:bg-red-950 text-red-400 dark:text-red-600 pointer-events-none opacity-50',
}

const BUSINESS_DAYS: WeekDays[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
]

type RenderEvent = (event: CalendarEvent) => React.ReactNode
type RenderHour = (date: Dayjs) => React.ReactNode
type RenderTimeIndicator = (
	props: RenderCurrentTimeIndicatorProps
) => React.ReactNode
type CellClickHandler = (info: CellInfo) => void
type EventClickHandler = (event: CalendarEvent) => void

// Props shared by both calendar variants after the demo toggles have been
// resolved to concrete values (or undefined) in DemoCalendarDisplay.
type SharedCalendarProps = {
	businessHours: {
		daysOfWeek: WeekDays[]
		startTime: number
		endTime: number
	}[]
	classesOverride: CalendarClassesOverride | undefined
	dayMaxEvents: number
	plugins: IlamyPlugin[]
	disableCellClick: boolean
	disableDragAndDrop: boolean
	disableEventClick: boolean
	eventHeight: number
	firstDayOfWeek: WeekDays
	hiddenDays: WeekDays[]
	hideNonBusinessHours: boolean
	initialDate: Dayjs | undefined
	locale: string
	scrollTime: string | undefined
	slotDuration: SlotDuration
	stickyViewHeader: boolean
	timeFormat: TimeFormat
	timezone: string
	onCellClick: CellClickHandler | undefined
	onDateChange: (date: Dayjs) => void
	renderEvent: RenderEvent | undefined
	renderHour: RenderHour | undefined
	renderCurrentTimeIndicator: RenderTimeIndicator | undefined
}

type RegularCalendarProps = SharedCalendarProps & {
	calendarKey: string
	initialView: CalendarView
	customEvents: CalendarEvent[]
	onEventClick: EventClickHandler | undefined
}

function RegularCalendar({
	businessHours,
	classesOverride,
	dayMaxEvents,
	plugins,
	disableCellClick,
	disableDragAndDrop,
	disableEventClick,
	eventHeight,
	firstDayOfWeek,
	hiddenDays,
	hideNonBusinessHours,
	initialDate,
	locale,
	scrollTime,
	slotDuration,
	stickyViewHeader,
	timeFormat,
	timezone,
	onCellClick,
	onDateChange,
	renderEvent,
	renderHour: hourRenderer,
	renderCurrentTimeIndicator: timeIndicator,
	calendarKey,
	initialView,
	customEvents,
	onEventClick,
}: RegularCalendarProps) {
	return (
		<IlamyCalendar
			businessHours={businessHours}
			classesOverride={classesOverride}
			dayMaxEvents={dayMaxEvents}
			disableCellClick={disableCellClick}
			disableDragAndDrop={disableDragAndDrop}
			disableEventClick={disableEventClick}
			eventHeight={eventHeight}
			events={customEvents}
			firstDayOfWeek={firstDayOfWeek}
			hiddenDays={hiddenDays}
			hideNonBusinessHours={hideNonBusinessHours}
			initialDate={initialDate}
			initialView={initialView}
			key={calendarKey}
			locale={locale}
			onCellClick={onCellClick}
			onDateChange={onDateChange}
			onEventAdd={handleEventAdd}
			onEventClick={onEventClick}
			onEventDelete={handleEventDelete}
			onEventUpdate={handleEventUpdate}
			plugins={plugins}
			renderCurrentTimeIndicator={timeIndicator}
			renderEvent={renderEvent}
			renderHour={hourRenderer}
			scrollTime={scrollTime}
			slotDuration={slotDuration}
			stickyViewHeader={stickyViewHeader}
			timeFormat={timeFormat}
			timezone={timezone}
		/>
	)
}

type ResourceCalendarProps = SharedCalendarProps & {
	calendarKey: string
	resourceInitialView: CalendarView
	orientation: 'horizontal' | 'vertical'
	weekViewGranularity: 'hourly' | 'daily'
	resourceEvents: CalendarEvent[]
	activeResources: Resource[]
	onEventClick: EventClickHandler | undefined
}

function ResourceCalendar({
	businessHours,
	classesOverride,
	dayMaxEvents,
	plugins,
	disableCellClick,
	disableDragAndDrop,
	disableEventClick,
	eventHeight,
	firstDayOfWeek,
	hiddenDays,
	hideNonBusinessHours,
	initialDate,
	locale,
	scrollTime,
	slotDuration,
	stickyViewHeader,
	timeFormat,
	timezone,
	onCellClick,
	onDateChange,
	renderEvent,
	renderHour: hourRenderer,
	renderCurrentTimeIndicator: timeIndicator,
	calendarKey,
	resourceInitialView,
	orientation,
	weekViewGranularity,
	resourceEvents,
	activeResources,
	onEventClick,
}: ResourceCalendarProps) {
	return (
		<IlamyCalendar
			businessHours={businessHours}
			classesOverride={classesOverride}
			dayMaxEvents={dayMaxEvents}
			disableCellClick={disableCellClick}
			disableDragAndDrop={disableDragAndDrop} // No year view for resource calendar
			disableEventClick={disableEventClick}
			eventHeight={eventHeight}
			events={resourceEvents}
			firstDayOfWeek={firstDayOfWeek}
			hiddenDays={hiddenDays}
			hideNonBusinessHours={hideNonBusinessHours}
			initialDate={initialDate}
			initialView={resourceInitialView}
			key={`resource-${calendarKey}-${orientation}`}
			locale={locale}
			onCellClick={onCellClick}
			onDateChange={onDateChange}
			onEventAdd={handleEventAdd}
			onEventClick={onEventClick}
			onEventDelete={handleEventDelete}
			onEventUpdate={handleEventUpdate}
			orientation={orientation}
			plugins={plugins}
			renderCurrentTimeIndicator={timeIndicator}
			renderEvent={renderEvent}
			renderHour={hourRenderer}
			resources={activeResources}
			scrollTime={scrollTime}
			slotDuration={slotDuration}
			stickyViewHeader={stickyViewHeader}
			timeFormat={timeFormat}
			timezone={timezone}
			weekViewGranularity={weekViewGranularity}
		/>
	)
}

// Only the data that doesn't live in the settings form. Everything else is read
// from the form context via useWatch.
type DemoCalendarDisplayProps = {
	customEvents: CalendarEvent[]
	resourceEvents: CalendarEvent[]
	activeResources: Resource[]
}

// Resolve the form settings + optional toggles into the concrete props both
// calendar branches share. Kept standalone to keep the component body small.
function resolveSharedCalendarProps(
	values: DemoSettingsValues,
	plugins: IlamyPlugin[],
	onDateChange: (date: Dayjs) => void
): SharedCalendarProps {
	return {
		businessHours: [
			{
				daysOfWeek: BUSINESS_DAYS,
				startTime: values.businessStartTime,
				endTime: values.businessEndTime,
			},
		],
		dayMaxEvents: values.dayMaxEvents,
		plugins,
		disableCellClick: values.disableCellClick,
		disableDragAndDrop: values.disableDragAndDrop,
		disableEventClick: values.disableEventClick,
		eventHeight: values.eventHeight,
		firstDayOfWeek: values.firstDayOfWeek,
		hiddenDays: values.hiddenDays,
		hideNonBusinessHours: values.hideNonBusinessHours,
		initialDate: values.initialDate ? dayjs(values.initialDate) : undefined,
		locale: values.locale,
		scrollTime: values.scrollTime === 'none' ? undefined : values.scrollTime,
		slotDuration: values.slotDuration,
		stickyViewHeader: values.stickyViewHeader,
		timeFormat: values.timeFormat,
		timezone: values.timezone,
		onDateChange,
		classesOverride: values.useCustomClasses
			? customCalendarClassesOverride
			: undefined,
		onCellClick: values.useCustomOnDateClick ? handleDateClick : undefined,
		renderEvent: values.useCustomEventRenderer
			? createRenderEvent(values.eventHeight)
			: undefined,
		renderHour: values.useCustomHourRenderer ? renderHour : undefined,
		renderCurrentTimeIndicator: values.useCustomTimeIndicator
			? renderCurrentTimeIndicator
			: undefined,
	}
}

export function DemoCalendarDisplay({
	customEvents,
	resourceEvents,
	activeResources,
}: DemoCalendarDisplayProps) {
	const { control, setValue } = useFormContext<DemoSettingsValues>()
	// useWatch (no name) returns a deep-partial; merge over the defaults to get a
	// fully-defined value object (every field is always present at runtime).
	const watched = useWatch({ control })
	const values: DemoSettingsValues = { ...defaultSettings, ...watched }

	// Rebuild the plugins array only when the agenda window changes so the
	// calendar's `plugins` prop stays referentially stable.
	const plugins = useMemo(
		() => createDemoPlugins(values.agendaWindow),
		[values.agendaWindow]
	)
	// Write the calendar's navigated date back into the form so it persists
	// across view-type switches (issue #172 repro).
	const onDateChange = (date: Dayjs) =>
		setValue('initialDate', date.toISOString())
	const shared = resolveSharedCalendarProps(values, plugins, onDateChange)

	// year and agenda are not resource-axis views; fall back to month on the resource calendar.
	const isResourceOnlyFallback =
		values.initialView === 'year' || values.initialView === 'agenda'
	const resourceInitialView = isResourceOnlyFallback
		? 'month'
		: values.initialView
	const regularEventClick = values.useCustomOnEventClick
		? handleEventClick
		: undefined
	const resourceEventClick = values.useCustomOnEventClick
		? handleResourceEventClick
		: undefined
	const calendarKey = `${values.locale}-${values.initialView}-${values.timeFormat}-${values.useCustomTimeIndicator}`

	return (
		<Card className="border backdrop-blur-md shadow-lg overflow-clip relative p-2 bg-background">
			<CardHeader>
				<div className="py-3 flex items-center">
					<div className="flex space-x-1.5">
						<div className="w-3 h-3 rounded-full bg-red-400"></div>
						<div className="w-3 h-3 rounded-full bg-yellow-400"></div>
						<div className="w-3 h-3 rounded-full bg-green-400"></div>
					</div>
					<div className="mx-auto text-sm font-medium">Calendar Demo</div>
				</div>
			</CardHeader>

			<CardContent
				className="p-0 overflow-clip relative z-10"
				style={{ height: values.calendarHeight }}
			>
				{values.calendarType === 'regular' && (
					<RegularCalendar
						{...shared}
						calendarKey={calendarKey}
						customEvents={customEvents}
						initialView={values.initialView}
						onEventClick={regularEventClick}
					/>
				)}

				{values.calendarType === 'resource' && (
					<ResourceCalendar
						{...shared}
						activeResources={activeResources}
						calendarKey={calendarKey}
						onEventClick={resourceEventClick}
						orientation={values.orientation}
						resourceEvents={resourceEvents}
						resourceInitialView={resourceInitialView}
						weekViewGranularity={values.weekViewGranularity}
					/>
				)}
			</CardContent>
		</Card>
	)
}
