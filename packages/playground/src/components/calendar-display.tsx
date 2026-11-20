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
import { Card, CardContent, CardHeader } from '@ilamy/ui/components/card'
import { cn } from '@ilamy/ui/lib/utils'
import { Blocks, Globe2, Layers, Palette } from 'lucide-react'
import { lazy, type ReactNode, Suspense, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { getTranslations } from '../lib/translations'
import {
	defaultSettings,
	type FrameworkId,
	type PlaygroundSettings,
	type ThemePreset,
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
import { resolveDemoTheme, useResolvedColorMode } from '../utils/demo-themes'
import { FrameworkCalendarHost } from './framework-calendar-host'
import { FRAMEWORK_OPTIONS } from './playground-toolbar'

const LazyMuiThemeWrapper = lazy(() => import('./mui-theme-wrapper'))

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

const THEME_ICONS: Record<ThemePreset, typeof Palette> = {
	unstyled: Layers,
	tailwind: Blocks,
	mui: Palette,
	stylex: Palette,
}

const THEME_OPTIONS: {
	value: ThemePreset
	label: string
	reactOnly?: boolean
}[] = [
	{ value: 'unstyled', label: 'Unstyled' },
	{ value: 'tailwind', label: 'Tailwind' },
	{ value: 'mui', label: 'MUI', reactOnly: true },
	{ value: 'stylex', label: 'StyleX' },
]

const WEEK_NUMBERS_PROP = {
	default: undefined,
	show: true,
	hide: false,
} as const

type LifecycleHandlers = {
	onEventAdd: EventHandler
	onEventUpdate: EventHandler
	onEventDelete: EventHandler
	onEventsChange: (change: EventsChange) => void
	onDateNavigate: (date: IsoDateString, range: DateRange) => void
}

type SharedCalendarProps = {
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

type CalendarDisplayProps = LifecycleHandlers & {
	customEvents: CalendarEvent[]
	resourceEvents: CalendarEvent[]
	activeResources: Resource[]
}

function resolveSharedCalendarProps(
	values: PlaygroundSettings,
	plugins: IlamyPlugin[],
	translations: Translations,
	themeAdapter: {
		unstyled?: boolean
		slotProps?: CalendarSlotProps
		components?: CalendarComponents
	},
	onDateChange: (date: IsoDateString, range: DateRange) => void,
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
		eventConstraint:
			values.enableBusinessHours && values.constrainEventsToBusinessHours
				? 'businessHours'
				: undefined,
		selectConstraint:
			values.enableBusinessHours && values.constrainSelectToBusinessHours
				? 'businessHours'
				: undefined,
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
		components: themeAdapter.components,
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
		onEventsChange: lifecycle.onEventsChange,
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
	onEventsChange,
	onDateNavigate,
}: CalendarDisplayProps) {
	const { control, setValue } = useFormContext<PlaygroundSettings>()
	const watched = useWatch({ control })
	const values: PlaygroundSettings = { ...defaultSettings, ...watched }
	const resolvedMode = useResolvedColorMode(values.themeMode)

	const resolvedTheme = useMemo(
		() =>
			resolveDemoTheme({
				preset: values.themePreset,
				mode: resolvedMode,
				accent: values.themeAccent,
				useCustomSlotProps: values.useCustomSlotProps,
			}),
		[
			values.themePreset,
			resolvedMode,
			values.themeAccent,
			values.useCustomSlotProps,
		]
	)

	const plugins = useMemo(
		() =>
			createDemoPlugins({
				agendaWindow: values.agendaWindow,
				showExportButton: !values.hideExportButton,
				enableRecurrencePlugin: values.enableRecurrencePlugin,
				enableAgendaPlugin: values.enableAgendaPlugin,
				enableDragToCreatePlugin: values.enableDragToCreatePlugin,
				enableYearPlugin: values.enableYearPlugin,
				enableIcalPlugin: values.enableIcalPlugin,
			}),
		[
			values.agendaWindow,
			values.hideExportButton,
			values.enableRecurrencePlugin,
			values.enableAgendaPlugin,
			values.enableDragToCreatePlugin,
			values.enableYearPlugin,
			values.enableIcalPlugin,
		]
	)

	const translations = useMemo(
		() => getTranslations(values.locale),
		[values.locale]
	)

	const handleDateChange = (date: IsoDateString, range: DateRange) => {
		setValue('initialDate', date)
		onDateNavigate(date, range)
	}

	const shared = resolveSharedCalendarProps(
		values,
		plugins,
		translations,
		resolvedTheme.adapter ?? {},
		handleDateChange,
		{
			onEventAdd,
			onEventUpdate,
			onEventDelete,
			onEventsChange,
			onDateNavigate,
		}
	)

	const isResourceOnlyFallback =
		values.initialView === 'year' || values.initialView === 'agenda'
	const resourceInitialView: CalendarView = isResourceOnlyFallback
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
	const calendarKey = `${values.locale}-${values.initialView}-${values.timeFormat}-${values.useCustomCurrentTimeIndicator}-${values.initialDateRevision}-${values.themePreset}`

	const activeFrameworkMeta =
		FRAMEWORK_OPTIONS.find((item) => item.value === values.framework) ??
		FRAMEWORK_OPTIONS[0]

	const buildDomOptions = (
		override: Partial<DomCalendarOptions> = {}
	): DomCalendarOptions => ({
		events: customEvents,
		initialView: values.initialView,
		initialDate: values.initialDate,
		firstDayOfWeek: values.firstDayOfWeek,
		hiddenDays: values.hiddenDays,
		weekends: values.weekends,
		timezone: values.timezone,
		locale: values.locale,
		timeFormat: values.timeFormat,
		dayMaxEvents: values.dayMaxEvents,
		slotDuration: values.slotDuration,
		snapDuration: values.snapDuration === 0 ? undefined : values.snapDuration,
		slotMinTime: values.slotMinTime,
		slotMaxTime: values.slotMaxTime,
		businessHours: shared.businessHours,
		hideNonBusinessHours: values.hideNonBusinessHours,
		eventConstraint: shared.eventConstraint,
		selectConstraint: shared.selectConstraint,
		editable: !values.disableDragAndDrop,
		nowIndicator: values.nowIndicator,
		displayEventTime: values.showEventTimes,
		displayEventEnd: values.showEventEnd,
		weekNumbers: shared.weekNumbers,
		weekNumberCalculation: values.weekNumberCalculation,
		orientation: values.orientation,
		weekViewGranularity: values.weekViewGranularity,
		enableDragToCreate: values.enableDragToCreatePlugin,
		enableIcalExport: values.enableIcalPlugin && !values.hideExportButton,
		enableYearView: values.enableYearPlugin,
		enableAgendaView: values.enableAgendaPlugin,
		agendaWindow: values.agendaWindow,
		stickyViewHeader: values.stickyViewHeader,
		disableCellClick: values.disableCellClick,
		disableEventClick: values.disableEventClick,
		unstyled: Boolean(resolvedTheme.adapter?.unstyled),
		slotProps: resolvedTheme.adapter?.slotProps,
		onDateChange: handleDateChange,
		onEventAdd: values.useEventLifecycleCallbacks ? onEventAdd : undefined,
		onEventUpdate: values.useEventLifecycleCallbacks
			? onEventUpdate
			: undefined,
		onEventDelete: values.useEventLifecycleCallbacks
			? onEventDelete
			: undefined,
		onEventsChange,
		onCellClick: values.useCustomOnDateClick ? handleDateClick : undefined,
		onEventClick: values.useCustomOnEventClick ? handleEventClick : undefined,
		...override,
	})

	const renderBody = (overrideAdapter?: CalendarThemeAdapter) => {
		if (values.framework !== 'react') {
			const nonReactFramework = values.framework
			if (values.calendarType === 'multi-zone') {
				return (
					<div
						className="grid gap-4 xl:grid-cols-2"
						data-testid="multi-zone-stage"
					>
						<div className="min-w-0 flex flex-col gap-2">
							<div className="flex items-center justify-between px-1">
								<span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground">
									<Globe2 className="size-3 mr-1" />
									{values.timezone}
								</span>
								<span className="text-[11px] text-muted-foreground">
									{activeFrameworkMeta.label} {activeFrameworkMeta.version} ·
									isolated clock
								</span>
							</div>
							<FrameworkCalendarHost
								framework={nonReactFramework}
								height={values.calendarHeight}
								options={buildDomOptions({ timezone: values.timezone })}
							/>
						</div>
						<div className="min-w-0 flex flex-col gap-2">
							<div className="flex items-center justify-between px-1">
								<span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground">
									<Globe2 className="size-3 mr-1" />
									{values.secondaryTimezone}
								</span>
								<span className="text-[11px] text-muted-foreground">
									Zero global timezone state
								</span>
							</div>
							<FrameworkCalendarHost
								framework={nonReactFramework}
								height={values.calendarHeight}
								options={buildDomOptions({
									timezone: values.secondaryTimezone,
								})}
							/>
						</div>
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

		const effectiveShared = overrideAdapter
			? {
					...shared,
					unstyled: Boolean(overrideAdapter.unstyled),
					slotProps: overrideAdapter.slotProps,
					components: overrideAdapter.components,
				}
			: shared

		if (values.calendarType === 'multi-zone') {
			return (
				<div
					className="grid gap-4 xl:grid-cols-2"
					data-testid="multi-zone-stage"
				>
					<div className="min-w-0 flex flex-col gap-2">
						<div className="flex items-center justify-between px-1">
							<span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground">
								<Globe2 className="size-3 mr-1" />
								{values.timezone}
							</span>
							<span className="text-[11px] text-muted-foreground">
								Shared events · isolated clock
							</span>
						</div>
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
					</div>
					<div className="min-w-0 flex flex-col gap-2">
						<div className="flex items-center justify-between px-1">
							<span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground">
								<Globe2 className="size-3 mr-1" />
								{values.secondaryTimezone}
							</span>
							<span className="text-[11px] text-muted-foreground">
								Zero global timezone state
							</span>
						</div>
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
					</div>
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

	const isReact = values.framework === 'react'

	const selectFramework = (framework: FrameworkId) => {
		setValue('framework', framework)
		if (framework !== 'react' && values.themePreset === 'mui') {
			setValue('themePreset', 'tailwind')
		}
	}

	const selectTheme = (theme: ThemePreset) => {
		if (theme === 'mui' && !isReact) return
		setValue('themePreset', theme)
	}

	return (
		<Card
			className="border shadow-md overflow-clip relative bg-background gap-0"
			data-active-framework={values.framework}
			data-active-theme={values.themePreset}
		>
			<CardHeader className="px-3 py-2 border-b flex flex-row flex-wrap items-center justify-between gap-2 bg-muted/30">
				{/* Framework switcher directly controls the preview runtime below */}
				<fieldset
					aria-label="Framework switcher"
					className="inline-flex flex-nowrap overflow-x-auto max-w-full items-center rounded-lg bg-background p-0.5 border border-border/80 m-0 min-w-0"
				>
					{FRAMEWORK_OPTIONS.map((fw) => {
						const isActive = values.framework === fw.value
						return (
							<button
								aria-pressed={isActive}
								className={cn(
									'inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
									isActive
										? 'bg-primary text-primary-foreground shadow-xs'
										: 'text-muted-foreground hover:text-foreground'
								)}
								data-testid={`framework-${fw.value}`}
								key={fw.value}
								onClick={() => selectFramework(fw.value)}
								type="button"
							>
								<span>{fw.label}</span>
								<span
									className={cn(
										'font-mono text-[10px]',
										isActive
											? 'text-primary-foreground/80'
											: 'text-muted-foreground/70'
									)}
								>
									{fw.version}
								</span>
							</button>
						)
					})}
				</fieldset>

				{/* Theme switcher directly controls the preview styling below */}
				<fieldset
					aria-label="Theme switcher"
					className="inline-flex flex-nowrap overflow-x-auto max-w-full items-center rounded-lg bg-background p-0.5 border border-border/80 m-0 min-w-0"
				>
					{THEME_OPTIONS.map((option) => {
						const isActive = values.themePreset === option.value
						const isDisabled = Boolean(option.reactOnly && !isReact)
						const Icon = THEME_ICONS[option.value]
						return (
							<button
								aria-pressed={isActive}
								className={cn(
									'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
									isDisabled
										? 'opacity-40 cursor-not-allowed text-muted-foreground'
										: 'cursor-pointer',
									isActive
										? 'bg-primary text-primary-foreground shadow-xs'
										: !isDisabled &&
												'text-muted-foreground hover:text-foreground'
								)}
								data-testid={`theme-${option.value}`}
								disabled={isDisabled}
								key={option.value}
								onClick={() => selectTheme(option.value)}
								title={
									isDisabled
										? 'Material UI adapter is React-only; try Tailwind, StyleX, or Unstyled'
										: undefined
								}
								type="button"
							>
								<Icon className="size-3.5 shrink-0" />
								{option.label}
							</button>
						)
					})}
				</fieldset>
			</CardHeader>

			<CardContent className="p-2 sm:p-3 relative z-10">
				{values.framework === 'react' && values.themePreset === 'mui' ? (
					<Suspense
						fallback={
							<div
								className="flex items-center justify-center text-sm text-muted-foreground"
								style={{ height: values.calendarHeight }}
							>
								Loading Material UI theme…
							</div>
						}
					>
						<LazyMuiThemeWrapper
							accent={values.themeAccent}
							mode={resolvedMode}
						>
							{(muiAdapter) => renderBody(muiAdapter)}
						</LazyMuiThemeWrapper>
					</Suspense>
				) : (
					renderBody()
				)}
			</CardContent>

			{/* Quiet non-interactive metadata footer (plain text, zero pill/button affordance) */}
			<div className="px-3 py-1.5 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground select-none">
				<span className="font-mono">
					{values.calendarType === 'multi-zone'
						? `${values.timezone} + ${values.secondaryTimezone}`
						: values.timezone}
				</span>
				<span>
					{activeFrameworkMeta.label} {activeFrameworkMeta.version} ·{' '}
					{resolvedTheme.label} · {plugins.length}{' '}
					{plugins.length === 1 ? 'plugin' : 'plugins'}
				</span>
			</div>
		</Card>
	)
}
