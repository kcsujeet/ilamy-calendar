import {
	formatDate,
	getResourceEvents,
	type Resource,
	type ZonedDate,
} from '@ilamy/core'
import { applySlot, createEl, mergeClassNames } from '../core/dom-styles.utils'
import type { DomCalendarEvent, DomRuntime } from '../dom-calendar.types'

export interface HorizontalGridCellRenderers {
	buildCell: (
		day: ZonedDate,
		currentMonth: number,
		runtime: DomRuntime,
		resource?: Resource
	) => HTMLElement
	renderOverlay: (
		weekDays: ZonedDate[],
		events: DomCalendarEvent[],
		runtime: DomRuntime,
		resource?: Resource
	) => HTMLElement
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

export const renderResourceHorizontalGrid = (
	grid: HTMLElement,
	days: ZonedDate[],
	visibleEvents: DomCalendarEvent[],
	currentMonth: number,
	runtime: DomRuntime,
	renderers: HorizontalGridCellRenderers
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const minDayWidth = days.length <= 7 ? '110px' : '72px'
	let stickyStruct = 'grid'
	if (options.stickyViewHeader !== false) {
		stickyStruct = 'grid sticky top-0 z-30'
	}

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
				renderers.buildCell(day, currentMonth, runtime, resource)
			)
		}
		cellsTrack.appendChild(
			renderers.renderOverlay(days, resEvents, runtime, resource)
		)
		row.appendChild(cellsTrack)
		grid.appendChild(row)
	}

	return grid
}
