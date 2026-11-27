import type {
	CalendarEventInput,
	CalendarSlots,
	EventFormSlotContext,
} from '@ilamy/calendar'
import { type FormEvent, useEffect, useState } from 'react'

/** Minimal React region-slot event form demonstrating the cross-framework slot contract. */
export function CustomReactEventFormSlot({
	open,
	event,
	initialStart,
	initialEnd,
	initialAllDay,
	initialResourceId,
	onAdd,
	onUpdate,
	onDelete,
	onClose,
}: EventFormSlotContext) {
	const [title, setTitle] = useState('')

	useEffect(() => {
		if (!open) return
		setTitle(event?.title ?? '')
	}, [open, event])

	useEffect(() => {
		if (!open) return
		const onKey = (evt: KeyboardEvent) => {
			if (evt.key === 'Escape') {
				evt.stopPropagation()
				onClose()
			}
		}
		window.addEventListener('keydown', onKey, true)
		return () => window.removeEventListener('keydown', onKey, true)
	}, [open, onClose])

	if (!open) return null

	const handleSubmit = (submitEvent: FormEvent) => {
		submitEvent.preventDefault()
		const payload: CalendarEventInput = {
			id: event?.id ?? `custom-slot-${Date.now()}`,
			title: title.trim() || 'Untitled Event',
			start: event?.start ?? initialStart,
			end: event?.end ?? initialEnd,
			allDay: event?.allDay ?? initialAllDay,
			resourceId: event?.resourceId ?? initialResourceId,
		}
		if (event) {
			onUpdate(event.id, payload)
		} else {
			onAdd(payload)
		}
		onClose()
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div
				aria-labelledby="custom-slot-dialog-title"
				aria-modal="true"
				className="w-full max-w-md rounded-lg border border-border bg-background p-6 text-foreground shadow-xl"
				data-testid="custom-event-form-dialog"
				role="dialog"
			>
				<h3 className="text-base font-semibold" id="custom-slot-dialog-title">
					{event ? 'Edit Event' : 'Create Event'}
				</h3>
				<p className="mt-1 text-xs text-muted-foreground">
					Custom <code className="font-mono">slots.eventForm</code> region
				</p>
				<form className="mt-4 space-y-4" onSubmit={handleSubmit}>
					<div>
						<label
							className="mb-1 block text-sm font-medium"
							htmlFor="custom-slot-title-input"
						>
							Title
						</label>
						<input
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
							data-testid="custom-slot-form-title"
							id="custom-slot-title-input"
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Event title"
							type="text"
							value={title}
						/>
					</div>
					<div className="flex items-center justify-end gap-2">
						{event && onDelete && (
							<button
								className="mr-auto rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-white cursor-pointer"
								data-testid="custom-slot-form-delete"
								onClick={() => {
									onDelete(event.id)
									onClose()
								}}
								type="button"
							>
								Delete
							</button>
						)}
						<button
							className="rounded-md border border-border px-3 py-1.5 text-xs font-medium cursor-pointer"
							data-testid="custom-slot-form-cancel"
							onClick={onClose}
							type="button"
						>
							Cancel
						</button>
						<button
							className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground cursor-pointer"
							data-testid="custom-slot-form-save"
							type="submit"
						>
							{event ? 'Update' : 'Create'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

/**
 * Framework-agnostic `CalendarSlots` mount used by Vue, Svelte, Solid, and Angular
 * when Components = Custom Slot is selected in the playground.
 */
export function createFrameworkCustomSlots(): CalendarSlots {
	return {
		eventForm: {
			mount: (host, initialProps) => {
				let currentProps = initialProps
				const backdrop = document.createElement('div')
				backdrop.className =
					'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
				backdrop.style.display = 'none'

				const dialog = document.createElement('div')
				dialog.setAttribute('role', 'dialog')
				dialog.setAttribute('aria-modal', 'true')
				dialog.setAttribute('data-testid', 'custom-event-form-dialog')
				dialog.className =
					'w-full max-w-md rounded-lg border border-border bg-background p-6 text-foreground shadow-xl'

				const heading = document.createElement('h3')
				heading.className = 'text-base font-semibold'

				const subtitle = document.createElement('p')
				subtitle.className = 'mt-1 text-xs text-muted-foreground'
				subtitle.textContent =
					'Custom slots.eventForm region (framework-agnostic)'

				const form = document.createElement('form')
				form.className = 'mt-4 space-y-4'

				const label = document.createElement('label')
				label.className = 'mb-1 block text-sm font-medium'
				label.textContent = 'Title'
				label.htmlFor = 'dom-custom-slot-title'

				const input = document.createElement('input')
				input.id = 'dom-custom-slot-title'
				input.type = 'text'
				input.placeholder = 'Event title'
				input.setAttribute('data-testid', 'custom-slot-form-title')
				input.className =
					'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground'

				const actions = document.createElement('div')
				actions.className = 'flex items-center justify-end gap-2'

				const deleteBtn = document.createElement('button')
				deleteBtn.type = 'button'
				deleteBtn.textContent = 'Delete'
				deleteBtn.setAttribute('data-testid', 'custom-slot-form-delete')
				deleteBtn.className =
					'mr-auto rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-white cursor-pointer'

				const cancelBtn = document.createElement('button')
				cancelBtn.type = 'button'
				cancelBtn.textContent = 'Cancel'
				cancelBtn.setAttribute('data-testid', 'custom-slot-form-cancel')
				cancelBtn.className =
					'rounded-md border border-border px-3 py-1.5 text-xs font-medium cursor-pointer'

				const saveBtn = document.createElement('button')
				saveBtn.type = 'submit'
				saveBtn.setAttribute('data-testid', 'custom-slot-form-save')
				saveBtn.className =
					'rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground cursor-pointer'

				actions.append(deleteBtn, cancelBtn, saveBtn)
				form.append(label, input, actions)
				dialog.append(heading, subtitle, form)
				backdrop.append(dialog)
				host.append(backdrop)

				const onEscape = (evt: KeyboardEvent) => {
					if (evt.key === 'Escape' && currentProps.open) {
						evt.stopPropagation()
						currentProps.onClose()
					}
				}
				window.addEventListener('keydown', onEscape, true)

				cancelBtn.addEventListener('click', () => currentProps.onClose())
				deleteBtn.addEventListener('click', () => {
					if (currentProps.event && currentProps.onDelete) {
						currentProps.onDelete(currentProps.event.id)
					}
					currentProps.onClose()
				})
				form.addEventListener('submit', (evt) => {
					evt.preventDefault()
					const ev = currentProps.event
					const payload: CalendarEventInput = {
						id: ev?.id ?? `custom-slot-${Date.now()}`,
						title: input.value.trim() || 'Untitled Event',
						start: ev?.start ?? currentProps.initialStart,
						end: ev?.end ?? currentProps.initialEnd,
						allDay: ev?.allDay ?? currentProps.initialAllDay,
						resourceId: ev?.resourceId ?? currentProps.initialResourceId,
					}
					if (ev) {
						currentProps.onUpdate(ev.id, payload)
					} else {
						currentProps.onAdd(payload)
					}
					currentProps.onClose()
				})

				const sync = (next: EventFormSlotContext) => {
					const wasOpen = currentProps.open && backdrop.style.display === 'flex'
					currentProps = next
					backdrop.style.display = next.open ? 'flex' : 'none'
					if (!next.open) return
					heading.textContent = next.event ? 'Edit Event' : 'Create Event'
					saveBtn.textContent = next.event ? 'Update' : 'Create'
					deleteBtn.style.display = next.event && next.onDelete ? '' : 'none'
					if (!wasOpen) {
						input.value = next.event?.title ?? ''
					}
				}
				sync(initialProps)

				return {
					update: sync,
					destroy: () => {
						window.removeEventListener('keydown', onEscape, true)
						backdrop.remove()
					},
				}
			},
		},
	}
}
