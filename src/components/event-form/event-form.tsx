import type React from 'react'
import { useEffect, useState } from 'react'
import type { CalendarEvent } from '@/components/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TimePicker } from '@/components/ui/time-picker'
import { isBusinessDay } from '@/features/calendar/utils/business-hours'
import {
	buildDateTime,
	buildEndDateTime,
	getTimeConstraints,
} from '@/features/calendar/utils/event-form-utils'
import { RecurrenceEditDialog } from '@/features/recurrence/components/recurrence-edit-dialog'
import { RecurrenceEditor } from '@/features/recurrence/components/recurrence-editor/recurrence-editor'
import { useRecurringEventActions } from '@/features/recurrence/hooks/useRecurringEventActions'
import type { RRuleOptions } from '@/features/recurrence/types'
import { isRecurringEvent } from '@/features/recurrence/utils/recurrence-handler'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'

const COLOR_OPTIONS = [
	{
		value: `bg-blue-100 text-blue-800`,
		label: 'Blue',
	},
	{
		value: `bg-green-100 text-green-800`,
		label: 'Green',
	},
	{
		value: `bg-purple-100 text-purple-800`,
		label: 'Purple',
	},
	{
		value: `bg-red-100 text-red-800`,
		label: 'Red',
	},
	{
		value: `bg-yellow-100 text-yellow-800`,
		label: 'Yellow',
	},
	{
		value: `bg-pink-100 text-pink-800`,
		label: 'Pink',
	},
	{
		value: `bg-indigo-100 text-indigo-800`,
		label: 'Indigo',
	},
	{
		value: `bg-amber-100 text-amber-800`,
		label: 'Amber',
	},
	{
		value: `bg-emerald-100 text-emerald-800`,
		label: 'Emerald',
	},
	{
		value: `bg-sky-100 text-sky-800`,
		label: 'Sky',
	},
	{
		value: `bg-violet-100 text-violet-800`,
		label: 'Violet',
	},
	{
		value: `bg-rose-100 text-rose-800`,
		label: 'Rose',
	},
	{
		value: `bg-teal-100 text-teal-800`,
		label: 'Teal',
	},
	{
		value: `bg-orange-100 text-orange-800`,
		label: 'Orange',
	},
]

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
	} = useRecurringEventActions(onClose)

	const { findParentRecurringEvent, t, businessHours, timeFormat } =
		useSmartCalendarContext((context) => ({
			findParentRecurringEvent: context.findParentRecurringEvent,
			t: context.t,
			businessHours: context.businessHours,
			timeFormat: context.timeFormat,
		}))

	const start = selectedEvent?.start ?? dayjs()
	const end = selectedEvent?.end ?? dayjs().add(1, 'hour')

	// Find parent event if this is a recurring event instance
	const parentEvent = selectedEvent
		? findParentRecurringEvent(selectedEvent)
		: null

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

	// Recurrence state - pull RRULE from parent if this is an instance
	const [rrule, setRrule] = useState<RRuleOptions | null>(() => {
		const eventRrule = selectedEvent?.rrule || parentEvent?.rrule
		return eventRrule || null
	})

	// Create wrapper functions to fix TypeScript errors with DatePicker
	const handleStartDateChange = (date: Date | undefined) => {
		setStartDate(date)
		if (date && dayjs(date).isAfter(dayjs(endDate))) {
			setEndDate(date)
		}
	}

	const handleEndDateChange = (date: Date | undefined) => {
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
			rrule: rrule || undefined,
		}

		if (selectedEvent?.id && isRecurringEvent(selectedEvent)) {
			openEditDialog(selectedEvent, {
				title: formValues.title,
				start: startDateTime,
				end: endDateTime,
				description: formValues.description,
				location: formValues.location,
				allDay: isAllDay,
				color: selectedColor,
				rrule: rrule || undefined,
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
		if (selectedEvent?.id) {
			// Check if this is a recurring event
			if (isRecurringEvent(selectedEvent)) {
				// Show recurring event delete dialog
				openDeleteDialog(selectedEvent)
				return // Don't close the form yet, let the dialog handle it
			}
			onDelete?.(selectedEvent)
			onClose()
		}
	}

	const handleRRuleChange = (newRRule: RRuleOptions | null) => {
		if (!newRRule) {
			setRrule(null)
			return
		}
		const startDateTime = buildDateTime(startDate, startTime, isAllDay)
		setRrule({ ...newRRule, dtstart: startDateTime.toDate() })
	}

	const disabledDateMatcher = businessHours
		? (date: Date) => !isBusinessDay(dayjs(date), businessHours)
		: undefined

	const startConstraints = getTimeConstraints(startDate, businessHours)
	const endConstraints = getTimeConstraints(endDate, businessHours)

	return (
		<>
			<form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit}>
				<ScrollArea className="flex-1 min-h-0">
					<div className="grid gap-3 sm:gap-4 p-1">
						<div className="grid gap-2">
							<Label className="text-xs sm:text-sm" htmlFor="title">
								{t('title')}
							</Label>
							<Input
								className="h-8 text-sm sm:h-9"
								id="title"
								name="title"
								onChange={handleInputChange}
								placeholder={t('eventTitlePlaceholder')}
								required
								value={formValues.title}
							/>
						</div>

						<div className="grid gap-1 sm:gap-2">
							<Label className="text-xs sm:text-sm" htmlFor="description">
								{t('description')}
							</Label>
							<Input
								className="h-8 text-sm sm:h-9"
								id="description"
								name="description"
								onChange={handleInputChange}
								placeholder={t('eventDescriptionPlaceholder')}
								value={formValues.description}
							/>
						</div>

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
							<div>
								<Label className="text-xs sm:text-sm">{t('startDate')}</Label>
								<DatePicker
									className="mt-1"
									closeOnSelect
									date={startDate}
									disabled={disabledDateMatcher}
									onChange={handleStartDateChange}
								/>
							</div>
							<div>
								<Label className="text-xs sm:text-sm">{t('endDate')}</Label>
								<DatePicker
									className="mt-1"
									closeOnSelect
									date={endDate}
									disabled={disabledDateMatcher}
									onChange={handleEndDateChange}
								/>
							</div>
						</div>

						{!isAllDay && (
							<div className="grid grid-cols-2 gap-2 sm:gap-4">
								<div>
									<Label className="text-xs sm:text-sm">{t('startTime')}</Label>
									<TimePicker
										className="mt-1 h-8 text-sm sm:h-9"
										maxTime={startConstraints.max}
										minTime={startConstraints.min}
										name="start-time"
										onChange={handleStartTimeChange}
										placeholder={t('searchTime')}
										timeFormat={timeFormat}
										value={startTime}
									/>
								</div>
								<div>
									<Label className="text-xs sm:text-sm">{t('endTime')}</Label>
									<TimePicker
										className="mt-1 h-8 text-sm sm:h-9"
										maxTime={endConstraints.max}
										minTime={endConstraints.min}
										name="end-time"
										onChange={handleEndTimeChange}
										placeholder={t('searchTime')}
										timeFormat={timeFormat}
										value={endTime}
									/>
								</div>
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

						<div className="grid gap-1 sm:gap-2">
							<Label className="text-xs sm:text-sm" htmlFor="location">
								{t('location')}
							</Label>
							<Input
								className="h-8 text-sm sm:h-9"
								id="location"
								name="location"
								onChange={handleInputChange}
								placeholder={t('eventLocationPlaceholder')}
								value={formValues.location}
							/>
						</div>

						{/* Recurrence Section */}
						<RecurrenceEditor onChange={handleRRuleChange} value={rrule} />
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

			{/* Recurring Event Edit Dialog */}
			<RecurrenceEditDialog
				eventTitle={dialogState.event?.title || ''}
				isOpen={dialogState.isOpen}
				onClose={closeDialog}
				onConfirm={handleConfirm}
				operationType={dialogState.operationType}
			/>
		</>
	)
}
