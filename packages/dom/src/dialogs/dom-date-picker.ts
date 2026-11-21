import {
	add,
	dayKey,
	formatDate,
	fromFields,
	getMonthWeeks,
	getWeekDays,
	now,
	parseDate,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/core'
import { createSvgIcon } from '../core/dom-icons.utils'
import { mountFloatingPopover } from '../core/dom-popover.utils'
import { createEl } from '../core/dom-styles.utils'
import type { DomRuntime } from '../dom-calendar.types'

const YEAR_BLOCK_SIZE = 12
// Clamping to 28 avoids month-end overflow (e.g. Feb 29 -> Mar 1) when switching years.
const MAX_SAFE_COMMON_MONTH_DAY = 28

const createPickerNav = (
	label: string,
	prevLabel: string,
	nextLabel: string,
	onPrev: () => void,
	onNext: () => void
): HTMLElement => {
	const navBtnClass =
		'inline-flex size-7 items-center justify-center rounded-md text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer'
	return createEl(
		'div',
		{ className: 'mb-2 flex items-center justify-between' },
		[
			createEl(
				'button',
				{
					attrs: { type: 'button', 'aria-label': prevLabel },
					className: navBtnClass,
					onClick: onPrev,
				},
				[createSvgIcon('chevron-left', 'size-4')]
			),
			createEl('span', {
				text: label,
				className: 'text-sm font-medium text-foreground',
			}),
			createEl(
				'button',
				{
					attrs: { type: 'button', 'aria-label': nextLabel },
					className: navBtnClass,
					onClick: onNext,
				},
				[createSvgIcon('chevron-right', 'size-4')]
			),
		]
	)
}

const resolvePickerCellClass = (
	isSelected: boolean,
	isCurrent: boolean
): string => {
	if (isSelected) {
		return 'bg-primary text-primary-foreground hover:bg-primary/90'
	}
	if (isCurrent) {
		return 'bg-accent text-accent-foreground'
	}
	return 'text-foreground hover:bg-accent hover:text-accent-foreground'
}

const createPickerCellButton = (
	label: string,
	isSelected: boolean,
	isCurrent: boolean,
	onClick: () => void
): HTMLButtonElement => {
	const stateClass = resolvePickerCellClass(isSelected, isCurrent)
	return createEl('button', {
		text: label,
		attrs: {
			type: 'button',
			'aria-current': isSelected ? 'date' : undefined,
		},
		className: `h-9 rounded-md text-sm font-medium transition-colors cursor-pointer ${stateClass}`,
		onClick,
	})
}

const renderMonthGridContent = (
	selected: ZonedDate,
	locale: string,
	onSelect: (date: ZonedDate) => void
): HTMLElement => {
	const wrapper = createEl('div', {
		className: 'w-72 p-3',
		data: { slot: 'month-grid' },
	})
	let displayYear = selected.year
	const currentNow = now(selected.timeZoneId)

	const redraw = () => {
		wrapper.replaceChildren()
		wrapper.appendChild(
			createPickerNav(
				String(displayYear),
				'Previous year',
				'Next year',
				() => {
					displayYear -= 1
					redraw()
				},
				() => {
					displayYear += 1
					redraw()
				}
			)
		)
		const grid = createEl('div', { className: 'grid grid-cols-3 gap-1' })
		for (let monthNum = 1; monthNum <= 12; monthNum += 1) {
			const first = fromFields(
				{ year: displayYear, month: monthNum, day: 1 },
				selected.timeZoneId
			)
			const label = formatDate(first, { month: 'short' }, locale)
			const isSelected =
				displayYear === selected.year && monthNum === selected.month
			const isCurrent =
				displayYear === currentNow.year &&
				monthNum === currentNow.month &&
				!isSelected
			grid.appendChild(
				createPickerCellButton(label, isSelected, isCurrent, () => {
					onSelect(
						fromFields(
							{
								year: displayYear,
								month: monthNum,
								day: 1,
								hour: selected.hour,
								minute: selected.minute,
								second: selected.second,
								millisecond: selected.millisecond,
							},
							selected.timeZoneId
						)
					)
				})
			)
		}
		wrapper.appendChild(grid)
	}

	redraw()
	return wrapper
}

const renderYearGridContent = (
	selected: ZonedDate,
	onSelect: (date: ZonedDate) => void
): HTMLElement => {
	const wrapper = createEl('div', {
		className: 'w-72 p-3',
		data: { slot: 'year-grid' },
	})
	let blockStart = selected.year - (selected.year % YEAR_BLOCK_SIZE)
	const currentNow = now(selected.timeZoneId)

	const redraw = () => {
		wrapper.replaceChildren()
		wrapper.appendChild(
			createPickerNav(
				`${blockStart} – ${blockStart + YEAR_BLOCK_SIZE - 1}`,
				'Previous years',
				'Next years',
				() => {
					blockStart -= YEAR_BLOCK_SIZE
					redraw()
				},
				() => {
					blockStart += YEAR_BLOCK_SIZE
					redraw()
				}
			)
		)
		const grid = createEl('div', { className: 'grid grid-cols-3 gap-1' })
		for (let i = 0; i < YEAR_BLOCK_SIZE; i += 1) {
			const year = blockStart + i
			const isSelected = year === selected.year
			const isCurrent = year === currentNow.year && !isSelected
			grid.appendChild(
				createPickerCellButton(String(year), isSelected, isCurrent, () => {
					onSelect(
						fromFields(
							{
								year,
								month: selected.month,
								day: Math.min(selected.day, MAX_SAFE_COMMON_MONTH_DAY),
								hour: selected.hour,
								minute: selected.minute,
								second: selected.second,
								millisecond: selected.millisecond,
							},
							selected.timeZoneId
						)
					)
				})
			)
		}
		wrapper.appendChild(grid)
	}

	redraw()
	return wrapper
}

const resolveDayButtonClass = (
	isSelected: boolean,
	isTodayCell: boolean,
	isOutsideMonth: boolean,
	highlightWeek: boolean
): string => {
	if (isSelected && !highlightWeek) {
		return 'bg-primary text-primary-foreground font-semibold hover:bg-primary/90'
	}
	if (isTodayCell) {
		return 'bg-accent text-accent-foreground font-semibold'
	}
	if (isOutsideMonth) {
		return 'text-muted-foreground/60 hover:bg-accent hover:text-accent-foreground'
	}
	return 'text-foreground hover:bg-accent hover:text-accent-foreground'
}

const resolveWeekRowClass = (
	isActiveWeek: boolean,
	highlightWeek: boolean
): string => {
	if (isActiveWeek) return 'grid grid-cols-7 rounded-md bg-accent/80'
	if (highlightWeek) {
		return 'grid grid-cols-7 rounded-md hover:bg-accent/50 transition-colors'
	}
	return 'grid grid-cols-7'
}

const renderDayGridContent = (params: {
	selected: ZonedDate
	locale: string
	firstDayOfWeek: number
	highlightWeek?: boolean
	onSelect: (date: ZonedDate) => void
}): HTMLElement => {
	const { selected, locale, firstDayOfWeek, onSelect } = params
	const highlightWeek = Boolean(params.highlightWeek)
	const wrapper = createEl('div', {
		className: 'w-72 p-3',
		data: { slot: 'day-grid' },
	})
	let displayMonth = fromFields(
		{ year: selected.year, month: selected.month, day: 1 },
		selected.timeZoneId
	)
	const todayKeyStr = dayKey(now(selected.timeZoneId))
	const selectedKeyStr = dayKey(selected)
	let activeWeekKeysList: string[] = []
	if (highlightWeek) {
		activeWeekKeysList = getWeekDays(selected, firstDayOfWeek).map((d) =>
			dayKey(d)
		)
	}
	const activeWeekKeys = new Set(activeWeekKeysList)

	const redraw = () => {
		wrapper.replaceChildren()
		const monthLabel = formatDate(
			displayMonth,
			{ month: 'long', year: 'numeric' },
			locale
		)
		wrapper.appendChild(
			createPickerNav(
				monthLabel,
				'Previous month',
				'Next month',
				() => {
					displayMonth = add(displayMonth, -1, 'month')
					redraw()
				},
				() => {
					displayMonth = add(displayMonth, 1, 'month')
					redraw()
				}
			)
		)

		const weeks = getMonthWeeks(displayMonth, firstDayOfWeek)
		const headerRow = createEl('div', {
			className: 'mb-1 grid grid-cols-7 text-center',
		})
		for (const day of weeks[0] ?? []) {
			headerRow.appendChild(
				createEl('div', {
					text: formatDate(day, { weekday: 'short' }, locale).slice(0, 2),
					className: 'py-1 text-xs font-normal text-muted-foreground',
				})
			)
		}
		wrapper.appendChild(headerRow)

		const body = createEl('div', {
			className: 'space-y-0.5',
			attrs: { role: 'grid' },
		})
		for (const week of weeks) {
			const isActiveWeek =
				highlightWeek && week.some((d) => activeWeekKeys.has(dayKey(d)))
			const row = createEl('div', {
				className: resolveWeekRowClass(isActiveWeek, highlightWeek),
			})
			for (const day of week) {
				const key = dayKey(day)
				const isSelected = key === selectedKeyStr
				const isTodayCell = key === todayKeyStr
				const isOutside = day.month !== displayMonth.month
				const btnClass = resolveDayButtonClass(
					isSelected,
					isTodayCell,
					isOutside,
					highlightWeek
				)
				row.appendChild(
					createEl('button', {
						text: String(day.day),
						attrs: {
							type: 'button',
							'aria-selected': isSelected ? 'true' : undefined,
						},
						className: `flex h-8 w-full items-center justify-center rounded-md text-xs tabular-nums transition-colors cursor-pointer ${btnClass}`,
						onClick: () => {
							onSelect(
								fromFields(
									{
										year: day.year,
										month: day.month,
										day: day.day,
										hour: selected.hour,
										minute: selected.minute,
										second: selected.second,
										millisecond: selected.millisecond,
									},
									selected.timeZoneId
								)
							)
						},
					})
				)
			}
			body.appendChild(row)
		}
		wrapper.appendChild(body)
	}

	redraw()
	return wrapper
}

const buildHeaderPickerContent = (
	view: string,
	current: ZonedDate,
	locale: string,
	firstDayOfWeek: number,
	onSelect: (picked: ZonedDate) => void
): HTMLElement => {
	if (view === 'month') {
		return renderMonthGridContent(current, locale, onSelect)
	}
	if (view === 'year') {
		return renderYearGridContent(current, onSelect)
	}
	return renderDayGridContent({
		selected: current,
		locale,
		firstDayOfWeek,
		highlightWeek: view === 'week',
		onSelect,
	})
}

/** Opens the anchored header title date picker popover matching the active calendar view. */
export const openDomHeaderDatePicker = (
	runtime: DomRuntime,
	anchorEl: HTMLElement,
	onClose?: () => void
): (() => void) => {
	const state = runtime.controller.getState()
	const current =
		parseDate(state.currentDate, state.timezone) ?? now(state.timezone)

	let closePopover: (() => void) | undefined
	const handleSelect = (picked: ZonedDate) => {
		closePopover?.()
		runtime.controller.setCurrentDate(toOffsetIso(picked))
	}

	const content = buildHeaderPickerContent(
		state.view,
		current,
		state.locale,
		state.firstDayOfWeek,
		handleSelect
	)

	closePopover = mountFloatingPopover({
		host: document.body,
		themeSource: runtime.root,
		anchor: anchorEl,
		content,
		onClose,
	})
	return closePopover
}

const formatDisplayDate = (date: ZonedDate, locale: string): string =>
	formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' }, locale)

export interface DomDatePickerField {
	element: HTMLButtonElement
	getDate: () => ZonedDate
	setDate: (next: ZonedDate) => void
	closePopover: () => void
}

/** Creates an interactive date-picker button and popover for the DOM event form. */
export const createDomDatePickerField = (params: {
	id: string
	initialDate: ZonedDate
	locale: string
	firstDayOfWeek: number
	popoverHost: HTMLElement
	themeSource: HTMLElement
	onChange?: (date: ZonedDate) => void
}): DomDatePickerField => {
	let currentDate = params.initialDate
	let activeClose: (() => void) | undefined

	const labelSpan = createEl('span', {
		text: formatDisplayDate(currentDate, params.locale),
		className: 'truncate',
	})

	const button = createEl(
		'button',
		{
			attrs: { type: 'button', id: params.id },
			className:
				'mt-1 flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm font-normal text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer',
		},
		[
			createSvgIcon('calendar', 'size-4 shrink-0 text-muted-foreground'),
			labelSpan,
		]
	)

	const closePopover = () => {
		activeClose?.()
		activeClose = undefined
	}

	const setDate = (next: ZonedDate) => {
		currentDate = next
		labelSpan.textContent = formatDisplayDate(currentDate, params.locale)
	}

	button.addEventListener('click', () => {
		if (activeClose) {
			closePopover()
			return
		}
		const content = renderDayGridContent({
			selected: currentDate,
			locale: params.locale,
			firstDayOfWeek: params.firstDayOfWeek,
			onSelect: (picked) => {
				setDate(picked)
				closePopover()
				params.onChange?.(picked)
			},
		})
		activeClose = mountFloatingPopover({
			host: params.popoverHost,
			themeSource: params.themeSource,
			anchor: button,
			content,
			onClose: () => {
				activeClose = undefined
			},
		})
	})

	return {
		element: button,
		getDate: () => currentDate,
		setDate,
		closePopover,
	}
}
