import {
	add,
	type BusinessHours,
	type CellInfo,
	collectResourceBusinessHours,
	dayKey,
	formatDate,
	getResourceEvents,
	getVerticalBarStyle,
	getViewHours,
	getWeekDays,
	getWeekNumber,
	isBusinessHour,
	isToday,
	layoutVertical,
	now,
	parseDate,
	type Resource,
	startOf,
	toOffsetIso,
	wallClockDiff,
	withoutHiddenDays,
	withTime,
	type ZonedDate,
} from '@ilamy/core'
import { renderDomEventBar } from './dom-event-bar'
import { canCommitSelection, resolveEffectiveBusinessHours } from './dom-events'
import { renderResourceHorizontalGrid } from './dom-month-view'
import { applySlot, createEl, mergeClassNames } from './dom-styles'
import type { DomCalendarEvent, DomRuntime } from './dom-types'

const HOUR_ROW_HEIGHT_PX = 56

interface TimeColumnSpec {
	day: ZonedDate
	resource?: Resource
	label: string
	sublabel?: string
	events: DomCalendarEvent[]
}

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

const buildTimeColumns = (
	days: ZonedDate[],
	visibleEvents: DomCalendarEvent[],
	runtime: DomRuntime
): TimeColumnSpec[] => {
	const state = runtime.controller.getState()

	if (state.resources.length === 0) {
		return days.map((day) => ({
			day,
			label: formatDate(day, { weekday: 'short' }, state.locale),
			sublabel: String(day.day),
			events: visibleEvents,
		}))
	}

	const columns: TimeColumnSpec[] = []
	for (const resource of state.resources) {
		const resEvents = getResourceEvents(
			visibleEvents,
			resource.id
		) as DomCalendarEvent[]
		for (const day of days) {
			columns.push({
				day,
				resource,
				label: resource.title,
				sublabel: formatDate(
					day,
					{ weekday: 'short', day: 'numeric' },
					state.locale
				),
				events: resEvents,
			})
		}
	}
	return columns
}

const isAllDayOrMultiDay = (
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

const renderNowLine = (
	day: ZonedDate,
	hours: ZonedDate[],
	runtime: DomRuntime
): HTMLElement | null => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	if (!options.nowIndicator || !isToday(day)) return null
	const firstHour = hours.at(0)
	if (!firstHour) return null
	const currentNow = now(state.timezone)
	const offsetMinutes =
		(currentNow.hour - firstHour.hour) * 60 + currentNow.minute
	const totalMinutes = hours.length * 60
	if (offsetMinutes < 0 || offsetMinutes > totalMinutes) return null

	const line = createEl(
		'div',
		{
			data: { testid: 'now-indicator' },
			style: {
				position: 'absolute',
				left: '0',
				right: '0',
				top: `${(offsetMinutes / totalMinutes) * 100}%`,
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
	const labelColor =
		isTodayCol && !col.resource ? 'text-primary' : 'text-muted-foreground'
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

const renderTimeAxis = (
	hours: ZonedDate[],
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const stripChrome = Boolean(options.unstyled && !options.slotProps?.cell)
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
	col: TimeColumnSpec,
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
	col: TimeColumnSpec,
	hours: ZonedDate[],
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const colHours = hours.map((h) =>
		withTime(col.day, { hour: h.hour, minute: 0, second: 0 })
	)
	const positioned = layoutVertical({
		events: col.events.filter(
			(event) => !isAllDayOrMultiDay(event, state.timezone)
		),
		days: colHours,
		gridType: 'hour',
	})

	const eventsLayer = createEl('div', {
		className: mergeClassNames(
			options.unstyled,
			'',
			undefined,
			'pointer-events-none absolute inset-0'
		),
	})
	for (const item of positioned) {
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
	col: TimeColumnSpec,
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

	colEl.appendChild(renderColumnEventsLayer(col, hours, runtime))
	const nowLine = renderNowLine(col.day, hours, runtime)
	if (nowLine) colEl.appendChild(nowLine)
	return colEl
}

export const renderDomTimeGrid = (
	runtime: DomRuntime,
	mode: 'day' | 'week'
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const current =
		parseDate(state.currentDate, state.timezone) ?? now(state.timezone)
	const rawDays =
		mode === 'day' ? [current] : getWeekDays(current, state.firstDayOfWeek)
	const days = withoutHiddenDays(rawDays, state.hiddenDays)
	const effectiveDays = days.length > 0 ? days : [current]
	const columns = buildTimeColumns(
		effectiveDays,
		runtime.getVisibleEvents(),
		runtime
	)

	let resourceBusinessHours: Array<BusinessHours | BusinessHours[]> = []
	if (state.resources.length > 0) {
		resourceBusinessHours = collectResourceBusinessHours(state.resources)
	}
	const hours = getViewHours({
		referenceDate: effectiveDays.at(0) ?? current,
		businessHours: options.businessHours,
		resourceBusinessHours,
		hideNonBusinessHours: options.hideNonBusinessHours,
		slotMinTime: options.slotMinTime,
		slotMaxTime: options.slotMaxTime,
		allDates: effectiveDays,
	})

	const grid = createEl('div', {
		data: { view: mode, testid: `dom-${mode}-view` },
	})
	applySlot(grid, 'grid', 'bg-background', options, 'flex-1 overflow-auto')

	if (state.resources.length > 0 && options.orientation === 'horizontal') {
		return renderResourceHorizontalGrid(
			grid,
			effectiveDays,
			runtime.getVisibleEvents(),
			current.month,
			runtime
		)
	}

	const colMinWidth = state.resources.length > 0 ? '128px' : '110px'
	const colTemplate = `64px repeat(${columns.length}, minmax(${colMinWidth}, 1fr))`
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
	grid.appendChild(stickyHeaderWrap)

	const bodyGrid = createEl('div', {
		className: mergeClassNames(options.unstyled, '', undefined, 'grid'),
		style: { gridTemplateColumns: colTemplate },
	})
	bodyGrid.appendChild(renderTimeAxis(hours, runtime))
	const slotMinutes = options.slotDuration ?? 60
	for (const col of columns) {
		bodyGrid.appendChild(renderTimeColumn(col, hours, slotMinutes, runtime))
	}
	grid.appendChild(bodyGrid)

	const firstHourNum = hours.at(0)?.hour ?? 0
	const targetHour = Math.max(firstHourNum, 8)
	const initialOffsetPx = (targetHour - firstHourNum) * HOUR_ROW_HEIGHT_PX
	if (initialOffsetPx > 0 && typeof requestAnimationFrame === 'function') {
		requestAnimationFrame(() => {
			grid.scrollTop = initialOffsetPx
		})
	}
	return grid
}
