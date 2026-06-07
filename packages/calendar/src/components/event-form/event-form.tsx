import { Button } from '@ilamy/ui/components/button'
import { Checkbox } from '@ilamy/ui/components/checkbox'
import { DialogFooter } from '@ilamy/ui/components/dialog'
import { Input } from '@ilamy/ui/components/input'
import { Label } from '@ilamy/ui/components/label'
import { ScrollArea } from '@ilamy/ui/components/scroll-area'
import type React from 'react'
import { useEffect, useState } from 'react'
import {
	EventFormSlot,
	EventMutationScopeSlot,
} from '@/components/calendar-slots'
import type { CalendarEvent } from '@/components/types'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { isBusinessDay } from '@/features/calendar/utils/business-hours'
import {
	buildDateTime,
	buildEndDateTime,
	getTimeConstraints,
} from '@/features/calendar/utils/event-form-utils'
import { useEffectiveBusinessHours } from '@/hooks/use-effective-business-hours'
import { useScopedEventMutation } from '@/hooks/use-scoped-event-mutation'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'

const COLOR_OPTIONS = [
	{ value: 'bg-blue-100 text-blue-800', label: 'Blue' },
	{ value: 'bg-green-100 text-green-800', label: 'Green' },
	{ value: 'bg-purple-100 text-purple-800', label: 'Purple' },
	{ value: 'bg-red-100 text-red-800', label: 'Red' },
	{ value: 'bg-yellow-100 text-yellow-800', label: 'Yellow' },
	{ value: 'bg-pink-100 text-pink-800', label: 'Pink' },
	{ value: 'bg-indigo-100 text-indigo-800', label: 'Indigo' },
	{ value: 'bg-amber-100 text-amber-800', label: 'Amber' },
	{ value: 'bg-emerald-100 text-emerald-800', label: 'Emerald' },
	{ value: 'bg-sky-100 text-sky-800', label: 'Sky' },
	{ value: 'bg-violet-100 text-violet-800', label: 'Violet' },
	{ value: 'bg-rose-100 text-rose-800', label: 'Rose' },
	{ value: 'bg-teal-100 text-teal-800', label: 'Teal' },
	{ value: 'bg-orange-100 text-orange-800', label: 'Orange' },
]

type TextFieldName = 'title' | 'description' | 'location'

interface EventFormTextFieldProps {
	name: TextFieldName
	label: string
	placeholder: string
	value: string
	required?: boolean
	onChange: (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => void
}

// Shared title / description / location inputs (must live outside EventForm to keep focus).
const EventFormTextField = ({
	name,
	label,
	placeholder,
	value,
	required = false,
	onChange,
}: EventFormTextFieldProps) => (
	<div className="grid gap-1 sm:gap-2">
		<Label className="text-xs sm:text-sm" htmlFor={name}>
			{label}
		</Label>
		<Input
			className="h-8 text-sm sm:h-9"
			id={name}
			name={name}
			onChange={onChange}
			placeholder={placeholder}
			required={required}
			value={value}
		/>
	</div>
)

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

	const { t, timeFormat, getEventManager } = useSmartCalendarContext(
		(context) => ({
			t: context.t,
			timeFormat: context.timeFormat,
			getEventManager: context.getEventManager,
		})
	)
	const effectiveBusinessHours = useEffectiveBusinessHours(
		selectedEvent?.resourceId
	)

	const start = selectedEvent?.start ?? dayjs()
	const end = selectedEvent?.end ?? dayjs().add(1, 'hour')

	// Whether a plugin owns this event (gates the scoped edit/delete flow)
	const eventIsOwned = Boolean(selectedEvent && getEventManager(selectedEvent))

	// Form state
	const [startDate, setStartDate] = useState(start.toDate())
	const [endDate, setEndDate] = useState(end.toDate())
	const [isAllDay, setIsAllDay] = useState(selectedEvent?.allDay || false)
	const [selectedColor, setSelectedColor] = useState(
		selectedEvent?.color || COLOR_OPTIONS[0].value
	)

	// Time state
	const [startTime, setStartTime] = useState(start.format('HH:mm'))
	const [endTime, setEndTime] = useState(end.format('HH:mm'))

	// Initialize form values from selected event or defaults
	const [formValues, setFormValues] = useState({
		title: selectedEvent?.title || '',
		description: selectedEvent?.description || '',
		location: selectedEvent?.location || '',
	})

	// Generic draft of plugin-contributed fields (e.g. recurrence's rrule).
	// Plugins push their fields through the event-form slot's `onChange`.
	const [pluginUpdates, setPluginUpdates] = useState<Partial<CalendarEvent>>({})

	// The event as the plugin editors see it: the selected event plus any
	// in-progress plugin fields, so their inputs stay controlled.
	const draftEvent = { ...selectedEvent, ...pluginUpdates } as CalendarEvent
	const mergePluginUpdates = (updates: Partial<CalendarEvent>) =>
		setPluginUpdates((prev) => ({ ...prev, ...updates }))

	// Create wrapper functions to fix TypeScript errors with DatePicker
	const handleStartDateChange = (date: Date | undefined) => {
		if (!date) return
		setStartDate(date)
		if (dayjs(date).isAfter(dayjs(endDate))) {
			setEndDate(date)
		}
	}

	const handleEndDateChange = (date: Date | undefined) => {
		if (!date) return
		setEndDate(date)
		if (date && dayjs(date).isBefore(dayjs(startDate))) {
			setStartDate(date)
		}
	}

	// Time validation handlers - only validate when dates are the same
	const handleStartTimeChange = (time: string) => {
		setStartTime(time)
		// Only validate if same day
		if (dayjs(startDate).isSame(dayjs(endDate), 'day') && time > endTime) {
			setEndTime(time)
		}
	}

	const handleEndTimeChange = (time: string) => {
		setEndTime(time)
		// Only validate if same day
		if (dayjs(startDate).isSame(dayjs(endDate), 'day') && time < startTime) {
			setStartTime(time)
		}
	}

	// Update form values when input changes
	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target
		setFormValues((prev) => ({ ...prev, [name]: value }))
	}

	useEffect(() => {
		// Reset end time when all day is toggled to on
		if (isAllDay) {
			setEndTime('23:59')
		}
	}, [isAllDay])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const startDateTime = buildDateTime(startDate, startTime, isAllDay)
		const endDateTime = buildEndDateTime(endDate, endTime, isAllDay)

		const eventData: CalendarEvent = {
			id: selectedEvent?.id || dayjs().format('YYYYMMDDHHmmss'),
			title: formValues.title,
			start: startDateTime,
			end: endDateTime,
			resourceId: selectedEvent?.resourceId,
			description: formValues.description,
			location: formValues.location,
			allDay: isAllDay,
			color: selectedColor,
			...pluginUpdates,
		}

		if (selectedEvent?.id && eventIsOwned) {
			openEditDialog(selectedEvent, {
				title: formValues.title,
				start: startDateTime,
				end: endDateTime,
				description: formValues.description,
				location: formValues.location,
				allDay: isAllDay,
				color: selectedColor,
				...pluginUpdates,
			})
			return
		}

		if (selectedEvent?.id) {
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
		// A plugin owns this event (e.g. recurring): let it gather the delete
		// scope via its dialog; don't close the form yet.
		if (eventIsOwned) {
			openDeleteDialog(selectedEvent)
			return
		}
		onDelete?.(selectedEvent)
		onClose()
	}

	let disabledDateMatcher: ((date: Date) => boolean) | undefined
	if (effectiveBusinessHours) {
		disabledDateMatcher = (date) =>
			!isBusinessDay(dayjs(date), effectiveBusinessHours)
	}

	const startConstraints = getTimeConstraints(startDate, effectiveBusinessHours)
	const endConstraints = getTimeConstraints(endDate, effectiveBusinessHours)

	const dateFields = [
		['startDate', startDate, handleStartDateChange],
		['endDate', endDate, handleEndDateChange],
	] as const

	const timeFields = [
		[
			'startTime',
			'start-time',
			startTime,
			handleStartTimeChange,
			startConstraints,
		],
		['endTime', 'end-time', endTime, handleEndTimeChange, endConstraints],
	] as const

	return (
		<>
			<form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit}>
				<ScrollArea className="flex-1 min-h-0">
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
							name="description"
							onChange={handleInputChange}
							placeholder={t('eventDescriptionPlaceholder')}
							value={formValues.description}
						/>

						<div className="flex items-center space-x-2">
							<Checkbox
								checked={isAllDay}
								id="allDay"
								onCheckedChange={(checked) => setIsAllDay(checked === true)}
							/>
							<Label className="text-xs sm:text-sm" htmlFor="allDay">
								{t('allDay')}
							</Label>
						</div>

						<div className="grid grid-cols-2 gap-2 sm:gap-4">
							{dateFields.map(([label, date, onChange]) => (
								<div key={label}>
									<Label className="text-xs sm:text-sm">{t(label)}</Label>
									<DatePicker
										className="mt-1"
										closeOnSelect
										date={date}
										disabled={disabledDateMatcher}
										onChange={onChange}
									/>
								</div>
							))}
						</div>

						{!isAllDay && (
							<div className="grid grid-cols-2 gap-2 sm:gap-4">
								{timeFields.map(([label, name, value, onChange, c]) => (
									<div key={label}>
										<Label className="text-xs sm:text-sm">{t(label)}</Label>
										<TimePicker
											className="mt-1 h-8 text-sm sm:h-9"
											maxTime={c.max}
											minTime={c.min}
											name={name}
											onChange={onChange}
											placeholder={t('searchTime')}
											timeFormat={timeFormat}
											value={value}
										/>
									</div>
								))}
							</div>
						)}

						<div className="grid gap-1 sm:gap-2">
							<Label className="text-xs sm:text-sm">{t('color')}</Label>
							<div className="flex flex-wrap gap-2">
								{COLOR_OPTIONS.map((color) => (
									<Button
										aria-label={color.label}
										className={cn(
											`${color.value} h-6 w-6 rounded-full sm:h-8 sm:w-8`,
											selectedColor === color.value &&
												'ring-2 ring-black ring-offset-1 sm:ring-offset-2'
										)}
										key={color.value}
										onClick={() => setSelectedColor(color.value)}
										type="button"
										variant="ghost"
									/>
								))}
							</div>
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

				<DialogFooter className="mt-4 shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:gap-0">
					{selectedEvent?.id && (
						<Button
							className="w-full sm:mr-auto sm:w-auto"
							onClick={handleDelete}
							size="sm"
							type="button"
							variant="destructive"
						>
							{t('delete')}
						</Button>
					)}
					<div className="flex w-full gap-2 sm:w-auto">
						<Button
							className="flex-1 sm:flex-none"
							onClick={onClose}
							size="sm"
							type="button"
							variant="outline"
						>
							{t('cancel')}
						</Button>
						<Button className="flex-1 sm:flex-none" size="sm" type="submit">
							{selectedEvent?.id ? t('update') : t('create')}
						</Button>
					</div>
				</DialogFooter>
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
