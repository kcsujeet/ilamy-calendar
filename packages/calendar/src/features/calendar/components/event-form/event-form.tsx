import { isBusinessDay } from '@ilamy/core'
import type { CalendarEvent, IsoDateString } from '@ilamy/types'
import { ColorPicker } from '@ilamy/ui/components/color-picker'
import { ScrollArea } from '@ilamy/ui/components/scroll-area'
import { readableTextColor } from '@ilamy/utils/helpers'
import {
	add,
	isAfter,
	isBefore,
	isSameInstant,
	now,
	parseDate,
	resolveZone,
	startOf,
	subtract,
	toDate,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type React from 'react'
import { useState } from 'react'
import {
	EventFormSlot,
	EventMutationScopeSlot,
} from '@/features/calendar/components/calendar-slots'
import { DatePicker } from '@/features/calendar/components/date-picker'
import { TimePicker } from '@/features/calendar/components/time-picker'
import { useEffectiveBusinessHours } from '@/features/calendar/hooks/use-effective-business-hours'
import { useScopedEventMutation } from '@/features/calendar/hooks/use-scoped-event-mutation'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useCalendarComponents } from '@/features/calendar/stores/calendar-theme-context'
import {
	buildDateTime,
	buildEndDateTime,
	type FormSchedule,
	getTimeConstraints,
	keepEndAfterStart,
	openedLengthMinutes,
} from '@/features/calendar/utils/event-form-utils'
import { keys } from '@/features/calendar/utils/keys'

const DEFAULT_EVENT_COLOR = 'bg-blue-100 text-blue-800'

const EVENT_COLOR_SWATCHES = [
	{ value: DEFAULT_EVENT_COLOR, label: 'Blue' },
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

const END_OF_DAY = '23:59'
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const pad2 = (value: number): string => String(value).padStart(2, '0')

const formatClockTime = (date: ZonedDate): string =>
	`${pad2(date.hour)}:${pad2(date.minute)}`

const generateEventId = (date: ZonedDate): string =>
	`${date.year}${pad2(date.month)}${pad2(date.day)}${pad2(date.hour)}${pad2(date.minute)}${pad2(date.second)}`

const resolveInitialColor = (
	backgroundColor: string | undefined,
	color: string | undefined
): string => {
	if (backgroundColor && HEX_COLOR_PATTERN.test(backgroundColor)) {
		return backgroundColor
	}
	return color ?? DEFAULT_EVENT_COLOR
}

const buildColorFields = (
	color: string
): Pick<CalendarEvent, 'backgroundColor' | 'color'> => {
	if (HEX_COLOR_PATTERN.test(color)) {
		return { backgroundColor: color, color: readableTextColor(color) }
	}
	return { backgroundColor: undefined, color }
}

const resolveColorFields = ({
	colorChanged,
	hadInitialColor,
	selectedColor,
	initialBackgroundColor,
	initialColor,
}: {
	colorChanged: boolean
	hadInitialColor: boolean
	selectedColor: string
	initialBackgroundColor: string | undefined
	initialColor: string | undefined
}): Pick<CalendarEvent, 'backgroundColor' | 'color'> => {
	if (colorChanged || !hadInitialColor) {
		return buildColorFields(selectedColor)
	}
	return { backgroundColor: initialBackgroundColor, color: initialColor }
}

type TextFieldName = 'title' | 'description' | 'location'

interface EventFormTextFieldProps {
	name: TextFieldName
	label: string
	placeholder: string
	value: string
	required?: boolean
	multiline?: boolean
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
	multiline = false,
	onChange,
}: EventFormTextFieldProps) => {
	const { Input, Label, Textarea } = useCalendarComponents()
	return (
		<div className="grid gap-1 sm:gap-2">
			<Label className="text-xs sm:text-sm" htmlFor={name}>
				{label}
			</Label>
			{multiline ? (
				<Textarea
					className="min-h-16 text-sm"
					id={name}
					name={name}
					onChange={onChange}
					placeholder={placeholder}
					required={required}
					value={value}
				/>
			) : (
				<Input
					className="h-8 text-sm sm:h-9"
					id={name}
					name={name}
					onChange={onChange}
					placeholder={placeholder}
					required={required}
					value={value}
				/>
			)}
		</div>
	)
}

interface ResourceSelectProps {
	value: string | number | undefined
	onChange: (resourceId: string | number) => void
}

const ResourceSelect = ({ value, onChange }: ResourceSelectProps) => {
	const { t, resources } = useSmartCalendarContext((context) => ({
		t: context.t,
		resources: context.resources ?? [],
	}))
	const { Label, Select } = useCalendarComponents()
	const resolveResourceId = (selected: string): string | number => {
		const resource = resources.find((item) => String(item.id) === selected)
		return resource?.id ?? selected
	}
	const options = resources.map((resource) => ({
		value: String(resource.id),
		label: resource.title,
	}))

	return (
		<div className="grid gap-1 sm:gap-2">
			<Label className="text-xs sm:text-sm" htmlFor="resource">
				{t('resource')}
			</Label>
			<div data-testid="resource-select">
				<Select
					className="h-8 text-sm sm:h-9"
					id="resource"
					onValueChange={(selected) => onChange(resolveResourceId(selected))}
					options={options}
					placeholder={t('selectResource')}
					value={value !== undefined ? String(value) : ''}
				/>
			</div>
		</div>
	)
}

interface EventFormFooterProps {
	isExistingEvent: boolean
	isSubmitDisabled: boolean
	onDelete: () => void
	onClose: () => void
}

const EventFormFooter = ({
	isExistingEvent,
	isSubmitDisabled,
	onDelete,
	onClose,
}: EventFormFooterProps) => {
	const t = useSmartCalendarContext((context) => context.t)
	const { Button } = useCalendarComponents()

	return (
		<div className="mt-4 shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
			{isExistingEvent && (
				<Button
					className="w-full sm:mr-auto sm:w-auto"
					onClick={onDelete}
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
				<Button
					className="flex-1 sm:flex-none"
					disabled={isSubmitDisabled}
					size="sm"
					type="submit"
				>
					{isExistingEvent ? t('update') : t('create')}
				</Button>
			</div>
		</div>
	)
}

interface EventScheduleInput {
	start: IsoDateString
	end: IsoDateString
	initialAllDay: boolean
	isExistingEvent: boolean
	timezone: string
}

// The form's dates, times and all-day flag, and the rules that keep them consistent.
const useEventSchedule = ({
	start,
	end,
	initialAllDay,
	isExistingEvent,
	timezone,
}: EventScheduleInput) => {
	const startZoned = parseDate(start, timezone) ?? now(timezone)
	const endZoned = parseDate(end, timezone) ?? add(startZoned, 1, 'hour')

	// An all-day `end` is STORED exclusively, as the midnight after the last day
	// the event covers (#248), but the picker shows the user that last day.
	// `buildEndDateTime` converts back on save. An end that is not on a midnight
	// boundary predates this and is already inclusive, so it is shown untouched.
	const endsOnMidnight = isSameInstant(endZoned, startOf(endZoned, 'day'))
	const lastCoveredDay =
		initialAllDay && endsOnMidnight
			? startOf(subtract(endZoned, 1, 'day'), 'day')
			: endZoned

	const [startDate, setStartDate] = useState(() => toDate(startZoned))
	const [endDate, setEndDate] = useState(() => toDate(lastCoveredDay))
	const [isAllDay, setIsAllDay] = useState(initialAllDay)

	const [startTime, setStartTime] = useState(() => formatClockTime(startZoned))
	// An all-day event's end is a midnight, which reads as 23:59 of the last
	// day it covers, so unticking All day leaves a whole-day timed range.
	const [endTime, setEndTime] = useState(() =>
		initialAllDay ? END_OF_DAY : formatClockTime(endZoned)
	)

	// Whether the user touched any schedule field. An existing event saved with
	// its schedule untouched keeps the start and end it came with.
	const [isScheduleEdited, setIsScheduleEdited] = useState(false)

	const lengthMinutes = openedLengthMinutes(start, end, timezone)

	// RFC 5545 section 3.8.2.2: DTEND "MUST be later in time than" DTSTART.
	const applySchedule = (
		schedule: FormSchedule,
		movedEdge: 'start' | 'end'
	) => {
		const ordered = isAllDay
			? schedule
			: keepEndAfterStart(schedule, movedEdge, lengthMinutes, timezone)
		setStartDate(ordered.startDate)
		setStartTime(ordered.startTime)
		setEndDate(ordered.endDate)
		setEndTime(ordered.endTime)
		setIsScheduleEdited(true)
	}

	const current: FormSchedule = { startDate, startTime, endDate, endTime }

	const handleStartDateChange = (date: Date | undefined) => {
		if (!date) return
		const parsedNew = parseDate(date, timezone)
		const parsedEnd = parseDate(endDate, timezone)
		const isAfterEnd = Boolean(
			parsedNew && parsedEnd && isAfter(parsedNew, parsedEnd)
		)
		const endDay = isAfterEnd ? date : endDate
		applySchedule({ ...current, startDate: date, endDate: endDay }, 'start')
	}

	const handleEndDateChange = (date: Date | undefined) => {
		if (!date) return
		const parsedNew = parseDate(date, timezone)
		const parsedStart = parseDate(startDate, timezone)
		const isBeforeStart = Boolean(
			parsedNew && parsedStart && isBefore(parsedNew, parsedStart)
		)
		const startDay = isBeforeStart ? date : startDate
		applySchedule({ ...current, endDate: date, startDate: startDay }, 'end')
	}

	/**
	 * The End Date input means different things in the two modes: a boundary for a
	 * timed event, the last day COVERED for an all-day one. Switching to all-day
	 * steps a next-day midnight back to the previous day (#248).
	 */
	const handleAllDayChange = (checked: boolean) => {
		setIsAllDay(checked)
		setIsScheduleEdited(true)
		if (!(checked && endTime === '00:00')) {
			return
		}
		const zonedEnd = parseDate(endDate, timezone)
		const zonedStart = parseDate(startDate, timezone)
		if (!(zonedEnd && zonedStart && isAfter(zonedEnd, zonedStart, 'day'))) {
			return
		}
		setEndDate(toDate(startOf(subtract(zonedEnd, 1, 'day'), 'day')))
		setEndTime(END_OF_DAY)
	}

	const buildScheduleFields = () => {
		if (isExistingEvent && !isScheduleEdited) {
			return { start, end, allDay: initialAllDay }
		}
		return {
			start: buildDateTime(startDate, startTime, isAllDay, timezone),
			end: buildEndDateTime(endDate, endTime, isAllDay, timezone),
			allDay: isAllDay,
		}
	}

	const handleStartTimeChange = (time: string) =>
		applySchedule({ ...current, startTime: time }, 'start')

	const handleEndTimeChange = (time: string) =>
		applySchedule({ ...current, endTime: time }, 'end')

	return {
		startDate,
		endDate,
		isAllDay,
		buildScheduleFields,
		startTime,
		endTime,
		handleStartDateChange,
		handleEndDateChange,
		handleAllDayChange,
		handleStartTimeChange,
		handleEndTimeChange,
	}
}

type EventSchedule = ReturnType<typeof useEventSchedule>

interface ScheduleFieldsProps {
	schedule: EventSchedule
	businessHours: ReturnType<typeof useEffectiveBusinessHours>
	timezone: string
}

// The all-day checkbox, the date pickers, and the time pickers a timed event needs.
const ScheduleFields = ({
	schedule,
	businessHours,
	timezone,
}: ScheduleFieldsProps) => {
	const { t, timeFormat } = useSmartCalendarContext((context) => ({
		t: context.t,
		timeFormat: context.timeFormat,
	}))
	const { Checkbox, Label } = useCalendarComponents()
	const {
		startDate,
		endDate,
		isAllDay,
		startTime,
		endTime,
		handleStartDateChange,
		handleEndDateChange,
		handleAllDayChange,
		handleStartTimeChange,
		handleEndTimeChange,
	} = schedule

	let disabledDateMatcher: ((date: Date) => boolean) | undefined
	if (businessHours) {
		disabledDateMatcher = (date) => {
			const zoned = parseDate(date, timezone)
			return zoned ? !isBusinessDay(zoned, businessHours) : false
		}
	}

	const startConstraints = getTimeConstraints(
		startDate,
		businessHours,
		timezone
	)
	const endConstraints = getTimeConstraints(endDate, businessHours, timezone)

	const dateFields = [
		['startDate', 'start-date', startDate, handleStartDateChange],
		['endDate', 'end-date', endDate, handleEndDateChange],
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
			<div className="flex items-center space-x-2">
				<Checkbox
					checked={isAllDay}
					id="allDay"
					onCheckedChange={handleAllDayChange}
				/>
				<Label className="text-xs sm:text-sm" htmlFor="allDay">
					{t('allDay')}
				</Label>
			</div>

			<div className="grid grid-cols-2 gap-2 sm:gap-4">
				{dateFields.map(([label, name, date, onChange]) => (
					<div key={label}>
						<Label
							className="text-xs sm:text-sm"
							htmlFor={name}
							id={keys.fieldLabel(name)}
						>
							{t(label)}
						</Label>
						<DatePicker
							className="mt-1"
							closeOnSelect
							date={date}
							disabled={disabledDateMatcher}
							id={name}
							labelId={keys.fieldLabel(name)}
							onChange={onChange}
						/>
					</div>
				))}
			</div>

			{!isAllDay && (
				<div className="grid grid-cols-2 gap-2 sm:gap-4">
					{timeFields.map(([label, name, value, onChange, c]) => (
						<div key={label}>
							<Label
								className="text-xs sm:text-sm"
								htmlFor={name}
								id={keys.fieldLabel(name)}
							>
								{t(label)}
							</Label>
							<TimePicker
								className="mt-1 h-8 text-sm sm:h-9"
								id={name}
								labelId={keys.fieldLabel(name)}
								maxTime={c.max}
								minTime={c.min}
								name={name}
								onChange={onChange}
								timeFormat={timeFormat}
								value={value}
							/>
						</div>
					))}
				</div>
			)}
		</>
	)
}

const withNewEventDefaults = (
	selectedEvent: CalendarEvent | null | undefined,
	timezone: string
) => {
	const current = now(timezone)
	const {
		start = toOffsetIso(current),
		end = toOffsetIso(add(current, 1, 'hour')),
		allDay = false,
		title = '',
		description = '',
		location = '',
		...rest
	} = selectedEvent ?? {}
	return { ...rest, start, end, allDay, title, description, location }
}

interface EventResourceInput {
	resourceId?: string | number
	resourceIds?: (string | number)[]
	hasResourceAxis: boolean
}

const useEventResource = ({
	resourceId,
	resourceIds,
	hasResourceAxis,
}: EventResourceInput) => {
	const initialSelectedResourceId = resourceId ?? resourceIds?.at(0)
	const showResourceSelector =
		hasResourceAxis && initialSelectedResourceId === undefined

	const [selectedResourceId, setSelectedResourceId] = useState<
		string | number | undefined
	>(initialSelectedResourceId)

	const effectiveResourceId = hasResourceAxis ? selectedResourceId : resourceId
	const isResourceMissing =
		showResourceSelector && selectedResourceId === undefined

	const hasResourceIds = resourceIds !== undefined
	const resourceFields = hasResourceIds
		? {}
		: { resourceId: effectiveResourceId }

	return {
		selectedResourceId,
		setSelectedResourceId,
		effectiveResourceId,
		resourceFields,
		showResourceSelector,
		isResourceMissing,
	}
}

export interface EventFormProps {
	open?: boolean
	selectedEvent?: CalendarEvent | null
	onAdd?: (event: CalendarEvent) => void
	onUpdate?: (event: CalendarEvent) => void
	onDelete?: (event: CalendarEvent) => void
	onClose: () => void
}

const isFormConstrainedByBusinessHours = (
	isExistingEvent: boolean,
	eventConstraint: string | undefined,
	selectConstraint: string | undefined
): boolean => {
	if (isExistingEvent) {
		return eventConstraint === 'businessHours'
	}
	return (
		selectConstraint === 'businessHours' || eventConstraint === 'businessHours'
	)
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
	} = withNewEventDefaults(selectedEvent, zone)

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
	const constrainedBusinessHours = isBusinessHoursConstrained
		? effectiveBusinessHours
		: undefined

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
	const draftEvent = { ...selectedEvent, ...pluginUpdates } as CalendarEvent
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
