import type {
	CalendarClassesOverride,
	CalendarComponents,
	CalendarEvent,
	CalendarSlotProps,
	CalendarThemeAdapter,
	CalendarView,
	CellInfo,
	DateRange,
	EventFormProps,
	EventsChange,
	IlamyPlugin,
	IsoDateString,
	RenderCurrentTimeIndicatorProps,
	Resource,
	SlotDuration,
	SnapDuration,
	TimeFormat,
	Translations,
	WeekDays,
	WeekNumberCalculation,
} from '@ilamy/calendar'
import { IlamyCalendar } from '@ilamy/calendar'
import type { DomCalendarOptions } from '@ilamy/calendar/vue'
import { Globe2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type {
	FrameworkOption,
	PlaygroundSettings,
} from '../types/settings-form'
import { FrameworkCalendarHost } from './framework-calendar-host'

type BusinessHours = {
	daysOfWeek: WeekDays[]
	startTime: number
	endTime: number
}[]

type EventHandler = (event: CalendarEvent) => void

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
	components: CalendarComponents | undefined
	headerComponent: ReactNode
	onCellClick: ((info: CellInfo) => void) | undefined
	onMoreEventsClick:
		| ((day: IsoDateString, events: CalendarEvent[]) => void)
		| undefined
	onDateChange: (date: IsoDateString, range: DateRange) => void
	onEventAdd: EventHandler | undefined
	onEventUpdate: EventHandler | undefined
	onEventDelete: EventHandler | undefined
	onEventsChange: (change: EventsChange) => void
	renderEvent: ((event: CalendarEvent) => ReactNode) | undefined
	renderEventForm: ((props: EventFormProps) => ReactNode) | undefined
	renderHour: ((date: IsoDateString) => ReactNode) | undefined
	renderCurrentTimeIndicator:
		| ((props: RenderCurrentTimeIndicatorProps) => ReactNode)
		| undefined
}

interface MultiZoneStageCardProps {
	timezone: string
	subtitle: string
	children: ReactNode
}

function MultiZoneStageCard({
	timezone,
	subtitle,
	children,
}: MultiZoneStageCardProps) {
	return (
		<div className="min-w-0 flex flex-col gap-2">
			<div className="flex items-center justify-between px-1">
				<span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground">
					<Globe2 className="size-3 mr-1" />
					{timezone}
				</span>
				<span className="text-[11px] text-muted-foreground">{subtitle}</span>
			</div>
			{children}
		</div>
	)
}

function mergeThemeAdapter(
	shared: SharedCalendarProps,
	overrideAdapter?: CalendarThemeAdapter
): SharedCalendarProps {
	if (!overrideAdapter) return shared
	return {
		...shared,
		unstyled: Boolean(overrideAdapter.unstyled),
		slotProps: overrideAdapter.slotProps,
		components: overrideAdapter.components,
	}
}

export interface CalendarStageProps {
	values: PlaygroundSettings
	activeFrameworkMeta: FrameworkOption
	shared: SharedCalendarProps
	overrideAdapter?: CalendarThemeAdapter
	calendarKey: string
	resourceInitialView: CalendarView
	customEvents: CalendarEvent[]
	resourceEvents: CalendarEvent[]
	activeResources: Resource[]
	regularEventClick: EventHandler | undefined
	resourceEventClick: EventHandler | undefined
	renderResource: ((resource: Resource) => ReactNode) | undefined
	buildDomOptions: (
		override?: Partial<DomCalendarOptions>
	) => DomCalendarOptions
}

export function CalendarStage({
	values,
	activeFrameworkMeta,
	shared,
	overrideAdapter,
	calendarKey,
	resourceInitialView,
	customEvents,
	resourceEvents,
	activeResources,
	regularEventClick,
	resourceEventClick,
	renderResource,
	buildDomOptions,
}: CalendarStageProps) {
	if (values.framework !== 'react') {
		const nonReactFramework = values.framework
		if (values.calendarType === 'multi-zone') {
			return (
				<div
					className="grid gap-4 xl:grid-cols-2"
					data-testid="multi-zone-stage"
				>
					<MultiZoneStageCard
						subtitle={`${activeFrameworkMeta.label} ${activeFrameworkMeta.version} · isolated clock`}
						timezone={values.timezone}
					>
						<FrameworkCalendarHost
							framework={nonReactFramework}
							height={values.calendarHeight}
							options={buildDomOptions({ timezone: values.timezone })}
						/>
					</MultiZoneStageCard>
					<MultiZoneStageCard
						subtitle="Zero global timezone state"
						timezone={values.secondaryTimezone}
					>
						<FrameworkCalendarHost
							framework={nonReactFramework}
							height={values.calendarHeight}
							options={buildDomOptions({
								timezone: values.secondaryTimezone,
							})}
						/>
					</MultiZoneStageCard>
				</div>
			)
		}

		if (values.calendarType === 'resource') {
			return (
				<FrameworkCalendarHost
					framework={nonReactFramework}
					height={values.calendarHeight}
					options={buildDomOptions({
						events: resourceEvents,
						resources: activeResources,
						initialView: resourceInitialView,
					})}
				/>
			)
		}

		return (
			<FrameworkCalendarHost
				framework={nonReactFramework}
				height={values.calendarHeight}
				options={buildDomOptions()}
			/>
		)
	}

	const effectiveShared = mergeThemeAdapter(shared, overrideAdapter)

	if (values.calendarType === 'multi-zone') {
		return (
			<div className="grid gap-4 xl:grid-cols-2" data-testid="multi-zone-stage">
				<MultiZoneStageCard
					subtitle="Shared events · isolated clock"
					timezone={values.timezone}
				>
					<div
						className="overflow-clip relative"
						style={{ height: values.calendarHeight }}
					>
						<IlamyCalendar
							{...effectiveShared}
							events={customEvents}
							initialView={values.initialView}
							key={`left-${calendarKey}`}
							onEventClick={regularEventClick}
							timezone={values.timezone}
						/>
					</div>
				</MultiZoneStageCard>
				<MultiZoneStageCard
					subtitle="Zero global timezone state"
					timezone={values.secondaryTimezone}
				>
					<div
						className="overflow-clip relative"
						style={{ height: values.calendarHeight }}
					>
						<IlamyCalendar
							{...effectiveShared}
							events={customEvents}
							initialView={values.initialView}
							key={`right-${calendarKey}`}
							onEventClick={regularEventClick}
							timezone={values.secondaryTimezone}
						/>
					</div>
				</MultiZoneStageCard>
			</div>
		)
	}

	if (values.calendarType === 'resource') {
		return (
			<div
				className="overflow-clip relative"
				style={{ height: values.calendarHeight }}
			>
				<IlamyCalendar
					{...effectiveShared}
					events={resourceEvents}
					initialView={resourceInitialView}
					key={`resource-${calendarKey}-${values.orientation}`}
					onEventClick={resourceEventClick}
					orientation={values.orientation}
					renderResource={renderResource}
					resources={activeResources}
					weekViewGranularity={values.weekViewGranularity}
				/>
			</div>
		)
	}

	return (
		<div
			className="overflow-clip relative"
			style={{ height: values.calendarHeight }}
		>
			<IlamyCalendar
				{...effectiveShared}
				events={customEvents}
				initialView={values.initialView}
				key={calendarKey}
				onEventClick={regularEventClick}
			/>
		</div>
	)
}
