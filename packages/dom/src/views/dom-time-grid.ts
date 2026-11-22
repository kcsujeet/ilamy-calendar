import {
	add,
	type BusinessHours,
	buildTimeGridViewModel,
	type CellInfo,
	dayKey,
	formatDate,
	getVerticalBarStyle,
	isBusinessHour,
	resolveTimelineGranularity,
	type TimeGridColumnViewModel,
	toOffsetIso,
	withTime,
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
import type {
	DomCalendarEvent,
	DomCalendarOptions,
	DomRuntime,
} from '../dom-calendar.types'
import { renderDomEventBar } from './dom-event-bar'
import { buildMonthCell, renderEventOverlay } from './dom-month-view'
import { renderResourceHorizontalGrid } from './dom-resource-horizontal-grid'
import { renderResourceHorizontalHourlyGrid } from './dom-resource-horizontal-hourly-grid'
import { renderTimeGridStickyChrome } from './dom-time-grid-chrome'

const HOUR_ROW_HEIGHT_PX = 56

const resolveTimeSlotAppearance = (
	isDisabled: boolean,
	isNonBusiness: boolean
): {
	slotName: 'cellDisabled' | 'cellNonBusiness' | 'cell'
	slotBg: string
} => {
	if (isDisabled) {
		return {
			slotName: 'cellDisabled',
			slotBg: 'bg-muted/60 opacity-50 cursor-not-allowed',
		}
	}
	if (isNonBusiness) {
		return { slotName: 'cellNonBusiness', slotBg: 'bg-muted/35' }
	}
	return { slotName: 'cell', slotBg: 'bg-background hover:bg-accent/20' }
}

const renderNowLine = (
	nowIndicatorPercent: number | null,
	options: DomCalendarOptions
): HTMLElement | null => {
	if (nowIndicatorPercent === null) return null

	const line = createEl(
		'div',
		{
			data: { testid: 'now-indicator' },
			style: {
				position: 'absolute',
				left: '0',
				right: '0',
				top: `${nowIndicatorPercent}%`,
				zIndex: '15',
			},
		},
		[
			createEl('span', {
				className: 'size-2 shrink-0 rounded-full bg-current',
			}),
			createEl('span', {
				className: 'h-0.5 flex-1 bg-current',
			}),
		]
	)
	applySlot(
		line,
		'nowIndicator',
		'text-destructive',
		options,
		'pointer-events-none flex -translate-y-1/2 items-center'
	)
	return line
}

const renderTimeAxis = (
	hours: ZonedDate[],
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const stripChrome = Boolean(options.unstyled)
	const timeAxisCol = createEl('div', {
		data: { testid: 'dom-time-axis' },
		className: mergeClassNames(
			stripChrome,
			'border-r border-border bg-background',
			undefined,
			'sticky left-0 z-20'
		),
	})
	const hourFmtOptions: Intl.DateTimeFormatOptions = {
		hour: options.timeFormat === '24-hour' ? '2-digit' : 'numeric',
		minute: options.timeFormat === '24-hour' ? '2-digit' : undefined,
		hour12: options.timeFormat !== '24-hour',
	}
	for (const hour of hours) {
		timeAxisCol.appendChild(
			createEl('div', {
				text: formatDate(hour, hourFmtOptions, state.locale),
				className: mergeClassNames(
					stripChrome,
					'border-b border-border/60 text-muted-foreground',
					undefined,
					'pr-2 pt-1 text-right text-[11px] tabular-nums'
				),
				style: { height: `${HOUR_ROW_HEIGHT_PX}px` },
			})
		)
	}
	return timeAxisCol
}

const renderTimeSlotCell = (
	col: TimeGridColumnViewModel,
	hourNum: number,
	minute: number,
	slotMinutes: number,
	slotHeightPx: number,
	isLastSub: boolean,
	effHours: BusinessHours | BusinessHours[] | undefined,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const slotStart = withTime(col.day, { hour: hourNum, minute, second: 0 })
	const cellInfo: CellInfo = {
		start: toOffsetIso(slotStart),
		end: toOffsetIso(add(slotStart, slotMinutes, 'minute')),
		allDay: false,
		resource: col.resource,
	}
	const isDisabled = Boolean(options.isCellDisabled?.(cellInfo))
	const isNonBusiness = Boolean(
		effHours &&
		!isBusinessHour({
			date: col.day,
			hour: hourNum,
			minute,
			businessHours: effHours,
		})
	)
	const { slotName, slotBg } = resolveTimeSlotAppearance(
		isDisabled,
		isNonBusiness
	)
	const borderClass = isLastSub ? 'border-border/70' : 'border-border/30'

	const slotEl = createEl('div', {
		data: {
			cell: 'true',
			date: dayKey(col.day),
			start: cellInfo.start,
			end: cellInfo.end,
			allDay: 'false',
			hour: String(hourNum),
			minute: String(minute),
			resourceId: col.resource ? String(col.resource.id) : undefined,
			nonBusiness: isNonBusiness ? 'true' : undefined,
			disabled: isDisabled ? 'true' : undefined,
			testid: `time-slot-${dayKey(col.day)}-${hourNum}-${minute}`,
		},
		style: { height: `${slotHeightPx}px` },
	})
	applySlot(
		slotEl,
		slotName,
		`border-b ${borderClass} transition-colors ${slotBg}`,
		options
	)

	slotEl.addEventListener('click', () => {
		if (!canCommitSelection(cellInfo, options, state.timezone)) return
		options.onCellClick?.(cellInfo)
		runtime.openCreateDialog(cellInfo)
	})
	return slotEl
}

const renderColumnEventsLayer = (
	col: TimeGridColumnViewModel,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const eventsLayer = createEl('div', {
		className: mergeClassNames(
			options.unstyled,
			'',
			undefined,
			'pointer-events-none absolute inset-0'
		),
	})
	for (const item of col.positionedEvents) {
		const barStyle = getVerticalBarStyle(item)
		const wrapper = createEl('div', {
			className: mergeClassNames(
				options.unstyled,
				'',
				undefined,
				'pointer-events-auto p-[1px]'
			),
			style: {
				position: 'absolute',
				...barStyle,
				zIndex: item.zIndex !== undefined ? String(item.zIndex) : undefined,
			},
		})
		wrapper.appendChild(
			renderDomEventBar(item.event as DomCalendarEvent, runtime, {
				axis: 'vertical',
				compact: false,
			})
		)
		eventsLayer.appendChild(wrapper)
	}
	return eventsLayer
}

const renderTimeColumn = (
	col: TimeGridColumnViewModel,
	hours: ZonedDate[],
	slotMinutes: number,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const slotsPerHour = Math.max(1, 60 / slotMinutes)
	const slotHeightPx = HOUR_ROW_HEIGHT_PX / slotsPerHour
	const firstHourNum = hours.at(0)?.hour ?? 0
	const lastHourNum = (hours.at(-1)?.hour ?? 23) + 1

	const colEl = createEl('div', {
		className: mergeClassNames(
			options.unstyled,
			'border-r border-border',
			undefined,
			'relative'
		),
		data: {
			timeColumn: 'true',
			date: dayKey(col.day),
			firstHour: String(firstHourNum),
			lastHour: String(lastHourNum),
			resourceId: col.resource ? String(col.resource.id) : undefined,
		},
		style: { height: `${hours.length * HOUR_ROW_HEIGHT_PX}px` },
	})

	const effHours = resolveEffectiveBusinessHours(options, col.resource)
	for (const hour of hours) {
		for (let sub = 0; sub < slotsPerHour; sub += 1) {
			colEl.appendChild(
				renderTimeSlotCell(
					col,
					hour.hour,
					sub * slotMinutes,
					slotMinutes,
					slotHeightPx,
					sub === slotsPerHour - 1,
					effHours,
					runtime
				)
			)
		}
	}

	colEl.appendChild(renderColumnEventsLayer(col, runtime))
	const nowLine = renderNowLine(col.nowIndicatorPercent, options)
	if (nowLine) colEl.appendChild(nowLine)
	return colEl
}

const renderHorizontalResourceTimeGrid = (
	grid: HTMLElement,
	mode: 'day' | 'week',
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	if (
		resolveTimelineGranularity(mode, options.weekViewGranularity) === 'hourly'
	) {
		return renderResourceHorizontalHourlyGrid(grid, mode, runtime)
	}
	return renderResourceHorizontalGrid(grid, mode, runtime, {
		buildCell: buildMonthCell,
		renderOverlay: renderEventOverlay,
	})
}

export const renderDomTimeGrid = (
	runtime: DomRuntime,
	mode: 'day' | 'week'
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const current = resolveCurrentZonedDate(state.currentDate, state.timezone)

	const grid = createGridScrollContainer(mode, options)

	if (state.resources.length > 0 && options.orientation === 'horizontal') {
		return renderHorizontalResourceTimeGrid(grid, mode, runtime)
	}

	const model = buildTimeGridViewModel({
		mode,
		currentDate: current,
		events: runtime.getVisibleEvents(),
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

	const colMinWidth = state.resources.length > 0 ? '128px' : '110px'
	const colTemplate = `64px repeat(${model.columns.length}, minmax(${colMinWidth}, 1fr))`
	grid.appendChild(
		renderTimeGridStickyChrome(model.columns, colTemplate, mode, runtime)
	)

	const bodyGrid = createEl('div', {
		className: mergeClassNames(options.unstyled, '', undefined, 'grid'),
		style: { gridTemplateColumns: colTemplate },
	})
	bodyGrid.appendChild(renderTimeAxis(model.hours, runtime))
	const slotMinutes = options.slotDuration ?? 60
	for (const col of model.columns) {
		bodyGrid.appendChild(
			renderTimeColumn(col, model.hours, slotMinutes, runtime)
		)
	}
	grid.appendChild(bodyGrid)

	const firstHourNum = model.hours.at(0)?.hour ?? 0
	const targetHour = Math.max(firstHourNum, 8)
	const initialOffsetPx = (targetHour - firstHourNum) * HOUR_ROW_HEIGHT_PX
	if (initialOffsetPx > 0 && typeof requestAnimationFrame === 'function') {
		requestAnimationFrame(() => {
			grid.scrollTop = initialOffsetPx
		})
	}
	return grid
}
