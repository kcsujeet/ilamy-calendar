/** @jsxImportSource preact */
import {
	add,
	type CellInfo,
	dayKey,
	formatDate,
	getHorizontalBarStyle,
	type HeadlessCalendarController,
	type HorizontalCellLayout,
	type HorizontalLayoutResult,
	isBusinessDay,
	isSameDay,
	isToday,
	layoutHorizontal,
	type MonthCellViewModel,
	type Resource,
	startOf,
	toOffsetIso,
	toUtcIso,
	type ZonedDate,
} from '../../../../index'
import { MoreEventsButton } from '../../components/more-events-button'
import type {
	DomCalendarEvent,
	DomCalendarOptions,
	RendererActions,
} from '../../types/renderer.types'
import { clipSegmentIsoRange } from '../../utils/cell-slot.utils'
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
const MONTH_CELL_MIN_HEIGHT_PX = 60

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
	return buildSlotProps(
		options.slotProps,
		resolveCellSlotName(cellModel),
		ownerState,
		cellExtraClass || undefined,
		{
			minHeight: `${MONTH_CELL_MIN_HEIGHT_PX}px`,
		}
	)
}

const isDayCellClickTarget = (
	target: HTMLElement | null,
	currentTarget: EventTarget | null
): boolean =>
	target === currentTarget ||
	target?.dataset.ilamyPart === 'cell-day-num' ||
	target?.dataset.ilamyPart === 'cell-header' ||
	target?.dataset.ilamyPart === 'week-num-inline' ||
	target?.dataset.ilamyPart === 'grid-cell-content'

export const HorizontalCellContent = ({
	cellLayout,
	rowBarHeight,
	rowBarGap,
	moreLink,
}: {
	cellLayout?: HorizontalCellLayout
	rowBarHeight: number
	rowBarGap: number
	moreLink?: preact.JSX.Element | null
}) => {
	if (!cellLayout || (cellLayout.rowCount === 0 && !moreLink)) return null
	return (
		<div
			data-ilamy-part="grid-cell-content"
			data-testid="grid-cell-content"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: `${rowBarGap}px`,
				width: '100%',
			}}
		>
			{Array.from({ length: cellLayout.rowCount }, (_, rowIdx) => (
				<div
					data-ilamy-part="cell-placeholder"
					data-testid={cellLayout.events.at(rowIdx)?.title}
					key={rendererKeys.key.weekdayCol('ph', rowIdx)}
					style={{
						width: '100%',
						flexShrink: 0,
						height: `${rowBarHeight}px`,
						pointerEvents: 'none',
					}}
				/>
			))}
			{moreLink}
		</div>
	)
}

const MonthCellHeader = ({
	weekNumber,
	isTodayCell,
	day,
}: {
	weekNumber?: number
	isTodayCell: boolean
	day: number
}) => (
	<div data-ilamy-part="cell-header">
		{weekNumber !== undefined && (
			<span data-ilamy-part="week-num-inline" data-testid="week-number">
				{weekNumber}
			</span>
		)}
		<span
			data-ilamy-part="cell-day-num"
			data-ilamy-today-badge={isTodayCell ? '' : undefined}
			data-testid={isTodayCell ? 'day-number-today' : undefined}
		>
			{day}
		</span>
	</div>
)

const buildMonthCellAttrs = ({
	cellModel,
	dateKey,
	cellStart,
	cellEnd,
	role,
	isLastCol,
}: {
	cellModel: MonthCellViewModel
	dateKey: string
	cellStart: ZonedDate
	cellEnd: ZonedDate
	role?: 'gridcell'
	isLastCol?: boolean
}) => {
	const { cellInfo, isToday: isTodayCell } = cellModel
	const attr = (cond: boolean | undefined) => (cond ? 'true' : undefined)
	return {
		'aria-current': isTodayCell ? ('date' as const) : undefined,
		'data-all-day': 'true',
		'data-cell': 'true',
		'data-date': dateKey,
		'data-disabled': cellModel.isDisabled ? 'true' : 'false',
		'data-end': toUtcIso(cellEnd),
		'data-ilamy-slot': 'cell',
		'data-last-col': attr(isLastCol),
		'data-non-business': attr(cellModel.isNonBusiness),
		'data-outside-month': attr(cellModel.isOutsideMonth),
		'data-resource-id': cellInfo.resource
			? String(cellInfo.resource.id)
			: undefined,
		'data-start': toUtcIso(cellStart),
		'data-testid': rendererKeys.testId.dayCell(dateKey),
		'data-today': attr(isTodayCell),
		role,
		tabIndex: role ? -1 : undefined,
	}
}

export const MonthCell = ({
	cellModel,
	cellLayout,
	controller,
	options,
	actions,
	role,
	isLastCol,
	weekNumber,
}: {
	cellModel: MonthCellViewModel
	cellLayout?: HorizontalCellLayout
	controller: HeadlessCalendarController
	options: DomCalendarOptions
	actions: RendererActions
	role?: 'gridcell'
	isLastCol?: boolean
	weekNumber?: number
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
	const moreLink = (
		<MoreEventsButton
			actions={actions}
			cellLayout={cellLayout}
			dateIso={toOffsetIso(date)}
			extraStyle={{ alignSelf: 'flex-start' }}
			getTitle={() => {
				const formatted = formatDate(
					date,
					{ month: 'long', day: 'numeric', year: 'numeric' },
					state.locale
				)
				return cellInfo.resource
					? `${cellInfo.resource.title} · ${formatted}`
					: formatted
			}}
			options={options}
			testId={rendererKeys.testId.moreEvents(dateKey)}
		/>
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
			{...buildMonthCellAttrs({
				cellModel,
				dateKey,
				cellStart,
				cellEnd,
				role,
				isLastCol,
			})}
			className={slotPropsResolved.className}
			onClick={handleClick}
			style={slotPropsResolved.style}
		>
			<MonthCellHeader
				day={date.day}
				isTodayCell={isTodayCell}
				weekNumber={weekNumber}
			/>
			<HorizontalCellContent
				cellLayout={cellLayout}
				moreLink={moreLink}
				rowBarGap={options.eventSpacing ?? ROW_BAR_GAP_PX}
				rowBarHeight={options.eventHeight ?? ROW_BAR_HEIGHT_PX}
			/>
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
	const { evStart, evEnd, segStart, segEnd } = clipSegmentIsoRange({
		eventStart: pos.event.start,
		eventEnd: pos.event.end,
		timezone: controller.getState().timezone,
		rowStart,
		rowEnd,
	})
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
		</div>
	)
}
