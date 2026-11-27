import type {
	CalendarEvent,
	CalendarSlots,
	CalendarView,
	DateRange,
	DomCalendarOptions,
	IsoDateString,
	Resource,
} from '@ilamy/calendar'
import type { ReactCalendarSlots } from '@ilamy/calendar/react'
import { Card, CardContent } from '../../../components/ui/card'
import { lazy, Suspense, useCallback, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useResolvedColorMode } from '../../../hooks/use-resolved-color-mode'
import { getTranslations } from '../../../lib/translations'
import {
	COMPONENT_LIBRARY_OPTIONS,
	type ComponentLibraryId,
	type CssMode,
	defaultSettings,
	FRAMEWORK_OPTIONS,
	type FrameworkId,
	type PlaygroundSettings,
} from '../../../types/settings-form.types'
import {
	createDemoPlugins,
	handleEventClick,
	handleResourceEventClick,
} from '../../../utils/demo-data.utils'
import { resolveDemoCss } from '../../../utils/demo-themes.utils'
import {
	buildDomCalendarOptions,
	type LifecycleHandlers,
	resolveSharedCalendarProps,
} from '../utils/calendar-display.utils'
import { createRenderResource } from '../utils/custom-renderers'
import { CalendarStage } from './calendar-stage'
import {
	createFrameworkCustomSlots,
	CustomReactEventFormSlot,
} from './custom-event-form-slot'
import { PreviewHeaderBar } from './preview-header-bar'
import { ShadcnEventFormSlot } from './shadcn-event-form-slot'

const LazyMuiThemeWrapper = lazy(() =>
	import('./mui-theme-wrapper').then((mod) => ({
		default: mod.MuiThemeWrapper,
	}))
)

const LazyMuiEventFormSlot = lazy(() =>
	import('./mui-theme-wrapper').then((mod) => ({
		default: mod.MuiEventFormSlot,
	}))
)

function MuiEventFormSlotLazy(
	props: Parameters<typeof ShadcnEventFormSlot>[0]
) {
	return (
		<Suspense fallback={null}>
			<LazyMuiEventFormSlot {...props} />
		</Suspense>
	)
}

type CalendarDisplayProps = LifecycleHandlers & {
	customEvents: CalendarEvent[]
	resourceEvents: CalendarEvent[]
	activeResources: Resource[]
}

const resolveReactComponentSlots = (
	library: ComponentLibraryId,
	supported: boolean
): ReactCalendarSlots | undefined => {
	if (!supported || library === 'native') return undefined
	if (library === 'shadcn') return { eventForm: ShadcnEventFormSlot }
	if (library === 'mui') return { eventForm: MuiEventFormSlotLazy }
	return { eventForm: CustomReactEventFormSlot }
}

const resolveDomComponentSlots = (
	library: ComponentLibraryId,
	supported: boolean,
	customSlots: CalendarSlots
): CalendarSlots | undefined => {
	if (!supported || library !== 'custom-slot') return undefined
	return customSlots
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

	const resolvedCss = useMemo(
		() =>
			resolveDemoCss({
				cssMode: values.cssMode,
				mode: resolvedMode,
				accent: values.themeAccent,
				useCustomSlotProps: values.useCustomSlotProps,
			}),
		[
			values.cssMode,
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

	const handleDateChange = useCallback(
		(date: IsoDateString, range: DateRange) => {
			setValue('initialDate', date)
			onDateNavigate(date, range)
		},
		[setValue, onDateNavigate]
	)

	const handleViewChange = useCallback(
		(view: CalendarView) => {
			setValue('initialView', view)
		},
		[setValue]
	)

	const activeFrameworkMeta =
		FRAMEWORK_OPTIONS.find((item) => item.value === values.framework) ??
		FRAMEWORK_OPTIONS[0]

	const activeComponentMeta =
		COMPONENT_LIBRARY_OPTIONS.find(
			(item) => item.value === values.componentLibrary
		) ?? COMPONENT_LIBRARY_OPTIONS[0]

	const isComponentSupported = activeComponentMeta.supportedFrameworks.includes(
		values.framework
	)

	const domCustomSlots = useMemo(() => createFrameworkCustomSlots(), [])
	const reactSlots = useMemo(
		() =>
			resolveReactComponentSlots(values.componentLibrary, isComponentSupported),
		[values.componentLibrary, isComponentSupported]
	)
	const domSlots = useMemo(
		() =>
			resolveDomComponentSlots(
				values.componentLibrary,
				isComponentSupported,
				domCustomSlots
			),
		[values.componentLibrary, isComponentSupported, domCustomSlots]
	)

	const lifecycle = {
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onEventsChange,
		onDateNavigate,
	}

	const shared = resolveSharedCalendarProps(
		values,
		plugins,
		translations,
		resolvedCss.adapter ?? {},
		reactSlots,
		handleDateChange,
		handleViewChange,
		lifecycle
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

	const calendarKey = `${values.locale}-${values.useCustomCurrentTimeIndicator}-${values.initialDateRevision}`

	const buildDomOptions = (override?: Partial<DomCalendarOptions>) =>
		buildDomCalendarOptions({
			values,
			shared,
			customEvents,
			themeAdapter: resolvedCss.adapter,
			domSlots,
			onDateChange: handleDateChange,
			onViewChange: handleViewChange,
			lifecycle,
			override,
		})

	const isReact = values.framework === 'react'
	const useMuiComponents = isReact && values.componentLibrary === 'mui'

	const selectFramework = (framework: FrameworkId) => {
		setValue('framework', framework)
	}

	const selectCss = (cssMode: CssMode) => {
		setValue('cssMode', cssMode)
	}

	const selectComponentLibrary = (library: ComponentLibraryId) => {
		const option = COMPONENT_LIBRARY_OPTIONS.find(
			(item) => item.value === library
		)
		if (!option || !option.supportedFrameworks.includes(values.framework))
			return
		setValue('componentLibrary', library)
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
	if (useMuiComponents) {
		stageContent = (
			<Suspense
				fallback={
					<div
						className="flex items-center justify-center text-sm text-muted-foreground"
						style={{ height: values.calendarHeight }}
					>
						Loading Material UI components…
					</div>
				}
			>
				<LazyMuiThemeWrapper
					accent={values.themeAccent}
					applyThemeVars={values.cssMode === 'plain'}
					mode={resolvedMode}
				>
					{(muiVarsAdapter) => (
						<CalendarStage {...stageProps} overrideAdapter={muiVarsAdapter} />
					)}
				</LazyMuiThemeWrapper>
			</Suspense>
		)
	}

	const timezoneLabel =
		values.calendarType === 'multi-zone'
			? `${values.timezone} + ${values.secondaryTimezone}`
			: values.timezone
	const pluginUnit = plugins.length === 1 ? 'plugin' : 'plugins'
	const effectiveComponentLabel = isComponentSupported
		? activeComponentMeta.label
		: `${activeComponentMeta.label} (unavailable on ${activeFrameworkMeta.label} -> Native)`

	return (
		<Card
			className="border shadow-md overflow-clip relative bg-background gap-0"
			data-active-components={values.componentLibrary}
			data-active-css={values.cssMode}
			data-active-framework={values.framework}
		>
			<PreviewHeaderBar
				componentLibrary={values.componentLibrary}
				cssMode={values.cssMode}
				framework={values.framework}
				onSelectComponentLibrary={selectComponentLibrary}
				onSelectCss={selectCss}
				onSelectFramework={selectFramework}
			/>

			{!isComponentSupported && (
				<div
					className="px-3 py-1.5 border-b bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs select-none"
					data-testid="component-unavailable-notice"
				>
					{activeComponentMeta.label} components require React and are disabled
					for {activeFrameworkMeta.label}. Preview falls back to Native regions
					while preserving your Components selection.
				</div>
			)}

			<CardContent className="p-2 sm:p-3 relative z-10">
				{stageContent}
			</CardContent>

			<div
				className="px-3 py-1.5 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground select-none cursor-default"
				data-testid="playground-status-strip"
			>
				<span className="font-mono">{timezoneLabel}</span>
				<span>
					{activeFrameworkMeta.label} {activeFrameworkMeta.version} ·{' '}
					{resolvedCss.label} · {effectiveComponentLabel} · {plugins.length}{' '}
					{pluginUnit}
				</span>
			</div>
		</Card>
	)
}
