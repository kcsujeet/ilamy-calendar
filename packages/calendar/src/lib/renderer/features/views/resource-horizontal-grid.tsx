/** @jsxImportSource preact */
import { useRef } from 'preact/hooks'
import {
	add,
	buildResourceTimelineViewModel,
	type CellInfo,
	dayKey,
	formatDate,
	type HeadlessCalendarController,
	isToday,
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
	MonthCell,
	MonthEventsOverlay,
} from './month-grid-cells'
import { ResourceHeaderContent } from './resource-header-content'

const HOUR_COL_WIDTH_PX = 80
const RESOURCE_COL_WIDTH_PX = 96
const DAILY_RESOURCE_WIDTH_PX = 176
const ROW_MIN_HEIGHT_PX = 80

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
				{days.map((day) => (
					<div
						className={dayHeaderSlot.className}
						data-ilamy-slot="day-header"
						key={dayKey(day)}
						style={dayHeaderSlot.style}
					>
						{formatDate(
							day,
							{ weekday: 'short', day: 'numeric' },
							state.locale
						)}
					</div>
				))}
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
								cellModel={buildFallbackMonthCell(
									day,
									currentMonth,
									options,
									resource
								)}
								controller={controller}
								isLastCol={idx === days.length - 1}
								key={rendererKeys.key.resourceDay(resource.id, dayKey(day))}
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
				return [
					<div
						className={dayHeaderSlot.className}
						data-ilamy-part="res-h-day-group"
						data-ilamy-slot="day-header"
						data-last-col={isLastDay ? 'true' : undefined}
						key={rendererKeys.key.groupDay(dayKey(day))}
						style={{
							...dayHeaderSlot.style,
							gridRow: '1',
							gridColumn: `${startCol} / span ${hours.length}`,
						}}
					>
						<span>{formatters.formatDayHeader(day)}</span>
						<span
							data-ilamy-today-badge={todayDay ? '' : undefined}
							data-testid={todayDay ? 'day-number-today' : undefined}
						>
							{day.day}
						</span>
					</div>,
					...hours.map((hour, hIdx) => {
						const hourDate = withTime(day, {
							hour: hour.hour,
							minute: 0,
							second: 0,
						})
						const isCurrentHour = todayDay && hourDate.hour === currentNow.hour
						const isLastHour = isLastDay && hIdx === hours.length - 1
						return (
							<div
								data-current-hour={isCurrentHour ? 'true' : undefined}
								data-hour={String(hour.hour).padStart(2, '0')}
								data-ilamy-part="res-h-hour-cell"
								data-last-col={isLastHour ? 'true' : undefined}
								key={rendererKeys.key.groupHour(dayKey(day), hour.hour)}
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
	options,
}: {
	nowIndicatorPercent: number | null
	hourSlots: ZonedDate[]
	resource: Resource
	timezone: string
	view: 'day' | 'week' | 'month'
	options: DomCalendarOptions
}) => {
	if (nowIndicatorPercent === null) return null
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
				style={{
					top: '0',
					bottom: '0',
					left: `${nowIndicatorPercent}%`,
					width: '2px',
				}}
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
			style={{
				top: '0',
				bottom: '0',
				left: `${nowIndicatorPercent}%`,
				width: '2px',
			}}
		/>
	)
}

const ResourceHourSlotCell = ({
	slotStart,
	slotIdx,
	totalSlots,
	resource,
	effHours,
	timezone,
	options,
	actions,
}: {
	slotStart: ZonedDate
	slotIdx: number
	totalSlots: number
	resource: Resource
	effHours: ReturnType<typeof resolveEffectiveBusinessHours>
	timezone: string
	options: DomCalendarOptions
	actions: RendererActions
}) => {
	const slotEnd = add(slotStart, 1, 'hour')
	const cellInfo: CellInfo = {
		start: toOffsetIso(slotStart),
		end: toOffsetIso(slotEnd),
		allDay: false,
		resource,
	}
	const { isDisabled, isNonBusiness, cellSlot } = buildTimedCellProps({
		options,
		ownerState: actions.ownerState,
		effHours,
		cellInfo,
		businessDate: slotStart,
		hour: slotStart.hour,
		minute: 0,
	})
	const snapMinutes = formatSubCellSnapMinutes(options.snapDuration, 60)
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: cell click action paired with New button
		<div
			className={cellSlot.className}
			data-all-day="false"
			data-cell="true"
			data-disabled={isDisabled ? 'true' : 'false'}
			data-end={toUtcIso(slotEnd)}
			data-ilamy-part="res-h-hour-slot"
			data-ilamy-slot="cell"
			data-last-col={slotIdx === totalSlots - 1 ? 'true' : undefined}
			data-non-business={isNonBusiness ? 'true' : undefined}
			data-resource-id={String(resource.id)}
			data-snap-minutes={snapMinutes}
			data-start={toUtcIso(slotStart)}
			data-testid={rendererKeys.testId.resourceHourSlot(
				resource.id,
				dayKey(slotStart),
				slotStart.hour
			)}
			data-time-axis={snapMinutes !== undefined ? 'horizontal' : undefined}
			onClick={() => {
				if (isDisabled || !canCommitSelection(cellInfo, options, timezone)) {
					return
				}
				options.onCellClick?.(cellInfo)
				actions.openCreateDialog(cellInfo)
			}}
			style={cellSlot.style}
		/>
	)
}

const ResourceHourlyRow = ({
	rowModel,
	mode,
	hourSlots,
	nowIndicatorPercent,
	colTemplate,
	previewBars,
	controller,
	options,
	actions,
	formatters,
}: {
	rowModel: ResourceTimelineRowViewModel
	mode: 'day' | 'week' | 'month'
	hourSlots: ZonedDate[]
	nowIndicatorPercent: number | null
	colTemplate: string
	previewBars: ResourceTimelineRowViewModel['hourlyBars']
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}) => {
	const state = controller.getState()
	const { resource, hourlyBars } = rowModel
	const effHours = resolveEffectiveBusinessHours(options, resource)
	const barHeight = options.eventHeight ?? 22
	const barGap = options.eventSpacing ?? 2
	const maxLane = hourlyBars.reduce(
		(acc, item) => Math.max(acc, item.lane + 1),
		0
	)
	const minHeight = Math.max(
		ROW_MIN_HEIGHT_PX,
		8 + maxLane * (barHeight + barGap)
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
					gridTemplateColumns: `repeat(${hourSlots.length}, ${HOUR_COL_WIDTH_PX}px)`,
				}}
			>
				{hourSlots.map((slotStart, slotIdx) => (
					<ResourceHourSlotCell
						actions={actions}
						effHours={effHours}
						key={rendererKeys.key.groupHour(dayKey(slotStart), slotStart.hour)}
						options={options}
						resource={resource}
						slotIdx={slotIdx}
						slotStart={slotStart}
						timezone={state.timezone}
						totalSlots={hourSlots.length}
					/>
				))}

				<div data-ilamy-part="events-layer">
					{hourlyBars.map((bar) => (
						<div
							data-ilamy-part="event-wrapper"
							key={rendererKeys.key.hourlyBar(bar.event.id, bar.lane)}
							style={{
								top: `${4 + bar.lane * (barHeight + barGap)}px`,
								left: `${bar.leftPercent}%`,
								width: `${bar.widthPercent}%`,
								height: `${barHeight}px`,
							}}
						>
							<EventBar
								actions={actions}
								axis="horizontal"
								compact
								controller={controller}
								event={bar.event as DomCalendarEvent}
								formatters={formatters}
								options={options}
							/>
						</div>
					))}
					{previewBars.map((bar) => (
						<div
							data-ilamy-part="event-wrapper"
							key={rendererKeys.key.previewEvent(
								bar.event.id,
								bar.leftPercent,
								bar.widthPercent
							)}
							style={{
								top: `${4 + bar.lane * (barHeight + barGap)}px`,
								left: `${bar.leftPercent}%`,
								width: `${bar.widthPercent}%`,
								height: `${barHeight}px`,
								zIndex: '25',
								pointerEvents: 'none',
							}}
						>
							<EventBar
								actions={actions}
								axis="horizontal"
								compact
								controller={controller}
								event={bar.event as DomCalendarEvent}
								formatters={formatters}
								isPreview
								options={options}
							/>
						</div>
					))}

					<HorizontalNowLine
						hourSlots={hourSlots}
						nowIndicatorPercent={nowIndicatorPercent}
						options={options}
						resource={resource}
						timezone={state.timezone}
						view={mode}
					/>
				</div>
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
	previewRows,
	controller,
	options,
	actions,
	formatters,
}: {
	viewportRef: { current: HTMLDivElement | null }
	mode: 'day' | 'week' | 'month'
	currentNow: ZonedDate
	model: ReturnType<typeof buildResourceTimelineViewModel>
	previewRows: ReturnType<typeof buildResourceTimelineViewModel>['rows']
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}) => {
	const totalCols = model.days.length * model.hours.length
	const colTemplate = `${RESOURCE_COL_WIDTH_PX}px repeat(${totalCols}, ${HOUR_COL_WIDTH_PX}px)`
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
					formatters={formatters}
					hourSlots={model.hourSlots}
					key={rowModel.resource.id}
					mode={mode}
					nowIndicatorPercent={model.nowIndicatorPercent}
					options={options}
					previewBars={previewRows.at(rowIdx)?.hourlyBars ?? []}
					rowModel={rowModel}
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
	const minDayWidth = days.length <= 7 ? '110px' : '72px'
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
		enabled: isHourly && model.hourSlots.length > 0,
		scrollKey: `res-h:${mode}:${state.currentDate}:${model.hourSlots.length}`,
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

	const previewRows = dragPreviewEvent
		? buildResourceTimelineConfig({
				mode,
				current,
				events: [dragPreviewEvent],
				resources: state.resources,
				state,
				options,
				dayMaxEvents: 100,
				nowIndicator: false,
			}).rows
		: []

	return renderHourlyTimelineView({
		viewportRef,
		mode,
		currentNow: now(state.timezone),
		model,
		previewRows,
		controller,
		options,
		actions,
		formatters,
	})
}
