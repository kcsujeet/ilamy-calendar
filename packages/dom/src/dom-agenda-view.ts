import {
	add,
	dayKey,
	endOf,
	formatDate,
	getWeekDays,
	isSameDay,
	isSameOrBefore,
	isToday,
	now,
	overlapsRange,
	startOf,
	subtract,
	wallClockDiff,
	type ZonedDate,
} from '@ilamy/core'
import { type ParsedDomEventRange, parseDomEventRanges } from './dom-events'
import {
	applySlot,
	createEl,
	mergeClassNames,
	resolveCurrentZonedDate,
} from './dom-styles'
import type {
	DomCalendarEvent,
	DomCalendarOptions,
	DomRuntime,
} from './dom-types'

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

const resolveAgendaWindowRange = (
	current: ZonedDate,
	firstDayOfWeek: number,
	agendaWindow: DomCalendarOptions['agendaWindow']
): { start: ZonedDate; end: ZonedDate } => {
	if (agendaWindow === 'day') {
		return { start: startOf(current, 'day'), end: endOf(current, 'day') }
	}
	if (agendaWindow === 'month') {
		return { start: startOf(current, 'month'), end: endOf(current, 'month') }
	}
	if (typeof agendaWindow === 'number') {
		const days = Math.max(1, agendaWindow)
		return {
			start: startOf(current, 'day'),
			end: endOf(add(current, days - 1, 'day'), 'day'),
		}
	}
	const weekDays = getWeekDays(current, firstDayOfWeek)
	const first = weekDays.at(0) ?? current
	const last = weekDays.at(-1) ?? current
	return { start: startOf(first, 'day'), end: endOf(last, 'day') }
}

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

const renderAgendaRow = (
	entry: ParsedDomEventRange,
	day: ZonedDate,
	runtime: DomRuntime
): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const { event, start, end } = entry

	const eventStartDay = startOf(start, 'day')
	const lastCoveredDay = startOf(subtract(end, 1, 'millisecond'), 'day')
	const totalDays = Math.max(
		Math.round(wallClockDiff(lastCoveredDay, eventStartDay, 'day')) + 1,
		1
	)
	const dayIndex =
		Math.round(wallClockDiff(startOf(day, 'day'), eventStartDay, 'day')) + 1
	const isMultiDay = totalDays > 1
	const isAllDayLabel =
		Boolean(event.allDay) ||
		(isMultiDay && dayIndex > 1 && dayIndex < totalDays)
	const edgeTime = isMultiDay && dayIndex === totalDays ? end : start
	let timeLabel = 'All Day'
	if (!isAllDayLabel) {
		timeLabel = formatDate(
			edgeTime,
			{
				hour: 'numeric',
				minute: '2-digit',
				hour12: (options.timeFormat ?? '12-hour') === '12-hour',
			},
			state.locale
		)
	}
	let multiDayBadge: HTMLElement | null = null
	if (isMultiDay) {
		multiDayBadge = createEl('span', {
			text: `(Day ${dayIndex}/${totalDays})`,
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
	day: ZonedDate,
	runtime: DomRuntime
): HTMLElement | null => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const currentNow = now(state.timezone)
	if (!options.nowIndicator || !isSameDay(day, currentNow)) return null

	const elapsedMinutes = currentNow.hour * MINUTES_PER_HOUR + currentNow.minute
	const progress = (elapsedMinutes / MINUTES_PER_DAY) * 100
	const line = createEl(
		'div',
		{
			style: {
				position: 'absolute',
				left: '0',
				right: '0',
				top: `${progress}%`,
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

const sortAgendaEntries = (
	a: ParsedDomEventRange,
	b: ParsedDomEventRange
): number => {
	const aRank = a.event.allDay ? 0 : 1
	const bRank = b.event.allDay ? 0 : 1
	if (aRank !== bRank) return aRank - bRank
	return a.startMs - b.startMs
}

const renderAgendaDayGroup = (
	dayStart: ZonedDate,
	dayEntries: ParsedDomEventRange[],
	locale: string,
	runtime: DomRuntime
): HTMLElement => {
	const isTodayDay = isToday(dayStart)
	let dayBadgeClass =
		'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium text-foreground'
	let weekdayClass = 'w-full truncate text-center text-xs text-muted-foreground'
	if (isTodayDay) {
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
			createEl('div', { text: String(dayStart.day), className: dayBadgeClass }),
			createEl('div', {
				text: formatDate(dayStart, { weekday: 'short' }, locale),
				className: weekdayClass,
			}),
		]
	)
	const eventsCol = createEl('div', {
		className: 'relative flex flex-1 flex-col gap-1',
	})
	const nowLine = renderAgendaNowLine(dayStart, runtime)
	if (nowLine) eventsCol.appendChild(nowLine)
	for (const entry of dayEntries) {
		eventsCol.appendChild(renderAgendaRow(entry, dayStart, runtime))
	}
	return createEl(
		'div',
		{
			className: 'flex gap-4 border-b border-border px-2 py-3',
			data: { testid: `agenda-day-${dayKey(dayStart)}` },
		},
		[dayCol, eventsCol]
	)
}

export const renderDomAgendaView = (runtime: DomRuntime): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const current = resolveCurrentZonedDate(state.currentDate, state.timezone)
	const range = resolveAgendaWindowRange(
		current,
		state.firstDayOfWeek,
		options.agendaWindow
	)
	const parsed = parseDomEventRanges(runtime.getVisibleEvents(), state.timezone)

	const container = createEl('div', {
		data: { view: 'agenda', testid: 'dom-agenda-view' },
	})
	applySlot(container, 'grid', 'bg-background', options, 'flex-1 overflow-auto')

	const list = createEl('div', { className: 'flex flex-col' })
	let cursor = startOf(range.start, 'day')
	const lastDay = startOf(range.end, 'day')

	while (isSameOrBefore(cursor, lastDay, 'day')) {
		const dayStart = startOf(cursor, 'day')
		const dayEnd = endOf(cursor, 'day')
		const dayEntries = parsed
			.filter((entry) => overlapsRange(entry, dayStart, dayEnd))
			.sort(sortAgendaEntries)

		if (dayEntries.length > 0) {
			list.appendChild(
				renderAgendaDayGroup(dayStart, dayEntries, state.locale, runtime)
			)
		}
		cursor = startOf(add(cursor, 1, 'day'), 'day')
	}

	if (list.childElementCount === 0) {
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

	container.appendChild(list)
	return container
}
