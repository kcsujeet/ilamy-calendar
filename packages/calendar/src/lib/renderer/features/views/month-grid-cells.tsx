/** @jsxImportSource preact */
import {
	add,
	type CellInfo,
	dayKey,
	formatDate,
	getHorizontalBarStyle,
	type HeadlessCalendarController,
	type HorizontalLayoutResult,
	isBusinessDay,
	isSameDay,
	isToday,
	layoutHorizontal,
	type MonthCellViewModel,
	maxDate,
	minDate,
	parseDate,
	type Resource,
	startOf,
	toOffsetIso,
	toUtcIso,
	type ZonedDate,
} from '../../../../index'
import type {
	DomCalendarEvent,
	DomCalendarOptions,
	RendererActions,
} from '../../types/renderer.types'
import {
	canCommitSelection,
	resolveEffectiveBusinessHours,
} from '../../utils/constraints.utils'
import type { CalendarFormatters } from '../../utils/format.utils'
import { rendererKeys } from '../../utils/keys.utils'
import { buildSlotProps } from '../../utils/slot-props.utils'
import { EventBar } from './event-bar'

const ROW_BAR_HEIGHT_PX = 24
const ROW_BAR_GAP_PX = 1
const MONTH_HEADER_OFFSET_PX = 28
const DEFAULT_DAY_MAX_EVENTS = 4
const MORE_LINK_RESERVE_PX = 24

const computeMonthCellMinHeight = (
	dayMaxEvents: number | undefined,
	rowBarHeight: number,
	rowBarGap: number
): number =>
	MONTH_HEADER_OFFSET_PX +
	(dayMaxEvents ?? DEFAULT_DAY_MAX_EVENTS) * (rowBarHeight + rowBarGap) +
	MORE_LINK_RESERVE_PX

const resolveCellSlotName = (cellModel: MonthCellViewModel) => {
	if (cellModel.isDisabled) return 'cellDisabled' as const
	if (cellModel.isToday) return 'cellToday' as const
	if (cellModel.isNonBusiness) return 'cellNonBusiness' as const
	return 'cell' as const
}

export const buildFallbackMonthCell = (
	day: ZonedDate,
	currentMonth: number,
	options: DomCalendarOptions,
	resource?: Resource
): MonthCellViewModel => {
	const cellStart = startOf(day, 'day')
	const cellInfo: CellInfo = {
		start: toOffsetIso(cellStart),
		end: toOffsetIso(add(cellStart, 1, 'day')),
		allDay: true,
		resource,
	}
	const businessHours = resolveEffectiveBusinessHours(options, resource)
	return {
		date: day,
		key: dayKey(day),
		cellInfo,
		isToday: isToday(day),
		isOutsideMonth: day.month !== currentMonth,
		isNonBusiness: Boolean(businessHours && !isBusinessDay(day, businessHours)),
		isDisabled: Boolean(options.isCellDisabled?.(cellInfo)),
	}
}

const resolveMonthCellSlotProps = (
	cellModel: MonthCellViewModel,
	options: DomCalendarOptions,
	ownerState: RendererActions['ownerState']
) => {
	const disabledExtraClass = cellModel.isDisabled
		? options.classesOverride?.disabledCell
		: undefined
	const cellExtraClass = [
		options.getCellClassName?.(cellModel.cellInfo),
		disabledExtraClass,
	]
		.filter(Boolean)
		.join(' ')
	const rowBarHeight = options.eventHeight ?? ROW_BAR_HEIGHT_PX
	const rowBarGap = options.eventSpacing ?? ROW_BAR_GAP_PX
	return buildSlotProps(
		options.slotProps,
		resolveCellSlotName(cellModel),
		ownerState,
		cellExtraClass || undefined,
		{
			minHeight: `${computeMonthCellMinHeight(options.dayMaxEvents, rowBarHeight, rowBarGap)}px`,
		}
	)
}

const isDayCellClickTarget = (
	target: HTMLElement | null,
	currentTarget: EventTarget | null
): boolean =>
	target === currentTarget || target?.dataset.ilamyPart === 'cell-day-num'

export const MonthCell = ({
	cellModel,
	controller,
	options,
	actions,
	role,
	isLastCol,
}: {
	cellModel: MonthCellViewModel
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	role?: 'gridcell'
	isLastCol?: boolean
}) => {
	const state = controller.getState()
	const { cellInfo, date, key: dateKey, isToday: isTodayCell } = cellModel
	const cellStart = startOf(date, 'day')
	const cellEnd = add(cellStart, 1, 'day')
	const slotPropsResolved = resolveMonthCellSlotProps(
		cellModel,
		options,
		actions.ownerState
	)

	const handleClick = (evt: MouseEvent) => {
		if (
			!isDayCellClickTarget(evt.target as HTMLElement | null, evt.currentTarget)
		)
			return
		if (!canCommitSelection(cellInfo, options, state.timezone)) return
		options.onCellClick?.(cellInfo)
		actions.openCreateDialog(cellInfo)
	}

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard creation via New button; grid navigation preserves cell semantics
		<div
			aria-current={isTodayCell ? 'date' : undefined}
			className={slotPropsResolved.className}
			data-all-day="true"
			data-cell="true"
			data-date={dateKey}
			data-disabled={cellModel.isDisabled ? 'true' : 'false'}
			data-end={toUtcIso(cellEnd)}
			data-ilamy-slot="cell"
			data-last-col={isLastCol ? 'true' : undefined}
			data-non-business={cellModel.isNonBusiness ? 'true' : undefined}
			data-outside-month={cellModel.isOutsideMonth ? 'true' : undefined}
			data-resource-id={
				cellInfo.resource ? String(cellInfo.resource.id) : undefined
			}
			data-start={toUtcIso(cellStart)}
			data-testid={rendererKeys.testId.dayCell(dateKey)}
			data-today={isTodayCell ? 'true' : undefined}
			onClick={handleClick}
			role={role}
			style={slotPropsResolved.style}
			tabIndex={role ? -1 : undefined}
		>
			<span
				data-ilamy-part="cell-day-num"
				data-ilamy-today-badge={isTodayCell ? '' : undefined}
				data-testid={isTodayCell ? 'day-number-today' : undefined}
			>
				{date.day}
			</span>
		</div>
	)
}

const MonthOverlayEvent = ({
	pos,
	rowStart,
	rowEnd,
	rowBarHeight,
	rowBarGap,
	isPreview,
	controller,
	options,
	actions,
	formatters,
}: {
	pos: HorizontalLayoutResult['positionedEvents'][number]
	rowStart?: ZonedDate
	rowEnd?: ZonedDate
	rowBarHeight: number
	rowBarGap: number
	isPreview: boolean
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
}) => {
	const rowTop = pos.row * (rowBarHeight + rowBarGap)
	const barStyle = getHorizontalBarStyle(pos, rowTop, rowBarHeight)
	const segment = {
		isStart: !pos.isTruncatedStart,
		isEnd: !pos.isTruncatedEnd,
	}
	const zone = controller.getState().timezone
	const evStart = parseDate(pos.event.start, zone)
	const evEnd = parseDate(pos.event.end, zone)
	const segStart =
		evStart && rowStart ? toOffsetIso(maxDate(evStart, rowStart)) : undefined
	const segEnd =
		evEnd && rowEnd ? toOffsetIso(minDate(evEnd, rowEnd)) : undefined
	const isSingleDayTimed =
		!pos.event.allDay &&
		Boolean(
			evStart && evEnd && isSameDay(evStart, add(evEnd, -1, 'millisecond'))
		)
	return (
		<div
			data-ilamy-part="event-wrapper"
			style={{
				...barStyle,
				paddingLeft: pos.isTruncatedStart ? '0px' : '2px',
				paddingRight: pos.isTruncatedEnd ? '0px' : '2px',
				...(isPreview ? { zIndex: 25, pointerEvents: 'none' } : undefined),
			}}
		>
			<EventBar
				actions={actions}
				axis="horizontal"
				compact
				controller={controller}
				disableResize={isSingleDayTimed}
				event={pos.event as DomCalendarEvent}
				formatters={formatters}
				isPreview={isPreview}
				options={options}
				segEnd={segEnd}
				segStart={segStart}
				segment={segment}
			/>
		</div>
	)
}

export const MonthEventsOverlay = ({
	days,
	layout,
	controller,
	options,
	actions,
	formatters,
	resource,
	dragPreviewEvent,
	role,
}: {
	days: ZonedDate[]
	layout: HorizontalLayoutResult
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	formatters: CalendarFormatters
	resource?: Resource
	dragPreviewEvent?: DomCalendarEvent | null
	role?: 'gridcell'
}) => {
	const state = controller.getState()
	const columnCount = Math.max(1, days.length)
	const rowBarHeight = options.eventHeight ?? ROW_BAR_HEIGHT_PX
	const rowBarGap = options.eventSpacing ?? ROW_BAR_GAP_PX
	const previewForResource =
		dragPreviewEvent &&
		(!resource ||
			String(dragPreviewEvent.resourceId ?? '') === String(resource.id))
			? dragPreviewEvent
			: null
	const previewPositions = previewForResource
		? layoutHorizontal({
				events: [previewForResource],
				days,
				dayMaxEvents: 100,
			}).positionedEvents
		: []
	const moreSlot = buildSlotProps(
		options.slotProps,
		'moreLink',
		actions.ownerState
	)

	const rowFirstDay = days.at(0)
	const rowLastDay = days.at(-1)
	const rowStart = rowFirstDay ? startOf(rowFirstDay, 'day') : undefined
	const rowEnd = rowLastDay
		? startOf(add(rowLastDay, 1, 'day'), 'day')
		: undefined

	return (
		<div
			data-ilamy-part="month-events-overlay"
			role={role}
			style={{ top: `${MONTH_HEADER_OFFSET_PX}px` }}
			tabIndex={role ? -1 : undefined}
		>
			{layout.positionedEvents.map((pos) => (
				<MonthOverlayEvent
					actions={actions}
					controller={controller}
					formatters={formatters}
					isPreview={false}
					key={rendererKeys.key.monthEvent(
						pos.event.id,
						pos.left,
						pos.width,
						pos.row
					)}
					options={options}
					pos={pos}
					rowBarGap={rowBarGap}
					rowBarHeight={rowBarHeight}
					rowEnd={rowEnd}
					rowStart={rowStart}
				/>
			))}
			{previewPositions.map((pos) => (
				<MonthOverlayEvent
					actions={actions}
					controller={controller}
					formatters={formatters}
					isPreview
					key={rendererKeys.key.previewEvent(pos.event.id, pos.left, pos.width)}
					options={options}
					pos={pos}
					rowBarGap={rowBarGap}
					rowBarHeight={rowBarHeight}
				/>
			))}

			{days.map((day, colIdx) => {
				const colLayout = layout.columnLayouts.at(colIdx)
				if (!colLayout || colLayout.hiddenCount <= 0) return null
				const dayIso = toOffsetIso(day)
				const dayEvents = colLayout.events as DomCalendarEvent[]
				return (
					<button
						className={moreSlot.className}
						data-ilamy-slot="more-link"
						data-testid={rendererKeys.testId.moreEvents(dayKey(day))}
						key={dayKey(day)}
						onClick={(evt) => {
							evt.stopPropagation()
							if (options.onMoreEventsClick) {
								options.onMoreEventsClick(dayIso, dayEvents)
								return
							}
							const formatted = formatDate(
								day,
								{ month: 'long', day: 'numeric', year: 'numeric' },
								state.locale
							)
							const title = resource
								? `${resource.title} · ${formatted}`
								: formatted
							actions.openOverflowDialog(dayIso, title, dayEvents)
						}}
						style={{
							...moreSlot.style,
							position: 'absolute',
							left: `${(colIdx / columnCount) * 100}%`,
							width: `${100 / columnCount}%`,
							bottom: '2px',
						}}
						type="button"
					>
						+{colLayout.hiddenCount} {actions.t('more')}
					</button>
				)
			})}
		</div>
	)
}
