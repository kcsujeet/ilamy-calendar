import type {
	CalendarClassesOverride,
	CalendarEvent,
	CalendarView,
	CellInfo,
	Dayjs,
	EventFormProps,
	IlamyPlugin,
	RenderCurrentTimeIndicatorProps,
	Resource,
	SlotDuration,
	TimeFormat,
	WeekDays,
} from '@ilamy/calendar'
import { dayjs, IlamyCalendar } from '@ilamy/calendar'
import { Card, CardContent, CardHeader } from '@ilamy/ui/components/card'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import {
	defaultSettings,
	type PlaygroundSettings,
} from '../types/settings-form'
import {
	CustomCalendarHeader,
	CustomEventForm,
	createRenderEvent,
	createRenderResource,
	renderCurrentTimeIndicator,
	renderHour,
} from '../utils/custom-renderers'
import {
	createDemoPlugins,
	handleDateClick,
	handleEventClick,
	handleMoreEventsClick,
	handleResourceEventClick,
} from '../utils/demo-data'

const customCalendarClassesOverride: CalendarClassesOverride = {
	disabledCell:
		'bg-red-50 dark:bg-red-950 text-red-400 dark:text-red-600 pointer-events-none opacity-50',
}

type BusinessHours = {
	daysOfWeek: WeekDays[]
	startTime: number
	endTime: number
}[]

type EventHandler = (event: CalendarEvent) => void

// Lifecycle mutators owned by the Playground (they edit its event state). Gated
// by the useEventLifecycleCallbacks toggle in resolveSharedCalendarProps.
type LifecycleHandlers = {
	onEventAdd: EventHandler
	onEventUpdate: EventHandler
	onEventDelete: EventHandler
}

// Props shared by both calendar variants after the toggles have been resolved
// to concrete values (or undefined) in CalendarDisplay.
type SharedCalendarProps = {
	businessHours: BusinessHours | undefined
	classesOverride: CalendarClassesOverride | undefined
	dayMaxEvents: number
	eventHeight: number
	eventSpacing: number
	hideExportButton: boolean
	plugins: IlamyPlugin[]
	disableCellClick: boolean
	disableDragAndDrop: boolean
	disableEventClick: boolean
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
	headerComponent: ReactNode
	onCellClick: ((info: CellInfo) => void) | undefined
	onMoreEventsClick: ((day: Dayjs, events: CalendarEvent[]) => void) | undefined
	onDateChange: (date: Dayjs) => void
	onEventAdd: EventHandler | undefined
	onEventUpdate: EventHandler | undefined
	onEventDelete: EventHandler | undefined
	renderEvent: ((event: CalendarEvent) => ReactNode) | undefined
	renderEventForm: ((props: EventFormProps) => ReactNode) | undefined
	renderHour: ((date: Dayjs) => ReactNode) | undefined
	renderCurrentTimeIndicator:
		| ((props: RenderCurrentTimeIndicatorProps) => ReactNode)
		| undefined
}

type RegularCalendarProps = SharedCalendarProps & {
	calendarKey: string
	initialView: CalendarView
	customEvents: CalendarEvent[]
	onEventClick: EventHandler | undefined
}

function RegularCalendar({
	calendarKey,
	initialView,
	customEvents,
	onEventClick,
	...shared
}: RegularCalendarProps) {
	return (
		<IlamyCalendar
			businessHours={shared.businessHours}
			classesOverride={shared.classesOverride}
			dayMaxEvents={shared.dayMaxEvents}
			disableCellClick={shared.disableCellClick}
			disableDragAndDrop={shared.disableDragAndDrop}
			disableEventClick={shared.disableEventClick}
			eventHeight={shared.eventHeight}
			eventSpacing={shared.eventSpacing}
			events={customEvents}
			firstDayOfWeek={shared.firstDayOfWeek}
			headerComponent={shared.headerComponent}
			hiddenDays={shared.hiddenDays}
			hideExportButton={shared.hideExportButton}
			hideNonBusinessHours={shared.hideNonBusinessHours}
			initialDate={shared.initialDate}
			initialView={initialView}
			key={calendarKey}
			locale={shared.locale}
			onCellClick={shared.onCellClick}
			onDateChange={shared.onDateChange}
			onEventAdd={shared.onEventAdd}
			onEventClick={onEventClick}
			onEventDelete={shared.onEventDelete}
			onEventUpdate={shared.onEventUpdate}
			onMoreEventsClick={shared.onMoreEventsClick}
			plugins={shared.plugins}
			renderCurrentTimeIndicator={shared.renderCurrentTimeIndicator}
			renderEvent={shared.renderEvent}
			renderEventForm={shared.renderEventForm}
			renderHour={shared.renderHour}
			scrollTime={shared.scrollTime}
			slotDuration={shared.slotDuration}
			stickyViewHeader={shared.stickyViewHeader}
			timeFormat={shared.timeFormat}
			timezone={shared.timezone}
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
	onEventClick: EventHandler | undefined
	renderResource: ((resource: Resource) => ReactNode) | undefined
}

function ResourceCalendar({
	calendarKey,
	resourceInitialView,
	orientation,
	weekViewGranularity,
	resourceEvents,
	activeResources,
	onEventClick,
	renderResource,
	...shared
}: ResourceCalendarProps) {
	return (
		<IlamyCalendar
			businessHours={shared.businessHours}
			classesOverride={shared.classesOverride}
			dayMaxEvents={shared.dayMaxEvents}
			disableCellClick={shared.disableCellClick}
			disableDragAndDrop={shared.disableDragAndDrop}
			disableEventClick={shared.disableEventClick}
			eventHeight={shared.eventHeight}
			eventSpacing={shared.eventSpacing}
			events={resourceEvents}
			firstDayOfWeek={shared.firstDayOfWeek}
			headerComponent={shared.headerComponent}
			hiddenDays={shared.hiddenDays}
			hideExportButton={shared.hideExportButton}
			hideNonBusinessHours={shared.hideNonBusinessHours}
			initialDate={shared.initialDate}
			initialView={resourceInitialView}
			key={`resource-${calendarKey}-${orientation}`}
			locale={shared.locale}
			onCellClick={shared.onCellClick}
			onDateChange={shared.onDateChange}
			onEventAdd={shared.onEventAdd}
			onEventClick={onEventClick}
			onEventDelete={shared.onEventDelete}
			onEventUpdate={shared.onEventUpdate}
			onMoreEventsClick={shared.onMoreEventsClick}
			orientation={orientation}
			plugins={shared.plugins}
			renderCurrentTimeIndicator={shared.renderCurrentTimeIndicator}
			renderEvent={shared.renderEvent}
			renderEventForm={shared.renderEventForm}
			renderHour={shared.renderHour}
			renderResource={renderResource}
			resources={activeResources}
			scrollTime={shared.scrollTime}
			slotDuration={shared.slotDuration}
			stickyViewHeader={shared.stickyViewHeader}
			timeFormat={shared.timeFormat}
			timezone={shared.timezone}
			weekViewGranularity={weekViewGranularity}
		/>
	)
}

// Data the Playground owns (event state) plus the state-aware lifecycle
// mutators. Everything else is read from the form context via useWatch.
type CalendarDisplayProps = LifecycleHandlers & {
	customEvents: CalendarEvent[]
	resourceEvents: CalendarEvent[]
	activeResources: Resource[]
}

// Resolve the form settings + optional toggles into the concrete props both
// calendar branches share. Kept standalone to keep the component body small.
function resolveSharedCalendarProps(
	values: PlaygroundSettings,
	plugins: IlamyPlugin[],
	onDateChange: (date: Dayjs) => void,
	lifecycle: LifecycleHandlers
): SharedCalendarProps {
	const lifecycleOn = values.useEventLifecycleCallbacks
	return {
		businessHours: values.enableBusinessHours
			? [
					{
						daysOfWeek: values.businessHoursDays,
						startTime: values.businessHoursStart,
						endTime: values.businessHoursEnd,
					},
				]
			: undefined,
		dayMaxEvents: values.dayMaxEvents,
		eventHeight: values.eventHeight,
		eventSpacing: values.eventSpacing,
		hideExportButton: values.hideExportButton,
		plugins,
		disableCellClick: values.disableCellClick,
		disableDragAndDrop: values.disableDragAndDrop,
		disableEventClick: values.disableEventClick,
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
		headerComponent: values.useCustomCalendarHeader ? (
			<CustomCalendarHeader />
		) : undefined,
		classesOverride: values.useCustomClasses
			? customCalendarClassesOverride
			: undefined,
		onCellClick: values.useCustomOnDateClick ? handleDateClick : undefined,
		onMoreEventsClick: values.useCustomOnMoreEventsClick
			? handleMoreEventsClick
			: undefined,
		onEventAdd: lifecycleOn ? lifecycle.onEventAdd : undefined,
		onEventUpdate: lifecycleOn ? lifecycle.onEventUpdate : undefined,
		onEventDelete: lifecycleOn ? lifecycle.onEventDelete : undefined,
		renderEvent: values.useCustomEventRenderer
			? createRenderEvent(values.eventHeight)
			: undefined,
		renderEventForm: values.useCustomEventForm
			? (props) => <CustomEventForm {...props} />
			: undefined,
		renderHour: values.useCustomHourRenderer ? renderHour : undefined,
		renderCurrentTimeIndicator: values.useCustomCurrentTimeIndicator
			? renderCurrentTimeIndicator
			: undefined,
	}
}

export function CalendarDisplay({
	customEvents,
	resourceEvents,
	activeResources,
	onEventAdd,
	onEventUpdate,
	onEventDelete,
}: CalendarDisplayProps) {
	const { control, setValue } = useFormContext<PlaygroundSettings>()
	// useWatch (no name) returns a deep-partial; merge over the defaults to get a
	// fully-defined value object (every field is always present at runtime).
	const watched = useWatch({ control })
	const values: PlaygroundSettings = { ...defaultSettings, ...watched }

	// Rebuild the plugins array only when the agenda window changes so the
	// calendar's `plugins` prop stays referentially stable.
	const plugins = useMemo(
		() => createDemoPlugins(values.agendaWindow),
		[values.agendaWindow]
	)
	// Persist the navigated date into the form so it survives view-type switches
	// (issue #172 repro).
	const onDateChange = (date: Dayjs) =>
		setValue('initialDate', date.toISOString())
	const shared = resolveSharedCalendarProps(values, plugins, onDateChange, {
		onEventAdd,
		onEventUpdate,
		onEventDelete,
	})

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
	const renderResource = values.useCustomResourceRenderer
		? createRenderResource(resourceEvents)
		: undefined
	const calendarKey = `${values.locale}-${values.initialView}-${values.timeFormat}-${values.useCustomCurrentTimeIndicator}`

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
						renderResource={renderResource}
						resourceEvents={resourceEvents}
						resourceInitialView={resourceInitialView}
						weekViewGranularity={values.weekViewGranularity}
					/>
				)}
			</CardContent>
		</Card>
	)
}
