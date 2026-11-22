import {
	add,
	dayKey,
	formatDate,
	getWeekNumber,
	startOf,
	type TimeGridColumnViewModel,
	toOffsetIso,
} from '@ilamy/core'
import { applySlot, createEl, mergeClassNames } from '../core/dom-styles.utils'
import type { DomCalendarEvent, DomRuntime } from '../dom-calendar.types'
import { renderDomEventBar } from './dom-event-bar'

const renderAllDayStrip = (
	columns: TimeGridColumnViewModel[],
	colTemplate: string,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()

	const strip = createEl('div', { style: { gridTemplateColumns: colTemplate } })
	const stripChrome = Boolean(options.unstyled)
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
		for (const event of col.allDayEvents) {
			const item = createEl('div', { style: { height: '22px' } })
			item.appendChild(
				renderDomEventBar(event as DomCalendarEvent, runtime, {
					axis: 'horizontal',
					compact: true,
				})
			)
			cell.appendChild(item)
		}
		strip.appendChild(cell)
	}
	return strip
}

const renderDayBannerHeader = (
	col: TimeGridColumnViewModel,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const today = col.isToday
	const headerText = formatDate(
		col.day,
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
			data: { ilamyTodayBadge: '' },
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
	firstCol: TimeGridColumnViewModel | undefined,
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
	col: TimeGridColumnViewModel,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const isTodayCol = col.isToday
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
				data: isTodayCol ? { ilamyTodayBadge: '' } : undefined,
				className: sublabelClass,
			})
		)
	}
	return headerCell
}

const renderTimeGridHeader = (
	columns: TimeGridColumnViewModel[],
	colTemplate: string,
	mode: 'day' | 'week',
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const firstCol = columns.at(0)
	if (mode === 'day' && state.resources.length === 0 && firstCol) {
		return renderDayBannerHeader(firstCol, runtime)
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
	columns: TimeGridColumnViewModel[],
	colTemplate: string,
	mode: 'day' | 'week',
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const isSticky = options.stickyViewHeader !== false
	let stickyHeaderClass = 'bg-background'
	if (isSticky) {
		stickyHeaderClass = 'sticky top-0 z-30 bg-background'
	}
	const stickyHeaderWrap = createEl('div', {
		data: {
			ilamySlot: 'grid-header',
			sticky: isSticky ? 'true' : undefined,
		},
		className: stickyHeaderClass,
	})
	stickyHeaderWrap.appendChild(
		renderTimeGridHeader(columns, colTemplate, mode, runtime)
	)
	stickyHeaderWrap.appendChild(renderAllDayStrip(columns, colTemplate, runtime))
	return stickyHeaderWrap
}
