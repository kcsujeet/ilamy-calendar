import {
	add,
	type BusinessHours,
	type CellInfo,
	dayKey,
	formatDate,
	getResourceEvents,
	isBusinessHour,
	isToday,
	now,
	parseDate,
	type Resource,
	toOffsetIso,
	withTime,
	type ZonedDate,
} from '@ilamy/core'
import {
	canCommitSelection,
	resolveEffectiveBusinessHours,
} from '../core/dom-constraints.utils'
import { applySlot, createEl, mergeClassNames } from '../core/dom-styles.utils'
import type { DomCalendarEvent, DomRuntime } from '../dom-calendar.types'
import { renderDomEventBar } from './dom-event-bar'
import { renderResourceLabel } from './dom-resource-horizontal-grid'

const HOUR_COL_WIDTH_PX = 80
const RESOURCE_COL_WIDTH_PX = 160
const ROW_MIN_HEIGHT_PX = 80

const buildHourSlots = (days: ZonedDate[], hours: ZonedDate[]): ZonedDate[] => {
	const slots: ZonedDate[] = []
	for (const day of days) {
		for (const hour of hours) {
			slots.push(withTime(day, { hour: hour.hour, minute: 0, second: 0 }))
		}
	}
	return slots
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
	const stickyStruct =
		options.stickyViewHeader !== false ? 'grid sticky top-0 z-30' : 'grid'

	const header = createEl('div', {
		className: mergeClassNames(
			options.unstyled,
			'border-b border-border bg-background',
			undefined,
			stickyStruct
		),
		style: { gridTemplateColumns: colTemplate, width: 'max-content' },
	})

	const corner = createEl('div', {
		text: options.translations?.resources ?? 'Resources',
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
		const day = days[dIdx]
		const startCol = 2 + dIdx * hours.length
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
		const numBadgeClass = isToday(day)
			? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-semibold'
			: 'text-xs text-muted-foreground'
		dayCell.appendChild(
			createEl('span', {
				text: String(day.day),
				className: mergeClassNames(options.unstyled, numBadgeClass),
			})
		)
		header.appendChild(dayCell)

		for (let hIdx = 0; hIdx < hours.length; hIdx += 1) {
			const hourDate = withTime(day, {
				hour: hours[hIdx].hour,
				minute: 0,
				second: 0,
			})
			const isCurrentHour = isToday(day) && hourDate.hour === currentNow.hour
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
			header.appendChild(hourCell)
		}
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
	rangeStartMs: number,
	rangeEndMs: number,
	totalMs: number,
	runtime: DomRuntime
): void => {
	const options = runtime.getOptions()
	if (!options.nowIndicator) return
	const nowMs = now(runtime.controller.getState().timezone).epochMilliseconds
	if (nowMs < rangeStartMs || nowMs > rangeEndMs) return
	overlay.appendChild(
		createEl('div', {
			data: { testid: 'now-indicator' },
			style: {
				position: 'absolute',
				top: '0',
				bottom: '0',
				left: `${((nowMs - rangeStartMs) / totalMs) * 100}%`,
				width: '2px',
				backgroundColor: '#ef4444',
				pointerEvents: 'none',
				zIndex: '15',
			},
		})
	)
}

const renderHourlyOverlay = (
	resource: Resource,
	hourSlots: ZonedDate[],
	visibleEvents: DomCalendarEvent[],
	runtime: DomRuntime
): HTMLElement => {
	const overlay = createEl('div', {
		className: 'pointer-events-none absolute inset-0 z-10',
	})
	const firstSlot = hourSlots.at(0)
	const lastSlot = hourSlots.at(-1)
	if (!firstSlot || !lastSlot) return overlay

	const state = runtime.controller.getState()
	const rangeStartMs = firstSlot.epochMilliseconds
	const rangeEndMs = add(lastSlot, 1, 'hour').epochMilliseconds
	const totalMs = Math.max(1, rangeEndMs - rangeStartMs)
	const resEvents = getResourceEvents(
		visibleEvents,
		resource.id
	) as DomCalendarEvent[]

	for (let i = 0; i < resEvents.length; i += 1) {
		const evt = resEvents[i]
		const start = parseDate(evt.start, state.timezone)
		const end = parseDate(evt.end, state.timezone)
		if (!start || !end) continue
		const clampedStart = Math.max(start.epochMilliseconds, rangeStartMs)
		const clampedEnd = Math.min(end.epochMilliseconds, rangeEndMs)
		if (clampedEnd <= clampedStart) continue

		const bar = renderDomEventBar(evt, runtime, {
			axis: 'horizontal',
			compact: true,
		})
		bar.style.position = 'absolute'
		bar.style.pointerEvents = 'auto'
		bar.style.top = `${4 + (i % 3) * 24}px`
		bar.style.left = `${((clampedStart - rangeStartMs) / totalMs) * 100}%`
		bar.style.width = `${Math.max(((clampedEnd - clampedStart) / totalMs) * 100, 1.5)}%`
		bar.style.height = '22px'
		overlay.appendChild(bar)
	}

	appendHourlyNowLine(overlay, rangeStartMs, rangeEndMs, totalMs, runtime)
	return overlay
}

const renderResourceHourlyRow = (
	resource: Resource,
	hourSlots: ZonedDate[],
	visibleEvents: DomCalendarEvent[],
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
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
		renderHourlyOverlay(resource, hourSlots, visibleEvents, runtime)
	)
	row.appendChild(track)
	return row
}

/**
 * Renders the horizontal hourly timeline for resource Day and Week (`weekViewGranularity: 'hourly'`) views.
 */
export const renderResourceHorizontalHourlyGrid = (
	grid: HTMLElement,
	days: ZonedDate[],
	hours: ZonedDate[],
	visibleEvents: DomCalendarEvent[],
	runtime: DomRuntime
): HTMLElement => {
	const state = runtime.controller.getState()
	const hourSlots = buildHourSlots(days, hours)
	grid.dataset.testid = 'dom-resource-hourly-grid'

	grid.appendChild(renderHourlyHeader(days, hours, runtime))
	for (const resource of state.resources) {
		grid.appendChild(
			renderResourceHourlyRow(resource, hourSlots, visibleEvents, runtime)
		)
	}

	if (typeof requestAnimationFrame === 'function' && hourSlots.length > 0) {
		const currentNow = now(state.timezone)
		const todayIndex = hourSlots.findIndex(
			(s) => isToday(s) && s.hour === currentNow.hour
		)
		const fallbackIndex = Math.min(8, Math.max(0, hourSlots.length - 1))
		const targetIndex =
			todayIndex >= 0 ? Math.max(0, todayIndex - 3) : fallbackIndex
		requestAnimationFrame(() => {
			grid.scrollLeft = targetIndex * HOUR_COL_WIDTH_PX
		})
	}

	return grid
}
