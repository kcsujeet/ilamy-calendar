import {
	buildResourceTimelineViewModel,
	formatDate,
	type HorizontalLayoutResult,
	type Resource,
	type ResourceTimelineViewModel,
	type ZonedDate,
} from '@ilamy/core'
import {
	applySlot,
	createEl,
	mergeClassNames,
	resolveCurrentZonedDate,
	translateDom,
} from '../core/dom-styles.utils'
import type { DomRuntime } from '../dom-calendar.types'

export interface HorizontalGridCellRenderers {
	buildCell: (
		day: ZonedDate,
		currentMonth: number,
		runtime: DomRuntime,
		resource?: Resource
	) => HTMLElement
	renderOverlay: (
		weekDays: ZonedDate[],
		layout: HorizontalLayoutResult,
		runtime: DomRuntime,
		resource?: Resource
	) => HTMLElement
}

export const renderResourceLabel = (
	resource: Resource,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const cell = createEl('div', {
		data: {
			resourceId: String(resource.id),
			sticky: 'true',
			testid: `resource-header-${resource.id}`,
		},
	})
	applySlot(
		cell,
		'resourceHeader',
		'border-r border-b border-border bg-muted px-2.5 py-2 text-xs font-semibold text-foreground',
		options,
		'sticky left-0 z-20 flex items-center justify-center'
	)
	if (resource.backgroundColor) {
		cell.style.backgroundColor = resource.backgroundColor
	}
	if (resource.color) {
		cell.style.color = resource.color
	}
	if (options.renderResource) {
		const cleanup = options.renderResource(cell, { resource, view: state.view })
		if (cleanup) runtime.registerCleanup(cleanup)
		return cell
	}
	cell.appendChild(
		createEl('span', {
			text: resource.title,
			className: mergeClassNames(options.unstyled, 'truncate'),
		})
	)
	return cell
}

export const buildDomResourceTimeline = (
	mode: 'day' | 'week' | 'month',
	runtime: DomRuntime
): { model: ResourceTimelineViewModel; currentMonth: number } => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const current = resolveCurrentZonedDate(state.currentDate, state.timezone)
	const model = buildResourceTimelineViewModel({
		mode,
		currentDate: current,
		events: runtime.getVisibleEvents(),
		resources: state.resources,
		firstDayOfWeek: state.firstDayOfWeek,
		timezone: state.timezone,
		hiddenDays: state.hiddenDays,
		dayMaxEvents: options.dayMaxEvents,
		businessHours: options.businessHours,
		hideNonBusinessHours: options.hideNonBusinessHours,
		slotMinTime: options.slotMinTime,
		slotMaxTime: options.slotMaxTime,
		weekViewGranularity: options.weekViewGranularity,
		nowIndicator: options.nowIndicator,
	})
	return { model, currentMonth: current.month }
}

export const renderResourceHorizontalGrid = (
	grid: HTMLElement,
	mode: 'day' | 'week' | 'month',
	runtime: DomRuntime,
	renderers: HorizontalGridCellRenderers
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const { model, currentMonth } = buildDomResourceTimeline(mode, runtime)
	const days = model.days
	const minDayWidth = days.length <= 7 ? '110px' : '72px'
	const isSticky = options.stickyViewHeader !== false
	let stickyStruct = 'grid'
	if (isSticky) {
		stickyStruct = 'grid sticky top-0 z-30'
	}

	const headerRow = createEl('div', {
		data: {
			ilamySlot: 'grid-header',
			sticky: isSticky ? 'true' : undefined,
		},
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
	const cornerCell = createEl('div', {
		text: translateDom(options, 'resource', 'Resource'),
		data: { sticky: 'true' },
	})
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

	for (const rowModel of model.rows) {
		const { resource, dailyLayout } = rowModel
		const row = createEl('div', {
			className: mergeClassNames(options.unstyled, '', undefined, 'grid'),
			style: {
				gridTemplateColumns: `176px repeat(${days.length}, minmax(${minDayWidth}, 1fr))`,
			},
		})
		row.appendChild(renderResourceLabel(resource, runtime))

		const cellsTrack = createEl('div', {
			data: { ilamySlot: 'grid-row' },
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
				renderers.buildCell(day, currentMonth, runtime, resource)
			)
		}
		if (dailyLayout) {
			cellsTrack.appendChild(
				renderers.renderOverlay(days, dailyLayout, runtime, resource)
			)
		}
		row.appendChild(cellsTrack)
		grid.appendChild(row)
	}

	return grid
}
