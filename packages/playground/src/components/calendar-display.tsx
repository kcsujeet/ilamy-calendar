import type {
	CalendarClassesOverride,
	CalendarComponents,
	CalendarEvent,
	CalendarSlotProps,
	CalendarView,
	DateRange,
	EventsChange,
	IlamyPlugin,
	IsoDateString,
	Resource,
	Translations,
} from '@ilamy/calendar'
import type { DomCalendarOptions } from '@ilamy/calendar/vue'
import { Card, CardContent } from '@ilamy/ui/components/card'
import { lazy, Suspense, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useResolvedColorMode } from '../hooks/use-resolved-color-mode'
import { getTranslations } from '../lib/translations'
import {
	defaultSettings,
	FRAMEWORK_OPTIONS,
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
import { resolveDemoTheme } from '../utils/demo-themes'
import { CalendarStage, type SharedCalendarProps } from './calendar-stage'
import { PreviewHeaderBar } from './preview-header-bar'

const LazyMuiThemeWrapper = lazy(() =>
	import('./mui-theme-wrapper').then((mod) => ({
		default: mod.MuiThemeWrapper,
	}))
)

const customCalendarClassesOverride: CalendarClassesOverride = {
	disabledCell:
		'bg-red-50 dark:bg-red-950 text-red-400 dark:text-red-600 pointer-events-none opacity-50',
}

type EventHandler = (event: CalendarEvent) => void

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
	let businessHours: SharedCalendarProps['businessHours']
	let eventConstraint: SharedCalendarProps['eventConstraint']
	let selectConstraint: SharedCalendarProps['selectConstraint']
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

	let headerComponent: SharedCalendarProps['headerComponent']
	if (values.useCustomCalendarHeader) {
		headerComponent = <CustomCalendarHeader />
	}

	let classesOverride: SharedCalendarProps['classesOverride']
	if (values.useCustomClasses) {
		classesOverride = customCalendarClassesOverride
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
		renderEventForm = (props) => <CustomEventForm {...props} />
	}

	let customCurrentTimeIndicator: SharedCalendarProps['renderCurrentTimeIndicator']
	if (values.useCustomCurrentTimeIndicator) {
		customCurrentTimeIndicator = renderCurrentTimeIndicator
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
		components: themeAdapter.components,
		onDateChange,
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
		renderCurrentTimeIndicator: customCurrentTimeIndicator,
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
	let resourceInitialView: CalendarView = values.initialView
	if (isResourceOnlyFallback) {
		resourceInitialView = 'month'
	}
	let regularEventClick: typeof handleEventClick | undefined
	let resourceEventClick: typeof handleResourceEventClick | undefined
	if (values.useCustomOnEventClick) {
		regularEventClick = handleEventClick
		resourceEventClick = handleResourceEventClick
	}
	let renderResource: ReturnType<typeof createRenderResource> | undefined
	if (values.useCustomResourceRenderer) {
		renderResource = createRenderResource(resourceEvents)
	}
	const calendarKey = `${values.locale}-${values.initialView}-${values.timeFormat}-${values.useCustomCurrentTimeIndicator}-${values.initialDateRevision}-${values.themePreset}`

	const activeFrameworkMeta =
		FRAMEWORK_OPTIONS.find((item) => item.value === values.framework) ??
		FRAMEWORK_OPTIONS[0]

	const buildDomOptions = (
		override: Partial<DomCalendarOptions> = {}
	): DomCalendarOptions => {
		let domEventAdd: typeof onEventAdd | undefined
		let domEventUpdate: typeof onEventUpdate | undefined
		let domEventDelete: typeof onEventDelete | undefined
		if (values.useEventLifecycleCallbacks) {
			domEventAdd = onEventAdd
			domEventUpdate = onEventUpdate
			domEventDelete = onEventDelete
		}

		return {
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
			onEventAdd: domEventAdd,
			onEventUpdate: domEventUpdate,
			onEventDelete: domEventDelete,
			onEventsChange,
			onCellClick: values.useCustomOnDateClick ? handleDateClick : undefined,
			onEventClick: values.useCustomOnEventClick ? handleEventClick : undefined,
			...override,
		}
	}

	const isReact = values.framework === 'react'
	const useMuiTheme = isReact && values.themePreset === 'mui'

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

	const stageProps = {
		values,
		activeFrameworkMeta,
		shared,
		calendarKey,
		resourceInitialView,
		customEvents,
		resourceEvents,
		activeResources,
		regularEventClick,
		resourceEventClick,
		renderResource,
		buildDomOptions,
	}

	let stageContent = <CalendarStage {...stageProps} />
	if (useMuiTheme) {
		stageContent = (
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
				<LazyMuiThemeWrapper accent={values.themeAccent} mode={resolvedMode}>
					{(muiAdapter) => (
						<CalendarStage {...stageProps} overrideAdapter={muiAdapter} />
					)}
				</LazyMuiThemeWrapper>
			</Suspense>
		)
	}

	let timezoneLabel = values.timezone
	if (values.calendarType === 'multi-zone') {
		timezoneLabel = `${values.timezone} + ${values.secondaryTimezone}`
	}
	const pluginUnit = plugins.length === 1 ? 'plugin' : 'plugins'

	return (
		<Card
			className="border shadow-md overflow-clip relative bg-background gap-0"
			data-active-framework={values.framework}
			data-active-theme={values.themePreset}
		>
			<PreviewHeaderBar
				framework={values.framework}
				onSelectFramework={selectFramework}
				onSelectTheme={selectTheme}
				themePreset={values.themePreset}
			/>

			<CardContent className="p-2 sm:p-3 relative z-10">
				{stageContent}
			</CardContent>

			<div className="px-3 py-1.5 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground select-none">
				<span className="font-mono">{timezoneLabel}</span>
				<span>
					{activeFrameworkMeta.label} {activeFrameworkMeta.version} ·{' '}
					{resolvedTheme.label} · {plugins.length} {pluginUnit}
				</span>
			</div>
		</Card>
	)
}
