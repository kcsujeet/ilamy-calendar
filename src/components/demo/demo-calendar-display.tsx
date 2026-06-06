import type { CalendarEvent, WeekDays } from '@/components/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'
import type {
	CalendarClassesOverride,
	CellInfo,
	RenderCurrentTimeIndicatorProps,
	SlotDuration,
} from '@/features/calendar/types'
import { IlamyResourceCalendar } from '@/features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar'
import type { Resource } from '@/features/resource-calendar/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import type { CalendarView, TimeFormat } from '@/types'
import {
	createRenderEvent,
	renderCurrentTimeIndicator,
	renderHour,
} from './demo-custom-renderers'
import {
	demoPlugins,
	handleDateClick,
	handleEventAdd,
	handleEventClick,
	handleEventDelete,
	handleEventUpdate,
	handleResourceEventClick,
} from './demo-data'

const customCalendarClassesOverride: CalendarClassesOverride = {
	disabledCell:
		'bg-red-50 dark:bg-red-950 text-red-400 dark:text-red-600 pointer-events-none opacity-50',
}

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
			plugins={demoPlugins}
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
		<IlamyResourceCalendar
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
			plugins={demoPlugins}
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

type DemoCalendarDisplayProps = {
	calendarType: 'regular' | 'resource'
	calendarHeight: string
	calendarKey: string
	businessHours: SharedCalendarProps['businessHours']
	dayMaxEvents: number
	disableCellClick: boolean
	disableDragAndDrop: boolean
	disableEventClick: boolean
	eventHeight: number
	firstDayOfWeek: WeekDays
	hiddenDays: WeekDays[]
	hideNonBusinessHours: boolean
	initialDate: Dayjs | undefined
	initialView: CalendarView
	locale: string
	orientation: 'horizontal' | 'vertical'
	scrollTime: string | undefined
	slotDuration: SlotDuration
	stickyViewHeader: boolean
	timeFormat: TimeFormat
	timezone: string
	weekViewGranularity: 'hourly' | 'daily'
	customEvents: CalendarEvent[]
	resourceEvents: CalendarEvent[]
	activeResources: Resource[]
	useCustomClasses: boolean
	useCustomEventRenderer: boolean
	useCustomHourRenderer: boolean
	useCustomTimeIndicator: boolean
	useCustomOnDateClick: boolean
	useCustomOnEventClick: boolean
	onDateChange: (date: Dayjs) => void
}

// Resolve the optional demo toggles to concrete values once so each calendar
// branch receives ready-to-use props. Kept as a standalone helper to keep the
// branching out of the component body.
function resolveSharedCalendarProps(
	props: DemoCalendarDisplayProps
): SharedCalendarProps {
	const {
		useCustomClasses,
		useCustomEventRenderer,
		useCustomHourRenderer,
		useCustomTimeIndicator,
		useCustomOnDateClick,
		eventHeight,
	} = props

	return {
		businessHours: props.businessHours,
		dayMaxEvents: props.dayMaxEvents,
		disableCellClick: props.disableCellClick,
		disableDragAndDrop: props.disableDragAndDrop,
		disableEventClick: props.disableEventClick,
		eventHeight,
		firstDayOfWeek: props.firstDayOfWeek,
		hiddenDays: props.hiddenDays,
		hideNonBusinessHours: props.hideNonBusinessHours,
		initialDate: props.initialDate,
		locale: props.locale,
		scrollTime: props.scrollTime,
		slotDuration: props.slotDuration,
		stickyViewHeader: props.stickyViewHeader,
		timeFormat: props.timeFormat,
		timezone: props.timezone,
		onDateChange: props.onDateChange,
		classesOverride: useCustomClasses
			? customCalendarClassesOverride
			: undefined,
		onCellClick: useCustomOnDateClick ? handleDateClick : undefined,
		renderEvent: useCustomEventRenderer
			? createRenderEvent(eventHeight)
			: undefined,
		renderHour: useCustomHourRenderer ? renderHour : undefined,
		renderCurrentTimeIndicator: useCustomTimeIndicator
			? renderCurrentTimeIndicator
			: undefined,
	}
}

export function DemoCalendarDisplay(props: DemoCalendarDisplayProps) {
	const {
		calendarType,
		calendarHeight,
		initialView,
		orientation,
		customEvents,
		resourceEvents,
		activeResources,
		weekViewGranularity,
		useCustomOnEventClick,
	} = props

	const shared = resolveSharedCalendarProps(props)
	const resourceInitialView = initialView === 'year' ? 'month' : initialView
	const regularEventClick = useCustomOnEventClick ? handleEventClick : undefined
	const resourceEventClick = useCustomOnEventClick
		? handleResourceEventClick
		: undefined

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
				style={{ height: calendarHeight }}
			>
				{calendarType === 'regular' && (
					<RegularCalendar
						{...shared}
						calendarKey={props.calendarKey}
						customEvents={customEvents}
						initialView={initialView}
						onEventClick={regularEventClick}
					/>
				)}

				{calendarType === 'resource' && (
					<ResourceCalendar
						{...shared}
						activeResources={activeResources}
						calendarKey={props.calendarKey}
						onEventClick={resourceEventClick}
						orientation={orientation}
						resourceEvents={resourceEvents}
						resourceInitialView={resourceInitialView}
						weekViewGranularity={weekViewGranularity}
					/>
				)}
			</CardContent>
		</Card>
	)
}
