import { valibotResolver } from '@hookform/resolvers/valibot'
import type { CalendarEvent } from '@ilamy/types'
import { ScrollArea } from '@ilamy/ui/components/scroll-area'
import dayjs from '@ilamy/utils/dayjs'
import type React from 'react'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import {
	EventFormSlot,
	EventMutationScopeSlot,
} from '@/components/calendar-slots'
import { FormInput } from '@/components/form/form-input'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useScopedEventMutation } from '@/hooks/use-scoped-event-mutation'
import { EventColorField } from './event-color-field'
import { EventDateTimeFields } from './event-date-time-fields'
import { EventFormFooter } from './event-form-footer'
import {
	type EventFormValues,
	eventFormSchema,
	toEventFields,
	toEventFormValues,
} from './event-form-schema'
import { EventResourceField } from './event-resource-field'

export interface EventFormProps {
	open?: boolean
	selectedEvent?: CalendarEvent | null
	onAdd?: (event: CalendarEvent) => void
	onUpdate?: (event: CalendarEvent) => void
	onDelete?: (event: CalendarEvent) => void
	onClose: () => void
}

export const EventForm: React.FC<EventFormProps> = ({
	selectedEvent,
	onClose,
	onUpdate,
	onDelete,
	onAdd,
}) => {
	const {
		dialogState,
		openEditDialog,
		openDeleteDialog,
		closeDialog,
		handleConfirm,
	} = useScopedEventMutation(onClose)

	const { t, getEventManager, resources } = useSmartCalendarContext(
		(context) => ({
			t: context.t,
			getEventManager: context.getEventManager,
			resources: context.resources ?? [],
		})
	)

	const methods = useForm<EventFormValues>({
		resolver: valibotResolver(eventFormSchema),
		defaultValues: toEventFormValues(selectedEvent),
	})
	const { handleSubmit } = methods

	const selectedEventId = selectedEvent?.id
	const hasResources = resources.length > 0
	const initialSelectedResourceId =
		selectedEvent?.resourceId ?? selectedEvent?.resourceIds?.at(0)
	const showResourceSelector =
		hasResources && initialSelectedResourceId === undefined

	// Whether a plugin owns this event (gates the scoped edit/delete flow).
	const eventIsOwned = Boolean(selectedEvent && getEventManager(selectedEvent))

	// Generic draft of plugin-contributed fields (e.g. recurrence's rrule).
	// Plugins push their fields through the event-form slot's `onChange`.
	const [pluginUpdates, setPluginUpdates] = useState<Partial<CalendarEvent>>({})
	const draftEvent = { ...selectedEvent, ...pluginUpdates } as CalendarEvent
	const mergePluginUpdates = (updates: Partial<CalendarEvent>) =>
		setPluginUpdates((prev) => ({ ...prev, ...updates }))

	// Route the built fields to the right place: a plugin-owned event opens the
	// scope dialog; otherwise it's a direct add or update.
	const persistEvent = (fields: Partial<CalendarEvent>) => {
		if (selectedEventId && eventIsOwned) {
			openEditDialog(selectedEvent as CalendarEvent, fields)
			return
		}

		const eventData = {
			id: selectedEventId || dayjs().format('YYYYMMDDHHmmss'),
			...fields,
		} as CalendarEvent

		if (selectedEventId) {
			onUpdate?.(eventData)
		} else {
			onAdd?.(eventData)
		}
		onClose()
	}

	const onSubmit = handleSubmit((values) => {
		if (showResourceSelector && values.resourceId === undefined) {
			return
		}
		persistEvent(
			toEventFields(values, {
				hasResources,
				fallbackResourceId: selectedEvent?.resourceId,
				pluginUpdates,
			})
		)
	})

	const handleDelete = () => {
		if (!selectedEvent?.id) {
			return
		}
		// A plugin owns this event (e.g. recurring): let it gather the delete
		// scope via its dialog; don't close the form yet.
		if (eventIsOwned) {
			openDeleteDialog(selectedEvent)
			return
		}
		onDelete?.(selectedEvent)
		onClose()
	}

	return (
		<FormProvider {...methods}>
			<form className="flex flex-col flex-1 min-h-0" onSubmit={onSubmit}>
				<ScrollArea className="flex-1 min-h-0">
					<div className="grid gap-3 sm:gap-4 p-1">
						<FormInput
							label={t('title')}
							name="title"
							placeholder={t('eventTitlePlaceholder')}
						/>
						<FormInput
							label={t('description')}
							name="description"
							placeholder={t('eventDescriptionPlaceholder')}
						/>

						{showResourceSelector && <EventResourceField />}

						<EventDateTimeFields />

						<EventColorField />

						<FormInput
							label={t('location')}
							name="location"
							placeholder={t('eventLocationPlaceholder')}
						/>

						{/* Plugin-provided form sections (e.g. the recurrence editor). */}
						<EventFormSlot event={draftEvent} onChange={mergePluginUpdates} />
					</div>
				</ScrollArea>

				<EventFormFooter
					isEdit={Boolean(selectedEventId)}
					onCancel={onClose}
					onDelete={handleDelete}
					requiresResource={showResourceSelector}
				/>
			</form>

			{/* Scope dialog, provided by the owning plugin (e.g. recurrence) */}
			<EventMutationScopeSlot
				dialog={dialogState}
				onCancel={closeDialog}
				onResolve={handleConfirm}
			/>
		</FormProvider>
	)
}
