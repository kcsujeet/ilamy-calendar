import {
	add,
	dayKey,
	endOf,
	formatDate,
	fromFields,
	getWeekDays,
	isSameDay,
	isSameOrBefore,
	isToday,
	now,
	overlapsRange,
	parseDate,
	startOf,
	subtract,
	toEpochMs,
	toOffsetIso,
	wallClockDiff,
	type ZonedDate,
} from '@ilamy/core'
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

const YEAR_DOT_COLORS = ['bg-primary', 'bg-blue-500', 'bg-green-500']
const DAYS_IN_MINI_CALENDAR = 42

interface ParsedEventRange {
	event: DomCalendarEvent
	start: ZonedDate
	end: ZonedDate
	startMs: number
}

const parseEventRanges = (
	events: DomCalendarEvent[],
	timezone: string
): ParsedEventRange[] => {
	const result: ParsedEventRange[] = []
	for (const event of events) {
		const start = parseDate(event.start, timezone)
		const end = parseDate(event.end, timezone)
		if (start && end) {
			result.push({ event, start, end, startMs: toEpochMs(start) })
		}
	}
	return result
}

const resolveYearDayClass = (
	isTodayDay: boolean,
	isSelected: boolean,
	isCurrentMonth: boolean,
	hasEvents: boolean
): string => {
	const shape = isTodayDay || isSelected ? 'rounded-full' : 'rounded-sm'
	const parts = [
		`relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center ${shape} transition-colors duration-200 hover:bg-accent`,
	]
	if (!isCurrentMonth) parts.push('text-muted-foreground opacity-50')
	if (isTodayDay) {
		parts.push('bg-primary text-primary-foreground')
	} else if (isSelected) {
		parts.push('bg-muted font-bold')
	} else if (hasEvents) {
		parts.push('font-medium')
	}
	return parts.join(' ')
}

const renderYearDayButton = (
	day: ZonedDate,
	month: number,
	selectedKey: string,
	eventCount: number,
	runtime: DomRuntime
): HTMLElement => {
	const isCurrentMonth = day.month === month
	const isTodayDay = isToday(day)
	const isSelected = dayKey(day) === selectedKey

	const btn = createEl('button', {
		attrs: {
			type: 'button',
			title:
				eventCount > 0
					? `${eventCount} ${eventCount === 1 ? 'event' : 'events'}`
					: '',
		},
		data: { date: dayKey(day) },
		className: resolveYearDayClass(
			isTodayDay,
			isSelected,
			isCurrentMonth,
			eventCount > 0
		),
		onClick: () => runtime.controller.setView('day', toOffsetIso(day)),
	})
	btn.appendChild(
		createEl('span', {
			text: String(day.day),
			className: 'text-center leading-none',
		})
	)

	if (eventCount > 0) {
		const dots = createEl('div', {
			className: `absolute ${isTodayDay ? 'bottom-px' : 'bottom-0'} flex w-full justify-center space-x-px`,
		})
		const visibleDots = YEAR_DOT_COLORS.slice(0, Math.min(eventCount, 3))
		for (const colorClass of visibleDots) {
			dots.appendChild(
				createEl('span', {
					className: `h-[3px] w-[3px] rounded-full ${isTodayDay ? 'bg-primary-foreground' : colorClass}`,
				})
			)
		}
		btn.appendChild(dots)
	}
	return btn
}

const renderYearMonthCard = (
	year: number,
	month: number,
	selectedKey: string,
	parsedEvents: ParsedEventRange[],
	weekdayLabels: string[],
	runtime: DomRuntime
): HTMLElement => {
	const state = runtime.controller.getState()
	const monthStart = fromFields({ year, month, day: 1 }, state.timezone)
	const monthEnd = endOf(monthStart, 'month')
	const gridStart = getWeekDays(monthStart, state.firstDayOfWeek).at(0)
	const firstCellDay = gridStart ?? monthStart
	const days = Array.from({ length: DAYS_IN_MINI_CALENDAR }, (_, idx) =>
		startOf(add(firstCellDay, idx, 'day'), 'day')
	)
	const monthEventCount = parsedEvents.filter((entry) =>
		overlapsRange(entry, monthStart, monthEnd)
	).length

	const card = createEl('div', {
		className:
			'hover:border-primary flex flex-col rounded-lg border border-border bg-card p-3 text-left transition-all duration-200 hover:shadow-md',
	})
	const header = createEl('div', {
		className: 'mb-2 flex items-center justify-between',
	})
	header.appendChild(
		createEl('button', {
			text: formatDate(monthStart, { month: 'long' }, state.locale),
			attrs: { type: 'button' },
			className:
				'text-lg font-medium text-foreground hover:underline cursor-pointer',
			onClick: () =>
				runtime.controller.setView('month', toOffsetIso(monthStart)),
		})
	)
	if (monthEventCount > 0) {
		header.appendChild(
			createEl('span', {
				text: `${monthEventCount} ${monthEventCount === 1 ? 'Event' : 'Events'}`,
				className:
					'bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs',
			})
		)
	}
	card.appendChild(header)

	const dayGrid = createEl('div', {
		className: 'grid grid-cols-7 gap-px text-[0.6rem]',
	})
	for (const label of weekdayLabels) {
		dayGrid.appendChild(
			createEl('div', {
				text: label,
				className: 'text-muted-foreground h-3 text-center',
			})
		)
	}
	for (const day of days) {
		const dayEnd = endOf(day, 'day')
		const dayCount = parsedEvents.filter((entry) =>
			overlapsRange(entry, day, dayEnd)
		).length
		dayGrid.appendChild(
			renderYearDayButton(day, month, selectedKey, dayCount, runtime)
		)
	}
	card.appendChild(dayGrid)
	return card
}

export const renderDomYearView = (runtime: DomRuntime): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const current = resolveCurrentZonedDate(state.currentDate, state.timezone)
	const selectedKey = dayKey(current)
	const parsedEvents = parseEventRanges(
		runtime.getVisibleEvents(),
		state.timezone
	)
	const weekdayLabels = getWeekDays(
		now(state.timezone),
		state.firstDayOfWeek
	).map((d) => formatDate(d, { weekday: 'short' }, state.locale).slice(0, 2))

	const scroller = createEl('div', {
		data: { view: 'year', testid: 'dom-year-view' },
	})
	applySlot(scroller, 'grid', 'bg-background', options, 'flex-1 overflow-auto')

	const innerGrid = createEl('div', {
		className:
			'grid auto-rows-fr grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3',
	})
	for (let month = 1; month <= 12; month += 1) {
		innerGrid.appendChild(
			renderYearMonthCard(
				current.year,
				month,
				selectedKey,
				parsedEvents,
				weekdayLabels,
				runtime
			)
		)
	}
	scroller.appendChild(innerGrid)
	return scroller
}

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
	entry: ParsedEventRange,
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
	const timeLabel = isAllDayLabel
		? 'All Day'
		: formatDate(
				edgeTime,
				{
					hour: 'numeric',
					minute: '2-digit',
					hour12: (options.timeFormat ?? '12-hour') === '12-hour',
				},
				state.locale
			)

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
			isMultiDay
				? createEl('span', {
						text: `(Day ${dayIndex}/${totalDays})`,
						className: 'text-muted-foreground shrink-0 text-xs',
					})
				: null,
		]
	)
}

const renderAgendaNowLine = (
	day: ZonedDate,
	runtime: DomRuntime
): HTMLElement | null => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	if (!options.nowIndicator || !isSameDay(day, now(state.timezone))) return null
	const currentNow = now(state.timezone)
	const progress =
		((currentNow.hour * 60 + currentNow.minute) / (24 * 60)) * 100
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
	a: ParsedEventRange,
	b: ParsedEventRange
): number => {
	const aRank = a.event.allDay ? 0 : 1
	const bRank = b.event.allDay ? 0 : 1
	if (aRank !== bRank) return aRank - bRank
	return a.startMs - b.startMs
}

const renderAgendaDayGroup = (
	dayStart: ZonedDate,
	dayEntries: ParsedEventRange[],
	locale: string,
	runtime: DomRuntime
): HTMLElement => {
	const isTodayDay = isToday(dayStart)
	const dayBadgeClass = isTodayDay
		? 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground'
		: 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium text-foreground'
	const weekdayClass = isTodayDay
		? 'w-full truncate text-center text-xs text-primary'
		: 'w-full truncate text-center text-xs text-muted-foreground'

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
	const parsed = parseEventRanges(runtime.getVisibleEvents(), state.timezone)

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
