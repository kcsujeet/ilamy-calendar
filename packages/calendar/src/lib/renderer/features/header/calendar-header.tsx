/** @jsxImportSource preact */
import { useMemo } from 'preact/hooks'
import {
	add,
	type CalendarView,
	type HeaderSlotContext,
	type HeadlessCalendarController,
	now,
	type PluginRuntime,
	type PluginToolbarContext,
	parseDate,
	SLOT_TOOLBAR,
	startOf,
	toOffsetIso,
} from '../../../../index'
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	PlusIcon,
} from '../../components/icons'
import { PluginSlotHost } from '../../components/plugin-slot-host'
import { LegacyRenderHost, SlotHost } from '../../components/slot-host'
import type {
	DomCalendarOptions,
	DomHeaderRenderContext,
	RendererActions,
} from '../../types/renderer.types'
import {
	type CalendarFormatters,
	formatCalendarHeaderTitle,
} from '../../utils/format.utils'
import { rendererKeys } from '../../utils/keys.utils'
import { buildSlotProps, joinClassNames } from '../../utils/slot-props.utils'
import { HeaderDatePicker } from './header-date-picker'
import { ViewMenu } from './view-menu'

const VIEW_LABELS: Record<string, string> = {
	day: 'Day',
	week: 'Week',
	month: 'Month',
	agenda: 'Agenda',
	year: 'Year',
}

const resolveAvailableViews = (
	options: DomCalendarOptions,
	pluginRuntime: PluginRuntime
): CalendarView[] => {
	if (options.views && options.views.length > 0) {
		return options.views
	}
	const views: CalendarView[] = ['day', 'week', 'month']
	for (const pluginView of pluginRuntime.getViews()) {
		if (!views.includes(pluginView.name)) {
			views.push(pluginView.name)
		}
	}
	return views
}

const resolveSeedDateIso = (
	value: unknown,
	fallback: string,
	timezone: string
): string => {
	if (!value) return fallback
	if (typeof value === 'string') return value
	const parsed = parseDate(value as Parameters<typeof parseDate>[0], timezone)
	return parsed ? toOffsetIso(parsed) : fallback
}

const resolveOpenEventSeed = (
	state: ReturnType<HeadlessCalendarController['getState']>,
	seed?: {
		start?: unknown
		end?: unknown
		allDay?: boolean
		resourceId?: string | number
	}
) => {
	const current =
		parseDate(state.currentDate, state.timezone) ?? now(state.timezone)
	const defaultStart = toOffsetIso(add(startOf(current, 'day'), 9, 'hour'))
	const start = resolveSeedDateIso(seed?.start, defaultStart, state.timezone)
	const startZoned = parseDate(start, state.timezone) ?? current
	const end = resolveSeedDateIso(
		seed?.end,
		toOffsetIso(add(startZoned, 1, 'hour')),
		state.timezone
	)
	return {
		start,
		end,
		allDay: Boolean(seed?.allDay),
		resource: state.resources.find((r) => r.id === seed?.resourceId),
	}
}

interface CalendarHeaderProps {
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}

export const CalendarHeader = ({
	controller,
	options,
	actions,
	formatters,
}: CalendarHeaderProps) => {
	const state = controller.getState()
	const { ownerState, t } = actions
	const views = resolveAvailableViews(options, actions.pluginRuntime)
	const activePluginView = actions.pluginRuntime.getView(state.view)

	const title =
		activePluginView?.headerTitle?.(state.currentDate, {
			firstDayOfWeek: state.firstDayOfWeek,
			timezone: state.timezone,
			locale: state.locale,
			hiddenDays: state.hiddenDays,
		}) ??
		formatCalendarHeaderTitle({
			currentDateIso: state.currentDate,
			visibleRange: state.visibleRange,
			view: state.view,
			firstDayOfWeek: state.firstDayOfWeek,
			hiddenDays: state.hiddenDays,
			timezone: state.timezone,
			locale: state.locale,
			hasResources: state.resources.length > 0,
			formatters,
		})

	const openNewEventForm = useMemo(
		() => () => {
			const current =
				parseDate(state.currentDate, state.timezone) ?? now(state.timezone)
			const start = add(startOf(current, 'day'), 9, 'hour')
			actions.openCreateDialog({
				start: toOffsetIso(start),
				end: toOffsetIso(add(start, 1, 'hour')),
				allDay: false,
				resource: state.resources.at(0),
			})
		},
		[state.currentDate, state.timezone, state.resources, actions]
	)

	const headerSlotContext = useMemo<HeaderSlotContext>(
		() => ({
			currentDate: state.currentDate,
			visibleRange: state.visibleRange,
			view: state.view,
			views,
			title,
			locale: state.locale,
			timezone: state.timezone,
			nextPeriod: () => controller.nextPeriod(),
			prevPeriod: () => controller.prevPeriod(),
			today: () => controller.today(),
			selectDate: (d) => controller.selectDate(d),
			setView: (v, d) => controller.setView(v, d),
			openEventForm: (seed) => {
				actions.openCreateDialog(
					resolveOpenEventSeed(controller.getState(), seed)
				)
			},
			t,
		}),
		[
			state.currentDate,
			state.visibleRange,
			state.view,
			state.locale,
			state.timezone,
			views,
			title,
			controller,
			actions,
			t,
		]
	)

	const legacyHeaderContext = useMemo<DomHeaderRenderContext>(
		() => ({
			state,
			title,
			views,
			nextPeriod: () => controller.nextPeriod(),
			prevPeriod: () => controller.prevPeriod(),
			today: () => controller.today(),
			setView: (v) => controller.setView(v),
			openNewEventForm,
		}),
		[state, title, views, controller, openNewEventForm]
	)

	const toolbarContext = useMemo<PluginToolbarContext>(
		() => ({
			placement: 'desktop',
			events: actions.rawEvents as PluginToolbarContext['events'],
			resources: state.resources,
			currentDate: state.currentDate,
			view: state.view,
			timezone: state.timezone,
			locale: state.locale,
			t,
			collect: (point, ctx) => actions.pluginRuntime.collect(point, ctx),
			slotProps: options.slotProps,
			ownerState,
		}),
		[actions, state, t, options.slotProps, ownerState]
	)

	const headerSlot = buildSlotProps(
		options.slotProps,
		'header',
		ownerState,
		options.headerClassName
	)

	if (options.slots?.header) {
		return (
			<header
				className={headerSlot.className}
				data-ilamy-slot="header"
				data-testid="calendar-header"
				style={headerSlot.style}
			>
				<SlotHost
					context={headerSlotContext}
					slot={options.slots.header}
					slotKey="header"
				/>
			</header>
		)
	}

	if (options.renderHeader) {
		return (
			<header
				className={headerSlot.className}
				data-ilamy-slot="header"
				data-testid="calendar-header"
				style={headerSlot.style}
			>
				<LegacyRenderHost
					context={legacyHeaderContext}
					renderFn={options.renderHeader}
					slotKey="header"
				/>
			</header>
		)
	}

	const toolbarSlot = buildSlotProps(options.slotProps, 'toolbar', ownerState)
	const navBtnSlot = buildSlotProps(options.slotProps, 'navButton', ownerState)
	const primaryBtnSlot = buildSlotProps(
		options.slotProps,
		'viewButtonActive',
		ownerState
	)
	const getViewLabel = (view: CalendarView) =>
		t(view) !== view ? t(view) : (VIEW_LABELS[view] ?? view)

	return (
		<header
			className={joinClassNames(headerSlot.className)}
			data-ilamy-slot="header"
			data-testid="calendar-header"
			style={headerSlot.style}
		>
			<div
				className={toolbarSlot.className}
				data-ilamy-slot="toolbar"
				style={toolbarSlot.style}
			>
				<div data-ilamy-slot="nav-group">
					<div data-ilamy-slot="arrow-group">
						<button
							aria-label={t('previous')}
							className={navBtnSlot.className}
							data-ilamy-slot="nav-button"
							data-testid="prev-period-btn"
							onClick={() => controller.prevPeriod()}
							style={navBtnSlot.style}
							type="button"
						>
							<ChevronLeftIcon size={16} />
						</button>
						<button
							aria-label={t('next')}
							className={navBtnSlot.className}
							data-ilamy-slot="nav-button"
							data-testid="next-period-btn"
							onClick={() => controller.nextPeriod()}
							style={navBtnSlot.style}
							type="button"
						>
							<ChevronRightIcon size={16} />
						</button>
					</div>
					<button
						className={navBtnSlot.className}
						data-ilamy-slot="nav-button"
						data-testid="today-btn"
						onClick={() => controller.today()}
						style={navBtnSlot.style}
						type="button"
					>
						{t('today')}
					</button>
					<HeaderDatePicker
						currentDateIso={state.currentDate}
						firstDayOfWeek={state.firstDayOfWeek}
						locale={state.locale}
						onSelectDate={(iso) => controller.selectDate(iso)}
						ownerState={ownerState}
						slotProps={options.slotProps}
						timezone={state.timezone}
						title={title}
						view={state.view}
					/>
				</div>

				<div data-ilamy-slot="actions-group">
					<div
						aria-label="Calendar view"
						data-ilamy-slot="view-switcher"
						role="group"
					>
						{views.map((view) => {
							const active = state.view === view
							const viewSlot = buildSlotProps(
								options.slotProps,
								active ? 'viewButtonActive' : 'viewButton',
								ownerState
							)
							return (
								<button
									aria-pressed={active}
									className={viewSlot.className}
									data-ilamy-slot="view-button"
									data-state={active ? 'active' : 'inactive'}
									data-testid={rendererKeys.testId.viewBtn(view)}
									data-view={view}
									key={view}
									onClick={() => controller.setView(view)}
									style={viewSlot.style}
									type="button"
								>
									{getViewLabel(view)}
								</button>
							)
						})}
					</div>

					<ViewMenu
						activeView={state.view}
						getViewLabel={getViewLabel}
						onSelectView={(v) => controller.setView(v)}
						ownerState={ownerState}
						slotProps={options.slotProps}
						views={views}
					/>

					<PluginSlotHost
						context={toolbarContext}
						plugins={actions.pluginRuntime.plugins}
						slotName={SLOT_TOOLBAR}
					/>

					{!options.disableCellClick && (
						<button
							aria-label={t('new')}
							className={primaryBtnSlot.className ?? navBtnSlot.className}
							data-ilamy-slot="nav-button"
							data-testid="new-event-btn"
							data-variant="primary"
							onClick={openNewEventForm}
							style={primaryBtnSlot.style ?? navBtnSlot.style}
							type="button"
						>
							<PlusIcon size={16} />
							<span data-ilamy-part="new-btn-label">{t('new')}</span>
						</button>
					)}
				</div>
			</div>
		</header>
	)
}
