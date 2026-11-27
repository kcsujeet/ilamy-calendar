/** @jsxImportSource preact */
import { useRef } from 'preact/hooks'
import {
	add,
	buildResourceTimelineViewModel,
	type CellInfo,
	dayKey,
	formatDate,
	getHorizontalBarStyle,
	type HeadlessCalendarController,
	type HorizontalCellLayout,
	type HorizontalPositionedEvent,
	isToday,
	layoutHorizontal,
	now,
	parseDate,
	type Resource,
	type ResourceTimelineRowViewModel,
	resolveTimelineGranularity,
	toOffsetIso,
	toUtcIso,
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
import { buildTimedCellProps } from '../../utils/cell-slot.utils'
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
import {
	buildFallbackMonthCell,
	HorizontalCellContent,
	MonthCell,
	MonthEventsOverlay,
} from './month-grid-cells'
import { ResourceHeaderContent } from './resource-header-content'

const HOUR_COL_WIDTH_PX = 81
const RESOURCE_COL_WIDTH_PX = 96
const DAILY_RESOURCE_WIDTH_PX = 176
const ROW_MIN_HEIGHT_PX = 60
const HOURLY_BAR_HEIGHT_PX = 24
const HOURLY_BAR_GAP_PX = 1

const ResourceLabelCell = ({
	resource,
	controller,
	options,
	actions,
}: {
	resource: Resource
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
}) => {
	const slotStyle = buildSlotProps(
		options.slotProps,
		'resourceHeader',
		actions.ownerState,
		undefined,
		{
			backgroundColor: resource.backgroundColor,
			color: resource.color,
		}
	)
	return (
		<div
			className={slotStyle.className}
			data-ilamy-slot="resource-header"
			data-resource-id={String(resource.id)}
			data-sticky="true"
			data-sticky-inset="left"
			data-testid={rendererKeys.testId.resourceHeader(resource.id)}
			style={slotStyle.style}
		>
			<ResourceHeaderContent
				controller={controller}
				options={options}
				resource={resource}
				truncate
			/>
		</div>
	)
}

const ResourceDailyGrid = ({
	mode,
	days,
	rows,
	currentMonth,
	colTemplate,
	minDayWidth,
	viewportRef,
	dragPreviewEvent,
	controller,
	options,
	actions,
	formatters,
}: {
	mode: 'day' | 'week' | 'month'
	days: ZonedDate[]
	rows: ResourceTimelineRowViewModel[]
	currentMonth: number
	colTemplate: string
	minDayWidth: string
	viewportRef: { current: HTMLDivElement | null }
	dragPreviewEvent: DomCalendarEvent | null
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}) => {
	const state = controller.getState()
	const isSticky = options.stickyViewHeader !== false
	const resHeaderSlot = buildSlotProps(
		options.slotProps,
		'resourceHeader',
		actions.ownerState
	)
	const dayHeaderSlot = buildSlotProps(
		options.slotProps,
		'dayHeader',
		actions.ownerState
	)

	return (
		<div
			data-ilamy-slot="grid-scroll"
			data-testid={rendererKeys.testId.modeView(mode)}
			ref={viewportRef}
		>
			<div
				className={joinClassNames(options.viewHeaderClassName)}
				data-ilamy-part="res-h-header"
				data-ilamy-slot="grid-header"
				data-sticky={isSticky ? 'true' : undefined}
				data-sticky-inset={isSticky ? 'top' : undefined}
				style={{ gridTemplateColumns: colTemplate }}
			>
				<div
					className={resHeaderSlot.className}
					data-ilamy-part="header-corner"
					data-ilamy-slot="resource-header"
					data-sticky="true"
					data-sticky-inset="left"
					style={resHeaderSlot.style}
				>
					{actions.t('resource')}
				</div>
				{days.map((day, dIdx) => {
					const todayDay = isToday(day)
					const label = options.dayHeaderFormat
						? formatters.formatDayHeader(day)
						: formatDate(
								day,
								{ weekday: 'short', day: 'numeric' },
								state.locale
							)
					return (
						<div
							className={dayHeaderSlot.className}
							data-ilamy-part="res-h-day-group"
							data-ilamy-slot="day-header"
							data-last-col={dIdx === days.length - 1 ? 'true' : undefined}
							data-today={todayDay ? 'true' : undefined}
							key={rendererKeys.key.weekdayCol('day-hdr', dIdx)}
							style={dayHeaderSlot.style}
						>
							<span
								data-ilamy-part="col-header-label"
								data-ilamy-today-badge={todayDay ? '' : undefined}
								title={label}
							>
								{label}
							</span>
						</div>
					)
				})}
			</div>

			{rows.map(({ resource, dailyLayout }) => (
				<div
					data-ilamy-part="res-h-row"
					data-resource-id={String(resource.id)}
					key={resource.id}
					style={{ gridTemplateColumns: colTemplate }}
				>
					<ResourceLabelCell
						actions={actions}
						controller={controller}
						options={options}
						resource={resource}
					/>
					<div
						data-ilamy-part="grid-row-grid"
						data-ilamy-slot="grid-row"
						style={{
							gridColumn: `2 / span ${days.length}`,
							gridTemplateColumns: `repeat(${days.length}, minmax(${minDayWidth}, 1fr))`,
						}}
					>
						{days.map((day, idx) => (
							<MonthCell
								actions={actions}
								cellLayout={dailyLayout?.columnLayouts.at(idx)}
								cellModel={buildFallbackMonthCell(
									day,
									currentMonth,
									options,
									resource
								)}
								controller={controller}
								isLastCol={idx === days.length - 1}
								key={rendererKeys.key.weekdayCol('res-day', idx)}
								options={options}
							/>
						))}
						{dailyLayout && (
							<MonthEventsOverlay
								actions={actions}
								controller={controller}
								days={days}
								dragPreviewEvent={dragPreviewEvent}
								formatters={formatters}
								layout={dailyLayout}
								options={options}
								resource={resource}
							/>
						)}
					</div>
				</div>
			))}
		</div>
	)
}

const ResourceHourlyHeader = ({
	days,
	hours,
	colTemplate,
	currentNow,
	options,
	actions,
	formatters,
}: {
	days: ZonedDate[]
	hours: ZonedDate[]
	colTemplate: string
	currentNow: ZonedDate
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}) => {
	const isSticky = options.stickyViewHeader !== false
	const resHeaderSlot = buildSlotProps(
		options.slotProps,
		'resourceHeader',
		actions.ownerState
	)
	const dayHeaderSlot = buildSlotProps(
		options.slotProps,
		'dayHeader',
		actions.ownerState
	)

	return (
		<div
			className={joinClassNames(options.viewHeaderClassName)}
			data-ilamy-part="res-h-header"
			data-ilamy-slot="grid-header"
			data-sticky={isSticky ? 'true' : undefined}
			data-sticky-inset={isSticky ? 'top' : undefined}
			style={{ gridTemplateColumns: colTemplate }}
		>
			<div
				className={resHeaderSlot.className}
				data-ilamy-part="header-corner"
				data-ilamy-slot="resource-header"
				data-sticky="true"
				data-sticky-inset="left"
				style={{
					...resHeaderSlot.style,
					gridRow: '1 / span 2',
					gridColumn: '1',
				}}
			>
				{actions.t('resources')}
			</div>

			{days.map((day, dIdx) => {
				const startCol = 2 + dIdx * hours.length
				const todayDay = isToday(day)
				const isLastDay = dIdx === days.length - 1
				const formattedDay = formatters.formatDayHeader(day)
				const hasCustomFormat = Boolean(options.dayHeaderFormat)
				return [
					<div
						className={dayHeaderSlot.className}
						data-hourly="true"
						data-ilamy-part="res-h-day-group"
						data-ilamy-slot="day-header"
						data-last-col={isLastDay ? 'true' : undefined}
						data-today={todayDay ? 'true' : undefined}
						key={rendererKeys.key.weekdayCol('grp-day', dIdx)}
						style={{
							...dayHeaderSlot.style,
							gridRow: '1',
							gridColumn: `${startCol} / span ${hours.length}`,
						}}
					>
						<div data-ilamy-part="res-h-day-label">
							<span
								data-ilamy-part="col-header-label"
								data-ilamy-today-badge={
									hasCustomFormat && todayDay ? '' : undefined
								}
								title={formattedDay}
							>
								{formattedDay}
							</span>
							{!hasCustomFormat && (
								<span
									data-ilamy-today-badge={todayDay ? '' : undefined}
									data-testid={todayDay ? 'day-number-today' : undefined}
								>
									{day.day}
								</span>
							)}
						</div>
					</div>,
					...hours.map((hour, hIdx) => {
						const hourDate = withTime(day, {
							hour: hour.hour,
							minute: 0,
							second: 0,
						})
						const isCurrentHour = todayDay && hourDate.hour === currentNow.hour
						const isLastHour = isLastDay && hIdx === hours.length - 1
						const hourStr = String(hour.hour).padStart(2, '0')
						return (
							<div
								aria-current={isCurrentHour ? 'time' : undefined}
								data-current-hour={isCurrentHour ? 'true' : undefined}
								data-date={dayKey(day)}
								data-hour={hourStr}
								data-ilamy-part="res-h-hour-cell"
								data-last-col={isLastHour ? 'true' : undefined}
								data-testid={rendererKeys.testId.resourceWeekTimeLabel(hourStr)}
								key={rendererKeys.key.weekdayCol(`grp-hr-${dIdx}`, hIdx)}
								style={{
									gridRow: '2',
									gridColumn: String(startCol + hIdx),
								}}
							>
								{formatters.formatSlotHeader(hourDate)}
							</div>
						)
					}),
				]
			})}
		</div>
	)
}

const HorizontalNowLine = ({
	nowIndicatorPercent,
	hourSlots,
	resource,
	timezone,
	view,
	showDot = true,
	options,
}: {
	nowIndicatorPercent: number | null
	hourSlots: ZonedDate[]
	resource: Resource
	timezone: string
	view: 'day' | 'week' | 'month'
	showDot?: boolean
	options: DomCalendarOptions
}) => {
	if (nowIndicatorPercent === null) return null
	const lineStyle = {
		top: '0',
		bottom: '0',
		left: `${nowIndicatorPercent}%`,
		transform: 'translateX(-50%)',
		flexDirection: 'column' as const,
	}
	const customFn = options.renderCurrentTimeIndicator
	if (customFn && hourSlots.length > 0) {
		const firstSlot = hourSlots.at(0)
		const lastSlot = hourSlots.at(-1)
		const props: RenderCurrentTimeIndicatorProps = {
			currentTime: toOffsetIso(now(timezone)),
			rangeStart: firstSlot ? toOffsetIso(firstSlot) : '',
			rangeEnd: lastSlot ? toOffsetIso(add(lastSlot, 1, 'hour')) : '',
			progress: nowIndicatorPercent,
			axis: 'horizontal',
			resource,
			view,
		}
		return (
			<div
				data-ilamy-slot="now-indicator"
				data-testid="current-time-indicator"
				style={lineStyle}
			>
				<LegacyRenderHost
					context={props}
					renderFn={customFn}
					slotKey="now-indicator-h"
				/>
			</div>
		)
	}
	return (
		<div
			data-ilamy-slot="now-indicator"
			data-testid="current-time-indicator"
			style={lineStyle}
		>
			{showDot && (
				<span data-ilamy-part="now-line-dot" data-testid="current-time-dot" />
			)}
			<span data-ilamy-part="now-line-bar-v" />
		</div>
	)
}

interface PrecomputedHourSlot {
	slotStart: ZonedDate
	slotIso: string
	slotEndIso: string
	startUtcIso: string
	endUtcIso: string
	dateKey: string
	hour: number
	snapMinutes: string | undefined
}

const buildPrecomputedHourSlots = (
	hourSlots: ZonedDate[],
	snapDuration: DomCalendarOptions['snapDuration']
): PrecomputedHourSlot[] => {
	const snapMinutes = formatSubCellSnapMinutes(snapDuration, 60)
	return hourSlots.map((slotStart) => {
		const slotEnd = add(slotStart, 1, 'hour')
		return {
			slotStart,
			slotIso: toOffsetIso(slotStart),
			slotEndIso: toOffsetIso(slotEnd),
			startUtcIso: toUtcIso(slotStart),
			endUtcIso: toUtcIso(slotEnd),
			dateKey: dayKey(slotStart),
			hour: slotStart.hour,
			snapMinutes,
		}
	})
}

const ResourceHourSlotCell = ({
	slot,
	slotIdx,
	totalSlots,
	resource,
	effHours,
	cellLayout,
	rowBarHeight,
	rowBarGap,
	locale,
	timezone,
	options,
	actions,
	gridStyle,
}: {
	slot: PrecomputedHourSlot
	slotIdx: number
	totalSlots: number
	resource: Resource
	effHours: ReturnType<typeof resolveEffectiveBusinessHours>
	cellLayout?: HorizontalCellLayout
	rowBarHeight: number
	rowBarGap: number
	locale: string
	timezone: string
	options: DomCalendarOptions
	actions: RendererActions
	gridStyle?: Record<string, string | number | undefined>
}) => {
	const {
		slotStart,
		slotIso,
		slotEndIso,
		startUtcIso,
		endUtcIso,
		dateKey,
		hour,
		snapMinutes,
	} = slot
	const cellInfo: CellInfo = {
		start: slotIso,
		end: slotEndIso,
		allDay: false,
		resource,
	}
	const { isDisabled, isNonBusiness, cellSlot } = buildTimedCellProps({
		options,
		ownerState: actions.ownerState,
		effHours,
		cellInfo,
		businessDate: slotStart,
		hour,
		minute: 0,
		extraStyle: { padding: '3px 4px 4px', ...gridStyle },
	})
	const moreLink = (
		<MoreEventsButton
			actions={actions}
			cellLayout={cellLayout}
			dateIso={slotIso}
			getTitle={() => {
				const formatted = formatDate(
					slotStart,
					{
						month: 'long',
						day: 'numeric',
						hour: 'numeric',
						minute: '2-digit',
					},
					locale
				)
				return `${resource.title} · ${formatted}`
			}}
			options={options}
		/>
	)

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: cell click action paired with New button
		<div
			className={cellSlot.className}
			data-all-day="false"
			data-cell="true"
			data-disabled={isDisabled ? 'true' : 'false'}
			data-end={endUtcIso}
			data-ilamy-part="res-h-hour-slot"
			data-ilamy-slot="cell"
			data-last-col={slotIdx === totalSlots - 1 ? 'true' : undefined}
			data-non-business={isNonBusiness ? 'true' : undefined}
			data-resource-id={String(resource.id)}
			data-snap-minutes={snapMinutes}
			data-start={startUtcIso}
			data-testid={rendererKeys.testId.resourceHourSlot(
				resource.id,
				dateKey,
				hour
			)}
			data-time-axis={snapMinutes !== undefined ? 'horizontal' : undefined}
			onClick={(evt) => {
				if (
					evt.target !== evt.currentTarget &&
					!(evt.target as HTMLElement)?.closest(
						'[data-ilamy-part="grid-cell-content"]'
					)
				) {
					return
				}
				if (isDisabled || !canCommitSelection(cellInfo, options, timezone)) {
					return
				}
				options.onCellClick?.(cellInfo)
				actions.openCreateDialog(cellInfo)
			}}
			style={cellSlot.style}
		>
			<HorizontalCellContent
				cellLayout={cellLayout}
				moreLink={moreLink}
				rowBarGap={rowBarGap}
				rowBarHeight={rowBarHeight}
			/>
		</div>
	)
}

const DEFAULT_HOURLY_MAX_EVENTS = 4

const ResourceHourlyRow = ({
	rowModel,
	mode,
	days,
	hoursCount,
	hourSlots,
	precomputedHourSlots,
	nowIndicatorPercent,
	showNowDot,
	colTemplate,
	dragPreviewEvent,
	controller,
	options,
	actions,
	formatters,
}: {
	rowModel: ResourceTimelineRowViewModel
	mode: 'day' | 'week' | 'month'
	days: ZonedDate[]
	hoursCount: number
	hourSlots: ZonedDate[]
	precomputedHourSlots: PrecomputedHourSlot[]
	nowIndicatorPercent: number | null
	showNowDot: boolean
	colTemplate: string
	dragPreviewEvent: DomCalendarEvent | null
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}) => {
	const state = controller.getState()
	const { resource } = rowModel
	const effHours = resolveEffectiveBusinessHours(options, resource)
	const barHeight = options.eventHeight ?? HOURLY_BAR_HEIGHT_PX
	const barGap = options.eventSpacing ?? HOURLY_BAR_GAP_PX
	const dayMaxEvents = options.dayMaxEvents ?? DEFAULT_HOURLY_MAX_EVENTS
	const dayCount = Math.max(1, days.length)
	const hoursPerDay = Math.max(1, hoursCount)

	const dayGroups = days.map((_, dIdx) => {
		const slots = hourSlots.slice(dIdx * hoursPerDay, (dIdx + 1) * hoursPerDay)
		const layout =
			dayCount === 1 && rowModel.hourlyLayout
				? rowModel.hourlyLayout
				: layoutHorizontal({
						events: rowModel.events,
						days: slots,
						dayMaxEvents,
						gridType: 'hour',
					})
		const previews: HorizontalPositionedEvent[] =
			dragPreviewEvent &&
			(dragPreviewEvent.resourceIds
				? dragPreviewEvent.resourceIds.some(
						(id) => String(id) === String(resource.id)
					)
				: String(dragPreviewEvent.resourceId ?? '') === String(resource.id))
				? layoutHorizontal({
						events: [dragPreviewEvent],
						days: slots,
						dayMaxEvents: 100,
						gridType: 'hour',
					}).positionedEvents
				: []
		const dayNowPercent =
			nowIndicatorPercent !== null
				? nowIndicatorPercent * dayCount - dIdx * 100
				: null
		return { slots, layout, previews, dayNowPercent }
	})

	const columnLayouts = dayGroups.flatMap((g) => g.layout.columnLayouts)
	const maxLane = dayGroups.reduce(
		(acc, group) =>
			group.layout.positionedEvents.reduce(
				(rowMax, item) => Math.max(rowMax, item.row + 1),
				acc
			),
		0
	)
	const hasOverflow = columnLayouts.some((col) => col.hiddenCount > 0)
	const minHeight = Math.max(
		ROW_MIN_HEIGHT_PX,
		7 +
			maxLane * barHeight +
			Math.max(0, maxLane - 1) * barGap +
			(hasOverflow ? 24 : 0)
	)

	return (
		<div
			data-ilamy-part="res-h-row"
			data-resource-id={String(resource.id)}
			key={resource.id}
			style={{
				gridTemplateColumns: colTemplate,
				minHeight: `${minHeight}px`,
			}}
		>
			<ResourceLabelCell
				actions={actions}
				controller={controller}
				options={options}
				resource={resource}
			/>
			<div
				data-ilamy-part="res-h-track"
				data-ilamy-slot="grid-row"
				style={{
					position: 'relative',
					display: 'grid',
					gridColumn: `2 / span ${hourSlots.length}`,
					gridTemplateColumns: `repeat(${hourSlots.length}, minmax(${HOUR_COL_WIDTH_PX}px, 1fr))`,
				}}
			>
				{precomputedHourSlots.map((slot, slotIdx) => (
					<ResourceHourSlotCell
						actions={actions}
						cellLayout={columnLayouts.at(slotIdx)}
						effHours={effHours}
						gridStyle={{ gridRow: '1', gridColumn: String(slotIdx + 1) }}
						key={rendererKeys.key.weekdayCol('slot', slotIdx)}
						locale={state.locale}
						options={options}
						resource={resource}
						rowBarGap={barGap}
						rowBarHeight={barHeight}
						slot={slot}
						slotIdx={slotIdx}
						timezone={state.timezone}
						totalSlots={precomputedHourSlots.length}
					/>
				))}

				{dayGroups.map((group, dIdx) => {
					const showNowInDay =
						group.dayNowPercent !== null &&
						group.dayNowPercent >= 0 &&
						group.dayNowPercent < 100
					return (
						<div
							data-ilamy-part="events-layer"
							key={rendererKeys.key.weekdayCol('events-layer', dIdx)}
							style={{
								position: 'relative',
								inset: 'auto',
								gridRow: '1',
								gridColumn: `${1 + dIdx * hoursPerDay} / span ${hoursPerDay}`,
								pointerEvents: 'none',
								zIndex: 10,
							}}
						>
							{group.layout.positionedEvents.map((pos) => {
								const rowTop = barGap + pos.row * (barHeight + barGap)
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
										key={rendererKeys.key.monthEvent(
											pos.event.id,
											pos.left,
											pos.width,
											pos.row
										)}
										options={options}
										segment={{
											isStart: !pos.isTruncatedStart,
											isEnd: !pos.isTruncatedEnd,
										}}
										style={{
											...getHorizontalBarStyle(pos, rowTop, barHeight),
											position: 'absolute',
											pointerEvents: 'auto',
										}}
									/>
								)
							})}
							{group.previews.map((pos) => {
								const rowTop = barGap + pos.row * (barHeight + barGap)
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
										isPreview
										key={rendererKeys.key.previewEvent(
											pos.event.id,
											pos.left,
											pos.width
										)}
										options={options}
										style={{
											...getHorizontalBarStyle(pos, rowTop, barHeight),
											position: 'absolute',
											zIndex: '25',
											pointerEvents: 'none',
										}}
									/>
								)
							})}
							{showNowInDay && (
								<HorizontalNowLine
									hourSlots={group.slots}
									nowIndicatorPercent={group.dayNowPercent}
									options={options}
									resource={resource}
									showDot={showNowDot}
									timezone={state.timezone}
									view={mode}
								/>
							)}
						</div>
					)
				})}
			</div>
		</div>
	)
}

interface ResourceHorizontalGridProps {
	mode: 'day' | 'week' | 'month'
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	visibleEvents: DomCalendarEvent[]
	dragPreview?: InteractionPreview | null
	scrollRequest?: ScrollRequest
}

const buildResourceTimelineConfig = ({
	mode,
	current,
	events,
	resources,
	state,
	options,
	dayMaxEvents,
	nowIndicator,
}: {
	mode: 'day' | 'week' | 'month'
	current: ZonedDate
	events: DomCalendarEvent[]
	resources: Resource[]
	state: ReturnType<HeadlessCalendarController['getState']>
	options: DomCalendarOptions
	dayMaxEvents?: number
	nowIndicator?: boolean
}) =>
	buildResourceTimelineViewModel({
		mode,
		currentDate: current,
		events,
		resources,
		firstDayOfWeek: state.firstDayOfWeek,
		timezone: state.timezone,
		hiddenDays: state.hiddenDays,
		dayMaxEvents,
		businessHours: options.businessHours,
		hideNonBusinessHours: options.hideNonBusinessHours,
		slotMinTime: options.slotMinTime,
		slotMaxTime: options.slotMaxTime,
		weekViewGranularity: options.weekViewGranularity,
		nowIndicator,
	})

const renderHourlyTimelineView = ({
	viewportRef,
	mode,
	currentNow,
	model,
	dragPreviewEvent,
	controller,
	options,
	actions,
	formatters,
}: {
	viewportRef: { current: HTMLDivElement | null }
	mode: 'day' | 'week' | 'month'
	currentNow: ZonedDate
	model: ReturnType<typeof buildResourceTimelineViewModel>
	dragPreviewEvent: DomCalendarEvent | null
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}) => {
	const totalCols = model.days.length * model.hours.length
	const colTemplate = `${RESOURCE_COL_WIDTH_PX}px repeat(${totalCols}, minmax(${HOUR_COL_WIDTH_PX}px, 1fr))`
	const precomputedHourSlots = buildPrecomputedHourSlots(
		model.hourSlots,
		options.snapDuration
	)
	return (
		<div
			data-ilamy-slot="grid-scroll"
			data-testid="dom-resource-hourly-grid"
			ref={viewportRef}
		>
			<ResourceHourlyHeader
				actions={actions}
				colTemplate={colTemplate}
				currentNow={currentNow}
				days={model.days}
				formatters={formatters}
				hours={model.hours}
				options={options}
			/>
			{model.rows.map((rowModel, rowIdx) => (
				<ResourceHourlyRow
					actions={actions}
					colTemplate={colTemplate}
					controller={controller}
					days={model.days}
					dragPreviewEvent={dragPreviewEvent}
					formatters={formatters}
					hourSlots={model.hourSlots}
					hoursCount={model.hours.length}
					key={rowModel.resource.id}
					mode={mode}
					nowIndicatorPercent={model.nowIndicatorPercent}
					options={options}
					precomputedHourSlots={precomputedHourSlots}
					rowModel={rowModel}
					showNowDot={rowIdx === 0}
				/>
			))}
		</div>
	)
}

const renderDailyTimelineView = ({
	viewportRef,
	mode,
	currentMonth,
	model,
	dragPreviewEvent,
	controller,
	options,
	actions,
	formatters,
}: {
	viewportRef: { current: HTMLDivElement | null }
	mode: 'week' | 'month' | 'day'
	currentMonth: number
	model: ReturnType<typeof buildResourceTimelineConfig>
	dragPreviewEvent: DomCalendarEvent | null
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}) => {
	const days = model.days
	const minDayWidth = days.length <= 7 ? '0px' : '81px'
	const colTemplate = `${DAILY_RESOURCE_WIDTH_PX}px repeat(${days.length}, minmax(${minDayWidth}, 1fr))`
	return (
		<ResourceDailyGrid
			actions={actions}
			colTemplate={colTemplate}
			controller={controller}
			currentMonth={currentMonth}
			days={days}
			dragPreviewEvent={dragPreviewEvent}
			formatters={formatters}
			minDayWidth={minDayWidth}
			mode={mode}
			options={options}
			rows={model.rows}
			viewportRef={viewportRef}
		/>
	)
}

export const ResourceHorizontalGrid = ({
	mode,
	controller,
	options,
	actions,
	formatters,
	visibleEvents,
	dragPreview,
	scrollRequest,
}: ResourceHorizontalGridProps) => {
	const viewportRef = useRef<HTMLDivElement>(null)
	const state = controller.getState()
	const current =
		parseDate(state.currentDate, state.timezone) ?? now(state.timezone)
	const model = buildResourceTimelineConfig({
		mode,
		current,
		events: visibleEvents,
		resources: state.resources,
		state,
		options,
		dayMaxEvents: options.dayMaxEvents,
		nowIndicator: options.nowIndicator,
	})
	const dragPreviewEvent = resolveDragPreviewEvent(dragPreview, visibleEvents)

	const isHourly =
		mode !== 'month' &&
		resolveTimelineGranularity(mode, options.weekViewGranularity) === 'hourly'
	const firstHourNum = model.hours.at(0)?.hour ?? 0
	const lastHourNum = (model.hours.at(-1)?.hour ?? 23) + 1

	useStickyInsets(
		viewportRef,
		`res-h:${mode}:${isHourly}:${state.currentDate}:${options.stickyViewHeader !== false}:${state.resources.length}`
	)

	useScrollToTime({
		viewportRef,
		scrollTime:
			options.scrollTime ?? (options.scrollToNow ? undefined : '08:00'),
		scrollToNow: options.scrollToNow,
		scrollRequest,
		enabled: isHourly
			? model.hourSlots.length > 0
			: Boolean(options.scrollToNow),
		scrollKey: `res-h:${mode}:${state.currentDate}:${firstHourNum}-${lastHourNum}:${model.days.length}`,
		axis: 'horizontal',
	})

	if (!isHourly) {
		return renderDailyTimelineView({
			viewportRef,
			mode,
			currentMonth: current.month,
			model,
			dragPreviewEvent,
			controller,
			options,
			actions,
			formatters,
		})
	}

	return renderHourlyTimelineView({
		viewportRef,
		mode,
		currentNow: now(state.timezone),
		model,
		dragPreviewEvent,
		controller,
		options,
		actions,
		formatters,
	})
}
