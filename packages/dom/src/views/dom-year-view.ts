import {
	buildYearViewModel,
	formatDate,
	toOffsetIso,
	type YearDayViewModel,
	type YearMonthViewModel,
	type YearWeekdayHeader,
} from '@ilamy/core'
import {
	createEl,
	createGridScrollContainer,
	resolveCurrentZonedDate,
} from '../core/dom-styles.utils'
import type { DomRuntime } from '../dom-calendar.types'

const YEAR_DOT_COLORS = ['bg-primary', 'bg-blue-500', 'bg-green-500']
const MAX_YEAR_DOTS = 3

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

const renderYearDayDots = (
	eventCount: number,
	isTodayDay: boolean
): HTMLElement => {
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
	return dots
}

const renderYearDayButton = (
	dayModel: YearDayViewModel,
	locale: string,
	runtime: DomRuntime
): HTMLElement => {
	const countTitle = formatEventCountTitle(dayModel.eventCount)
	const accessibleDate = formatDate(
		dayModel.date,
		{ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
		locale
	)
	const ariaLabel = countTitle
		? `${accessibleDate}, ${countTitle}`
		: accessibleDate

	const btn = createEl('button', {
		attrs: {
			type: 'button',
			'aria-current': dayModel.isToday ? 'date' : undefined,
			'aria-label': ariaLabel,
			title: countTitle,
		},
		data: { date: dayModel.dayKey },
		className: resolveYearDayClass(
			dayModel.isToday,
			dayModel.isSelected,
			dayModel.isInCurrentMonth,
			dayModel.eventCount > 0
		),
		onClick: () =>
			runtime.controller.setView('day', toOffsetIso(dayModel.date)),
	})
	btn.appendChild(
		createEl('span', {
			text: String(dayModel.date.day),
			className: 'text-center leading-none',
		})
	)

	if (dayModel.eventCount > 0) {
		btn.appendChild(renderYearDayDots(dayModel.eventCount, dayModel.isToday))
	}
	return btn
}

const renderYearMonthCard = (
	monthModel: YearMonthViewModel,
	weekdayHeaders: YearWeekdayHeader[],
	locale: string,
	runtime: DomRuntime
): HTMLElement => {
	const card = createEl('div', {
		className:
			'hover:border-primary flex flex-col rounded-lg border border-border bg-card p-3 text-left transition-all duration-200 hover:shadow-md',
	})
	const header = createEl('div', {
		className: 'mb-2 flex items-center justify-between',
	})
	header.appendChild(
		createEl('button', {
			text: monthModel.name,
			attrs: { type: 'button' },
			className:
				'text-lg font-medium text-foreground hover:underline cursor-pointer',
			onClick: () =>
				runtime.controller.setView('month', toOffsetIso(monthModel.date)),
		})
	)
	if (monthModel.eventCount > 0) {
		const badgeNoun = monthModel.eventCount === 1 ? 'Event' : 'Events'
		header.appendChild(
			createEl('span', {
				text: `${monthModel.eventCount} ${badgeNoun}`,
				className:
					'bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs',
			})
		)
	}
	card.appendChild(header)

	const dayGrid = createEl('div', {
		className: 'grid grid-cols-7 gap-px text-[0.6rem]',
	})
	for (const headerItem of weekdayHeaders) {
		dayGrid.appendChild(
			createEl('div', {
				text: headerItem.label,
				className: 'text-muted-foreground h-3 text-center',
			})
		)
	}
	for (const dayModel of monthModel.days) {
		dayGrid.appendChild(renderYearDayButton(dayModel, locale, runtime))
	}
	card.appendChild(dayGrid)
	return card
}

export const renderDomYearView = (runtime: DomRuntime): HTMLElement => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const current = resolveCurrentZonedDate(state.currentDate, state.timezone)
	const model = buildYearViewModel({
		currentDate: current,
		events: runtime.getVisibleEvents(),
		firstDayOfWeek: state.firstDayOfWeek,
		timezone: state.timezone,
		locale: state.locale,
	})

	const scroller = createGridScrollContainer('year', options)

	const innerGrid = createEl('div', {
		className:
			'grid auto-rows-fr grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3',
	})
	for (const monthModel of model.months) {
		innerGrid.appendChild(
			renderYearMonthCard(
				monthModel,
				model.weekdayHeaders,
				state.locale,
				runtime
			)
		)
	}
	scroller.appendChild(innerGrid)
	return scroller
}
