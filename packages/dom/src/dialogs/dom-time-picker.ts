import type { TimeFormat } from '@ilamy/core'
import { MINUTES_PER_HOUR } from '@ilamy/utils/helpers'
import { createSvgIcon } from '../core/dom-icons.utils'
import { mountFloatingPopover } from '../core/dom-popover.utils'
import { createEl } from '../core/dom-styles.utils'

const TIME_STEP_MINUTES = 15
const HOURS_PER_DAY = 24

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

/** Creates a scrollable 15-minute interval time-picker button and popover for the DOM event form. */
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
		const totalMinutes = HOURS_PER_DAY * MINUTES_PER_HOUR
		for (let mins = 0; mins < totalMinutes; mins += TIME_STEP_MINUTES) {
			const h = Math.floor(mins / MINUTES_PER_HOUR)
			const m = mins % MINUTES_PER_HOUR
			const isSelected = h === currentHour && m === currentMinute
			let itemState =
				'text-foreground hover:bg-accent hover:text-accent-foreground'
			if (isSelected) {
				itemState = 'bg-primary text-primary-foreground font-medium'
			}
			const itemBtn = createEl('button', {
				text: formatClockDisplay(h, m, params.timeFormat),
				attrs: { type: 'button' },
				className: `flex w-full items-center rounded-sm px-2.5 py-1.5 text-left text-sm tabular-nums transition-colors cursor-pointer ${itemState}`,
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
