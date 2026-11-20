import {
	add,
	type CellInfo,
	fromFields,
	isBefore,
	now,
	parseDate,
	type Resource,
	startOf,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/core'
import { readableTextColor } from '@ilamy/utils/helpers'
import { Frequency, RRule } from 'rrule'
import {
	copyThemeCssVars,
	createDomDatePickerField,
	createDomTimePickerField,
	createSvgIcon,
} from './dom-date-picker'
import { renderDomEventBar } from './dom-event-bar'
import { isRecurringEvent } from './dom-events'
import { createEl } from './dom-styles'
import type {
	DomCalendarEvent,
	DomCalendarEventInput,
	DomMutationScope,
	DomRRuleInput,
	DomRuntime,
} from './dom-types'

const DEFAULT_EVENT_COLOR = 'bg-blue-100 text-blue-800'
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const EVENT_COLOR_SWATCHES: Array<{
	value: string
	label: string
	dotClass: string
}> = [
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

const WEEKDAY_CODES = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR]

const REPEAT_PRESETS: Array<{ value: string; label: string }> = [
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekdays', label: 'Every weekday' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'monthly', label: 'Monthly' },
	{ value: 'yearly', label: 'Yearly' },
]

const SCOPE_OPTIONS: Array<{
	value: DomMutationScope
	title: string
	description: string
}> = [
	{
		value: 'this',
		title: 'This Event',
		description: 'Only Change This',
	},
	{
		value: 'following',
		title: 'This and Following Events',
		description: 'Change This and Future',
	},
	{
		value: 'all',
		title: 'All Events',
		description: 'Change Entire Series',
	},
]

const INPUT_CLASS =
	'w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const TEXTAREA_CLASS =
	'w-full min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const LABEL_CLASS = 'block text-sm font-medium text-foreground mb-1.5'

const detectRepeatPreset = (rrule: DomRRuleInput | undefined): string => {
	if (!rrule || rrule.freq === undefined) return 'daily'
	if (
		rrule.freq === Frequency.WEEKLY &&
		Array.isArray(rrule.byweekday) &&
		rrule.byweekday.length === 5
	) {
		return 'weekdays'
	}
	if (rrule.freq === Frequency.WEEKLY) return 'weekly'
	if (rrule.freq === Frequency.MONTHLY) return 'monthly'
	if (rrule.freq === Frequency.YEARLY) return 'yearly'
	return 'daily'
}

const presetToRRule = (
	preset: string,
	endMode: 'never' | 'after',
	countValue: number
): DomRRuleInput => {
	const count = endMode === 'after' ? Math.max(1, countValue) : undefined
	if (preset === 'weekdays') {
		return {
			freq: Frequency.WEEKLY,
			interval: 1,
			byweekday: WEEKDAY_CODES,
			count,
		}
	}
	const freqMap: Record<string, Frequency> = {
		daily: Frequency.DAILY,
		weekly: Frequency.WEEKLY,
		monthly: Frequency.MONTHLY,
		yearly: Frequency.YEARLY,
	}
	return { freq: freqMap[preset] ?? Frequency.DAILY, interval: 1, count }
}

const createDialogShell = (
	runtime: DomRuntime,
	testId: string,
	maxWidthClass = 'max-w-[500px]'
): HTMLDialogElement => {
	const dialog = document.createElement('dialog')
	dialog.dataset.testid = testId
	dialog.className = `fixed inset-0 m-auto hidden open:flex flex-col max-h-[90vh] w-[90vw] ${maxWidthClass} rounded-lg border border-border bg-background p-4 sm:p-6 text-foreground shadow-lg overflow-hidden backdrop:bg-black/50`
	copyThemeCssVars(runtime.root, dialog)
	return dialog
}

const openDialogSafely = (dialog: HTMLDialogElement): void => {
	if (typeof dialog.showModal === 'function') {
		try {
			dialog.showModal()
			return
		} catch {
			// Fallback in happy-dom / non-modal contexts
		}
	}
	dialog.setAttribute('open', 'true')
}

const createDialogHeader = (
	title: string,
	subtitle: string | undefined,
	onClose: () => void
): HTMLElement =>
	createEl(
		'div',
		{ className: 'flex items-start justify-between gap-4 shrink-0 pb-2' },
		[
			createEl('div', {}, [
				createEl('h3', {
					text: title,
					className: 'text-lg font-semibold leading-none text-foreground',
				}),
				subtitle
					? createEl('p', {
							text: subtitle,
							className: 'mt-1.5 text-sm text-muted-foreground',
						})
					: null,
			]),
			createEl(
				'button',
				{
					attrs: { type: 'button', 'aria-label': 'Close' },
					className:
						'rounded-xs p-1 text-muted-foreground opacity-70 hover:opacity-100 hover:bg-accent transition-opacity cursor-pointer',
					onClick: onClose,
				},
				[createSvgIcon('x', 'size-4')]
			),
		]
	)

const createLabeledField = (
	label: string,
	htmlFor: string | undefined,
	control: HTMLElement
): HTMLElement =>
	createEl('div', {}, [
		createEl('label', {
			text: label,
			className: LABEL_CLASS,
			attrs: htmlFor ? { for: htmlFor } : undefined,
		}),
		control,
	])

const createSelectControl = (
	options: Array<{ value: string; label: string }>,
	selectedValue: string,
	id?: string
): HTMLSelectElement => {
	const select = createEl('select', {
		className: INPUT_CLASS,
		attrs: id ? { id } : undefined,
	})
	for (const item of options) {
		const opt = createEl('option', {
			text: item.label,
			attrs: { value: item.value },
		})
		if (item.value === selectedValue) opt.selected = true
		select.appendChild(opt)
	}
	return select
}

const findColorOption = (value: string) =>
	EVENT_COLOR_SWATCHES.find((item) => item.value === value)

const createColorPickerField = (
	initialBackgroundColor: string | undefined,
	initialColor: string | undefined,
	dialogHost: HTMLElement,
	themeSource: HTMLElement
) => {
	const initialValue =
		initialBackgroundColor && HEX_COLOR_RE.test(initialBackgroundColor)
			? initialBackgroundColor
			: (initialColor ?? DEFAULT_EVENT_COLOR)
	let selected = initialValue
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
	}

	const handleOutside = (evt: Event) => {
		const target = evt.target
		if (!(target instanceof Node)) return
		if (activeDropdown?.contains(target) || trigger.contains(target)) return
		closeDropdown()
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
			const row = createEl(
				'button',
				{
					attrs: {
						type: 'button',
						role: 'option',
						'aria-selected': String(isSelected),
					},
					className: `flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm cursor-pointer transition-colors ${
						isSelected
							? 'bg-accent text-accent-foreground font-medium'
							: 'hover:bg-accent hover:text-accent-foreground'
					}`,
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

const createRepeatSection = (initialRRule: DomRRuleInput | undefined) => {
	let enabled = Boolean(initialRRule)
	let preset = detectRepeatPreset(initialRRule)
	let endMode: 'never' | 'after' = initialRRule?.count ? 'after' : 'never'
	let count = initialRRule?.count ?? 10

	const card = createEl('div', {
		className: 'rounded-lg border border-border p-3 space-y-3',
	})

	const checkbox = createEl('input', {
		attrs: { type: 'checkbox', id: 'repeat-toggle' },
		className:
			'size-4 rounded border border-muted-foreground/50 accent-primary cursor-pointer',
	})
	checkbox.checked = enabled

	const summaryText = createEl('span', {
		className: 'block text-xs text-muted-foreground',
	})

	const presetSelect = createSelectControl(
		REPEAT_PRESETS,
		preset,
		'repeat-preset'
	)
	const endSelect = createSelectControl(
		[
			{ value: 'never', label: 'Never' },
			{ value: 'after', label: 'After occurrences' },
		],
		endMode,
		'repeat-end-mode'
	)
	const countInput = createEl('input', {
		className: `${INPUT_CLASS} w-24`,
		attrs: { type: 'number', min: '1', max: '365', value: String(count) },
	})
	const countRow = createEl('div', { className: 'flex items-center gap-2' }, [
		countInput,
		createEl('span', {
			text: 'occurrences',
			className: 'text-sm text-muted-foreground',
		}),
	])

	const body = createEl('div', { className: 'space-y-3 pt-1' }, [
		createLabeledField('Repeats', 'repeat-preset', presetSelect),
		createLabeledField('Ends', 'repeat-end-mode', endSelect),
		countRow,
	])

	const syncUi = () => {
		const activePreset = REPEAT_PRESETS.find((item) => item.value === preset)
		summaryText.textContent = enabled ? (activePreset?.label ?? 'Daily') : ''
		summaryText.style.display = enabled ? '' : 'none'
		body.style.display = enabled ? '' : 'none'
		countRow.style.display = endMode === 'after' ? 'flex' : 'none'
	}

	checkbox.addEventListener('change', () => {
		enabled = checkbox.checked
		syncUi()
	})
	presetSelect.addEventListener('change', () => {
		preset = presetSelect.value
		syncUi()
	})
	endSelect.addEventListener('change', () => {
		endMode = endSelect.value === 'after' ? 'after' : 'never'
		syncUi()
	})
	countInput.addEventListener('input', () => {
		const parsed = Number.parseInt(countInput.value, 10)
		if (Number.isFinite(parsed) && parsed > 0) count = parsed
	})

	const toggleHeader = createEl(
		'label',
		{
			attrs: { for: 'repeat-toggle' },
			className: 'flex items-center gap-2.5 cursor-pointer select-none',
		},
		[
			checkbox,
			createEl('div', {}, [
				createEl('span', {
					text: 'Repeat',
					className: 'text-sm font-medium text-foreground',
				}),
				summaryText,
			]),
		]
	)

	card.append(toggleHeader, body)
	syncUi()

	return {
		element: card,
		getRRule: (): DomRRuleInput | undefined =>
			enabled ? presetToRRule(preset, endMode, count) : undefined,
	}
}

const createScheduleFields = (params: {
	initialStart: ZonedDate
	initialEnd: ZonedDate
	initialAllDay: boolean
	locale: string
	firstDayOfWeek: number
	timeFormat: '12-hour' | '24-hour'
	dialogHost: HTMLElement
	themeSource: HTMLElement
}) => {
	const allDayCheckbox = createEl('input', {
		attrs: { type: 'checkbox', id: 'allDay', name: 'allDay' },
		className:
			'size-4 rounded border border-muted-foreground/50 accent-primary cursor-pointer',
	})
	allDayCheckbox.checked = params.initialAllDay

	const startDatePicker = createDomDatePickerField({
		id: 'start-date',
		initialDate: params.initialStart,
		locale: params.locale,
		firstDayOfWeek: params.firstDayOfWeek,
		popoverHost: params.dialogHost,
		themeSource: params.themeSource,
		onChange: (picked) => {
			if (isBefore(endDatePicker.getDate(), picked, 'day')) {
				endDatePicker.setDate(picked)
			}
		},
	})
	const endDatePicker = createDomDatePickerField({
		id: 'end-date',
		initialDate: params.initialEnd,
		locale: params.locale,
		firstDayOfWeek: params.firstDayOfWeek,
		popoverHost: params.dialogHost,
		themeSource: params.themeSource,
		onChange: (picked) => {
			if (isBefore(picked, startDatePicker.getDate(), 'day')) {
				startDatePicker.setDate(picked)
			}
		},
	})

	const startTimePicker = createDomTimePickerField({
		id: 'start-time',
		initialHour: params.initialStart.hour,
		initialMinute: params.initialStart.minute,
		timeFormat: params.timeFormat,
		popoverHost: params.dialogHost,
		themeSource: params.themeSource,
	})
	const endTimePicker = createDomTimePickerField({
		id: 'end-time',
		initialHour: params.initialEnd.hour,
		initialMinute: params.initialEnd.minute,
		timeFormat: params.timeFormat,
		popoverHost: params.dialogHost,
		themeSource: params.themeSource,
	})

	const timeRow = createEl(
		'div',
		{ className: 'grid grid-cols-2 gap-2 sm:gap-4' },
		[
			createLabeledField('Start Time', 'start-time', startTimePicker.element),
			createLabeledField('End Time', 'end-time', endTimePicker.element),
		]
	)

	const syncAllDay = () => {
		timeRow.style.display = allDayCheckbox.checked ? 'none' : ''
	}
	allDayCheckbox.addEventListener('change', syncAllDay)
	syncAllDay()

	const allDayRow = createEl(
		'label',
		{
			attrs: { for: 'allDay' },
			className:
				'flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer select-none',
		},
		[allDayCheckbox, 'All Day']
	)

	const dateRow = createEl(
		'div',
		{ className: 'grid grid-cols-2 gap-2 sm:gap-4' },
		[
			createLabeledField('Start Date', 'start-date', startDatePicker.element),
			createLabeledField('End Date', 'end-date', endDatePicker.element),
		]
	)

	const buildRange = (
		timezone: string
	): { start: string; end: string; allDay: boolean } => {
		const isAllDay = allDayCheckbox.checked
		const sd = startDatePicker.getDate()
		const ed = endDatePicker.getDate()
		if (isAllDay) {
			const startDay = startOf(sd, 'day')
			const rawEndDay = startOf(ed, 'day')
			const endDay = isBefore(rawEndDay, startDay, 'day')
				? add(startDay, 1, 'day')
				: add(rawEndDay, 1, 'day')
			return {
				start: toOffsetIso(startDay),
				end: toOffsetIso(endDay),
				allDay: true,
			}
		}
		const st = startTimePicker.getTime()
		const et = endTimePicker.getTime()
		const startZoned = fromFields(
			{
				year: sd.year,
				month: sd.month,
				day: sd.day,
				hour: st.hour,
				minute: st.minute,
			},
			timezone
		)
		let endZoned = fromFields(
			{
				year: ed.year,
				month: ed.month,
				day: ed.day,
				hour: et.hour,
				minute: et.minute,
			},
			timezone
		)
		if (!isBefore(startZoned, endZoned)) {
			endZoned = add(startZoned, 1, 'hour')
		}
		return {
			start: toOffsetIso(startZoned),
			end: toOffsetIso(endZoned),
			allDay: false,
		}
	}

	return {
		nodes: [allDayRow, dateRow, timeRow],
		buildRange,
		closePopovers: () => {
			startDatePicker.closePopover()
			endDatePicker.closePopover()
			startTimePicker.closePopover()
			endTimePicker.closePopover()
		},
	}
}

const createManagedDialog = (
	runtime: DomRuntime,
	testId: string,
	maxWidthClass = 'max-w-[500px]',
	onCleanup?: () => void
): { dialog: HTMLDialogElement; close: () => void } => {
	const dialog = createDialogShell(runtime, testId, maxWidthClass)
	const close = () => {
		onCleanup?.()
		if (typeof dialog.close === 'function' && dialog.open) dialog.close()
		dialog.remove()
	}
	dialog.addEventListener('close', () => {
		onCleanup?.()
		dialog.remove()
	})
	dialog.addEventListener('click', (evt) => {
		if (evt.target === dialog) close()
	})
	return { dialog, close }
}

const openDomScopeDialog = (
	runtime: DomRuntime,
	eventTitle: string,
	mode: 'edit' | 'delete',
	onConfirm: (scope: DomMutationScope) => void
): void => {
	const { dialog, close } = createManagedDialog(
		runtime,
		'dom-scope-dialog',
		'max-w-md'
	)

	const actionWord = mode === 'delete' ? 'delete' : 'edit'
	const header = createDialogHeader(
		mode === 'delete' ? 'Delete Recurring Event' : 'Edit Recurring Event',
		`"${eventTitle}" How would you like to ${actionWord} this recurring event?`,
		close
	)

	const choices = createEl('div', { className: 'my-4 space-y-2.5' })
	for (const item of SCOPE_OPTIONS) {
		choices.appendChild(
			createEl(
				'button',
				{
					attrs: { type: 'button' },
					data: { testid: `dom-scope-${item.value}` },
					className:
						'w-full rounded-lg border border-border bg-background p-3.5 text-left hover:bg-accent/50 transition-colors cursor-pointer',
					onClick: () => {
						close()
						onConfirm(item.value)
					},
				},
				[
					createEl('div', {
						text: item.title,
						className: 'text-sm font-medium text-foreground',
					}),
					createEl('div', {
						text: item.description,
						className: 'mt-0.5 text-xs text-muted-foreground',
					}),
				]
			)
		)
	}

	const footer = createEl('div', { className: 'flex justify-end pt-1' }, [
		createEl('button', {
			text: 'Cancel',
			attrs: { type: 'button' },
			className:
				'h-9 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-accent cursor-pointer',
			onClick: close,
		}),
	])

	dialog.append(header, choices, footer)
	runtime.root.appendChild(dialog)
	openDialogSafely(dialog)
}

const buildFormFooter = (
	existing: DomCalendarEvent | null,
	onDelete: () => void,
	onClose: () => void
): HTMLElement => {
	const footer = createEl('div', {
		className: 'mt-4 shrink-0 flex items-center justify-end gap-2',
	})
	if (existing) {
		footer.appendChild(
			createEl('button', {
				text: 'Delete',
				attrs: { type: 'button' },
				data: { testid: 'dom-event-delete-btn' },
				className:
					'mr-auto h-8 rounded-md bg-destructive px-3 text-xs font-medium text-white hover:bg-destructive/90 cursor-pointer',
				onClick: onDelete,
			})
		)
	}
	footer.append(
		createEl('button', {
			text: 'Cancel',
			attrs: { type: 'button' },
			className:
				'h-8 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground hover:bg-accent cursor-pointer',
			onClick: onClose,
		}),
		createEl('button', {
			text: existing ? 'Update' : 'Create',
			attrs: { type: 'submit' },
			data: { testid: 'dom-event-save-btn' },
			className:
				'h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer',
		})
	)
	return footer
}

const resolveDefaultResourceId = (
	existing: DomCalendarEvent | null,
	cell: CellInfo | undefined
): string | number | undefined => {
	if (existing?.resourceId !== undefined) return existing.resourceId
	if (existing?.resourceIds?.length) return existing.resourceIds.at(0)
	return cell?.resource?.id
}

const resolveDefaultEndIso = (
	existing: DomCalendarEvent | null,
	cell: CellInfo | undefined,
	initialStart: string,
	timezone: string
): string => {
	if (existing) return existing.end
	if (cell) return cell.end
	const anchor = parseDate(initialStart, timezone) ?? now(timezone)
	return toOffsetIso(add(anchor, 1, 'hour'))
}

const resolveDialogDefaults = (
	runtime: DomRuntime,
	params: { event: DomCalendarEvent | null; cell?: CellInfo }
) => {
	const state = runtime.controller.getState()
	const existing = params.event
	const initialStart =
		existing?.start ?? params.cell?.start ?? state.currentDate
	return {
		existing,
		initialStart,
		initialEnd: resolveDefaultEndIso(
			existing,
			params.cell,
			initialStart,
			state.timezone
		),
		initialAllDay: Boolean(existing?.allDay ?? params.cell?.allDay),
		initialResourceId: resolveDefaultResourceId(existing, params.cell),
	}
}

const resolveResourceOption = (
	resources: Resource[],
	selectedValue: string | undefined
): string | number | undefined =>
	resources.find((item) => String(item.id) === selectedValue)?.id

const resolveDisplayBounds = (
	defaults: ReturnType<typeof resolveDialogDefaults>,
	timezone: string
) => {
	const startZoned = parseDate(defaults.initialStart, timezone) ?? now(timezone)
	const rawEndZoned =
		parseDate(defaults.initialEnd, timezone) ?? add(startZoned, 1, 'hour')
	const displayEndZoned =
		defaults.initialAllDay &&
		!isBefore(rawEndZoned, add(startZoned, 1, 'day'), 'day')
			? add(rawEndZoned, -1, 'day')
			: rawEndZoned
	return { startZoned, displayEndZoned }
}

const createBasicTextInputs = (existing: DomCalendarEvent | null) => {
	const titleInput = createEl('input', {
		className: INPUT_CLASS,
		attrs: {
			type: 'text',
			id: 'title',
			name: 'title',
			required: 'true',
			placeholder: 'Enter event title...',
			value: existing ? existing.title : 'New Event',
		},
	})
	const descInput = createEl('textarea', {
		className: TEXTAREA_CLASS,
		attrs: {
			id: 'description',
			name: 'description',
			rows: '3',
			placeholder: 'Enter event description...',
		},
	})
	descInput.value = existing?.description ?? ''
	const locationInput = createEl('input', {
		className: INPUT_CLASS,
		attrs: {
			type: 'text',
			id: 'location',
			name: 'location',
			placeholder: 'Enter event location...',
			value: existing?.location ?? '',
		},
	})
	return { titleInput, descInput, locationInput }
}

const commitFormSubmission = (
	runtime: DomRuntime,
	existing: DomCalendarEvent | null,
	payload: DomCalendarEventInput,
	closeWithPopovers: () => void
): void => {
	if (existing && isRecurringEvent(existing)) {
		closeWithPopovers()
		openDomScopeDialog(runtime, existing.title, 'edit', (scope) => {
			runtime.commitUpdate(existing, payload, scope)
		})
		return
	}
	if (existing) {
		runtime.commitUpdate(existing, payload, 'this')
	} else {
		runtime.commitAdd(payload)
	}
	closeWithPopovers()
}

const createResourceSelect = (
	resources: Resource[],
	initialResourceId: string | number | undefined
): HTMLSelectElement | undefined => {
	if (resources.length === 0) return undefined
	const fallbackId = resources[0]?.id ?? ''
	return createSelectControl(
		resources.map((r) => ({ value: String(r.id), label: r.title })),
		String(initialResourceId ?? fallbackId),
		'resource'
	)
}

const handleDeleteClick = (
	runtime: DomRuntime,
	existing: DomCalendarEvent | null,
	closeWithPopovers: () => void
): void => {
	if (!existing) return
	if (isRecurringEvent(existing)) {
		closeWithPopovers()
		openDomScopeDialog(runtime, existing.title, 'delete', (scope) => {
			runtime.commitDelete(existing, scope)
		})
		return
	}
	runtime.commitDelete(existing, 'this')
	closeWithPopovers()
}

const buildFormEventPayload = (params: {
	existing: DomCalendarEvent | null
	title: string
	description: string
	location: string
	range: { start: string; end: string; allDay: boolean }
	colorFields: Pick<DomCalendarEventInput, 'backgroundColor' | 'color'>
	resources: Resource[]
	selectedResourceValue: string | undefined
	rrule: DomRRuleInput | undefined
}): DomCalendarEventInput => {
	const trimmedDesc = params.description.trim()
	const trimmedLocation = params.location.trim()
	return {
		id: params.existing?.id ?? `evt_${Date.now()}`,
		title: params.title.trim() || 'Untitled Event',
		start: params.range.start,
		end: params.range.end,
		allDay: params.range.allDay,
		...params.colorFields,
		description: trimmedDesc.length > 0 ? trimmedDesc : undefined,
		location: trimmedLocation.length > 0 ? trimmedLocation : undefined,
		resourceId: resolveResourceOption(
			params.resources,
			params.selectedResourceValue
		),
		rrule: params.rrule,
	}
}

const mountDefaultEventForm = (
	runtime: DomRuntime,
	dialog: HTMLDialogElement,
	defaults: ReturnType<typeof resolveDialogDefaults>,
	close: () => void
): HTMLElement => {
	const state = runtime.controller.getState()
	const options = runtime.getOptions()
	const { existing, initialAllDay, initialResourceId } = defaults
	const { startZoned, displayEndZoned } = resolveDisplayBounds(
		defaults,
		state.timezone
	)

	const form = createEl('form', { className: 'flex min-h-0 flex-1 flex-col' })
	form.appendChild(
		createDialogHeader(
			existing ? 'Edit Event' : 'Create Event',
			existing ? 'Edit Event Details' : 'Add New Event',
			close
		)
	)

	const { titleInput, descInput, locationInput } =
		createBasicTextInputs(existing)
	const schedule = createScheduleFields({
		initialStart: startZoned,
		initialEnd: displayEndZoned,
		initialAllDay,
		locale: state.locale,
		firstDayOfWeek: state.firstDayOfWeek,
		timeFormat: options.timeFormat ?? '12-hour',
		dialogHost: dialog,
		themeSource: runtime.root,
	})
	const colorField = createColorPickerField(
		existing?.backgroundColor,
		existing?.color,
		dialog,
		runtime.root
	)
	const resourceSelect = createResourceSelect(
		state.resources,
		initialResourceId
	)
	const repeatSection = createRepeatSection(existing?.rrule)

	form.appendChild(
		createEl(
			'div',
			{ className: 'min-h-0 flex-1 overflow-y-auto py-3 pr-1 space-y-4' },
			[
				createLabeledField('Title', 'title', titleInput),
				createLabeledField('Description', 'description', descInput),
				...schedule.nodes,
				colorField.field,
				createLabeledField('Location', 'location', locationInput),
				resourceSelect
					? createLabeledField('Resource', 'resource', resourceSelect)
					: null,
				repeatSection.element,
			]
		)
	)

	const closeWithPopovers = () => {
		schedule.closePopovers()
		colorField.closeDropdown()
		close()
	}

	form.appendChild(
		buildFormFooter(
			existing,
			() => handleDeleteClick(runtime, existing, closeWithPopovers),
			closeWithPopovers
		)
	)

	form.addEventListener('submit', (submitEvent) => {
		submitEvent.preventDefault()
		const payload = buildFormEventPayload({
			existing,
			title: titleInput.value,
			description: descInput.value,
			location: locationInput.value,
			range: schedule.buildRange(state.timezone),
			colorFields: colorField.resolveColorFields(),
			resources: state.resources,
			selectedResourceValue: resourceSelect?.value,
			rrule: repeatSection.getRRule(),
		})
		commitFormSubmission(runtime, existing, payload, closeWithPopovers)
	})
	return form
}

export const openDomEventDialog = (
	runtime: DomRuntime,
	params: { event: DomCalendarEvent | null; cell?: CellInfo }
): (() => void) => {
	const options = runtime.getOptions()
	const state = runtime.controller.getState()
	const defaults = resolveDialogDefaults(runtime, params)
	let customCleanup: (() => void) | undefined
	const { dialog, close } = createManagedDialog(
		runtime,
		'dom-event-dialog',
		'max-w-[500px]',
		() => customCleanup?.()
	)

	if (options.renderEventForm) {
		const host = createEl('div')
		customCleanup = options.renderEventForm(host, {
			event: defaults.existing,
			initialStart: defaults.initialStart,
			initialEnd: defaults.initialEnd,
			initialAllDay: defaults.initialAllDay,
			initialResourceId: defaults.initialResourceId,
			resources: state.resources,
			onSave: (input, scope) => {
				if (defaults.existing) {
					runtime.commitUpdate(defaults.existing, input, scope)
				} else {
					runtime.commitAdd(input)
				}
				close()
			},
			onDelete: defaults.existing
				? (target, scope) => {
						runtime.commitDelete(target, scope)
						close()
					}
				: undefined,
			onClose: close,
		})
		dialog.appendChild(host)
	} else {
		dialog.appendChild(mountDefaultEventForm(runtime, dialog, defaults, close))
	}

	runtime.root.appendChild(dialog)
	openDialogSafely(dialog)
	return close
}

export const openDomOverflowDialog = (
	runtime: DomRuntime,
	title: string,
	events: DomCalendarEvent[]
): (() => void) => {
	const options = runtime.getOptions()
	const { dialog, close } = createManagedDialog(
		runtime,
		'dom-overflow-dialog',
		'max-w-md'
	)

	const header = createDialogHeader(title, undefined, close)
	const list = createEl('div', {
		className: 'mt-3 space-y-2 max-h-[60vh] overflow-y-auto',
	})

	for (const event of events) {
		const pill = renderDomEventBar(event, runtime, {
			axis: 'horizontal',
			compact: true,
			staticPill: true,
		})
		pill.style.height = '24px'
		pill.addEventListener('click', () => {
			close()
			if (options.disableEventClick) return
			options.onEventClick?.(event)
			runtime.openEditDialog(event)
		})
		list.appendChild(pill)
	}

	dialog.append(header, list)
	runtime.root.appendChild(dialog)
	openDialogSafely(dialog)
	return close
}
