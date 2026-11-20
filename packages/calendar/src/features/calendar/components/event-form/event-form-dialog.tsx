import type { CalendarEvent } from '@ilamy/types'
import { useRef } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useCalendarComponents } from '@/features/calendar/stores/calendar-theme-context'
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
	const { Dialog } = useCalendarComponents()

	// WAI-ARIA dialog pattern: return focus to the element that invoked the
	// dialog when it closes (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
	const invokerRef = useRef<Element | null>(null)

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
		<Dialog
			className="flex flex-col max-h-[90vh] w-[90vw] max-w-[500px] p-4 sm:p-6 overflow-hidden gap-0"
			description={selectedEvent?.id ? t('editEventDetails') : t('addNewEvent')}
			onCloseAutoFocus={handleCloseAutoFocus}
			onOpenAutoFocus={rememberInvoker}
			onOpenChange={(open) => {
				if (!open) {
					closeEventForm()
				}
			}}
			open={isEventFormOpen}
			title={selectedEvent?.id ? t('editEvent') : t('createEvent')}
		>
			<EventForm {...eventFormProps} />
		</Dialog>
	)
}
