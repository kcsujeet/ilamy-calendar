import {
	type AgendaDayGroup,
	type AgendaEventEntry,
	buildAgendaViewModel,
	formatDate,
} from '@ilamy/core'
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

const createEventColorDot = (event: DomCalendarEvent): HTMLElement => {
	const dot = createEl('span', {
		className: 'size-3 shrink-0 rounded-full border border-border',
	})
	const bg = event.backgroundColor
	const color = event.color
	const isBgToken = Boolean(bg && /^bg-/.test(bg.trim()))
	const colorHasBg = Boolean(color && /(?:^|\s)bg-/.test(color))

	if (isBgToken && bg) {
		dot.classList.add(...bg.trim().split(/\s+/))
	} else if (bg) {
		dot.style.backgroundColor = bg
	} else if (colorHasBg && color) {
		const bgTokens = color
			.trim()
			.split(/\s+/)
			.filter((t) => t.startsWith('bg-'))
		dot.classList.add(...bgTokens)
	} else {
		dot.classList.add('bg-blue-500')
	}
	return dot
}

const formatAgendaEntryTime = (
	entry: AgendaEventEntry,
	timeFormat: DomCalendarOptions['timeFormat'],
	locale: string
): string => {
	if (entry.isAllDayLabel) return 'All Day'
	const edgeTime = entry.isMultiDay && entry.isLastDay ? entry.end : entry.start
	return formatDate(
		edgeTime,
		{
			hour: 'numeric',
			minute: '2-digit',
			hour12: (timeFormat ?? '12-hour') === '12-hour',
		},
		locale
	)
}

const renderAgendaRow = (
	entry: AgendaEventEntry,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const event = entry.event as DomCalendarEvent
	const timeLabel = formatAgendaEntryTime(
		entry,
		options.timeFormat,
		state.locale
	)

	let multiDayBadge: HTMLElement | null = null
	if (entry.isMultiDay) {
		multiDayBadge = createEl('span', {
			text: `(Day ${entry.dayIndex}/${entry.totalDays})`,
			className: 'text-muted-foreground shrink-0 text-xs',
		})
	}

	return createEl(
		'button',
		{
			attrs: { type: 'button' },
			data: { eventId: String(event.id), testid: `agenda-event-${event.id}` },
			className:
				'hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors',
			onClick: () => {
				if (options.disableEventClick) return
				options.onEventClick?.(event)
				runtime.openEditDialog(event)
			},
		},
		[
			createEl('span', {
				text: timeLabel,
				className: 'text-muted-foreground w-20 shrink-0 tabular-nums',
			}),
			createEventColorDot(event),
			createEl('span', {
				text: event.title,
				className: 'truncate text-foreground',
			}),
			multiDayBadge,
		]
	)
}

const renderAgendaNowLine = (
	nowIndicatorPercent: number | null,
	options: DomCalendarOptions
): HTMLElement | null => {
	if (nowIndicatorPercent === null) return null

	const line = createEl(
		'div',
		{
			style: {
				position: 'absolute',
				left: '0',
				right: '0',
				top: `${nowIndicatorPercent}%`,
				zIndex: '10',
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

const renderAgendaDayGroup = (
	group: AgendaDayGroup,
	locale: string,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	let dayBadgeClass =
		'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium text-foreground'
	let weekdayClass = 'w-full truncate text-center text-xs text-muted-foreground'
	if (group.isToday) {
		dayBadgeClass =
			'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground'
		weekdayClass = 'w-full truncate text-center text-xs text-primary'
	}

	const dayCol = createEl(
		'div',
		{
			className:
				'text-muted-foreground flex w-16 shrink-0 flex-col items-center text-center',
		},
		[
			createEl('div', {
				text: String(group.date.day),
				data: group.isToday ? { ilamyTodayBadge: '' } : undefined,
				className: dayBadgeClass,
			}),
			createEl('div', {
				text: formatDate(group.date, { weekday: 'short' }, locale),
				className: weekdayClass,
			}),
		]
	)
	const eventsCol = createEl('div', {
		className: 'relative flex flex-1 flex-col gap-1',
	})
	const nowLine = renderAgendaNowLine(group.nowIndicatorPercent, options)
	if (nowLine) eventsCol.appendChild(nowLine)
	for (const entry of group.entries) {
		eventsCol.appendChild(renderAgendaRow(entry, runtime))
	}
	return createEl(
		'div',
		{
			className: 'flex gap-4 border-b border-border px-2 py-3',
			data: { testid: `agenda-day-${group.key}` },
		},
		[dayCol, eventsCol]
	)
}

export const renderDomAgendaView = (runtime: DomRuntime): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const current = resolveCurrentZonedDate(state.currentDate, state.timezone)
	const model = buildAgendaViewModel({
		currentDate: current,
		events: runtime.getVisibleEvents(),
		window: options.agendaWindow ?? 'week',
		firstDayOfWeek: state.firstDayOfWeek,
		timezone: state.timezone,
		nowIndicator: options.nowIndicator,
	})

	const container = createGridScrollContainer('agenda', options)

	if (model.groups.length === 0) {
		container.appendChild(
			createEl('div', {
				text: 'No events scheduled in this period.',
				className: mergeClassNames(
					options.unstyled,
					'',
					undefined,
					'flex h-full items-center justify-center p-4 text-sm text-muted-foreground'
				),
			})
		)
		return container
	}

	const list = createEl('div', { className: 'flex flex-col' })
	for (const group of model.groups) {
		list.appendChild(renderAgendaDayGroup(group, state.locale, runtime))
	}
	container.appendChild(list)
	return container
}
