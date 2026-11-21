import { readableTextColor } from '@ilamy/utils/helpers'
import { createSvgIcon } from '../core/dom-icons.utils'
import { copyThemeCssVars } from '../core/dom-popover.utils'
import { createEl } from '../core/dom-styles.utils'
import type { DomCalendarEventInput } from '../dom-calendar.types'
import { createLabeledField } from './dom-dialog-shell'

const DEFAULT_EVENT_COLOR = 'bg-blue-100 text-blue-800'
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

interface ColorSwatchOption {
	value: string
	label: string
	dotClass: string
}

const EVENT_COLOR_SWATCHES: ColorSwatchOption[] = [
	{ value: DEFAULT_EVENT_COLOR, label: 'Blue', dotClass: 'bg-blue-200' },
	{
		value: 'bg-green-100 text-green-800',
		label: 'Green',
		dotClass: 'bg-green-200',
	},
	{
		value: 'bg-purple-100 text-purple-800',
		label: 'Purple',
		dotClass: 'bg-purple-200',
	},
	{ value: 'bg-red-100 text-red-800', label: 'Red', dotClass: 'bg-red-200' },
	{
		value: 'bg-yellow-100 text-yellow-800',
		label: 'Yellow',
		dotClass: 'bg-yellow-200',
	},
	{
		value: 'bg-pink-100 text-pink-800',
		label: 'Pink',
		dotClass: 'bg-pink-200',
	},
	{
		value: 'bg-indigo-100 text-indigo-800',
		label: 'Indigo',
		dotClass: 'bg-indigo-200',
	},
	{
		value: 'bg-amber-100 text-amber-800',
		label: 'Amber',
		dotClass: 'bg-amber-200',
	},
	{
		value: 'bg-emerald-100 text-emerald-800',
		label: 'Emerald',
		dotClass: 'bg-emerald-200',
	},
	{ value: 'bg-sky-100 text-sky-800', label: 'Sky', dotClass: 'bg-sky-200' },
	{
		value: 'bg-violet-100 text-violet-800',
		label: 'Violet',
		dotClass: 'bg-violet-200',
	},
	{
		value: 'bg-rose-100 text-rose-800',
		label: 'Rose',
		dotClass: 'bg-rose-200',
	},
	{
		value: 'bg-teal-100 text-teal-800',
		label: 'Teal',
		dotClass: 'bg-teal-200',
	},
	{
		value: 'bg-orange-100 text-orange-800',
		label: 'Orange',
		dotClass: 'bg-orange-200',
	},
]

const findColorOption = (value: string): ColorSwatchOption | undefined =>
	EVENT_COLOR_SWATCHES.find((item) => item.value === value)

export interface DomColorPickerField {
	field: HTMLElement
	resolveColorFields: () => Pick<
		DomCalendarEventInput,
		'backgroundColor' | 'color'
	>
	closeDropdown: () => void
}

/** Creates the 14-color pastel dropdown field matching React's EventForm color picker. */
export const createColorPickerField = (
	initialBackgroundColor: string | undefined,
	initialColor: string | undefined,
	dialogHost: HTMLElement,
	themeSource: HTMLElement
): DomColorPickerField => {
	let selected = initialColor ?? DEFAULT_EVENT_COLOR
	if (initialBackgroundColor && HEX_COLOR_RE.test(initialBackgroundColor)) {
		selected = initialBackgroundColor
	}
	let changed = false
	let activeDropdown: HTMLElement | undefined

	const dot = createEl('span', {
		className: 'size-4 shrink-0 rounded-full border border-border/50',
	})
	const text = createEl('span', { className: 'truncate text-sm' })

	const syncTrigger = () => {
		const preset = findColorOption(selected)
		dot.className = `size-4 shrink-0 rounded-full border border-border/50 ${preset?.dotClass ?? ''}`
		dot.style.backgroundColor = preset ? '' : selected
		text.textContent = preset?.label ?? selected
	}
	syncTrigger()

	const trigger = createEl(
		'button',
		{
			attrs: { type: 'button', id: 'event-color', 'aria-haspopup': 'listbox' },
			className:
				'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer',
		},
		[
			createEl('span', { className: 'flex items-center gap-2 truncate' }, [
				dot,
				text,
			]),
			createSvgIcon('chevron-down', 'size-4 shrink-0 opacity-50'),
		]
	)

	const closeDropdown = () => {
		activeDropdown?.remove()
		activeDropdown = undefined
		document.removeEventListener('pointerdown', handleOutside, true)
		document.removeEventListener('keydown', handleKeyDown, true)
	}

	const handleOutside = (evt: Event) => {
		const target = evt.target
		if (!(target instanceof Node)) return
		if (activeDropdown?.contains(target) || trigger.contains(target)) return
		closeDropdown()
	}

	const handleKeyDown = (evt: KeyboardEvent) => {
		if (evt.key === 'Escape') {
			evt.preventDefault()
			evt.stopPropagation()
			closeDropdown()
		}
	}

	trigger.addEventListener('click', () => {
		if (activeDropdown) {
			closeDropdown()
			return
		}
		const rect = trigger.getBoundingClientRect()
		const menu = createEl('div', {
			attrs: { role: 'listbox' },
			className:
				'fixed z-50 max-h-56 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
			style: {
				left: `${Math.round(rect.left)}px`,
				top: `${Math.round(rect.bottom + 4)}px`,
				width: `${Math.round(rect.width)}px`,
			},
		})
		copyThemeCssVars(themeSource, menu)
		for (const item of EVENT_COLOR_SWATCHES) {
			const isSelected = item.value === selected
			let rowState = 'hover:bg-accent hover:text-accent-foreground'
			if (isSelected) {
				rowState = 'bg-accent text-accent-foreground font-medium'
			}
			const row = createEl(
				'button',
				{
					attrs: {
						type: 'button',
						role: 'option',
						'aria-selected': String(isSelected),
					},
					className: `flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm cursor-pointer transition-colors ${rowState}`,
					onClick: () => {
						selected = item.value
						changed = true
						syncTrigger()
						closeDropdown()
					},
				},
				[
					createEl('span', {
						className: `size-4 shrink-0 rounded-full border border-border/50 ${item.dotClass}`,
					}),
					createEl('span', { text: item.label }),
				]
			)
			menu.appendChild(row)
		}
		dialogHost.appendChild(menu)
		activeDropdown = menu
		document.addEventListener('pointerdown', handleOutside, true)
		document.addEventListener('keydown', handleKeyDown, true)
	})

	const resolveColorFields = (): Pick<
		DomCalendarEventInput,
		'backgroundColor' | 'color'
	> => {
		const hadInitial = Boolean(initialColor || initialBackgroundColor)
		if (!changed && hadInitial) {
			return { backgroundColor: initialBackgroundColor, color: initialColor }
		}
		if (HEX_COLOR_RE.test(selected)) {
			return { backgroundColor: selected, color: readableTextColor(selected) }
		}
		return { backgroundColor: undefined, color: selected }
	}

	return {
		field: createLabeledField('Color', 'event-color', trigger),
		resolveColorFields,
		closeDropdown,
	}
}
