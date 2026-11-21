import type {
	CalendarEvent,
	CalendarView,
	DateRange,
	IsoDateString,
	Resource,
} from '@ilamy/calendar'
import type { DomCalendarOptions } from '@ilamy/calendar/vue'
import { Card, CardContent } from '@ilamy/ui/components/card'
import { lazy, Suspense, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useResolvedColorMode } from '../../../hooks/use-resolved-color-mode'
import { getTranslations } from '../../../lib/translations'
import {
	defaultSettings,
	FRAMEWORK_OPTIONS,
	type FrameworkId,
	type PlaygroundSettings,
	type ThemePreset,
} from '../../../types/settings-form.types'
import {
	createDemoPlugins,
	handleEventClick,
	handleResourceEventClick,
} from '../../../utils/demo-data.utils'
import { resolveDemoTheme } from '../../../utils/demo-themes.utils'
import {
	buildDomCalendarOptions,
	type LifecycleHandlers,
	resolveSharedCalendarProps,
} from '../utils/calendar-display.utils'
import { createRenderResource } from '../utils/custom-renderers'
import { CalendarStage } from './calendar-stage'
import { PreviewHeaderBar } from './preview-header-bar'

const LazyMuiThemeWrapper = lazy(() =>
	import('./mui-theme-wrapper').then((mod) => ({
		default: mod.MuiThemeWrapper,
	}))
)

type CalendarDisplayProps = LifecycleHandlers & {
	customEvents: CalendarEvent[]
	resourceEvents: CalendarEvent[]
	activeResources: Resource[]
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
		resolvedTheme.adapter ?? {},
		handleDateChange,
		lifecycle
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

	const buildDomOptions = (override?: Partial<DomCalendarOptions>) =>
		buildDomCalendarOptions({
			values,
			shared,
			customEvents,
			themeAdapter: resolvedTheme.adapter,
			onDateChange: handleDateChange,
			lifecycle,
			override,
		})

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
