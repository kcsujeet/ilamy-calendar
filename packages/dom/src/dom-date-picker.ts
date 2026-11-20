import {
	add,
	dayKey,
	formatDate,
	fromFields,
	getMonthWeeks,
	getWeekDays,
	now,
	parseDate,
	type TimeFormat,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/core'
import { createEl } from './dom-styles'
import type { DomRuntime } from './dom-types'

const SVG_NS = 'http://www.w3.org/2000/svg'
const YEAR_BLOCK_SIZE = 12
const TIME_STEP_MINUTES = 15

export type DomIconName =
	| 'chevron-left'
	| 'chevron-right'
	| 'chevron-down'
	| 'calendar'
	| 'clock'
	| 'download'
	| 'plus'
	| 'x'

const ICON_PATHS: Record<DomIconName, string[]> = {
	'chevron-left': ['m15 18-6-6 6-6'],
	'chevron-right': ['m9 18 6-6-6-6'],
	'chevron-down': ['m6 9 6 6 6-6'],
	calendar: [
		'M8 2v4',
		'M16 2v4',
		'M3 10h18',
		'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
	],
	clock: ['M12 6v6l4 2', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z'],
	download: [
		'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
		'm7 10 5 5 5-5',
		'M12 15V3',
	],
	plus: ['M5 12h14', 'M12 5v14'],
	x: ['M18 6 6 18', 'm6 6 12 12'],
}

export const createSvgIcon = (
	name: DomIconName,
	className = 'size-4 shrink-0'
): SVGSVGElement => {
	const svg = document.createElementNS(SVG_NS, 'svg')
	svg.setAttribute('viewBox', '0 0 24 24')
	svg.setAttribute('fill', 'none')
	svg.setAttribute('stroke', 'currentColor')
	svg.setAttribute('stroke-width', '2')
	svg.setAttribute('stroke-linecap', 'round')
	svg.setAttribute('stroke-linejoin', 'round')
	svg.setAttribute('aria-hidden', 'true')
	svg.setAttribute('class', className)
	for (const d of ICON_PATHS[name]) {
		const path = document.createElementNS(SVG_NS, 'path')
		path.setAttribute('d', d)
		svg.appendChild(path)
	}
	return svg
}

export const copyThemeCssVars = (
	source: HTMLElement,
	target: HTMLElement
): void => {
	const inline = source.style
	for (let i = 0; i < inline.length; i += 1) {
		const prop = inline.item(i)
		if (
			prop.startsWith('--') ||
			prop === 'color-scheme' ||
			prop === 'font-family'
		) {
			target.style.setProperty(prop, inline.getPropertyValue(prop))
		}
	}
}

const positionPopover = (popover: HTMLElement, anchor: HTMLElement): void => {
	const rect = anchor.getBoundingClientRect()
	const popWidth = popover.offsetWidth || 288
	const popHeight = popover.offsetHeight || 260
	const margin = 8
	const maxLeft = Math.max(margin, window.innerWidth - popWidth - margin)
	const left = Math.min(Math.max(margin, rect.left), maxLeft)
	const spaceBelow = window.innerHeight - rect.bottom - margin
	const top =
		spaceBelow >= popHeight || rect.top < popHeight
			? rect.bottom + 6
			: Math.max(margin, rect.top - popHeight - 6)
	popover.style.left = `${Math.round(left)}px`
	popover.style.top = `${Math.round(top)}px`
}

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

const createPickerCellButton = (
	label: string,
	isSelected: boolean,
	isCurrent: boolean,
	onClick: () => void
): HTMLButtonElement => {
	const stateClass = isSelected
		? 'bg-primary text-primary-foreground hover:bg-primary/90'
		: isCurrent
			? 'bg-accent text-accent-foreground'
			: 'text-foreground hover:bg-accent hover:text-accent-foreground'
	return createEl('button', {
		text: label,
		attrs: {
			type: 'button',
			...(isSelected ? { 'aria-current': 'date' } : {}),
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
								day: Math.min(selected.day, 28),
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

const renderDayGridContent = (params: {
	selected: ZonedDate
	locale: string
	firstDayOfWeek: number
	highlightWeek?: boolean
	onSelect: (date: ZonedDate) => void
}): HTMLElement => {
	const { selected, locale, firstDayOfWeek, highlightWeek, onSelect } = params
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
	const activeWeekKeys = new Set(
		highlightWeek
			? getWeekDays(selected, firstDayOfWeek).map((d) => dayKey(d))
			: []
	)

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
				Boolean(highlightWeek) &&
				week.some((d) => activeWeekKeys.has(dayKey(d)))
			const rowClass = isActiveWeek
				? 'grid grid-cols-7 rounded-md bg-accent/80'
				: highlightWeek
					? 'grid grid-cols-7 rounded-md hover:bg-accent/50 transition-colors'
					: 'grid grid-cols-7'
			const row = createEl('div', { className: rowClass })
			for (const day of week) {
				const key = dayKey(day)
				const isSelected = key === selectedKeyStr
				const isTodayCell = key === todayKeyStr
				const isOutside = day.month !== displayMonth.month
				const btnClass = resolveDayButtonClass(
					isSelected,
					isTodayCell,
					isOutside,
					Boolean(highlightWeek)
				)
				row.appendChild(
					createEl('button', {
						text: String(day.day),
						attrs: {
							type: 'button',
							...(isSelected ? { 'aria-selected': 'true' } : {}),
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

const mountFloatingPopover = (params: {
	host: HTMLElement
	themeSource: HTMLElement
	anchor: HTMLElement
	content: HTMLElement
	onClose?: () => void
}): (() => void) => {
	const popover = createEl(
		'div',
		{
			className:
				'fixed z-50 rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none',
			data: { testid: 'dom-date-picker-popover' },
		},
		[params.content]
	)
	copyThemeCssVars(params.themeSource, popover)
	params.host.appendChild(popover)
	positionPopover(popover, params.anchor)

	let closed = false
	const close = () => {
		if (closed) return
		closed = true
		document.removeEventListener('pointerdown', handleOutside, true)
		document.removeEventListener('keydown', handleKeyDown, true)
		window.removeEventListener('resize', handleReposition)
		popover.remove()
		params.onClose?.()
	}

	const handleOutside = (evt: Event) => {
		const target = evt.target
		if (!(target instanceof Node)) return
		if (popover.contains(target) || params.anchor.contains(target)) return
		close()
	}

	const handleKeyDown = (evt: KeyboardEvent) => {
		if (evt.key === 'Escape') {
			evt.preventDefault()
			evt.stopPropagation()
			close()
		}
	}

	const handleReposition = () => positionPopover(popover, params.anchor)

	document.addEventListener('pointerdown', handleOutside, true)
	document.addEventListener('keydown', handleKeyDown, true)
	window.addEventListener('resize', handleReposition)
	return close
}

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

	const content =
		state.view === 'month'
			? renderMonthGridContent(current, state.locale, handleSelect)
			: state.view === 'year'
				? renderYearGridContent(current, handleSelect)
				: renderDayGridContent({
						selected: current,
						locale: state.locale,
						firstDayOfWeek: state.firstDayOfWeek,
						highlightWeek: state.view === 'week',
						onSelect: handleSelect,
					})

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

const pad2 = (n: number): string => String(n).padStart(2, '0')

const formatClockDisplay = (
	hour: number,
	minute: number,
	timeFormat: TimeFormat
): string => {
	if (timeFormat === '24-hour') {
		return `${pad2(hour)}:${pad2(minute)}`
	}
	const period = hour >= 12 ? 'PM' : 'AM'
	const displayHour = hour % 12 === 0 ? 12 : hour % 12
	return `${displayHour}:${pad2(minute)} ${period}`
}

export interface DomTimePickerField {
	element: HTMLButtonElement
	getTime: () => { hour: number; minute: number }
	setTime: (hour: number, minute: number) => void
	closePopover: () => void
}

export const createDomTimePickerField = (params: {
	id: string
	initialHour: number
	initialMinute: number
	timeFormat: TimeFormat
	popoverHost: HTMLElement
	themeSource: HTMLElement
	onChange?: (hour: number, minute: number) => void
}): DomTimePickerField => {
	let currentHour = params.initialHour
	let currentMinute = params.initialMinute
	let activeClose: (() => void) | undefined

	const labelSpan = createEl('span', {
		text: formatClockDisplay(currentHour, currentMinute, params.timeFormat),
		className: 'truncate tabular-nums',
	})

	const button = createEl(
		'button',
		{
			attrs: { type: 'button', id: params.id },
			className:
				'mt-1 flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm font-normal text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer',
		},
		[createSvgIcon('clock', 'size-4 shrink-0 text-muted-foreground'), labelSpan]
	)

	const closePopover = () => {
		activeClose?.()
		activeClose = undefined
	}

	const setTime = (hour: number, minute: number) => {
		currentHour = hour
		currentMinute = minute
		labelSpan.textContent = formatClockDisplay(
			currentHour,
			currentMinute,
			params.timeFormat
		)
	}

	button.addEventListener('click', () => {
		if (activeClose) {
			closePopover()
			return
		}
		const list = createEl('div', {
			className: 'max-h-56 w-40 overflow-y-auto p-1',
			data: { slot: 'time-list' },
		})
		let selectedBtn: HTMLButtonElement | undefined
		for (let mins = 0; mins < 24 * 60; mins += TIME_STEP_MINUTES) {
			const h = Math.floor(mins / 60)
			const m = mins % 60
			const isSelected = h === currentHour && m === currentMinute
			const itemBtn = createEl('button', {
				text: formatClockDisplay(h, m, params.timeFormat),
				attrs: { type: 'button' },
				className: `flex w-full items-center rounded-sm px-2.5 py-1.5 text-left text-sm tabular-nums transition-colors cursor-pointer ${
					isSelected
						? 'bg-primary text-primary-foreground font-medium'
						: 'text-foreground hover:bg-accent hover:text-accent-foreground'
				}`,
				onClick: () => {
					setTime(h, m)
					closePopover()
					params.onChange?.(h, m)
				},
			})
			if (isSelected) selectedBtn = itemBtn
			list.appendChild(itemBtn)
		}
		activeClose = mountFloatingPopover({
			host: params.popoverHost,
			themeSource: params.themeSource,
			anchor: button,
			content: list,
			onClose: () => {
				activeClose = undefined
			},
		})
		if (selectedBtn && typeof selectedBtn.scrollIntoView === 'function') {
			selectedBtn.scrollIntoView({ block: 'center' })
		}
	})

	return {
		element: button,
		getTime: () => ({ hour: currentHour, minute: currentMinute }),
		setTime,
		closePopover,
	}
}
