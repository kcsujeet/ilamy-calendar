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
import { isRecurringEvent } from '../core/dom-events.utils'
import { createEl } from '../core/dom-styles.utils'
import type {
	DomCalendarEvent,
	DomCalendarEventInput,
	DomEventFormRenderContext,
	DomRRuleInput,
	DomRuntime,
} from '../dom-calendar.types'
import { renderDomEventBar } from '../views/dom-event-bar'
import { createColorPickerField } from './dom-color-picker'
import { createDomDatePickerField } from './dom-date-picker'
import {
	createDialogHeader,
	createLabeledField,
	createManagedDialog,
	createSelectControl,
	INPUT_CLASS,
	openDialogSafely,
	TEXTAREA_CLASS,
} from './dom-dialog-shell'
import { createRepeatSection } from './dom-repeat-section'
import { openDomScopeDialog } from './dom-scope-dialog'
import { createDomTimePickerField } from './dom-time-picker'

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
			let endDay = add(rawEndDay, 1, 'day')
			if (isBefore(rawEndDay, startDay, 'day')) {
				endDay = add(startDay, 1, 'day')
			}
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
	let displayEndZoned = rawEndZoned
	if (
		defaults.initialAllDay &&
		!isBefore(rawEndZoned, add(startZoned, 1, 'day'), 'day')
	) {
		displayEndZoned = add(rawEndZoned, -1, 'day')
	}
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
		id: params.existing?.id ?? `evt-${Date.now()}`,
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
			close,
			dialog
		)
	)

	const { titleInput, descInput, locationInput } =
		createBasicTextInputs(existing)
	titleInput.setAttribute('autofocus', '')
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
	let resourceField: HTMLElement | null = null
	if (resourceSelect) {
		resourceField = createLabeledField('Resource', 'resource', resourceSelect)
	}

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
				resourceField,
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

/** Opens the create/edit event modal dialog (or delegates to `options.renderEventForm`). */
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
		let onDelete: DomEventFormRenderContext['onDelete']
		if (defaults.existing) {
			onDelete = (target, scope) => {
				runtime.commitDelete(target, scope)
				close()
			}
		}
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
			onDelete,
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

/** Opens the `+N More` overflow dialog listing all events for a day as clickable pills. */
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

	const header = createDialogHeader(title, undefined, close, dialog)
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
