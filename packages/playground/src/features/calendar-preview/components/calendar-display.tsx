import type {
	CalendarEvent,
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
	getComponentLibraryIncompatibility,
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
import {
	BaseUiEventFormSlot,
	BaseUiHeaderSlot,
	BaseUiMoreEventsDialogSlot,
	BaseUiRecurrenceScopeDialogSlot,
} from './base-ui-slots'
import { CalendarStage } from './calendar-stage'
import { PreviewHeaderBar } from './preview-header-bar'
import { SlotPreviewOptionsContext } from './primitive-slot-chrome'
import {
	RadixEventFormSlot,
	RadixHeaderSlot,
	RadixMoreEventsDialogSlot,
	RadixRecurrenceScopeDialogSlot,
} from './radix-slots'

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

const resolveReactComponentSlots = (options: {
	library: ComponentLibraryId
	framework: FrameworkId
	cssMode: CssMode
	useCustomCalendarHeader: boolean
	useCustomEventForm: boolean
}): ReactCalendarSlots | undefined => {
	const {
		library,
		framework,
		cssMode,
		useCustomCalendarHeader,
		useCustomEventForm,
	} = options
	if (
		library === 'native' ||
		library === 'mui' ||
		getComponentLibraryIncompatibility(library, framework, cssMode) !== null
	) {
		return undefined
	}
	if (library === 'radix') {
		return {
			...(useCustomCalendarHeader ? {} : { header: RadixHeaderSlot }),
			...(useCustomEventForm ? {} : { eventForm: RadixEventFormSlot }),
			moreEventsDialog: RadixMoreEventsDialogSlot,
			recurrenceScopeDialog: RadixRecurrenceScopeDialogSlot,
		}
	}
	return {
		...(useCustomCalendarHeader ? {} : { header: BaseUiHeaderSlot }),
		...(useCustomEventForm ? {} : { eventForm: BaseUiEventFormSlot }),
		moreEventsDialog: BaseUiMoreEventsDialogSlot,
		recurrenceScopeDialog: BaseUiRecurrenceScopeDialogSlot,
	}
}

const getComponentDisplayLabel = (
	library: ComponentLibraryId,
	label: string,
	cssMode: CssMode
) => {
	if (
		cssMode === 'tailwind' &&
		(library === 'radix' || library === 'base-ui')
	) {
		return `${label} (shadcn/ui)`
	}
	return label
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

	const isComponentSupported =
		getComponentLibraryIncompatibility(
			values.componentLibrary,
			values.framework,
			values.cssMode
		) === null

	const reactSlots = useMemo(
		() =>
			resolveReactComponentSlots({
				library: values.componentLibrary,
				framework: values.framework,
				cssMode: values.cssMode,
				useCustomCalendarHeader: values.useCustomCalendarHeader,
				useCustomEventForm: values.useCustomEventForm,
			}),
		[
			values.componentLibrary,
			values.framework,
			values.cssMode,
			values.useCustomCalendarHeader,
			values.useCustomEventForm,
		]
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
			domSlots: undefined,
			onDateChange: handleDateChange,
			onViewChange: handleViewChange,
			lifecycle,
			override,
		})

	const useMuiComponents =
		values.framework === 'react' &&
		values.componentLibrary === 'mui' &&
		isComponentSupported

	const selectFramework = (framework: FrameworkId) => {
		setValue('framework', framework)
		if (
			getComponentLibraryIncompatibility(
				values.componentLibrary,
				framework,
				values.cssMode
			) !== null
		) {
			setValue('componentLibrary', 'native')
		}
	}

	const selectCss = (cssMode: CssMode) => {
		setValue('cssMode', cssMode)
		if (
			getComponentLibraryIncompatibility(
				values.componentLibrary,
				values.framework,
				cssMode
			) !== null
		) {
			setValue('componentLibrary', 'native')
		}
	}

	const selectComponentLibrary = (library: ComponentLibraryId) => {
		if (
			getComponentLibraryIncompatibility(
				library,
				values.framework,
				values.cssMode
			) !== null
		) {
			return
		}
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
					{(muiVarsAdapter, muiSlots) => (
						<CalendarStage
							{...stageProps}
							overrideAdapter={muiVarsAdapter}
							shared={{
								...stageProps.shared,
								slots: {
									...(values.useCustomCalendarHeader
										? {}
										: { header: muiSlots.header }),
									...(values.useCustomEventForm
										? {}
										: { eventForm: muiSlots.eventForm }),
									moreEventsDialog: muiSlots.moreEventsDialog,
									recurrenceScopeDialog: muiSlots.recurrenceScopeDialog,
								},
							}}
						/>
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
	const effectiveComponentLabel = getComponentDisplayLabel(
		values.componentLibrary,
		activeComponentMeta.label,
		values.cssMode
	)

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

			<CardContent className="p-2 sm:p-3 relative z-10">
				<SlotPreviewOptionsContext.Provider
					value={{
						cssMode: values.cssMode,
						hideNewButton: values.disableCellClick,
					}}
				>
					{stageContent}
				</SlotPreviewOptionsContext.Provider>
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
