import {
	add,
	type BusinessHours,
	type CellInfo,
	dayKey,
	formatDate,
	type HourlyTimelineBar,
	isBusinessHour,
	isToday,
	now,
	type Resource,
	type ResourceTimelineRowViewModel,
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
	mergeClassNames,
	translateDom,
} from '../core/dom-styles.utils'
import type { DomCalendarEvent, DomRuntime } from '../dom-calendar.types'
import { renderDomEventBar } from './dom-event-bar'
import {
	buildDomResourceTimeline,
	renderResourceLabel,
} from './dom-resource-horizontal-grid'

const HOUR_COL_WIDTH_PX = 80
const RESOURCE_COL_WIDTH_PX = 160
const ROW_MIN_HEIGHT_PX = 80

const renderHourlyDayGroup = (
	day: ZonedDate,
	hours: ZonedDate[],
	startCol: number,
	currentNow: ZonedDate,
	runtime: DomRuntime
): HTMLElement[] => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const dayCell = createEl('div', {
		style: {
			gridRow: '1',
			gridColumn: `${startCol} / span ${hours.length}`,
		},
	})
	applySlot(
		dayCell,
		'dayHeader',
		'border-r border-b border-border bg-background py-1.5 text-center text-xs font-medium text-foreground',
		options,
		'flex flex-col items-center justify-center gap-0.5'
	)
	dayCell.appendChild(
		createEl('span', {
			text: formatDate(day, { weekday: 'short' }, state.locale),
			className: mergeClassNames(options.unstyled, 'text-xs'),
		})
	)
	const isTodayDay = isToday(day)
	let numBadgeClass = 'text-xs text-muted-foreground'
	if (isTodayDay) {
		numBadgeClass =
			'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold'
	}
	dayCell.appendChild(
		createEl('span', {
			text: String(day.day),
			data: isTodayDay ? { ilamyTodayBadge: '' } : undefined,
			className: mergeClassNames(options.unstyled, numBadgeClass),
		})
	)

	const cells: HTMLElement[] = [dayCell]
	for (let hIdx = 0; hIdx < hours.length; hIdx += 1) {
		const hourDate = withTime(day, {
			hour: hours[hIdx].hour,
			minute: 0,
			second: 0,
		})
		const isCurrentHour = isTodayDay && hourDate.hour === currentNow.hour
		const hourCell = createEl('div', {
			text: formatDate(
				hourDate,
				{ hour: 'numeric', hour12: options.timeFormat !== '24-hour' },
				state.locale
			),
			style: { gridRow: '2', gridColumn: String(startCol + hIdx) },
		})
		const hourClasses = isCurrentHour
			? 'border-r border-border bg-primary/10 py-2 text-center text-xs font-medium text-primary'
			: 'border-r border-border bg-background py-2 text-center text-xs text-muted-foreground'
		applySlot(hourCell, 'dayHeader', hourClasses, options)
		cells.push(hourCell)
	}
	return cells
}

const renderHourlyHeader = (
	days: ZonedDate[],
	hours: ZonedDate[],
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const totalCols = days.length * hours.length
	const colTemplate = `${RESOURCE_COL_WIDTH_PX}px repeat(${totalCols}, ${HOUR_COL_WIDTH_PX}px)`
	const currentNow = now(state.timezone)
	const isSticky = options.stickyViewHeader !== false
	const stickyStruct = isSticky ? 'grid sticky top-0 z-30' : 'grid'

	const header = createEl('div', {
		data: {
			ilamySlot: 'grid-header',
			sticky: isSticky ? 'true' : undefined,
		},
		className: mergeClassNames(
			options.unstyled,
			'border-b border-border bg-background',
			undefined,
			stickyStruct
		),
		style: { gridTemplateColumns: colTemplate, width: 'max-content' },
	})

	const corner = createEl('div', {
		text: translateDom(options, 'resources', 'Resources'),
		style: { gridRow: '1 / span 2', gridColumn: '1' },
	})
	applySlot(
		corner,
		'resourceHeader',
		'border-r border-border bg-background px-2.5 py-2 text-xs font-semibold text-foreground',
		options,
		'sticky left-0 z-30 flex items-center justify-center'
	)
	header.appendChild(corner)

	for (let dIdx = 0; dIdx < days.length; dIdx += 1) {
		const cells = renderHourlyDayGroup(
			days[dIdx],
			hours,
			2 + dIdx * hours.length,
			currentNow,
			runtime
		)
		header.append(...cells)
	}

	return header
}

const renderHourlySlotCell = (
	resource: Resource,
	slotStart: ZonedDate,
	effHours: BusinessHours | BusinessHours[] | undefined,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const slotEnd = add(slotStart, 1, 'hour')
	const cellInfo: CellInfo = {
		start: toOffsetIso(slotStart),
		end: toOffsetIso(slotEnd),
		allDay: false,
		resource,
	}
	const isDisabled = Boolean(options.isCellDisabled?.(cellInfo))
	const isNonBusiness = Boolean(
		effHours &&
		!isBusinessHour({
			date: slotStart,
			hour: slotStart.hour,
			minute: 0,
			businessHours: effHours,
		})
	)
	let slotName: 'cellDisabled' | 'cellNonBusiness' | 'cell' = 'cell'
	let slotBg = 'bg-background hover:bg-accent/20'
	if (isDisabled) {
		slotName = 'cellDisabled'
		slotBg = 'bg-muted/60 opacity-50 cursor-not-allowed'
	} else if (isNonBusiness) {
		slotName = 'cellNonBusiness'
		slotBg = 'bg-muted/35'
	}

	const cell = createEl('div', {
		data: {
			testid: `dom-resource-hour-slot-${resource.id}-${dayKey(slotStart)}-${slotStart.hour}`,
			start: cellInfo.start,
			end: cellInfo.end,
			resourceId: String(resource.id),
			nonBusiness: isNonBusiness ? 'true' : undefined,
		},
	})
	applySlot(
		cell,
		slotName,
		`border-r border-b border-border ${slotBg}`,
		options
	)
	if (!options.disableCellClick && !isDisabled) {
		cell.addEventListener('click', () => {
			if (!canCommitSelection(cellInfo, options, state.timezone)) return
			options.onCellClick?.(cellInfo)
			runtime.openCreateDialog(cellInfo)
		})
	}
	return cell
}

const appendHourlyNowLine = (
	overlay: HTMLElement,
	nowIndicatorPercent: number | null,
	runtime: DomRuntime
): void => {
	if (nowIndicatorPercent === null) return
	const options = runtime.getOptions()
	const line = createEl('div', {
		data: { testid: 'now-indicator' },
		style: {
			position: 'absolute',
			top: '0',
			bottom: '0',
			left: `${nowIndicatorPercent}%`,
			width: '2px',
			pointerEvents: 'none',
			zIndex: '15',
		},
	})
	applySlot(line, 'nowIndicator', 'bg-destructive', options)
	overlay.appendChild(line)
}

const renderHourlyOverlay = (
	bars: HourlyTimelineBar[],
	nowIndicatorPercent: number | null,
	runtime: DomRuntime
): HTMLElement => {
	const overlay = createEl('div', {
		className: 'pointer-events-none absolute inset-0 z-10',
	})

	for (const item of bars) {
		const bar = renderDomEventBar(item.event as DomCalendarEvent, runtime, {
			axis: 'horizontal',
			compact: true,
		})
		bar.style.position = 'absolute'
		bar.style.pointerEvents = 'auto'
		bar.style.top = `${4 + item.lane * 24}px`
		bar.style.left = `${item.leftPercent}%`
		bar.style.width = `${item.widthPercent}%`
		bar.style.height = '22px'
		overlay.appendChild(bar)
	}

	appendHourlyNowLine(overlay, nowIndicatorPercent, runtime)
	return overlay
}

const renderResourceHourlyRow = (
	rowModel: ResourceTimelineRowViewModel,
	hourSlots: ZonedDate[],
	nowIndicatorPercent: number | null,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const { resource, hourlyBars } = rowModel
	const effHours = resolveEffectiveBusinessHours(options, resource)
	const colTemplate = `${RESOURCE_COL_WIDTH_PX}px repeat(${hourSlots.length}, ${HOUR_COL_WIDTH_PX}px)`

	const row = createEl('div', {
		className: mergeClassNames(options.unstyled, '', undefined, 'grid'),
		style: {
			gridTemplateColumns: colTemplate,
			minHeight: `${ROW_MIN_HEIGHT_PX}px`,
			width: 'max-content',
		},
	})
	row.appendChild(renderResourceLabel(resource, runtime))

	const track = createEl('div', {
		data: { ilamySlot: 'grid-row' },
		className: mergeClassNames(
			options.unstyled,
			'',
			undefined,
			'relative grid'
		),
		style: {
			gridColumn: `2 / span ${hourSlots.length}`,
			gridTemplateColumns: `repeat(${hourSlots.length}, ${HOUR_COL_WIDTH_PX}px)`,
		},
	})
	for (const slotStart of hourSlots) {
		track.appendChild(
			renderHourlySlotCell(resource, slotStart, effHours, runtime)
		)
	}
	track.appendChild(
		renderHourlyOverlay(hourlyBars, nowIndicatorPercent, runtime)
	)
	row.appendChild(track)
	return row
}

/**
 * Renders the horizontal hourly timeline for resource Day and Week (`weekViewGranularity: 'hourly'`) views.
 */
export const renderResourceHorizontalHourlyGrid = (
	grid: HTMLElement,
	mode: 'day' | 'week',
	runtime: DomRuntime
): HTMLElement => {
	const state = runtime.controller.getState()
	const { model } = buildDomResourceTimeline(mode, runtime)
	grid.dataset.testid = 'dom-resource-hourly-grid'

	grid.appendChild(renderHourlyHeader(model.days, model.hours, runtime))
	for (const row of model.rows) {
		grid.appendChild(
			renderResourceHourlyRow(
				row,
				model.hourSlots,
				model.nowIndicatorPercent,
				runtime
			)
		)
	}

	if (
		typeof requestAnimationFrame === 'function' &&
		model.hourSlots.length > 0
	) {
		const currentNow = now(state.timezone)
		const todayIndex = model.hourSlots.findIndex(
			(s) => isToday(s) && s.hour === currentNow.hour
		)
		const fallbackIndex = Math.min(8, Math.max(0, model.hourSlots.length - 1))
		const targetIndex =
			todayIndex >= 0 ? Math.max(0, todayIndex - 3) : fallbackIndex
		requestAnimationFrame(() => {
			grid.scrollLeft = targetIndex * HOUR_COL_WIDTH_PX
		})
	}

	return grid
}
