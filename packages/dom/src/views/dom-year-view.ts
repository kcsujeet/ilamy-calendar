import {
	add,
	dayKey,
	endOf,
	formatDate,
	fromFields,
	getWeekDays,
	isToday,
	now,
	overlapsRange,
	startOf,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/core'
import {
	type ParsedDomEventRange,
	parseDomEventRanges,
} from '../core/dom-events.utils'
import {
	applySlot,
	createEl,
	resolveCurrentZonedDate,
} from '../core/dom-styles.utils'
import type { DomRuntime } from '../dom-calendar.types'

const YEAR_DOT_COLORS = ['bg-primary', 'bg-blue-500', 'bg-green-500']
const DAYS_IN_MINI_CALENDAR = 42
const MAX_YEAR_DOTS = 3
const MONTHS_IN_YEAR = 12

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
	if (!isCurrentMonth) parts.push('text-muted-foreground')
	if (isTodayDay) {
		parts.push('bg-primary text-primary-foreground')
	} else if (isSelected) {
		parts.push('bg-muted font-bold')
	} else if (hasEvents) {
		parts.push('font-medium')
	}
	return parts.join(' ')
}

const formatEventCountTitle = (eventCount: number): string => {
	if (eventCount <= 0) return ''
	const noun = eventCount === 1 ? 'event' : 'events'
	return `${eventCount} ${noun}`
}

const renderYearDayButton = (
	day: ZonedDate,
	month: number,
	selectedKey: string,
	eventCount: number,
	locale: string,
	runtime: DomRuntime
): HTMLElement => {
	const isCurrentMonth = day.month === month
	const isTodayDay = isToday(day)
	const isSelected = dayKey(day) === selectedKey
	const countTitle = formatEventCountTitle(eventCount)
	const accessibleDate = formatDate(
		day,
		{ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
		locale
	)
	let ariaLabel = accessibleDate
	if (countTitle) {
		ariaLabel = `${accessibleDate}, ${countTitle}`
	}

	const btn = createEl('button', {
		attrs: {
			type: 'button',
			'aria-current': isTodayDay ? 'date' : undefined,
			'aria-label': ariaLabel,
			title: countTitle,
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
		const bottomClass = isTodayDay ? 'bottom-px' : 'bottom-0'
		const dots = createEl('div', {
			className: `absolute ${bottomClass} flex w-full justify-center space-x-px`,
		})
		const visibleDots = YEAR_DOT_COLORS.slice(
			0,
			Math.min(eventCount, MAX_YEAR_DOTS)
		)
		for (const colorClass of visibleDots) {
			const dotColor = isTodayDay ? 'bg-primary-foreground' : colorClass
			dots.appendChild(
				createEl('span', {
					className: `h-[3px] w-[3px] rounded-full ${dotColor}`,
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
	parsedEvents: ParsedDomEventRange[],
	weekdayLabels: string[],
	runtime: DomRuntime
): HTMLElement => {
	const state = runtime.controller.getState()
	const monthStart = fromFields({ year, month, day: 1 }, state.timezone)
	const monthEnd = endOf(monthStart, 'month')
	const firstCellDay =
		getWeekDays(monthStart, state.firstDayOfWeek).at(0) ?? monthStart
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
		const badgeNoun = monthEventCount === 1 ? 'Event' : 'Events'
		header.appendChild(
			createEl('span', {
				text: `${monthEventCount} ${badgeNoun}`,
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
			renderYearDayButton(
				day,
				month,
				selectedKey,
				dayCount,
				state.locale,
				runtime
			)
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
	const parsedEvents = parseDomEventRanges(
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
	for (let month = 1; month <= MONTHS_IN_YEAR; month += 1) {
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
