import type { CalendarEvent } from '@ilamy/types'
import { ColorPicker } from '@ilamy/ui/components/color-picker'
import { ScrollArea } from '@ilamy/ui/components/scroll-area'
import { now, resolveZone } from '@ilamy/utils/temporal'
import type React from 'react'
import { useState } from 'react'
import {
	EventFormSlot,
	EventMutationScopeSlot,
} from '@/components/calendar-slots'
import { useEventResource } from '@/features/event-form/hooks/use-event-resource'
import { useEventSchedule } from '@/features/event-form/hooks/use-event-schedule'
import {
	EVENT_COLOR_SWATCHES,
	generateEventId,
	isFormConstrainedByBusinessHours,
	resolveColorFields,
	resolveInitialColor,
	withNewEventDefaults,
} from '@/features/event-form/utils/event-form.utils'
import { useEffectiveBusinessHours } from '@/hooks/use-effective-business-hours'
import { useScopedEventMutation } from '@/hooks/use-scoped-event-mutation'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useCalendarComponents } from '@/stores/calendar-theme-context'
import type { EventFormProps } from '@/types/calendar.types'
import { EventFormFooter } from './event-form-footer'
import { ResourceSelect } from './event-form-resource-select'
import { ScheduleFields } from './event-form-schedule'
import { EventFormTextField } from './event-form-text-field'

export type { EventFormProps }

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

	const {
		t,
		getEventManager,
		hasResourceAxis,
		timezone,
		eventConstraint,
		selectConstraint,
	} = useSmartCalendarContext((context) => ({
		t: context.t,
		getEventManager: context.getEventManager,
		hasResourceAxis: context.hasResourceAxis,
		timezone: context.timezone,
		eventConstraint: context.eventConstraint,
		selectConstraint: context.selectConstraint,
	}))
	const { Label } = useCalendarComponents()
	const zone = resolveZone(timezone)

	const defaultEvent = withNewEventDefaults(selectedEvent, zone)
	const {
		id: selectedEventId,
		resourceId,
		resourceIds,
		start,
		end,
		allDay: initialAllDay,
		color: initialColor,
		backgroundColor: initialBackgroundColor,
		title: initialTitle,
		description: initialDescription,
		location: initialLocation,
	} = defaultEvent

	const {
		selectedResourceId,
		setSelectedResourceId,
		effectiveResourceId,
		resourceFields,
		showResourceSelector,
		isResourceMissing,
	} = useEventResource({ resourceId, resourceIds, hasResourceAxis })

	const effectiveBusinessHours = useEffectiveBusinessHours(effectiveResourceId)
	const isExistingEvent = Boolean(selectedEventId)
	// Business hours only shade by default (4.0.5); form limits follow
	// `eventConstraint` / `selectConstraint`.
	const isBusinessHoursConstrained = isFormConstrainedByBusinessHours(
		isExistingEvent,
		eventConstraint,
		selectConstraint
	)
	let constrainedBusinessHours: typeof effectiveBusinessHours
	if (isBusinessHoursConstrained) {
		constrainedBusinessHours = effectiveBusinessHours
	}

	const eventIsOwned = Boolean(selectedEvent && getEventManager(selectedEvent))

	const schedule = useEventSchedule({
		start,
		end,
		initialAllDay,
		isExistingEvent,
		timezone: zone,
	})
	const { buildScheduleFields } = schedule

	const [selectedColor, setSelectedColor] = useState(
		resolveInitialColor(initialBackgroundColor, initialColor)
	)
	const [colorPicked, setColorPicked] = useState(false)
	const hadInitialColor = Boolean(initialColor || initialBackgroundColor)

	const handleColorChange = (color: string) => {
		setSelectedColor(color)
		setColorPicked(true)
	}

	const [formValues, setFormValues] = useState({
		title: initialTitle,
		description: initialDescription,
		location: initialLocation,
	})

	const [pluginUpdates, setPluginUpdates] = useState<Partial<CalendarEvent>>({})
	const draftEvent: CalendarEvent = { ...defaultEvent, ...pluginUpdates }
	const mergePluginUpdates = (updates: Partial<CalendarEvent>) =>
		setPluginUpdates((prev) => ({ ...prev, ...updates }))

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target
		setFormValues((prev) => ({ ...prev, [name]: value }))
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (isResourceMissing) {
			return
		}

		const colorFields = resolveColorFields({
			colorChanged: colorPicked,
			hadInitialColor,
			selectedColor,
			initialBackgroundColor,
			initialColor,
		})

		const editedFields = {
			title: formValues.title,
			...buildScheduleFields(),
			...resourceFields,
			description: formValues.description,
			location: formValues.location,
			...pluginUpdates,
		}

		if (selectedEvent?.id && eventIsOwned) {
			openEditDialog(selectedEvent, { color: selectedColor, ...editedFields })
			return
		}

		const eventData: CalendarEvent = {
			id: selectedEventId || generateEventId(now(zone)),
			...colorFields,
			...editedFields,
		}
		if (selectedEventId) {
			onUpdate?.(eventData)
		} else {
			onAdd?.(eventData)
		}
		onClose()
	}

	const handleDelete = () => {
		if (!selectedEvent?.id) {
			return
		}
		if (eventIsOwned) {
			openDeleteDialog(selectedEvent)
			return
		}
		onDelete?.(selectedEvent)
		onClose()
	}

	return (
		<>
			<form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit}>
				<ScrollArea
					className="flex-1 min-h-0 overflow-hidden"
					viewPortProps={{ className: 'max-h-[calc(90vh-10rem)]' }}
				>
					<div className="grid gap-3 sm:gap-4 p-1">
						<EventFormTextField
							label={t('title')}
							name="title"
							onChange={handleInputChange}
							placeholder={t('eventTitlePlaceholder')}
							required
							value={formValues.title}
						/>
						<EventFormTextField
							label={t('description')}
							multiline
							name="description"
							onChange={handleInputChange}
							placeholder={t('eventDescriptionPlaceholder')}
							value={formValues.description}
						/>

						{showResourceSelector && (
							<ResourceSelect
								onChange={setSelectedResourceId}
								value={selectedResourceId}
							/>
						)}

						<ScheduleFields
							businessHours={constrainedBusinessHours}
							schedule={schedule}
							timezone={zone}
						/>

						<div className="grid gap-1 sm:gap-2">
							<Label className="text-xs sm:text-sm">{t('color')}</Label>
							<ColorPicker
								aria-label={t('color')}
								onChange={handleColorChange}
								swatches={EVENT_COLOR_SWATCHES}
								value={selectedColor}
							/>
						</div>

						<EventFormTextField
							label={t('location')}
							name="location"
							onChange={handleInputChange}
							placeholder={t('eventLocationPlaceholder')}
							value={formValues.location}
						/>

						{/* Plugin-provided form sections (e.g. the recurrence editor). */}
						<EventFormSlot event={draftEvent} onChange={mergePluginUpdates} />
					</div>
				</ScrollArea>

				<EventFormFooter
					isExistingEvent={isExistingEvent}
					isSubmitDisabled={isResourceMissing}
					onClose={onClose}
					onDelete={handleDelete}
				/>
			</form>

			{/* Scope dialog, provided by the owning plugin (e.g. recurrence) */}
			<EventMutationScopeSlot
				dialog={dialogState}
				onCancel={closeDialog}
				onResolve={handleConfirm}
			/>
		</>
	)
}
