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
	getMonthDays,
	getVerticalBarStyle,
	getWeekNumber,
	type HeadlessCalendarController,
	isBusinessDay,
	isSameDay,
	layoutVertical,
	maxDate,
	minDate,
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
import { LegacyRenderHost } from '../../components/slot-host'
import type {
	DomCalendarEvent,
	DomCalendarOptions,
	RenderCurrentTimeIndicatorProps,
	RendererActions,
} from '../../types/renderer.types'
import {
	buildTimedCellProps,
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
import { ResourceHeaderContent } from './resource-header-content'
import { ResourceHorizontalGrid } from './resource-horizontal-grid'

const HOUR_ROW_HEIGHT_PX = 56

const NowLine = ({
	percent,
	day,
	hours,
	resource,
	timezone,
	view,
	options,
	actions,
}: {
	percent: number | null
	day: ZonedDate
	hours: ZonedDate[]
	resource?: Resource
	timezone: string
	view: 'day' | 'week' | 'month'
	options: DomCalendarOptions
	actions: RendererActions
}) => {
	if (percent === null) return null
	const nowSlot = buildSlotProps(
		options.slotProps,
		'nowIndicator',
		actions.ownerState,
		undefined,
		{ left: '0', right: '0', top: `${percent}%` }
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
			<span data-ilamy-part="now-line-dot" data-testid="current-time-dot" />
			<span data-ilamy-part="now-line-bar" />
		</div>
	)
}

const VerticalResourceMonthView = ({
	controller,
	options,
	actions,
	formatters,
	visibleEvents,
	dragPreviewEvent,
}: {
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
			'v-res-month'
		)
	const current = resolveAnchorDate(controller) ?? now(state.timezone)
	const days = withoutHiddenDays(getMonthDays(current), state.hiddenDays)
	const colTemplate = `84px repeat(${state.resources.length}, minmax(140px, 1fr))`

	return (
		<div
			data-ilamy-slot="grid-scroll"
			data-testid="dom-month-view"
			ref={viewportRef}
		>
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
						{actions.t('resources')}
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

const ColumnHeaderSublabel = ({ col }: { col: TimeGridColumnViewModel }) =>
	col.sublabel ? (
		<span
			data-ilamy-today-badge={col.isToday ? '' : undefined}
			data-testid={col.isToday ? 'day-number-today' : undefined}
			style={{ marginTop: '0.125rem' }}
		>
			{col.sublabel}
		</span>
	) : null

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
}) => (
	<div {...buildColumnHeaderDivProps(col, dayHeaderSlot, resHeaderSlot)}>
		{col.resource ? (
			<ResourceHeaderContent
				controller={controller}
				options={options}
				resource={col.resource}
			/>
		) : (
			<span>{formatters.formatDayHeader(col.day)}</span>
		)}
		<ColumnHeaderSublabel col={col} />
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
			<div
				className={dayHeaderSlot.className}
				data-ilamy-part="day-banner"
				data-ilamy-slot="day-header"
				data-testid="day-view-header"
				style={dayHeaderSlot.style}
			>
				<span>
					{formatDate(
						firstCol.day,
						{ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
						state.locale
					)}
				</span>
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

	return (
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
				{mode === 'week' && options.weekNumbers !== false && firstCol && (
					<>
						<span>{actions.t('week')}</span>
						<strong data-testid="week-number">
							{getWeekNumber(
								firstCol.day,
								options.weekNumberCalculation ?? 'local',
								state.locale
							)}
						</strong>
					</>
				)}
			</div>
			{model.columns.map((col, colIdx) => (
				<TimeGridColumnHeader
					col={col}
					controller={controller}
					dayHeaderSlot={dayHeaderSlot}
					formatters={formatters}
					key={rendererKeys.key.timeHeader(
						dayKey(col.day),
						col.resource?.id,
						colIdx
					)}
					options={options}
					resHeaderSlot={resHeaderSlot}
				/>
			))}
		</div>
	)
}

const TimeGridAllDayRow = ({
	columns,
	colTemplate,
	controller,
	options,
	actions,
	formatters,
}: {
	columns: TimeGridColumnViewModel[]
	colTemplate: string
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
	return (
		<div
			className={allDaySlot.className}
			data-ilamy-part="all-day-row"
			data-ilamy-slot="all-day-row"
			data-testid="all-day-row"
			style={{ ...allDaySlot.style, gridTemplateColumns: colTemplate }}
		>
			<div data-ilamy-part="all-day-label" data-sticky-inset="left">
				{actions.t('allDay')}
			</div>
			{columns.map((col, idx) => {
				const dayStart = startOf(col.day, 'day')
				const dayEnd = add(dayStart, 1, 'day')
				const cellInfo: CellInfo = {
					start: toOffsetIso(dayStart),
					end: toOffsetIso(dayEnd),
					allDay: true,
					resource: col.resource,
				}
				return (
					// biome-ignore lint/a11y/useKeyWithClickEvents: all-day cell creation paired with New button
					<div
						data-all-day="true"
						data-cell="true"
						data-date={dayKey(col.day)}
						data-end={toUtcIso(dayEnd)}
						data-ilamy-part="all-day-cell"
						data-resource-id={
							col.resource ? String(col.resource.id) : undefined
						}
						data-start={toUtcIso(dayStart)}
						key={rendererKeys.key.allDayCell(
							dayKey(col.day),
							col.resource?.id,
							idx
						)}
						onClick={(evt) => {
							if (evt.target !== evt.currentTarget) return
							if (!canCommitSelection(cellInfo, options, state.timezone)) return
							options.onCellClick?.(cellInfo)
							actions.openCreateDialog(cellInfo)
						}}
					>
						{col.allDayEvents.map((evt) => {
							const evStart = parseDate(evt.start, state.timezone)
							const evEnd = parseDate(evt.end, state.timezone)
							return (
								<div data-ilamy-part="all-day-item" key={evt.id}>
									<EventBar
										actions={actions}
										axis="horizontal"
										compact
										controller={controller}
										event={evt as DomCalendarEvent}
										formatters={formatters}
										options={options}
										segEnd={toOffsetIso(dayEnd)}
										segStart={toOffsetIso(dayStart)}
										segment={{
											isStart: evStart ? isSameDay(col.day, evStart) : true,
											isEnd: evEnd
												? isSameDay(col.day, add(evEnd, -1, 'millisecond'))
												: true,
										}}
									/>
								</div>
							)
						})}
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
					const evStart = parseDate(item.event.start, state.timezone)
					const evEnd = parseDate(item.event.end, state.timezone)
					const colStart = startOf(col.day, 'day')
					const colEnd = add(colStart, 1, 'day')
					return (
						<div
							data-ilamy-part="event-wrapper"
							key={item.event.id}
							style={{
								...getVerticalBarStyle(item),
								paddingInline: '1px',
								zIndex:
									item.zIndex !== undefined ? String(item.zIndex) : undefined,
							}}
						>
							<EventBar
								actions={actions}
								axis="vertical"
								compact={barHeightPx <= 40}
								controller={controller}
								event={item.event as DomCalendarEvent}
								formatters={formatters}
								options={options}
								segEnd={evEnd ? toOffsetIso(minDate(evEnd, colEnd)) : undefined}
								segStart={
									evStart ? toOffsetIso(maxDate(evStart, colStart)) : undefined
								}
								segment={{
									isStart:
										!item.isTruncatedStart &&
										(!evStart || isSameDay(col.day, evStart)),
									isEnd:
										!item.isTruncatedEnd &&
										(!evEnd ||
											isSameDay(col.day, add(evEnd, -1, 'millisecond'))),
								}}
							/>
						</div>
					)
				})}
				{previewItems.map((item) => (
					<div
						data-ilamy-part="event-wrapper"
						key={rendererKeys.key.previewEvent(
							item.event.id,
							item.top,
							item.height
						)}
						style={{
							...getVerticalBarStyle(item),
							padding: '1px',
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

			<NowLine
				actions={actions}
				day={col.day}
				hours={hours}
				options={options}
				percent={col.nowIndicatorPercent}
				resource={col.resource}
				timezone={state.timezone}
				view={mode}
			/>
		</div>
	)
}

const TimeAxisColumn = ({
	hours,
	options,
	formatters,
}: {
	hours: ZonedDate[]
	options: DomCalendarOptions
	formatters: CalendarFormatters
}) => (
	<div
		data-ilamy-part="time-axis"
		data-sticky-inset="left"
		data-testid="dom-time-axis"
	>
		{hours.map((hour) => (
			<div
				data-hour={String(hour.hour).padStart(2, '0')}
				data-ilamy-part="time-axis-hour"
				key={hour.hour}
				style={{ height: `${HOUR_ROW_HEIGHT_PX}px` }}
			>
				{options.renderHour ? (
					<LegacyRenderHost
						context={toOffsetIso(hour)}
						renderFn={options.renderHour}
						slotKey={`hour-${hour.hour}`}
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
	let colMinWidth = '0px'
	if (state.resources.length > 0) {
		colMinWidth = mode === 'week' ? '48px' : '80px'
	}
	const slotMinutes = options.slotDuration ?? 60
	const slotsPerHour = Math.max(1, 60 / slotMinutes)
	return {
		model,
		colTemplate: `64px repeat(${model.columns.length}, minmax(${colMinWidth}, 1fr))`,
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
	viewportRef,
	dragPreviewEvent,
	controller,
	options,
	actions,
	formatters,
	visibleEvents,
}: {
	mode: 'day' | 'week'
	current: ZonedDate
	viewportRef: { current: HTMLDivElement | null }
	dragPreviewEvent: DomCalendarEvent | null
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	visibleEvents: DomCalendarEvent[]
}) => {
	const {
		model,
		colTemplate,
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

	return (
		<div
			data-ilamy-part="time-grid-scroll-x"
			data-testid={rendererKeys.testId.modeView(mode)}
		>
			<div data-ilamy-part="time-grid-scroll-frame">
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
							formatters={formatters}
							options={options}
						/>
					)}
				</div>

				<div data-ilamy-slot="grid-scroll" ref={viewportRef}>
					<div
						data-ilamy-part="time-grid-body"
						style={{ gridTemplateColumns: colTemplate }}
					>
						<TimeAxisColumn
							formatters={formatters}
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
								key={rendererKeys.key.timeCol(
									dayKey(col.day),
									col.resource?.id,
									colIdx
								)}
								lastHourNum={lastHourNum}
								mode={mode}
								options={options}
								slotHeightPx={slotHeightPx}
								slotMinutes={slotMinutes}
								slotsPerHour={slotsPerHour}
							/>
						))}
					</div>
				</div>
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
	const viewportRef = useRef<HTMLDivElement>(null)
	const state = controller.getState()
	const current =
		parseDate(state.currentDate, state.timezone) ?? now(state.timezone)
	const delegatesHorizontal =
		mode !== 'month' &&
		state.resources.length > 0 &&
		options.orientation !== 'vertical'
	const dragPreviewEvent = resolveDragPreviewEvent(dragPreview, visibleEvents)

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
		enabled: mode !== 'month' && !delegatesHorizontal,
		scrollKey: `${mode}:${state.currentDate}:${state.resources.length}`,
		axis: 'vertical',
	})

	if (mode === 'month') {
		return (
			<VerticalResourceMonthView
				actions={actions}
				controller={controller}
				dragPreviewEvent={dragPreviewEvent}
				formatters={formatters}
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

	return (
		<VerticalTimeGrid
			actions={actions}
			controller={controller}
			current={current}
			dragPreviewEvent={dragPreviewEvent}
			formatters={formatters}
			mode={mode}
			options={options}
			viewportRef={viewportRef}
			visibleEvents={visibleEvents}
		/>
	)
}
