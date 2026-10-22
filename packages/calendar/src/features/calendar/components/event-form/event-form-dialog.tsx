import type { CalendarEvent } from '@ilamy/types'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@ilamy/ui/components/dialog'
import { useRef } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { EventForm } from './event-form'

export const EventFormDialog = () => {
	const {
		t,
		selectedEvent,
		isEventFormOpen,
		closeEventForm,
		addEvent,
		updateEvent,
		deleteEvent,
		renderEventForm,
	} = useSmartCalendarContext((context) => ({
		t: context.t,
		selectedEvent: context.selectedEvent,
		isEventFormOpen: context.isEventFormOpen,
		closeEventForm: context.closeEventForm,
		addEvent: context.addEvent,
		updateEvent: context.updateEvent,
		deleteEvent: context.deleteEvent,
		renderEventForm: context.renderEventForm,
	}))

	// Radix returns focus to the dialog's `Trigger`, and this dialog is opened
	// from the calendar's state, not from a trigger, so on close focus fell to
	// <body>. Remember what had focus when the form opened and give it back, as
	// the WAI-ARIA dialog pattern asks: "When a dialog closes, focus returns to
	// the element that invoked the dialog".
	// https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
	const invokerRef = useRef<Element | null>(null)

	// `onOpenAutoFocus` runs before focus moves into the dialog.
	const rememberInvoker = () => {
		invokerRef.current = document.activeElement
	}

	const handleCloseAutoFocus = (event: Event) => {
		event.preventDefault()
		if (invokerRef.current instanceof HTMLElement) {
			invokerRef.current.focus()
		}
	}

	const handleOnUpdate = (event: CalendarEvent) => {
		updateEvent(event.id, event)
	}

	const handleOnDelete = (event: CalendarEvent) => {
		deleteEvent(event.id)
	}

	const eventFormProps = {
		open: isEventFormOpen,
		onClose: closeEventForm,
		selectedEvent,
		onAdd: addEvent,
		onUpdate: handleOnUpdate,
		onDelete: handleOnDelete,
	}

	if (renderEventForm) {
		return renderEventForm(eventFormProps)
	}

	return (
		<Dialog onOpenChange={closeEventForm} open={isEventFormOpen}>
			<DialogContent
				className="flex flex-col h-[90vh] w-[90vw] max-w-[500px] p-4 sm:p-6 overflow-hidden gap-0"
				onCloseAutoFocus={handleCloseAutoFocus}
				onOpenAutoFocus={rememberInvoker}
			>
				<DialogHeader className="mb-2 sm:mb-4 shrink-0">
					<DialogTitle className="text-base sm:text-lg">
						{selectedEvent?.id ? t('editEvent') : t('createEvent')}
					</DialogTitle>
					<DialogDescription className="text-xs sm:text-sm">
						{selectedEvent?.id ? t('editEventDetails') : t('addNewEvent')}
					</DialogDescription>
				</DialogHeader>

				<EventForm {...eventFormProps} />
			</DialogContent>
		</Dialog>
	)
}
