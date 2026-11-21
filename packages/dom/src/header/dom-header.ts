import {
	add,
	type CalendarView,
	formatDate,
	formatDateRange,
	getWeekDays,
	now,
	parseDate,
	startOf,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/core'
import { createSvgIcon } from '../core/dom-icons.utils'
import { applySlot, createEl, mergeClassNames } from '../core/dom-styles.utils'
import { openDomHeaderDatePicker } from '../dialogs/dom-date-picker'
import type { DomCalendarOptions, DomRuntime } from '../dom-calendar.types'

const VIEW_LABELS: Record<string, string> = {
	day: 'Day',
	week: 'Week',
	month: 'Month',
	agenda: 'Agenda',
	year: 'Year',
}

const resolveAvailableViews = (options: DomCalendarOptions): CalendarView[] => {
	if (options.views && options.views.length > 0) {
		return options.views
	}
	const views: CalendarView[] = ['day', 'week', 'month']
	if (options.enableAgendaView !== false) {
		views.push('agenda')
	}
	if (options.enableYearView !== false) {
		views.push('year')
	}
	return views
}

const RANGE_FORMAT: Intl.DateTimeFormatOptions = {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
}

const DAY_FORMAT: Intl.DateTimeFormatOptions = {
	weekday: 'short',
	...RANGE_FORMAT,
}

const formatWeekRangeTitle = (
	current: ZonedDate,
	firstDayOfWeek: number,
	locale: string
): string => {
	const days = getWeekDays(current, firstDayOfWeek)
	const first = days.at(0) ?? current
	const last = days.at(-1) ?? current
	return formatDateRange(first, last, RANGE_FORMAT, locale)
}

const formatAgendaTitle = (
	current: ZonedDate,
	firstDayOfWeek: number,
	locale: string,
	agendaWindow: DomCalendarOptions['agendaWindow']
): string => {
	if (agendaWindow === 'day') {
		return formatDate(current, DAY_FORMAT, locale)
	}
	if (agendaWindow === 'month') {
		return formatDate(current, { month: 'short', year: 'numeric' }, locale)
	}
	if (typeof agendaWindow === 'number') {
		const last = add(current, Math.max(1, agendaWindow) - 1, 'day')
		return formatDateRange(current, last, RANGE_FORMAT, locale)
	}
	return formatWeekRangeTitle(current, firstDayOfWeek, locale)
}

const formatHeaderTitle = (
	currentDateIso: string,
	view: CalendarView,
	firstDayOfWeek: number,
	timezone: string,
	locale: string,
	agendaWindow: DomCalendarOptions['agendaWindow']
): string => {
	const current = parseDate(currentDateIso, timezone) ?? now(timezone)
	if (view === 'year') {
		return formatDate(current, { year: 'numeric' }, locale)
	}
	if (view === 'day') {
		return formatDate(current, DAY_FORMAT, locale)
	}
	if (view === 'week') {
		return formatWeekRangeTitle(current, firstDayOfWeek, locale)
	}
	if (view === 'agenda') {
		return formatAgendaTitle(current, firstDayOfWeek, locale, agendaWindow)
	}
	return formatDate(current, { month: 'short', year: 'numeric' }, locale)
}

export const renderDomHeader = (runtime: DomRuntime): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const views = resolveAvailableViews(options)
	const title = formatHeaderTitle(
		state.currentDate,
		state.view,
		state.firstDayOfWeek,
		state.timezone,
		state.locale,
		options.agendaWindow
	)

	const openNewEventForm = () => {
		const current =
			parseDate(state.currentDate, state.timezone) ?? now(state.timezone)
		const start = add(startOf(current, 'day'), 9, 'hour')
		const end = add(start, 1, 'hour')
		runtime.openCreateDialog({
			start: toOffsetIso(start),
			end: toOffsetIso(end),
			allDay: false,
			resource: state.resources.at(0),
		})
	}

	const headerEl = createEl('header')
	applySlot(
		headerEl,
		'header',
		'p-1 mb-1 bg-background',
		options,
		'shrink-0 flex flex-wrap items-center justify-between gap-2'
	)

	if (options.renderHeader) {
		const cleanup = options.renderHeader(headerEl, {
			state,
			title,
			views,
			nextPeriod: () => runtime.controller.nextPeriod(),
			prevPeriod: () => runtime.controller.prevPeriod(),
			today: () => runtime.controller.today(),
			setView: (view) => runtime.controller.setView(view),
			openNewEventForm,
			exportIcal: () => runtime.downloadIcal(),
		})
		if (cleanup) runtime.registerCleanup(cleanup)
		return headerEl
	}

	const navGroup = createEl('div', {
		className: mergeClassNames(
			options.unstyled,
			'',
			undefined,
			'flex items-center gap-2'
		),
	})
	const hasSlotTheme = Boolean(options.slotProps?.navButton)
	const navButtonDefault =
		'h-9 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors'
	const navButtonStructure =
		'inline-flex h-9 items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap'

	const arrowGroup = createEl('div', {
		className: mergeClassNames(
			options.unstyled && !hasSlotTheme,
			'bg-background rounded-lg border border-border',
			undefined,
			'inline-flex h-9 shrink-0 items-center overflow-hidden'
		),
	})

	const prevBtn = createEl(
		'button',
		{
			attrs: { type: 'button', 'aria-label': 'Previous period' },
			data: { testid: 'prev-period-btn' },
			onClick: () => runtime.controller.prevPeriod(),
		},
		[createSvgIcon('chevron-left', 'size-4')]
	)
	applySlot(
		prevBtn,
		'navButton',
		'h-full w-9 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
		options,
		'inline-flex h-full items-center justify-center cursor-pointer'
	)
	if (hasSlotTheme) {
		prevBtn.style.border = 'none'
		prevBtn.style.borderRadius = '0'
		prevBtn.style.padding = '0 10px'
	}

	const nextBtn = createEl(
		'button',
		{
			attrs: { type: 'button', 'aria-label': 'Next period' },
			data: { testid: 'next-period-btn' },
			onClick: () => runtime.controller.nextPeriod(),
		},
		[createSvgIcon('chevron-right', 'size-4')]
	)
	applySlot(
		nextBtn,
		'navButton',
		'h-full w-9 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
		options,
		'inline-flex h-full items-center justify-center cursor-pointer'
	)
	if (hasSlotTheme) {
		nextBtn.style.border = 'none'
		nextBtn.style.borderRadius = '0'
		nextBtn.style.padding = '0 10px'
	}

	arrowGroup.append(prevBtn, nextBtn)

	const todayBtn = createEl('button', {
		text: 'Today',
		attrs: { type: 'button' },
		data: { testid: 'today-btn' },
		onClick: () => runtime.controller.today(),
	})
	applySlot(
		todayBtn,
		'navButton',
		navButtonDefault,
		options,
		navButtonStructure
	)

	let closeTitlePicker: (() => void) | undefined
	runtime.registerCleanup(() => {
		closeTitlePicker?.()
		closeTitlePicker = undefined
	})

	const titleBtn = createEl(
		'button',
		{
			attrs: {
				type: 'button',
				'aria-haspopup': 'dialog',
				'aria-expanded': 'false',
			},
			data: { testid: 'calendar-title' },
			onClick: () => {
				if (closeTitlePicker) {
					closeTitlePicker()
					closeTitlePicker = undefined
					return
				}
				titleBtn.setAttribute('aria-expanded', 'true')
				closeTitlePicker = openDomHeaderDatePicker(runtime, titleBtn, () => {
					titleBtn.setAttribute('aria-expanded', 'false')
					closeTitlePicker = undefined
				})
			},
		},
		[title, createSvgIcon('chevron-down', 'size-4 shrink-0 opacity-50')]
	)
	applySlot(
		titleBtn,
		'navButton',
		'h-9 rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors',
		options,
		'inline-flex h-9 items-center gap-1.5 font-semibold tracking-tight whitespace-nowrap cursor-pointer'
	)

	navGroup.append(arrowGroup, todayBtn, titleBtn)

	const toolbar = createEl('div')
	applySlot(
		toolbar,
		'toolbar',
		'',
		options,
		'flex flex-wrap items-center gap-2'
	)

	const viewGroup = createEl('div', {
		className: mergeClassNames(
			options.unstyled && !options.slotProps?.viewButton,
			'rounded-lg bg-muted p-0.75',
			undefined,
			'inline-flex h-9 items-center gap-0.5'
		),
		attrs: { role: 'group', 'aria-label': 'Calendar view' },
	})

	for (const view of views) {
		const isActive = state.view === view
		const viewBtn = createEl('button', {
			text: VIEW_LABELS[view] ?? view,
			attrs: {
				type: 'button',
				'aria-pressed': String(isActive),
			},
			data: { testid: `view-btn-${view}`, view },
			onClick: () => runtime.controller.setView(view),
		})
		let viewSlot: 'viewButtonActive' | 'viewButton' = 'viewButton'
		let viewClass =
			'h-full rounded-md px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
		if (isActive) {
			viewSlot = 'viewButtonActive'
			viewClass =
				'h-full rounded-md bg-background px-3 text-sm font-medium text-foreground shadow-xs'
		}
		applySlot(
			viewBtn,
			viewSlot,
			viewClass,
			options,
			'inline-flex h-full items-center cursor-pointer whitespace-nowrap'
		)
		viewGroup.appendChild(viewBtn)
	}
	toolbar.appendChild(viewGroup)

	if (options.enableIcalExport) {
		const exportBtn = createEl(
			'button',
			{
				attrs: { type: 'button' },
				data: { testid: 'export-ical-btn' },
				onClick: () => runtime.downloadIcal(),
			},
			[createSvgIcon('download', 'size-4 shrink-0'), 'Export']
		)
		applySlot(
			exportBtn,
			'navButton',
			navButtonDefault,
			options,
			navButtonStructure
		)
		toolbar.appendChild(exportBtn)
	}

	if (!options.disableCellClick) {
		const newBtn = createEl(
			'button',
			{
				attrs: { type: 'button', 'aria-label': 'New' },
				data: { testid: 'new-event-btn' },
				onClick: openNewEventForm,
			},
			[createSvgIcon('plus', 'size-4 shrink-0'), 'New']
		)
		applySlot(
			newBtn,
			'viewButtonActive',
			'h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90',
			options,
			'inline-flex h-9 items-center gap-1.5 cursor-pointer whitespace-nowrap'
		)
		toolbar.appendChild(newBtn)
	}

	headerEl.append(navGroup, toolbar)
	return headerEl
}
