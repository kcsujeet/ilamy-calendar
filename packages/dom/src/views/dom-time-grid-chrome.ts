import {
	add,
	dayKey,
	formatDate,
	getWeekNumber,
	isToday,
	parseDate,
	type Resource,
	startOf,
	toOffsetIso,
	wallClockDiff,
	type ZonedDate,
} from '@ilamy/core'
import { applySlot, createEl, mergeClassNames } from '../core/dom-styles.utils'
import type { DomCalendarEvent, DomRuntime } from '../dom-calendar.types'
import { renderDomEventBar } from './dom-event-bar'

export interface TimeColumnSpec {
	day: ZonedDate
	resource?: Resource
	label: string
	sublabel?: string
	events: DomCalendarEvent[]
}

export const isAllDayOrMultiDay = (
	event: DomCalendarEvent,
	timezone: string
): boolean => {
	if (event.allDay) return true
	const s = parseDate(event.start, timezone)
	const e = parseDate(event.end, timezone)
	if (!s || !e) return false
	return wallClockDiff(e, s, 'hour') >= 24
}

const renderAllDayStrip = (
	columns: TimeColumnSpec[],
	colTemplate: string,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()

	const strip = createEl('div', { style: { gridTemplateColumns: colTemplate } })
	const stripChrome = Boolean(options.unstyled && !options.slotProps?.cell)
	applySlot(
		strip,
		'allDayRow',
		'border-b border-border bg-background',
		options,
		'grid'
	)
	strip.appendChild(
		createEl('div', {
			text: 'All Day',
			className: mergeClassNames(
				stripChrome,
				'border-r border-border bg-background text-muted-foreground',
				undefined,
				'sticky left-0 z-20 flex items-center justify-center px-1 py-1.5 text-xs'
			),
		})
	)

	for (const col of columns) {
		const dayStart = startOf(col.day, 'day')
		const dayEnd = add(dayStart, 1, 'day')
		const allDayEvents = col.events.filter((event) => {
			if (!isAllDayOrMultiDay(event, state.timezone)) return false
			const s = parseDate(event.start, state.timezone)
			const e = parseDate(event.end, state.timezone)
			return Boolean(
				s &&
					e &&
					toOffsetIso(s) < toOffsetIso(dayEnd) &&
					toOffsetIso(e) > toOffsetIso(dayStart)
			)
		})

		const cell = createEl('div', {
			className: mergeClassNames(
				stripChrome,
				'border-r border-border p-1 min-h-[32px]',
				undefined,
				'flex flex-col gap-1'
			),
			data: {
				cell: 'true',
				date: dayKey(col.day),
				start: toOffsetIso(dayStart),
				end: toOffsetIso(dayEnd),
				allDay: 'true',
				resourceId: col.resource ? String(col.resource.id) : undefined,
			},
		})
		for (const event of allDayEvents) {
			const item = createEl('div', { style: { height: '22px' } })
			item.appendChild(
				renderDomEventBar(event, runtime, { axis: 'horizontal', compact: true })
			)
			cell.appendChild(item)
		}
		strip.appendChild(cell)
	}
	return strip
}

const renderDayBannerHeader = (
	day: ZonedDate,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const today = isToday(day)
	const headerText = formatDate(
		day,
		{ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
		state.locale
	)
	const banner = createEl('div', {
		data: { testid: 'day-view-header' },
	})
	applySlot(
		banner,
		'dayHeader',
		'border-b border-border bg-background py-2.5 px-3',
		options,
		'flex min-h-12 w-full items-center justify-center'
	)
	let todayBadge: HTMLElement | null = null
	if (today) {
		todayBadge = createEl('span', {
			text: 'Today',
			className:
				'bg-primary text-primary-foreground ml-2 rounded-full px-2 py-0.5 text-xs sm:text-sm',
		})
	}
	const inner = createEl(
		'div',
		{
			className: `flex items-center justify-center text-center text-sm font-semibold sm:text-xl ${today ? 'text-primary' : 'text-foreground'}`,
		},
		[headerText, todayBadge]
	)
	banner.appendChild(inner)
	return banner
}

const renderTimeGridHeaderCorner = (
	mode: 'day' | 'week',
	firstCol: TimeColumnSpec | undefined,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const cornerCell = createEl('div')
	applySlot(
		cornerCell,
		'dayHeader',
		'border-r border-border bg-background p-2',
		options,
		'sticky left-0 z-30 flex flex-col items-center justify-center'
	)
	if (mode === 'week' && options.weekNumbers !== false && firstCol) {
		const wk = getWeekNumber(
			firstCol.day,
			options.weekNumberCalculation ?? 'ISO',
			state.locale
		)
		cornerCell.append(
			createEl('span', {
				text: 'Week',
				className: 'text-muted-foreground text-xs leading-tight',
			}),
			createEl('span', {
				text: String(wk),
				className: 'text-foreground text-sm font-medium leading-tight',
			})
		)
	}
	return cornerCell
}

const renderTimeGridColumnHeader = (
	col: TimeColumnSpec,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const isTodayCol = isToday(col.day)
	const headerCell = createEl('div', {
		data: {
			date: dayKey(col.day),
			resourceId: col.resource ? String(col.resource.id) : undefined,
		},
	})
	applySlot(
		headerCell,
		col.resource ? 'resourceHeader' : 'dayHeader',
		'border-r border-border bg-background py-2 px-1 text-xs font-medium text-muted-foreground',
		options,
		'flex flex-col items-center justify-center'
	)
	let labelColor = 'text-muted-foreground'
	if (isTodayCol && !col.resource) {
		labelColor = 'text-primary'
	}
	headerCell.appendChild(
		createEl('span', {
			text: col.label,
			className: `truncate max-w-full text-xs ${labelColor}`,
		})
	)
	if (col.sublabel) {
		const todayBadgeSize = col.sublabel.length <= 2 ? 'h-5 w-5' : 'h-6 px-2'
		let sublabelClass =
			'mt-0.5 text-xs font-medium text-foreground tabular-nums whitespace-nowrap'
		if (isTodayCol) {
			sublabelClass = `mt-0.5 inline-flex ${todayBadgeSize} items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground tabular-nums whitespace-nowrap`
		}
		headerCell.appendChild(
			createEl('span', {
				text: col.sublabel,
				className: sublabelClass,
			})
		)
	}
	return headerCell
}

const renderTimeGridHeader = (
	columns: TimeColumnSpec[],
	colTemplate: string,
	mode: 'day' | 'week',
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const firstCol = columns.at(0)
	if (mode === 'day' && state.resources.length === 0 && firstCol) {
		return renderDayBannerHeader(firstCol.day, runtime)
	}

	const headerRow = createEl('div', {
		className: mergeClassNames(
			options.unstyled,
			'border-b border-border bg-background',
			undefined,
			'grid'
		),
		style: { gridTemplateColumns: colTemplate },
	})
	headerRow.appendChild(renderTimeGridHeaderCorner(mode, firstCol, runtime))
	for (const col of columns) {
		headerRow.appendChild(renderTimeGridColumnHeader(col, runtime))
	}
	return headerRow
}

/** Renders the sticky day/resource header and all-day row strip for day/week time grids. */
export const renderTimeGridStickyChrome = (
	columns: TimeColumnSpec[],
	colTemplate: string,
	mode: 'day' | 'week',
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	let stickyHeaderClass = 'bg-background'
	if (options.stickyViewHeader !== false) {
		stickyHeaderClass = 'sticky top-0 z-30 bg-background'
	}
	const stickyHeaderWrap = createEl('div', {
		className: stickyHeaderClass,
	})
	stickyHeaderWrap.appendChild(
		renderTimeGridHeader(columns, colTemplate, mode, runtime)
	)
	stickyHeaderWrap.appendChild(renderAllDayStrip(columns, colTemplate, runtime))
	return stickyHeaderWrap
}
