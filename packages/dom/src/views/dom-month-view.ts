import {
	add,
	buildMonthViewModel,
	type CellInfo,
	dayKey,
	formatDate,
	getHorizontalBarStyle,
	type HorizontalLayoutResult,
	isBusinessDay,
	isToday,
	type MonthCellViewModel,
	type MonthWeekViewModel,
	type Resource,
	startOf,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/core'
import {
	canCommitSelection,
	resolveEffectiveBusinessHours,
} from '../core/dom-constraints.utils'
import {
	applySlot,
	createEl,
	createGridScrollContainer,
	mergeClassNames,
	resolveCurrentZonedDate,
} from '../core/dom-styles.utils'
import type { DomCalendarEvent, DomRuntime } from '../dom-calendar.types'
import { renderDomEventBar } from './dom-event-bar'
import { renderResourceHorizontalGrid } from './dom-resource-horizontal-grid'

const ROW_BAR_HEIGHT_PX = 24
const ROW_BAR_GAP_PX = 2
const HEADER_OFFSET_PX = 28
const DEFAULT_DAY_MAX_EVENTS = 4
const MORE_LINK_RESERVE_PX = 24

const resolveMonthCellSlot = (
	isDisabled: boolean,
	isTodayCell: boolean,
	isNonBusiness: boolean
): 'cell' | 'cellToday' | 'cellDisabled' | 'cellNonBusiness' => {
	if (isDisabled) return 'cellDisabled'
	if (isTodayCell) return 'cellToday'
	if (isNonBusiness) return 'cellNonBusiness'
	return 'cell'
}

const resolveMonthCellStateClass = (
	isDisabled: boolean,
	isNonBusiness: boolean,
	isOutsideMonth: boolean
): string => {
	if (isDisabled) return 'bg-muted/60 opacity-50 cursor-not-allowed'
	if (isNonBusiness) return 'bg-muted/35'
	if (isOutsideMonth) return 'bg-muted/30 text-muted-foreground'
	return 'bg-background'
}

const computeMonthCellMinHeight = (dayMaxEvents: number | undefined): number =>
	HEADER_OFFSET_PX +
	(dayMaxEvents ?? DEFAULT_DAY_MAX_EVENTS) *
		(ROW_BAR_HEIGHT_PX + ROW_BAR_GAP_PX) +
	MORE_LINK_RESERVE_PX

const createMonthCellData = (
	cellModel: MonthCellViewModel
): Record<string, string | undefined> => ({
	cell: 'true',
	date: cellModel.key,
	start: cellModel.cellInfo.start,
	end: cellModel.cellInfo.end,
	allDay: 'true',
	resourceId: cellModel.cellInfo.resource
		? String(cellModel.cellInfo.resource.id)
		: undefined,
	outsideMonth: cellModel.isOutsideMonth ? 'true' : undefined,
	nonBusiness: cellModel.isNonBusiness ? 'true' : undefined,
	disabled: cellModel.isDisabled ? 'true' : undefined,
	testid: `day-cell-${cellModel.key}`,
})

const renderMonthCellFromModel = (
	cellModel: MonthCellViewModel,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const { date, cellInfo, isToday: isTodayCell, isOutsideMonth } = cellModel
	const { isNonBusiness, isDisabled } = cellModel
	const customClass = options.getCellClassName?.(cellInfo) ?? ''
	const minCellHeightPx = computeMonthCellMinHeight(options.dayMaxEvents)

	const cell = createEl('div', {
		attrs: isTodayCell ? { 'aria-current': 'date' } : undefined,
		style: { minHeight: `${minCellHeightPx}px` },
		data: createMonthCellData(cellModel),
	})

	const slotName = resolveMonthCellSlot(isDisabled, isTodayCell, isNonBusiness)
	const stateClass = resolveMonthCellStateClass(
		isDisabled,
		isNonBusiness,
		isOutsideMonth
	)
	applySlot(
		cell,
		slotName,
		`border-r border-b border-border p-1.5 transition-colors hover:bg-accent/25 ${stateClass} ${customClass}`.trim(),
		options,
		'relative'
	)

	let dayTextColor = 'text-foreground'
	if (isTodayCell) {
		dayTextColor = ''
	} else if (isOutsideMonth) {
		dayTextColor = 'text-muted-foreground'
	}
	const dayBadgeBase =
		'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium tabular-nums'
	let dayBadgeStruct = dayBadgeBase
	if (isTodayCell) {
		dayBadgeStruct = `${dayBadgeBase} bg-primary text-primary-foreground`
	}
	const dayNum = createEl('span', {
		text: String(date.day),
		data: isTodayCell ? { ilamyTodayBadge: '' } : undefined,
		className: mergeClassNames(
			options.unstyled,
			dayTextColor,
			undefined,
			dayBadgeStruct
		),
	})
	cell.appendChild(dayNum)

	cell.addEventListener('click', (mouseEvent) => {
		if (mouseEvent.target !== cell && mouseEvent.target !== dayNum) return
		if (!canCommitSelection(cellInfo, options, state.timezone)) return
		options.onCellClick?.(cellInfo)
		runtime.openCreateDialog(cellInfo)
	})
	return cell
}

export const buildMonthCell = (
	day: ZonedDate,
	currentMonth: number,
	runtime: DomRuntime,
	resource?: Resource
): HTMLElement => {
	const options = runtime.getOptions()
	const cellStart = startOf(day, 'day')
	const cellInfo: CellInfo = {
		start: toOffsetIso(cellStart),
		end: toOffsetIso(add(cellStart, 1, 'day')),
		allDay: true,
		resource,
	}
	const businessHours = resolveEffectiveBusinessHours(options, resource)
	return renderMonthCellFromModel(
		{
			date: day,
			key: dayKey(day),
			cellInfo,
			isToday: isToday(day),
			isOutsideMonth: day.month !== currentMonth,
			isNonBusiness: Boolean(
				businessHours && !isBusinessDay(day, businessHours)
			),
			isDisabled: Boolean(options.isCellDisabled?.(cellInfo)),
		},
		runtime
	)
}

export const renderEventOverlay = (
	weekDays: ZonedDate[],
	layout: HorizontalLayoutResult,
	runtime: DomRuntime,
	resource?: Resource
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()

	const overlay = createEl('div', {
		className: mergeClassNames(
			options.unstyled,
			'',
			undefined,
			'pointer-events-none absolute inset-x-0 bottom-0'
		),
		style: { top: `${HEADER_OFFSET_PX}px` },
	})

	for (const positioned of layout.positionedEvents) {
		const rowTop = positioned.row * (ROW_BAR_HEIGHT_PX + ROW_BAR_GAP_PX)
		const barStyle = getHorizontalBarStyle(
			positioned,
			rowTop,
			ROW_BAR_HEIGHT_PX
		)
		const edgePad = `${positioned.isTruncatedStart ? 'pl-0' : 'pl-0.5'} ${positioned.isTruncatedEnd ? 'pr-0' : 'pr-0.5'}`
		const wrapper = createEl('div', {
			className: mergeClassNames(
				options.unstyled,
				'',
				undefined,
				`pointer-events-auto ${edgePad}`
			),
			style: {
				position: 'absolute',
				...barStyle,
			},
		})
		wrapper.appendChild(
			renderDomEventBar(positioned.event as DomCalendarEvent, runtime, {
				axis: 'horizontal',
				segment: {
					isStart: !positioned.isTruncatedStart,
					isEnd: !positioned.isTruncatedEnd,
				},
				compact: true,
			})
		)
		overlay.appendChild(wrapper)
	}

	const columnCount = Math.max(1, weekDays.length)
	for (let colIdx = 0; colIdx < weekDays.length; colIdx += 1) {
		const day = weekDays.at(colIdx)
		const colLayout = layout.columnLayouts.at(colIdx)
		if (!day || !colLayout || colLayout.hiddenCount <= 0) continue

		const dayEvents = colLayout.events
		const moreBtn = createEl('button', {
			text: `+${colLayout.hiddenCount} More`,
			attrs: { type: 'button' },
			data: { testid: `more-events-${dayKey(day)}` },
			style: {
				position: 'absolute',
				left: `${(colIdx / columnCount) * 100}%`,
				width: `${100 / columnCount}%`,
				bottom: '2px',
			},
			onClick: (mouseEvent) => {
				mouseEvent.stopPropagation()
				const dayLabel = formatDate(
					day,
					{ month: 'long', day: 'numeric', year: 'numeric' },
					state.locale
				)
				const label = resource ? `${resource.title} · ${dayLabel}` : dayLabel
				runtime.openOverflowDialog(label, dayEvents as DomCalendarEvent[])
			},
		})
		applySlot(
			moreBtn,
			'moreLink',
			'text-muted-foreground hover:text-foreground hover:underline',
			options,
			'pointer-events-auto truncate px-1.5 text-left text-xs font-medium cursor-pointer'
		)
		overlay.appendChild(moreBtn)
	}

	return overlay
}

const renderMonthHeaderRow = (
	weekdayHeaders: string[],
	colTemplate: string,
	showWeekNumbers: boolean,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const isSticky = options.stickyViewHeader !== false
	const stickyStruct = isSticky ? 'grid sticky top-0 z-30' : 'grid'
	const headerRow = createEl('div', {
		data: {
			ilamySlot: 'month-header',
			sticky: isSticky ? 'true' : undefined,
		},
		className: mergeClassNames(
			options.unstyled,
			'border-b border-border bg-background',
			undefined,
			stickyStruct
		),
		style: { gridTemplateColumns: colTemplate },
	})
	if (showWeekNumbers) {
		const wkHeader = createEl('div', { text: 'Wk' })
		applySlot(
			wkHeader,
			'dayHeader',
			'border-r border-border bg-background py-2 text-center text-xs font-medium text-muted-foreground',
			options
		)
		headerRow.appendChild(wkHeader)
	}
	for (const label of weekdayHeaders) {
		const dayHeader = createEl('div', { text: label })
		applySlot(
			dayHeader,
			'dayHeader',
			'border-r border-border bg-background py-2 text-center text-sm font-medium text-foreground capitalize',
			options
		)
		headerRow.appendChild(dayHeader)
	}
	return headerRow
}

const renderMonthWeekRow = (
	week: MonthWeekViewModel,
	colCount: number,
	colTemplate: string,
	showWeekNumbers: boolean,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const row = createEl('div', {
		className: mergeClassNames(
			options.unstyled,
			'',
			undefined,
			'relative grid'
		),
		style: { gridTemplateColumns: colTemplate },
	})
	if (showWeekNumbers) {
		const stripChrome = Boolean(options.unstyled)
		const weekText =
			week.weekNumber !== undefined ? String(week.weekNumber) : ''
		row.appendChild(
			createEl('div', {
				text: weekText,
				className: mergeClassNames(
					stripChrome,
					'border-r border-b border-border bg-muted/20 text-muted-foreground',
					undefined,
					'pt-2 text-center text-[11px] tabular-nums'
				),
			})
		)
	}
	let gridColumn = `1 / span ${colCount}`
	if (showWeekNumbers) {
		gridColumn = `2 / span ${colCount}`
	}
	const cellsContainer = createEl('div', {
		data: { ilamySlot: 'grid-row' },
		className: mergeClassNames(
			options.unstyled,
			'',
			undefined,
			'relative grid col-span-full'
		),
		style: {
			gridColumn,
			gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
		},
	})
	for (const dayModel of week.days) {
		cellsContainer.appendChild(renderMonthCellFromModel(dayModel, runtime))
	}
	cellsContainer.appendChild(
		renderEventOverlay(
			week.days.map((d) => d.date),
			week.layout,
			runtime
		)
	)
	row.appendChild(cellsContainer)
	return row
}

export const renderDomMonthView = (runtime: DomRuntime): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const current = resolveCurrentZonedDate(state.currentDate, state.timezone)

	const grid = createGridScrollContainer('month', options)

	if (state.resources.length > 0) {
		return renderResourceHorizontalGrid(grid, 'month', runtime, {
			buildCell: buildMonthCell,
			renderOverlay: renderEventOverlay,
		})
	}

	const showWeekNumbers = Boolean(options.weekNumbers)
	const model = buildMonthViewModel({
		currentDate: current,
		events: runtime.getVisibleEvents(),
		firstDayOfWeek: state.firstDayOfWeek,
		locale: state.locale,
		hiddenDays: state.hiddenDays,
		weekNumbers: showWeekNumbers,
		weekNumberCalculation: options.weekNumberCalculation,
		dayMaxEvents: options.dayMaxEvents,
		businessHours: options.businessHours,
		isCellDisabled: options.isCellDisabled,
	})
	let colTemplate = `repeat(${model.colCount}, minmax(0, 1fr))`
	if (showWeekNumbers) {
		colTemplate = `36px repeat(${model.colCount}, minmax(0, 1fr))`
	}

	grid.appendChild(
		renderMonthHeaderRow(
			model.weekdayHeaders,
			colTemplate,
			showWeekNumbers,
			runtime
		)
	)
	for (const week of model.weeks) {
		grid.appendChild(
			renderMonthWeekRow(
				week,
				model.colCount,
				colTemplate,
				showWeekNumbers,
				runtime
			)
		)
	}
	return grid
}
