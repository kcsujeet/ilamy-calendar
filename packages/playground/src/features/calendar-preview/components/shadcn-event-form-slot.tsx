import type { CalendarEventInput, EventFormSlotContext } from '@ilamy/calendar'
import { Button } from '../../../components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from '../../../components/ui/dialog'
import { type FormEvent, useEffect, useState } from 'react'

/** shadcn / Radix dialog region slot demonstrating `slots.eventForm` in React. */
export function ShadcnEventFormSlot({
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
	const [description, setDescription] = useState('')

	useEffect(() => {
		if (!open) return
		setTitle(event?.title ?? '')
		setDescription(event?.description ?? '')
	}, [open, event])

	const handleSubmit = (submitEvent: FormEvent) => {
		submitEvent.preventDefault()
		const payload: CalendarEventInput = {
			id: event?.id ?? `shadcn-${Date.now()}`,
			title: title.trim() || 'Untitled Event',
			start: event?.start ?? initialStart,
			end: event?.end ?? initialEnd,
			allDay: event?.allDay ?? initialAllDay,
			resourceId: event?.resourceId ?? initialResourceId,
			description,
		}
		if (event) {
			onUpdate(event.id, payload)
		} else {
			onAdd(payload)
		}
		onClose()
	}

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent data-testid="shadcn-event-form-dialog">
				<DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
				<p className="text-xs text-muted-foreground">
					Rendered via <code className="font-mono">slots.eventForm</code> using
					shadcn Dialog
				</p>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-1.5">
						<label
							className="block text-sm font-medium"
							htmlFor="shadcn-slot-title"
						>
							Title
						</label>
						<input
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							data-testid="shadcn-form-title"
							id="shadcn-slot-title"
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Event title"
							type="text"
							value={title}
						/>
					</div>
					<div className="space-y-1.5">
						<label
							className="block text-sm font-medium"
							htmlFor="shadcn-slot-desc"
						>
							Description
						</label>
						<textarea
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-20"
							data-testid="shadcn-form-description"
							id="shadcn-slot-desc"
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional details"
							value={description}
						/>
					</div>
					<div className="flex items-center justify-end gap-2 pt-2">
						{event && onDelete && (
							<Button
								className="mr-auto"
								data-testid="shadcn-form-delete"
								onClick={() => {
									onDelete(event.id)
									onClose()
								}}
								size="sm"
								type="button"
								variant="destructive"
							>
								Delete
							</Button>
						)}
						<Button
							data-testid="shadcn-form-cancel"
							onClick={onClose}
							size="sm"
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button data-testid="shadcn-form-save" size="sm" type="submit">
							{event ? 'Update' : 'Create'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
