import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { CalendarEvent } from '../types'
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
			<DialogContent className="flex flex-col h-[90vh] w-[90vw] max-w-[500px] p-4 sm:p-6 overflow-hidden gap-0">
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
