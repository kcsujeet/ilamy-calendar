import {
	add,
	type CellInfo,
	dayKey,
	formatDate,
	getHorizontalBarStyle,
	getResourceEvents,
	getWeekNumber,
	isBusinessDay,
	isToday,
	layoutHorizontal,
	type Resource,
	startOf,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/core'
import { renderDomEventBar } from './dom-event-bar'
import { canCommitSelection, resolveEffectiveBusinessHours } from './dom-events'
import {
	applySlot,
	createEl,
	getVisibleMonthWeeks,
	mergeClassNames,
	resolveCurrentZonedDate,
} from './dom-styles'
import type { DomCalendarEvent, DomRuntime } from './dom-types'

const ROW_BAR_HEIGHT_PX = 24
const ROW_BAR_GAP_PX = 2
const HEADER_OFFSET_PX = 28

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
	(dayMaxEvents ?? 4) * (ROW_BAR_HEIGHT_PX + ROW_BAR_GAP_PX) +
	24

const createMonthCellData = (
	day: ZonedDate,
	cellInfo: CellInfo,
	isNonBusiness: boolean,
	isDisabled: boolean
): Record<string, string | undefined> => ({
	cell: 'true',
	date: dayKey(day),
	start: cellInfo.start,
	end: cellInfo.end,
	allDay: 'true',
	resourceId: cellInfo.resource ? String(cellInfo.resource.id) : undefined,
	nonBusiness: isNonBusiness ? 'true' : undefined,
	disabled: isDisabled ? 'true' : undefined,
	testid: `day-cell-${dayKey(day)}`,
})

const buildMonthCell = (
	day: ZonedDate,
	currentMonth: number,
	runtime: DomRuntime,
	resource?: Resource
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const cellStart = startOf(day, 'day')
	const cellInfo: CellInfo = {
		start: toOffsetIso(cellStart),
		end: toOffsetIso(add(cellStart, 1, 'day')),
		allDay: true,
		resource,
	}
	const businessHours = resolveEffectiveBusinessHours(options, resource)
	const isNonBusiness = Boolean(
		businessHours && !isBusinessDay(day, businessHours)
	)
	const isDisabled = Boolean(options.isCellDisabled?.(cellInfo))
	const isTodayCell = isToday(day)
	const customClass = options.getCellClassName?.(cellInfo) ?? ''
	const minCellHeightPx = computeMonthCellMinHeight(options.dayMaxEvents)

	const cell = createEl('div', {
		style: { minHeight: `${minCellHeightPx}px` },
		data: createMonthCellData(day, cellInfo, isNonBusiness, isDisabled),
	})

	const slotName = resolveMonthCellSlot(isDisabled, isTodayCell, isNonBusiness)
	const stateClass = resolveMonthCellStateClass(
		isDisabled,
		isNonBusiness,
		day.month !== currentMonth
	)
	applySlot(
		cell,
		slotName,
		`border-r border-b border-border p-1.5 transition-colors hover:bg-accent/25 ${stateClass} ${customClass}`.trim(),
		options,
		'relative'
	)

	const isOutsideMonth = day.month !== currentMonth
	const dayNum = createEl('span', {
		text: String(day.day),
		className: mergeClassNames(
			options.unstyled,
			isTodayCell
				? ''
				: isOutsideMonth
					? 'text-muted-foreground'
					: 'text-foreground',
			undefined,
			isTodayCell
				? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground tabular-nums'
				: 'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium tabular-nums'
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

const renderEventOverlay = (
	weekDays: ZonedDate[],
	events: DomCalendarEvent[],
	runtime: DomRuntime,
	resource?: Resource
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const dayMaxEvents = options.dayMaxEvents ?? 4
	const layout = layoutHorizontal({
		events,
		days: weekDays,
		dayMaxEvents,
	})

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

const renderResourceLabel = (
	resource: Resource,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const cell = createEl('div', {
		data: {
			resourceId: String(resource.id),
			testid: `resource-header-${resource.id}`,
		},
	})
	applySlot(
		cell,
		'resourceHeader',
		'border-r border-b border-border bg-muted px-2.5 py-2 text-xs font-semibold text-foreground',
		options,
		'sticky left-0 z-20 flex items-center gap-2'
	)
	if (options.renderResource) {
		const cleanup = options.renderResource(cell, { resource, view: state.view })
		if (cleanup) runtime.registerCleanup(cleanup)
		return cell
	}
	if (resource.backgroundColor || resource.color) {
		cell.appendChild(
			createEl('span', {
				className: mergeClassNames(
					options.unstyled,
					'h-2.5 w-2.5 shrink-0 rounded-full'
				),
				style: { backgroundColor: resource.backgroundColor ?? resource.color },
			})
		)
	}
	cell.appendChild(
		createEl('span', {
			text: resource.title,
			className: mergeClassNames(options.unstyled, 'truncate'),
		})
	)
	return cell
}

const renderMonthHeaderRow = (
	firstWeek: ZonedDate[],
	colTemplate: string,
	showWeekNumbers: boolean,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const stickyStruct =
		options.stickyViewHeader !== false ? 'grid sticky top-0 z-30' : 'grid'
	const headerRow = createEl('div', {
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
	for (const day of firstWeek) {
		const dayHeader = createEl('div', {
			text: formatDate(day, { weekday: 'short' }, state.locale),
		})
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
	week: ZonedDate[],
	currentMonth: number,
	colCount: number,
	colTemplate: string,
	showWeekNumbers: boolean,
	visibleEvents: DomCalendarEvent[],
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
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
		const firstDay = week.at(0)
		const weekNum = firstDay
			? getWeekNumber(
					firstDay,
					options.weekNumberCalculation ?? 'ISO',
					state.locale
				)
			: ''
		const stripChrome = Boolean(options.unstyled && !options.slotProps?.cell)
		row.appendChild(
			createEl('div', {
				text: String(weekNum),
				className: mergeClassNames(
					stripChrome,
					'border-r border-b border-border bg-muted/20 text-muted-foreground',
					undefined,
					'pt-2 text-center text-[11px] tabular-nums'
				),
			})
		)
	}
	const cellsContainer = createEl('div', {
		className: mergeClassNames(
			options.unstyled,
			'',
			undefined,
			'relative grid col-span-full'
		),
		style: {
			gridColumn: showWeekNumbers
				? `2 / span ${colCount}`
				: `1 / span ${colCount}`,
			gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
		},
	})
	for (const day of week) {
		cellsContainer.appendChild(buildMonthCell(day, currentMonth, runtime))
	}
	cellsContainer.appendChild(renderEventOverlay(week, visibleEvents, runtime))
	row.appendChild(cellsContainer)
	return row
}

export const renderDomMonthView = (runtime: DomRuntime): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const current = resolveCurrentZonedDate(state.currentDate, state.timezone)
	const visibleWeeks = getVisibleMonthWeeks(
		current,
		state.firstDayOfWeek,
		state.hiddenDays
	)
	const visibleEvents = runtime.getVisibleEvents()

	const grid = createEl('div', {
		data: { view: 'month', testid: 'dom-month-view' },
	})
	applySlot(grid, 'grid', 'bg-background', options, 'flex-1 overflow-auto')

	if (state.resources.length > 0) {
		const monthDays = visibleWeeks
			.flat()
			.filter((day) => day.month === current.month)
		const days = monthDays.length > 0 ? monthDays : (visibleWeeks.at(0) ?? [])
		return renderResourceHorizontalGrid(
			grid,
			days,
			visibleEvents,
			current.month,
			runtime
		)
	}

	const firstWeek = visibleWeeks.at(0) ?? []
	const colCount = Math.max(1, firstWeek.length)
	const showWeekNumbers = Boolean(options.weekNumbers)
	const colTemplate = showWeekNumbers
		? `36px repeat(${colCount}, minmax(0, 1fr))`
		: `repeat(${colCount}, minmax(0, 1fr))`

	grid.appendChild(
		renderMonthHeaderRow(firstWeek, colTemplate, showWeekNumbers, runtime)
	)
	for (const week of visibleWeeks) {
		grid.appendChild(
			renderMonthWeekRow(
				week,
				current.month,
				colCount,
				colTemplate,
				showWeekNumbers,
				visibleEvents,
				runtime
			)
		)
	}
	return grid
}

export const renderResourceHorizontalGrid = (
	grid: HTMLElement,
	days: ZonedDate[],
	visibleEvents: DomCalendarEvent[],
	currentMonth: number,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const minDayWidth = days.length <= 7 ? '110px' : '72px'
	const stickyStruct =
		options.stickyViewHeader !== false ? 'grid sticky top-0 z-30' : 'grid'

	const headerRow = createEl('div', {
		className: mergeClassNames(
			options.unstyled,
			'border-b border-border bg-muted',
			undefined,
			stickyStruct
		),
		style: {
			gridTemplateColumns: `176px repeat(${days.length}, minmax(${minDayWidth}, 1fr))`,
		},
	})
	const cornerCell = createEl('div', { text: 'Resource' })
	applySlot(
		cornerCell,
		'resourceHeader',
		'border-r border-border bg-muted px-2.5 py-2 text-xs font-semibold text-muted-foreground',
		options,
		'sticky left-0 z-30'
	)
	headerRow.appendChild(cornerCell)
	for (const day of days) {
		const dh = createEl('div', {
			text: formatDate(day, { weekday: 'short', day: 'numeric' }, state.locale),
		})
		applySlot(
			dh,
			'dayHeader',
			'border-r border-border bg-muted py-2 text-center text-xs font-medium text-muted-foreground',
			options
		)
		headerRow.appendChild(dh)
	}
	grid.appendChild(headerRow)

	for (const resource of state.resources) {
		const resEvents = getResourceEvents(
			visibleEvents,
			resource.id
		) as DomCalendarEvent[]
		const row = createEl('div', {
			className: mergeClassNames(options.unstyled, '', undefined, 'grid'),
			style: {
				gridTemplateColumns: `176px repeat(${days.length}, minmax(${minDayWidth}, 1fr))`,
			},
		})
		row.appendChild(renderResourceLabel(resource, runtime))

		const cellsTrack = createEl('div', {
			className: mergeClassNames(
				options.unstyled,
				'',
				undefined,
				'relative grid'
			),
			style: {
				gridColumn: `2 / span ${days.length}`,
				gridTemplateColumns: `repeat(${days.length}, minmax(${minDayWidth}, 1fr))`,
			},
		})
		for (const day of days) {
			cellsTrack.appendChild(
				buildMonthCell(day, currentMonth, runtime, resource)
			)
		}
		cellsTrack.appendChild(
			renderEventOverlay(days, resEvents, runtime, resource)
		)
		row.appendChild(cellsTrack)
		grid.appendChild(row)
	}

	return grid
}
