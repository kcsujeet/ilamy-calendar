/** @jsxImportSource preact */
import { useRef } from 'preact/hooks'
import {
	add,
	type BusinessHours,
	buildTimeGridViewModel,
	type CellInfo,
	dayKey,
	filterEventsForResource,
	formatDate,
	getFields,
	getHorizontalBarStyle,
	getMonthDays,
	getVerticalBarStyle,
	getWeekDays,
	getWeekNumber,
	type HeadlessCalendarController,
	type HorizontalPositionedEvent,
	isBusinessDay,
	isSameDay,
	layoutHorizontal,
	layoutVertical,
	now,
	parseDate,
	type Resource,
	startOf,
	type TimeGridColumnViewModel,
	type TimeGridViewModel,
	toOffsetIso,
	toUtcIso,
	withoutHiddenDays,
	withTime,
	type ZonedDate,
} from '../../../../index'
import { formatSubCellSnapMinutes } from '../../../../utils/helpers'
import type { InteractionPreview } from '../../../interactions/calendar-pointer-engine'
import { MoreEventsButton } from '../../components/more-events-button'
import { LegacyRenderHost } from '../../components/slot-host'
import type {
	DomCalendarEvent,
	DomCalendarOptions,
	RenderCurrentTimeIndicatorProps,
	RendererActions,
} from '../../types/renderer.types'
import {
	buildTimedCellProps,
	clipSegmentIsoRange,
	resolveAnchorDate,
	useMonthViewportSetup,
} from '../../utils/cell-slot.utils'
import {
	canCommitSelection,
	resolveEffectiveBusinessHours,
} from '../../utils/constraints.utils'
import { resolveDragPreviewEvent } from '../../utils/drag-preview.utils'
import type { CalendarFormatters } from '../../utils/format.utils'
import { rendererKeys } from '../../utils/keys.utils'
import {
	type ScrollRequest,
	useScrollToTime,
} from '../../utils/scroll-to-time.utils'
import { buildSlotProps, joinClassNames } from '../../utils/slot-props.utils'
import { useStickyInsets } from '../../utils/sticky-insets.utils'
import { EventBar } from './event-bar'
import { HorizontalCellContent } from './month-grid-cells'
import { ResourceHeaderContent } from './resource-header-content'
import { ResourceHorizontalGrid } from './resource-horizontal-grid'

const HOUR_ROW_HEIGHT_PX = 60

const NowLine = ({
	percent,
	day,
	hours,
	resource,
	timezone,
	view,
	showDot = true,
	options,
	actions,
}: {
	percent: number | null
	day: ZonedDate
	hours: ZonedDate[]
	resource?: Resource
	timezone: string
	view: 'day' | 'week' | 'month'
	showDot?: boolean
	options: DomCalendarOptions
	actions: RendererActions
}) => {
	if (percent === null) return null
	const nowSlot = buildSlotProps(
		options.slotProps,
		'nowIndicator',
		actions.ownerState,
		undefined,
		{ left: '0', right: '0', top: `${percent}%`, transform: 'translateY(-50%)' }
	)
	const customFn = options.renderCurrentTimeIndicator
	if (customFn && hours.length > 0) {
		const firstHour = hours.at(0)
		const lastHour = hours.at(-1)
		const rangeStart = toOffsetIso(
			withTime(day, { hour: firstHour?.hour ?? 0, minute: 0, second: 0 })
		)
		const rangeEnd = toOffsetIso(
			add(
				withTime(day, { hour: lastHour?.hour ?? 23, minute: 0, second: 0 }),
				1,
				'hour'
			)
		)
		const props: RenderCurrentTimeIndicatorProps = {
			currentTime: toOffsetIso(now(timezone)),
			rangeStart,
			rangeEnd,
			progress: percent,
			axis: 'vertical',
			resource,
			view,
		}
		return (
			<div
				className={nowSlot.className}
				data-ilamy-slot="now-indicator"
				data-testid="current-time-indicator"
				style={nowSlot.style}
			>
				<LegacyRenderHost
					context={props}
					renderFn={customFn}
					slotKey="now-indicator"
				/>
			</div>
		)
	}
	return (
		<div
			className={nowSlot.className}
			data-ilamy-slot="now-indicator"
			data-testid="current-time-indicator"
			style={nowSlot.style}
		>
			{showDot && (
				<span data-ilamy-part="now-line-dot" data-testid="current-time-dot" />
			)}
			<span data-ilamy-part="now-line-bar" />
		</div>
	)
}

const VerticalResourceDayGrid = ({
	mode,
	controller,
	options,
	actions,
	formatters,
	visibleEvents,
	dragPreviewEvent,
}: {
	mode: 'month' | 'week'
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	visibleEvents: DomCalendarEvent[]
	dragPreviewEvent: DomCalendarEvent | null
}) => {
	const { viewportRef, state, isSticky, dayHeaderSlot, resHeaderSlot } =
		useMonthViewportSetup(
			controller,
			options,
			actions.ownerState,
			`v-res-${mode}`
		)
	const current = resolveAnchorDate(controller) ?? now(state.timezone)
	useScrollToTime({
		viewportRef,
		scrollToNow: options.scrollToNow,
		enabled: Boolean(options.scrollToNow) && state.resources.length > 0,
		scrollKey: `v-res-${mode}:${state.currentDate}`,
		axis: 'vertical',
	})
	const testId = rendererKeys.testId.modeView(mode)
	if (state.resources.length === 0) {
		return (
			<div
				data-ilamy-slot="grid-scroll"
				data-testid={testId}
				ref={viewportRef}
			/>
		)
	}
	const rawDays =
		mode === 'week'
			? getWeekDays(current, state.firstDayOfWeek)
			: getMonthDays(current)
	const days = withoutHiddenDays(rawDays, state.hiddenDays)
	const firstDay = days.at(0)
	const colTemplate = `64px repeat(${state.resources.length}, minmax(80px, 1fr))`

	return (
		<div data-ilamy-slot="grid-scroll" data-testid={testId} ref={viewportRef}>
			<div
				className={joinClassNames(options.viewHeaderClassName)}
				data-ilamy-slot="grid-header"
				data-sticky={isSticky ? 'true' : undefined}
				data-sticky-inset={isSticky ? 'top' : undefined}
			>
				<div
					data-ilamy-part="time-grid-header-row"
					style={{ gridTemplateColumns: colTemplate }}
				>
					<div
						className={dayHeaderSlot.className}
						data-ilamy-part="header-corner"
						data-sticky="true"
						data-sticky-inset="left"
						style={dayHeaderSlot.style}
					>
						{mode === 'week' && options.weekNumbers !== false ? (
							<WeekNumberCorner
								day={firstDay}
								locale={state.locale}
								options={options}
								weekLabel={actions.t('week')}
							/>
						) : (
							actions.t('resources')
						)}
					</div>
					{state.resources.map((resource) => (
						<div
							className={resHeaderSlot.className}
							data-ilamy-slot="resource-header"
							data-testid={rendererKeys.testId.resourceHeader(resource.id)}
							key={resource.id}
							style={resHeaderSlot.style}
						>
							<ResourceHeaderContent
								controller={controller}
								options={options}
								resource={resource}
							/>
						</div>
					))}
				</div>
			</div>

			<div
				data-ilamy-part="time-grid-body"
				style={{ gridTemplateColumns: colTemplate }}
			>
				<div
					data-ilamy-part="time-axis"
					data-sticky-inset="left"
					data-testid="dom-time-axis"
				>
					{days.map((day) => (
						<div
							data-ilamy-part="time-axis-hour"
							key={dayKey(day)}
							style={{ height: `${HOUR_ROW_HEIGHT_PX}px` }}
						>
							{formatDate(
								day,
								{ weekday: 'short', day: 'numeric' },
								state.locale
							)}
						</div>
					))}
				</div>

				{state.resources.map((resource) => (
					<VerticalResourceDayColumn
						actions={actions}
						controller={controller}
						days={days}
						dragPreviewEvent={dragPreviewEvent}
						formatters={formatters}
						key={resource.id}
						options={options}
						resource={resource}
						visibleEvents={visibleEvents}
					/>
				))}
			</div>
		</div>
	)
}

const resolveDailyResourceCellMeta = ({
	day,
	resource,
	effHours,
	options,
	actions,
}: {
	day: ZonedDate
	resource: Resource
	effHours: BusinessHours | BusinessHours[] | undefined
	options: DomCalendarOptions
	actions: RendererActions
}) => {
	const cellStart = startOf(day, 'day')
	const cellEnd = add(cellStart, 1, 'day')
	const cellInfo: CellInfo = {
		start: toOffsetIso(cellStart),
		end: toOffsetIso(cellEnd),
		allDay: true,
		resource,
	}
	const isDisabled = Boolean(options.isCellDisabled?.(cellInfo))
	const isNonBusiness = Boolean(effHours && !isBusinessDay(day, effHours))
	const slotKey = isDisabled
		? 'cellDisabled'
		: isNonBusiness
			? 'cellNonBusiness'
			: 'cell'
	const cellSlot = buildSlotProps(
		options.slotProps,
		slotKey,
		actions.ownerState,
		isDisabled ? options.classesOverride?.disabledCell : undefined,
		{ height: `${HOUR_ROW_HEIGHT_PX}px` }
	)
	return { cellStart, cellEnd, cellInfo, isDisabled, isNonBusiness, cellSlot }
}

const DailyResourceDayCell = ({
	day,
	isLastRow,
	resource,
	effHours,
	timezone,
	options,
	actions,
}: {
	day: ZonedDate
	isLastRow: boolean
	resource: Resource
	effHours: BusinessHours | BusinessHours[] | undefined
	timezone: string
	options: DomCalendarOptions
	actions: RendererActions
}) => {
	const { cellStart, cellEnd, cellInfo, isDisabled, isNonBusiness, cellSlot } =
		resolveDailyResourceCellMeta({
			day,
			resource,
			effHours,
			options,
			actions,
		})
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: cell click action paired with New button
		<div
			className={cellSlot.className}
			data-all-day="true"
			data-cell="true"
			data-date={dayKey(day)}
			data-disabled={isDisabled ? 'true' : 'false'}
			data-end={toUtcIso(cellEnd)}
			data-ilamy-slot="cell"
			data-last-row={isLastRow ? 'true' : undefined}
			data-non-business={isNonBusiness ? 'true' : undefined}
			data-resource-id={String(resource.id)}
			data-start={toUtcIso(cellStart)}
			data-testid={rendererKeys.testId.dayCell(dayKey(day))}
			onClick={() => {
				if (!canCommitSelection(cellInfo, options, timezone)) return
				options.onCellClick?.(cellInfo)
				actions.openCreateDialog(cellInfo)
			}}
			style={cellSlot.style}
		/>
	)
}

const VerticalResourceDayColumn = ({
	resource,
	days,
	controller,
	options,
	actions,
	formatters,
	visibleEvents,
	dragPreviewEvent,
}: {
	resource: Resource
	days: ZonedDate[]
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	visibleEvents: DomCalendarEvent[]
	dragPreviewEvent: DomCalendarEvent | null
}) => {
	const state = controller.getState()
	const effHours = resolveEffectiveBusinessHours(options, resource)
	const positioned = layoutVertical({
		days,
		gridType: 'day',
		events: filterEventsForResource(visibleEvents, resource.id),
	})
	const previewForCol =
		dragPreviewEvent &&
		String(dragPreviewEvent.resourceId ?? '') === String(resource.id)
			? layoutVertical({ days, gridType: 'day', events: [dragPreviewEvent] })
			: []

	return (
		<div
			data-ilamy-part="time-col"
			data-resource-id={String(resource.id)}
			style={{ height: `${days.length * HOUR_ROW_HEIGHT_PX}px` }}
		>
			{days.map((day, dayIdx) => (
				<DailyResourceDayCell
					actions={actions}
					day={day}
					effHours={effHours}
					isLastRow={dayIdx === days.length - 1}
					key={dayKey(day)}
					options={options}
					resource={resource}
					timezone={state.timezone}
				/>
			))}

			<div data-ilamy-part="events-layer">
				{positioned.map((item) => (
					<div
						data-ilamy-part="event-wrapper"
						key={item.event.id}
						style={{
							...getVerticalBarStyle(item),
							zIndex:
								item.zIndex !== undefined ? String(item.zIndex) : undefined,
						}}
					>
						<EventBar
							actions={actions}
							axis="vertical"
							controller={controller}
							event={item.event as DomCalendarEvent}
							formatters={formatters}
							options={options}
						/>
					</div>
				))}
				{previewForCol.map((item) => (
					<div
						data-ilamy-part="event-wrapper"
						key={rendererKeys.key.previewEvent(
							item.event.id,
							item.top,
							item.height
						)}
						style={{
							...getVerticalBarStyle(item),
							zIndex: '25',
							pointerEvents: 'none',
						}}
					>
						<EventBar
							actions={actions}
							axis="vertical"
							controller={controller}
							event={item.event as DomCalendarEvent}
							formatters={formatters}
							isPreview
							options={options}
						/>
					</div>
				))}
			</div>
		</div>
	)
}

const JS_WEEKDAY_LONG = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
] as const

const HeaderDayLabel = ({
	label,
	isTodayCol,
	useBadge,
	marginTop,
}: {
	label: string
	isTodayCol: boolean
	useBadge: boolean
	marginTop?: string
}) => (
	<span
		data-ilamy-part="col-header-label"
		data-ilamy-today-badge={isTodayCol && useBadge ? '' : undefined}
		data-testid={isTodayCol && useBadge ? 'day-number-today' : undefined}
		style={marginTop ? { marginTop } : undefined}
		title={label}
	>
		{label}
	</span>
)

const buildColumnHeaderDivProps = (
	col: TimeGridColumnViewModel,
	dayHeaderSlot: ReturnType<typeof buildSlotProps>,
	resHeaderSlot: ReturnType<typeof buildSlotProps>
) => {
	const isRes = Boolean(col.resource)
	const headerSlot = isRes ? resHeaderSlot : dayHeaderSlot
	const resourceId = col.resource ? String(col.resource.id) : undefined
	return {
		className: headerSlot.className,
		'data-date': dayKey(col.day),
		'data-ilamy-part': 'time-col-header',
		'data-ilamy-slot': isRes ? 'resource-header' : 'day-header',
		'data-resource-id': resourceId,
		'data-testid': col.resource
			? rendererKeys.testId.resourceHeader(col.resource.id)
			: rendererKeys.testId.weekWeekday(
					JS_WEEKDAY_LONG[getFields(col.day).dayOfWeek]
				),
		'data-today': col.isToday ? 'true' : undefined,
		style: headerSlot.style,
	}
}

const TimeGridColumnHeader = ({
	col,
	controller,
	options,
	formatters,
	dayHeaderSlot,
	resHeaderSlot,
}: {
	col: TimeGridColumnViewModel
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	formatters: CalendarFormatters
	dayHeaderSlot: ReturnType<typeof buildSlotProps>
	resHeaderSlot: ReturnType<typeof buildSlotProps>
}) => {
	const hasCustomFormat = Boolean(options.dayHeaderFormat)
	const formattedDay = formatters.formatDayHeader(col.day)
	const sublabel = hasCustomFormat ? formattedDay : col.sublabel
	return (
		<div {...buildColumnHeaderDivProps(col, dayHeaderSlot, resHeaderSlot)}>
			{col.resource ? (
				<ResourceHeaderContent
					controller={controller}
					options={options}
					resource={col.resource}
					truncate
				/>
			) : (
				<HeaderDayLabel
					isTodayCol={col.isToday}
					label={formattedDay}
					useBadge={hasCustomFormat}
				/>
			)}
			{(col.resource || !hasCustomFormat) && sublabel && (
				<HeaderDayLabel
					isTodayCol={col.isToday}
					label={sublabel}
					marginTop="0.125rem"
					useBadge
				/>
			)}
		</div>
	)
}

const WeekNumberCorner = ({
	day,
	options,
	locale,
	weekLabel,
}: {
	day: ZonedDate | undefined
	options: DomCalendarOptions
	locale: string
	weekLabel: string
}) => {
	if (!day) return null
	const weekNum = getWeekNumber(
		day,
		options.weekNumberCalculation ?? 'local',
		locale
	)
	return (
		<>
			<span>{weekLabel}</span>
			<strong className="animate-in" data-testid="week-number" key={weekNum}>
				{weekNum}
			</strong>
		</>
	)
}

const ResourceWeekHeaderRows = ({
	model,
	colTemplate,
	controller,
	options,
	actions,
	formatters,
	dayHeaderSlot,
	resHeaderSlot,
}: {
	model: TimeGridViewModel
	colTemplate: string
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	dayHeaderSlot: ReturnType<typeof buildSlotProps>
	resHeaderSlot: ReturnType<typeof buildSlotProps>
}) => {
	const state = controller.getState()
	const firstCol = model.columns.at(0)
	const dayCount = Math.max(1, model.days.length)

	return (
		<>
			<div
				data-ilamy-part="time-grid-header-row"
				style={{ gridTemplateColumns: colTemplate }}
			>
				<div
					className={dayHeaderSlot.className}
					data-ilamy-part="header-corner"
					data-sticky="true"
					data-sticky-inset="left"
					style={{
						...dayHeaderSlot.style,
						borderBottom: '1px solid var(--ilamy-border)',
					}}
				>
					{options.weekNumbers !== false && (
						<WeekNumberCorner
							day={firstCol?.day}
							locale={state.locale}
							options={options}
							weekLabel={actions.t('week')}
						/>
					)}
				</div>
				{state.resources.map((resource, rIdx) => {
					const startCol = 2 + rIdx * dayCount
					return (
						<div
							className={resHeaderSlot.className}
							data-ilamy-part="time-col-header"
							data-ilamy-slot="resource-header"
							data-resource-id={String(resource.id)}
							data-testid={rendererKeys.testId.resourceHeader(resource.id)}
							key={rendererKeys.key.slot('res-hdr', resource.id)}
							style={{
								...resHeaderSlot.style,
								gridColumn: `${startCol} / span ${dayCount}`,
								borderBottom: '1px solid var(--ilamy-border)',
							}}
						>
							<ResourceHeaderContent
								controller={controller}
								options={options}
								resource={resource}
								truncate
							/>
						</div>
					)
				})}
			</div>
			<div
				data-ilamy-part="time-grid-header-row"
				style={{ gridTemplateColumns: colTemplate }}
			>
				<div
					className={dayHeaderSlot.className}
					data-ilamy-part="header-corner"
					data-sticky="true"
					data-sticky-inset="left"
					style={dayHeaderSlot.style}
				/>
				{model.columns.map((col, colIdx) => {
					const label = options.dayHeaderFormat
						? formatters.formatDayHeader(col.day)
						: col.sublabel
					return (
						<div
							className={dayHeaderSlot.className}
							data-date={dayKey(col.day)}
							data-ilamy-part="time-col-header"
							data-ilamy-slot="day-header"
							data-resource-id={
								col.resource ? String(col.resource.id) : undefined
							}
							data-today={col.isToday ? 'true' : undefined}
							key={rendererKeys.key.timeHeader(
								dayKey(col.day),
								col.resource?.id,
								colIdx
							)}
							style={dayHeaderSlot.style}
						>
							<HeaderDayLabel isTodayCol={col.isToday} label={label} useBadge />
						</div>
					)
				})}
			</div>
		</>
	)
}

const TimeGridSingleDayBanner = ({
	firstCol,
	dayHeaderSlot,
	formatters,
	options,
	actions,
	locale,
}: {
	firstCol: TimeGridColumnViewModel
	dayHeaderSlot: ReturnType<typeof buildSlotProps>
	formatters: CalendarFormatters
	options: DomCalendarOptions
	actions: RendererActions
	locale: string
}) => {
	const label = options.dayHeaderFormat
		? formatters.formatDayHeader(firstCol.day)
		: formatDate(
				firstCol.day,
				{
					weekday: 'long',
					month: 'long',
					day: 'numeric',
					year: 'numeric',
				},
				locale
			)
	return (
		<div
			className={dayHeaderSlot.className}
			data-ilamy-part="day-banner"
			data-ilamy-slot="day-header"
			data-testid="day-view-header"
			style={dayHeaderSlot.style}
		>
			<span>{label}</span>
			{firstCol.isToday && (
				<span
					data-ilamy-today-badge=""
					data-testid="day-number-today"
					style={{ marginInlineStart: '0.5rem' }}
				>
					{actions.t('today')}
				</span>
			)}
		</div>
	)
}

const TimeGridHeaderCorner = ({
	mode,
	firstCol,
	dayHeaderSlot,
	locale,
	options,
	weekLabel,
}: {
	mode: 'day' | 'week' | 'month'
	firstCol: TimeGridColumnViewModel | undefined
	dayHeaderSlot: ReturnType<typeof buildSlotProps>
	locale: string
	options: DomCalendarOptions
	weekLabel: string
}) => (
	<div
		className={dayHeaderSlot.className}
		data-ilamy-part="header-corner"
		data-sticky="true"
		data-sticky-inset="left"
		style={dayHeaderSlot.style}
	>
		{mode === 'week' && options.weekNumbers !== false && (
			<WeekNumberCorner
				day={firstCol?.day}
				locale={locale}
				options={options}
				weekLabel={weekLabel}
			/>
		)}
	</div>
)

const TimeGridHeaderRow = ({
	mode,
	model,
	colTemplate,
	controller,
	options,
	actions,
	formatters,
}: {
	mode: 'day' | 'week' | 'month'
	model: TimeGridViewModel
	colTemplate: string
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}) => {
	const state = controller.getState()
	const firstCol = model.columns.at(0)
	const dayHeaderSlot = buildSlotProps(
		options.slotProps,
		'dayHeader',
		actions.ownerState
	)
	const resHeaderSlot = buildSlotProps(
		options.slotProps,
		'resourceHeader',
		actions.ownerState
	)

	if (mode === 'day' && state.resources.length === 0 && firstCol) {
		return (
			<TimeGridSingleDayBanner
				actions={actions}
				dayHeaderSlot={dayHeaderSlot}
				firstCol={firstCol}
				formatters={formatters}
				locale={state.locale}
				options={options}
			/>
		)
	}

	if (mode === 'week' && state.resources.length > 0) {
		return (
			<ResourceWeekHeaderRows
				actions={actions}
				colTemplate={colTemplate}
				controller={controller}
				dayHeaderSlot={dayHeaderSlot}
				formatters={formatters}
				model={model}
				options={options}
				resHeaderSlot={resHeaderSlot}
			/>
		)
	}

	const headerTestId =
		mode === 'week' && !actions.ownerState.hasResourceAxis
			? 'week-view-header'
			: undefined

	return (
		<div
			data-ilamy-part="time-grid-header-row"
			data-testid={headerTestId}
			style={{ gridTemplateColumns: colTemplate }}
		>
			<TimeGridHeaderCorner
				dayHeaderSlot={dayHeaderSlot}
				firstCol={firstCol}
				locale={state.locale}
				mode={mode}
				options={options}
				weekLabel={actions.t('week')}
			/>
			{model.columns.map((col, colIdx) => (
				<TimeGridColumnHeader
					col={col}
					controller={controller}
					dayHeaderSlot={dayHeaderSlot}
					formatters={formatters}
					key={rendererKeys.key.weekdayCol('hdr', colIdx)}
					options={options}
					resHeaderSlot={resHeaderSlot}
				/>
			))}
		</div>
	)
}

const ALL_DAY_BAR_HEIGHT_PX = 22
const ALL_DAY_BAR_GAP_PX = 2
const ALL_DAY_PADDING_PX = 4
const DEFAULT_ALL_DAY_MAX_EVENTS = 4

interface AllDayGroup {
	resource?: Resource
	startColIdx: number
	days: ZonedDate[]
	events: DomCalendarEvent[]
}

const appendUniqueEvents = (
	target: DomCalendarEvent[],
	incoming: DomCalendarEvent[]
) => {
	const seenIds = new Set(target.map((e) => e.id))
	for (const evt of incoming) {
		if (!seenIds.has(evt.id)) {
			seenIds.add(evt.id)
			target.push(evt)
		}
	}
}

const groupAllDayColumns = (
	columns: TimeGridColumnViewModel[]
): AllDayGroup[] => {
	const groups: AllDayGroup[] = []
	for (let idx = 0; idx < columns.length; idx++) {
		const col = columns.at(idx)
		if (!col) continue
		const currentGroup = groups.at(-1)
		const sameResource =
			currentGroup &&
			String(currentGroup.resource?.id ?? '__default__') ===
				String(col.resource?.id ?? '__default__')
		if (!sameResource) {
			groups.push({
				resource: col.resource,
				startColIdx: idx,
				days: [col.day],
				events: [...(col.allDayEvents as DomCalendarEvent[])],
			})
			continue
		}
		currentGroup.days.push(col.day)
		appendUniqueEvents(
			currentGroup.events,
			col.allDayEvents as DomCalendarEvent[]
		)
	}
	return groups
}

const matchesResourcePreview = (
	preview: DomCalendarEvent | null | undefined,
	resource?: Resource
): boolean => {
	if (!preview?.allDay) return false
	if (!resource) return true
	if (preview.resourceIds) {
		return preview.resourceIds.some((id) => String(id) === String(resource.id))
	}
	return String(preview.resourceId ?? '') === String(resource.id)
}

const renderAllDayOverlayBar = ({
	pos,
	groupDays,
	rowBarHeight,
	rowBarGap,
	isPreview,
	controller,
	options,
	actions,
	formatters,
	zone,
}: {
	pos: HorizontalPositionedEvent
	groupDays: ZonedDate[]
	rowBarHeight: number
	rowBarGap: number
	isPreview: boolean
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	zone: string
}) => {
	const rowTop = ALL_DAY_PADDING_PX + pos.row * (rowBarHeight + rowBarGap)
	const barStyle = getHorizontalBarStyle(pos, rowTop, rowBarHeight)
	const firstDay = groupDays.at(0)
	const lastDay = groupDays.at(-1)
	const rowStart = firstDay ? startOf(firstDay, 'day') : undefined
	const rowEnd = lastDay ? startOf(add(lastDay, 1, 'day'), 'day') : undefined
	const { segStart, segEnd } = clipSegmentIsoRange({
		eventStart: pos.event.start,
		eventEnd: pos.event.end,
		timezone: zone,
		rowStart,
		rowEnd,
	})
	return (
		<EventBar
			actions={actions}
			axis="horizontal"
			compact
			controller={controller}
			dataLeft={pos.left}
			dataWidth={pos.width}
			event={pos.event as DomCalendarEvent}
			formatters={formatters}
			isPreview={isPreview}
			key={
				isPreview
					? rendererKeys.key.previewEvent(pos.event.id, pos.left, pos.width)
					: rendererKeys.key.monthEvent(
							pos.event.id,
							pos.left,
							pos.width,
							pos.row
						)
			}
			options={options}
			segEnd={segEnd}
			segStart={segStart}
			segment={{
				isStart: !pos.isTruncatedStart,
				isEnd: !pos.isTruncatedEnd,
			}}
			style={{
				...barStyle,
				position: 'absolute',
				...(isPreview
					? { zIndex: '25', pointerEvents: 'none' }
					: { pointerEvents: 'auto' }),
			}}
		/>
	)
}

const TimeGridAllDayRow = ({
	columns,
	colTemplate,
	dragPreviewEvent,
	controller,
	options,
	actions,
	formatters,
}: {
	columns: TimeGridColumnViewModel[]
	colTemplate: string
	dragPreviewEvent?: DomCalendarEvent | null
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}) => {
	const state = controller.getState()
	const allDaySlot = buildSlotProps(
		options.slotProps,
		'allDayRow',
		actions.ownerState
	)
	const rowBarHeight = options.eventHeight ?? ALL_DAY_BAR_HEIGHT_PX
	const rowBarGap = options.eventSpacing ?? ALL_DAY_BAR_GAP_PX
	const dayMaxEvents = options.dayMaxEvents ?? DEFAULT_ALL_DAY_MAX_EVENTS
	const groups = groupAllDayColumns(columns)
	const layouts = groups.map((group) =>
		layoutHorizontal({
			events: group.events,
			days: group.days,
			dayMaxEvents,
			gridType: 'day',
		})
	)
	const colLayouts = layouts.flatMap((layout) => layout.columnLayouts)

	return (
		<div
			className={allDaySlot.className}
			data-ilamy-part="all-day-row"
			data-ilamy-slot="all-day-row"
			data-testid="all-day-row"
			style={{ ...allDaySlot.style, gridTemplateColumns: colTemplate }}
		>
			<div
				data-ilamy-part="all-day-label"
				data-sticky-inset="left"
				style={{ gridRow: '1', gridColumn: '1' }}
			>
				<span>{actions.t('allDay')}</span>
			</div>
			{columns.map((col, idx) => {
				const dayStart = startOf(col.day, 'day')
				const dayEnd = add(dayStart, 1, 'day')
				const dayIso = toOffsetIso(dayStart)
				const cellInfo: CellInfo = {
					start: dayIso,
					end: toOffsetIso(dayEnd),
					allDay: true,
					resource: col.resource,
				}
				const cellLayout = colLayouts.at(idx)
				const moreLink = (
					<MoreEventsButton
						actions={actions}
						cellLayout={cellLayout}
						dateIso={dayIso}
						getTitle={() => formatters.formatDayHeader(col.day)}
						options={options}
					/>
				)
				return (
					// biome-ignore lint/a11y/useKeyWithClickEvents: all-day cell creation paired with New button
					<div
						data-all-day="true"
						data-cell="true"
						data-date={dayKey(col.day)}
						data-end={toUtcIso(dayEnd)}
						data-ilamy-part="all-day-cell"
						data-last-col={idx === columns.length - 1 ? 'true' : undefined}
						data-resource-id={
							col.resource ? String(col.resource.id) : undefined
						}
						data-start={toUtcIso(dayStart)}
						data-testid={rendererKeys.testId.dayCell(dayKey(col.day))}
						key={rendererKeys.key.weekdayCol('all-day', idx)}
						onClick={(evt) => {
							if (
								evt.target !== evt.currentTarget &&
								!(evt.target as HTMLElement)?.closest(
									'[data-ilamy-part="grid-cell-content"]'
								)
							) {
								return
							}
							if (!canCommitSelection(cellInfo, options, state.timezone)) return
							options.onCellClick?.(cellInfo)
							actions.openCreateDialog(cellInfo)
						}}
						style={{ gridRow: '1', gridColumn: String(idx + 2) }}
					>
						<HorizontalCellContent
							cellLayout={cellLayout}
							moreLink={moreLink}
							rowBarGap={rowBarGap}
							rowBarHeight={rowBarHeight}
						/>
					</div>
				)
			})}
			{groups.map((group, groupIdx) => {
				const layout = layouts.at(groupIdx)
				const previewPositions = matchesResourcePreview(
					dragPreviewEvent,
					group.resource
				)
					? layoutHorizontal({
							events: dragPreviewEvent ? [dragPreviewEvent] : [],
							days: group.days,
							dayMaxEvents: 100,
							gridType: 'day',
						}).positionedEvents
					: []
				return (
					<div
						data-ilamy-part="all-day-events-overlay"
						key={rendererKeys.key.weekdayCol('all-day-overlay', groupIdx)}
						style={{
							position: 'relative',
							gridRow: '1',
							gridColumn: `${group.startColIdx + 2} / span ${group.days.length}`,
							pointerEvents: 'none',
							zIndex: 10,
						}}
					>
						{layout?.positionedEvents.map((pos) =>
							renderAllDayOverlayBar({
								pos,
								groupDays: group.days,
								rowBarHeight,
								rowBarGap,
								isPreview: false,
								controller,
								options,
								actions,
								formatters,
								zone: state.timezone,
							})
						)}
						{previewPositions.map((pos) =>
							renderAllDayOverlayBar({
								pos,
								groupDays: group.days,
								rowBarHeight,
								rowBarGap,
								isPreview: true,
								controller,
								options,
								actions,
								formatters,
								zone: state.timezone,
							})
						)}
					</div>
				)
			})}
		</div>
	)
}

const resolveTimeSlotMeta = ({
	col,
	hourNum,
	minute,
	slotMinutes,
	slotHeightPx,
	effHours,
	options,
	actions,
}: {
	col: TimeGridColumnViewModel
	hourNum: number
	minute: number
	slotMinutes: number
	slotHeightPx: number
	effHours: BusinessHours | BusinessHours[] | undefined
	options: DomCalendarOptions
	actions: RendererActions
}) => {
	const slotStart = withTime(col.day, { hour: hourNum, minute, second: 0 })
	const slotEnd = add(slotStart, slotMinutes, 'minute')
	const cellInfo: CellInfo = {
		start: toOffsetIso(slotStart),
		end: toOffsetIso(slotEnd),
		allDay: false,
		resource: col.resource,
	}
	const { isDisabled, isNonBusiness, cellSlot } = buildTimedCellProps({
		options,
		ownerState: actions.ownerState,
		effHours,
		cellInfo,
		businessDate: col.day,
		hour: hourNum,
		minute,
		extraStyle: { height: `${slotHeightPx}px` },
	})
	return {
		cellInfo,
		dataStart: toUtcIso(slotStart),
		dataEnd: toUtcIso(slotEnd),
		isDisabled,
		isNonBusiness,
		cellSlot,
	}
}

const TimeGridSlotCell = ({
	col,
	hourNum,
	minute,
	slotMinutes,
	slotHeightPx,
	isHourEnd,
	isLastRow,
	effHours,
	timezone,
	options,
	actions,
}: {
	col: TimeGridColumnViewModel
	hourNum: number
	minute: number
	slotMinutes: number
	slotHeightPx: number
	isHourEnd: boolean
	isLastRow: boolean
	effHours: BusinessHours | BusinessHours[] | undefined
	timezone: string
	options: DomCalendarOptions
	actions: RendererActions
}) => {
	const { cellInfo, dataStart, dataEnd, isDisabled, isNonBusiness, cellSlot } =
		resolveTimeSlotMeta({
			col,
			hourNum,
			minute,
			slotMinutes,
			slotHeightPx,
			effHours,
			options,
			actions,
		})
	const resourceId = col.resource ? String(col.resource.id) : undefined
	const snapMinutes = formatSubCellSnapMinutes(
		options.snapDuration,
		slotMinutes
	)

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: cell selection triggers create dialog
		<div
			className={cellSlot.className}
			data-all-day="false"
			data-cell="true"
			data-date={dayKey(col.day)}
			data-disabled={isDisabled ? 'true' : 'false'}
			data-end={dataEnd}
			data-hour={String(hourNum).padStart(2, '0')}
			data-hour-end={isHourEnd ? 'true' : undefined}
			data-ilamy-part="time-slot"
			data-ilamy-slot="cell"
			data-last-row={isLastRow ? 'true' : undefined}
			data-minute={String(minute)}
			data-non-business={isNonBusiness ? 'true' : undefined}
			data-resource-id={resourceId}
			data-snap-minutes={snapMinutes}
			data-start={dataStart}
			data-testid={rendererKeys.testId.timeSlot(
				dayKey(col.day),
				hourNum,
				minute
			)}
			data-time-axis={snapMinutes !== undefined ? 'vertical' : undefined}
			onClick={() => {
				if (!canCommitSelection(cellInfo, options, timezone)) return
				options.onCellClick?.(cellInfo)
				actions.openCreateDialog(cellInfo)
			}}
			style={cellSlot.style}
		/>
	)
}

const TimeGridColumn = ({
	col,
	hours,
	firstHourNum,
	lastHourNum,
	slotMinutes,
	slotsPerHour,
	slotHeightPx,
	dragPreviewEvent,
	mode,
	showNowDot,
	controller,
	options,
	actions,
	formatters,
}: {
	col: TimeGridColumnViewModel
	hours: ZonedDate[]
	firstHourNum: number
	lastHourNum: number
	slotMinutes: number
	slotsPerHour: number
	slotHeightPx: number
	dragPreviewEvent: DomCalendarEvent | null
	mode: 'day' | 'week' | 'month'
	showNowDot: boolean
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}) => {
	const state = controller.getState()
	const effHours = resolveEffectiveBusinessHours(options, col.resource)
	const colHours = hours.map((hour) =>
		withTime(col.day, { hour: hour.hour, minute: 0, second: 0 })
	)
	const matchesColResource =
		!col.resource ||
		String(dragPreviewEvent?.resourceId ?? '') === String(col.resource.id)
	const previewItems =
		dragPreviewEvent && !dragPreviewEvent.allDay && matchesColResource
			? layoutVertical({
					events: [dragPreviewEvent],
					days: colHours,
					gridType: 'hour',
				})
			: []

	return (
		<div
			data-date={dayKey(col.day)}
			data-first-hour={String(firstHourNum)}
			data-ilamy-part="time-col"
			data-last-hour={String(lastHourNum)}
			data-resource-id={col.resource ? String(col.resource.id) : undefined}
			data-time-column="true"
			style={{ height: `${hours.length * HOUR_ROW_HEIGHT_PX}px` }}
		>
			{hours.flatMap((hour, hourIdx) =>
				Array.from({ length: slotsPerHour }, (_, sub) => (
					<TimeGridSlotCell
						actions={actions}
						col={col}
						effHours={effHours}
						hourNum={hour.hour}
						isHourEnd={sub === slotsPerHour - 1}
						isLastRow={hourIdx === hours.length - 1 && sub === slotsPerHour - 1}
						key={rendererKeys.key.hourMinute(hour.hour, sub * slotMinutes)}
						minute={sub * slotMinutes}
						options={options}
						slotHeightPx={slotHeightPx}
						slotMinutes={slotMinutes}
						timezone={state.timezone}
					/>
				))
			)}

			<div data-ilamy-part="events-layer">
				{col.positionedEvents.map((item) => {
					const barHeightPx =
						(item.height / 100) * hours.length * HOUR_ROW_HEIGHT_PX
					const colStart = startOf(col.day, 'day')
					const colEnd = add(colStart, 1, 'day')
					const { evStart, evEnd, segStart, segEnd } = clipSegmentIsoRange({
						eventStart: item.event.start,
						eventEnd: item.event.end,
						timezone: state.timezone,
						rowStart: colStart,
						rowEnd: colEnd,
					})
					return (
						<EventBar
							actions={actions}
							axis="vertical"
							compact={barHeightPx <= 40}
							controller={controller}
							event={item.event as DomCalendarEvent}
							formatters={formatters}
							key={item.event.id}
							options={options}
							segEnd={segEnd}
							segStart={segStart}
							segment={{
								isStart:
									!item.isTruncatedStart &&
									(!evStart || isSameDay(col.day, evStart)),
								isEnd:
									!item.isTruncatedEnd &&
									(!evEnd || isSameDay(col.day, add(evEnd, -1, 'millisecond'))),
							}}
							style={{
								...getVerticalBarStyle(item),
								position: 'absolute',
								pointerEvents: 'auto',
								paddingInline: '1px',
								zIndex:
									item.zIndex !== undefined ? String(item.zIndex) : undefined,
							}}
						/>
					)
				})}
				{previewItems.map((item) => (
					<EventBar
						actions={actions}
						axis="vertical"
						controller={controller}
						event={item.event as DomCalendarEvent}
						formatters={formatters}
						isPreview
						key={rendererKeys.key.previewEvent(
							item.event.id,
							item.top,
							item.height
						)}
						options={options}
						style={{
							...getVerticalBarStyle(item),
							position: 'absolute',
							padding: '1px',
							zIndex: '25',
							pointerEvents: 'none',
						}}
					/>
				))}
			</div>

			<NowLine
				actions={actions}
				day={col.day}
				hours={hours}
				options={options}
				percent={col.nowIndicatorPercent}
				resource={col.resource}
				showDot={showNowDot}
				timezone={state.timezone}
				view={mode}
			/>
		</div>
	)
}

const TimeAxisColumn = ({
	hours,
	hasToday,
	currentHour,
	options,
	formatters,
}: {
	hours: ZonedDate[]
	hasToday: boolean
	currentHour: number
	options: DomCalendarOptions
	formatters: CalendarFormatters
}) => (
	<div
		data-ilamy-part="time-axis"
		data-sticky-inset="left"
		data-testid="dom-time-axis"
	>
		{hours.map((hour, index) => (
			<div
				aria-current={
					hasToday && hour.hour === currentHour ? 'time' : undefined
				}
				data-hour={String(hour.hour).padStart(2, '0')}
				data-ilamy-part="time-axis-hour"
				key={rendererKeys.key.timeAxisHour(hour.hour, index)}
				style={{ height: `${HOUR_ROW_HEIGHT_PX}px` }}
			>
				{options.renderHour ? (
					<LegacyRenderHost
						context={toOffsetIso(hour)}
						renderFn={options.renderHour}
						slotKey={`hour-${hour.hour}-${index}`}
					/>
				) : (
					formatters.formatSlotHeader(hour)
				)}
			</div>
		))}
	</div>
)

const buildVerticalGridViewModel = (
	mode: 'day' | 'week',
	current: ZonedDate,
	controller: HeadlessCalendarController,
	options: DomCalendarOptions,
	visibleEvents: DomCalendarEvent[]
) => {
	const state = controller.getState()
	const model = buildTimeGridViewModel({
		mode,
		currentDate: current,
		events: visibleEvents,
		resources: state.resources,
		firstDayOfWeek: state.firstDayOfWeek,
		timezone: state.timezone,
		locale: state.locale,
		hiddenDays: state.hiddenDays,
		businessHours: options.businessHours,
		hideNonBusinessHours: options.hideNonBusinessHours,
		slotMinTime: options.slotMinTime,
		slotMaxTime: options.slotMaxTime,
		nowIndicator: options.nowIndicator,
	})
	const colMinPx = state.resources.length > 0 ? 80 : 0
	const colMinWidth = `${colMinPx}px`
	const frameMinWidth =
		colMinPx > 0
			? `max(100%, ${64 + model.columns.length * colMinPx}px)`
			: '100%'
	const slotMinutes = options.slotDuration ?? 60
	const slotsPerHour = Math.max(1, 60 / slotMinutes)
	return {
		model,
		colTemplate: `64px repeat(${model.columns.length}, minmax(${colMinWidth}, 1fr))`,
		frameMinWidth,
		slotMinutes,
		slotsPerHour,
		slotHeightPx: HOUR_ROW_HEIGHT_PX / slotsPerHour,
		firstHourNum: model.hours.at(0)?.hour ?? 0,
		lastHourNum: (model.hours.at(-1)?.hour ?? 23) + 1,
	}
}

const VerticalTimeGrid = ({
	mode,
	current,
	dragPreviewEvent,
	scrollRequest,
	controller,
	options,
	actions,
	formatters,
	visibleEvents,
}: {
	mode: 'day' | 'week'
	current: ZonedDate
	dragPreviewEvent: DomCalendarEvent | null
	scrollRequest?: ScrollRequest
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	visibleEvents: DomCalendarEvent[]
}) => {
	const viewportRef = useRef<HTMLDivElement>(null)
	const state = controller.getState()
	const {
		model,
		colTemplate,
		frameMinWidth,
		slotMinutes,
		slotsPerHour,
		slotHeightPx,
		firstHourNum,
		lastHourNum,
	} = buildVerticalGridViewModel(
		mode,
		current,
		controller,
		options,
		visibleEvents
	)
	const isSticky = options.stickyViewHeader !== false
	const showAllDayRow = options.allDaySlot !== false
	const hasToday = model.columns.some((c) => c.isToday)
	const firstTodayColIdx = model.columns.findIndex((c) => c.isToday)
	const currentHour = now(state.timezone).hour

	useStickyInsets(
		viewportRef,
		`time:${mode}:${state.currentDate}:${options.stickyViewHeader !== false}:${options.allDaySlot !== false}:${state.resources.length}`
	)

	useScrollToTime({
		viewportRef,
		scrollTime:
			options.scrollTime ?? (options.scrollToNow ? undefined : '08:00'),
		scrollToNow: options.scrollToNow,
		scrollRequest,
		enabled: !actions.ownerState.hasResourceAxis || state.resources.length > 0,
		scrollKey: `${mode}:${state.currentDate}:${firstHourNum}-${lastHourNum}`,
		axis: 'vertical',
	})

	const gridHeader = (
		<div
			className={joinClassNames(options.viewHeaderClassName)}
			data-ilamy-slot="grid-header"
			data-sticky={isSticky ? 'true' : undefined}
			data-sticky-inset={isSticky ? 'top' : undefined}
		>
			<TimeGridHeaderRow
				actions={actions}
				colTemplate={colTemplate}
				controller={controller}
				formatters={formatters}
				mode={mode}
				model={model}
				options={options}
			/>
			{showAllDayRow && (
				<TimeGridAllDayRow
					actions={actions}
					colTemplate={colTemplate}
					columns={model.columns}
					controller={controller}
					dragPreviewEvent={dragPreviewEvent}
					formatters={formatters}
					options={options}
				/>
			)}
		</div>
	)

	const gridBody = (
		<div
			data-ilamy-part="time-grid-body"
			style={{ gridTemplateColumns: colTemplate }}
		>
			<TimeAxisColumn
				currentHour={currentHour}
				formatters={formatters}
				hasToday={hasToday}
				hours={model.hours}
				options={options}
			/>

			{model.columns.map((col, colIdx) => (
				<TimeGridColumn
					actions={actions}
					col={col}
					controller={controller}
					dragPreviewEvent={dragPreviewEvent}
					firstHourNum={firstHourNum}
					formatters={formatters}
					hours={model.hours}
					key={rendererKeys.key.weekdayCol('col', colIdx)}
					lastHourNum={lastHourNum}
					mode={mode}
					options={options}
					showNowDot={colIdx === firstTodayColIdx}
					slotHeightPx={slotHeightPx}
					slotMinutes={slotMinutes}
					slotsPerHour={slotsPerHour}
				/>
			))}
		</div>
	)

	if (actions.ownerState.hasResourceAxis) {
		return (
			<div
				data-ilamy-slot="grid-scroll"
				data-testid={rendererKeys.testId.modeView(mode)}
				ref={viewportRef}
			>
				<div
					data-ilamy-part="time-grid-scroll-frame"
					style={{ minWidth: frameMinWidth }}
				>
					{gridHeader}
					{gridBody}
				</div>
			</div>
		)
	}

	return (
		<div data-ilamy-part="time-grid-regular-frame">
			{gridHeader}
			<div
				data-ilamy-slot="grid-scroll"
				data-testid={rendererKeys.testId.modeView(mode)}
				ref={viewportRef}
			>
				{gridBody}
			</div>
		</div>
	)
}

interface TimeGridViewProps {
	mode: 'day' | 'week' | 'month'
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	visibleEvents: DomCalendarEvent[]
	dragPreview?: InteractionPreview | null
	scrollRequest?: ScrollRequest
}

export const TimeGridView = ({
	mode,
	controller,
	options,
	actions,
	formatters,
	visibleEvents,
	dragPreview,
	scrollRequest,
}: TimeGridViewProps) => {
	const state = controller.getState()
	const current =
		parseDate(state.currentDate, state.timezone) ?? now(state.timezone)
	const delegatesHorizontal =
		mode !== 'month' &&
		actions.ownerState.hasResourceAxis &&
		options.orientation !== 'vertical'
	const dragPreviewEvent = resolveDragPreviewEvent(dragPreview, visibleEvents)
	const isVerticalDailyResourceWeek =
		mode === 'week' &&
		actions.ownerState.hasResourceAxis &&
		options.orientation === 'vertical' &&
		options.weekViewGranularity === 'daily'

	if (mode === 'month' || isVerticalDailyResourceWeek) {
		return (
			<VerticalResourceDayGrid
				actions={actions}
				controller={controller}
				dragPreviewEvent={dragPreviewEvent}
				formatters={formatters}
				mode={mode === 'month' ? 'month' : 'week'}
				options={options}
				visibleEvents={visibleEvents}
			/>
		)
	}

	if (delegatesHorizontal) {
		return (
			<ResourceHorizontalGrid
				actions={actions}
				controller={controller}
				dragPreview={dragPreview}
				formatters={formatters}
				mode={mode}
				options={options}
				scrollRequest={scrollRequest}
				visibleEvents={visibleEvents}
			/>
		)
	}

	if (actions.ownerState.hasResourceAxis && state.resources.length === 0) {
		return (
			<div
				data-ilamy-part="time-grid-scroll-x"
				data-testid={rendererKeys.testId.modeView(mode)}
			/>
		)
	}

	return (
		<VerticalTimeGrid
			actions={actions}
			controller={controller}
			current={current}
			dragPreviewEvent={dragPreviewEvent}
			formatters={formatters}
			mode={mode}
			options={options}
			scrollRequest={scrollRequest}
			visibleEvents={visibleEvents}
		/>
	)
}
