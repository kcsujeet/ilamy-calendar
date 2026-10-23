import type { CalendarEvent } from '@ilamy/types'
import { Button } from '@ilamy/ui/components/button'
import { Checkbox } from '@ilamy/ui/components/checkbox'
import { ColorPicker } from '@ilamy/ui/components/color-picker'
import { DialogFooter } from '@ilamy/ui/components/dialog'
import { Input } from '@ilamy/ui/components/input'
import { Label } from '@ilamy/ui/components/label'
import { ScrollArea } from '@ilamy/ui/components/scroll-area'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@ilamy/ui/components/select'
import { Textarea } from '@ilamy/ui/components/textarea'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { readableTextColor } from '@ilamy/utils/helpers'
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
import { isBusinessDay } from '@/features/calendar/utils/business-hours'
import {
	buildDateTime,
	buildEndDateTime,
	type FormSchedule,
	getTimeConstraints,
	keepEndAfterStart,
	openedLengthMinutes,
} from '@/features/calendar/utils/event-form-utils'
import { keys } from '@/features/calendar/utils/keys'

// Default event color, kept as a Tailwind class-pair (theme-aware) like before.
const DEFAULT_EVENT_COLOR = 'bg-blue-100 text-blue-800'

// Curated swatches: the original Tailwind class-pairs (theme-aware). The picker
// additionally allows any custom color via its native input + hex field.
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

// The picker's value is whatever the event already stored (a Tailwind class-pair
// from a swatch, or a hex). Prefer a hex `backgroundColor`, then `color`, else
// the default class-pair.
const resolveInitialColor = (
	backgroundColor: string | undefined,
	color: string | undefined
): string => {
	if (backgroundColor && HEX_COLOR_PATTERN.test(backgroundColor)) {
		return backgroundColor
	}
	return color ?? DEFAULT_EVENT_COLOR
}

// A swatch stores a Tailwind class-pair in `color`; a custom hex stores
// `backgroundColor` + a readable text `color`.
const buildColorFields = (
	color: string
): Pick<CalendarEvent, 'backgroundColor' | 'color'> => {
	if (HEX_COLOR_PATTERN.test(color)) {
		return { backgroundColor: color, color: readableTextColor(color) }
	}
	return { backgroundColor: undefined, color }
}

// Write the new color only when the user picked one (or the event had none).
// Otherwise preserve the event's original color (legacy class-pair or hex) as-is.
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
	// Render a multi-line textarea (e.g. for the description) instead of an input.
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
}: EventFormTextFieldProps) => (
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

interface ResourceSelectProps {
	value: string | number | undefined
	onChange: (resourceId: string | number) => void
}

const ResourceSelect = ({ value, onChange }: ResourceSelectProps) => {
	const { t, resources } = useSmartCalendarContext((context) => ({
		t: context.t,
		resources: context.resources ?? [],
	}))
	const resolveResourceId = (selected: string): string | number => {
		const resource = resources.find((item) => String(item.id) === selected)
		return resource?.id ?? selected
	}

	return (
		<div className="grid gap-1 sm:gap-2">
			<Label className="text-xs sm:text-sm" htmlFor="resource">
				{t('resource')}
			</Label>
			<Select
				onValueChange={(selected) => onChange(resolveResourceId(selected))}
				value={value?.toString()}
			>
				<SelectTrigger
					className="h-8 text-sm sm:h-9"
					data-testid="resource-select"
					id="resource"
				>
					<SelectValue placeholder={t('selectResource')} />
				</SelectTrigger>
				<SelectContent>
					{resources.map((resource) => (
						<SelectItem key={String(resource.id)} value={String(resource.id)}>
							{resource.title}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
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

	return (
		<DialogFooter className="mt-4 shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:gap-0">
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
		</DialogFooter>
	)
}

interface EventScheduleInput {
	start: Dayjs
	end: Dayjs
	initialAllDay: boolean
	isExistingEvent: boolean
}

// The form's dates, times and all-day flag, and the rules that keep them consistent.
const useEventSchedule = ({
	start,
	end,
	initialAllDay,
	isExistingEvent,
}: EventScheduleInput) => {
	// An all-day `end` is STORED exclusively, as the midnight after the last day
	// the event covers (#248), but the picker shows the user that last day.
	// `buildEndDateTime` converts back on save. An end that is not on a midnight
	// boundary predates this and is already inclusive, so it is shown untouched.
	const endsOnMidnight = end.isSame(end.startOf('day'))
	// `startOf('day')` re-anchors after `subtract`, which keeps the receiver's
	// offset: across a clock change the end would otherwise step back to the
	// previous day's 23:00 and read as the start's own day.
	const lastCoveredDay =
		initialAllDay && endsOnMidnight
			? end.subtract(1, 'day').startOf('day')
			: end

	const [startDate, setStartDate] = useState(start.toDate())
	const [endDate, setEndDate] = useState(lastCoveredDay.toDate())
	const [isAllDay, setIsAllDay] = useState(initialAllDay)

	// Time state
	const [startTime, setStartTime] = useState(start.format('HH:mm'))
	// An all-day event's end is a midnight, which reads as 23:59 of the last
	// day it covers, so unticking All day leaves a whole-day timed range.
	const [endTime, setEndTime] = useState(
		initialAllDay ? END_OF_DAY : end.format('HH:mm')
	)

	// Whether the user touched any schedule field. An existing event saved with
	// its schedule untouched keeps the start and end it came with (see
	// `buildScheduleFields`): rebuilding them from the days and times the form shows
	// would rewrite values the form can only show in the calendar's zone.
	const [isScheduleEdited, setIsScheduleEdited] = useState(false)

	const lengthMinutes = openedLengthMinutes(start, end)

	// RFC 5545 section 3.8.2.2: DTEND "MUST be later in time than" DTSTART. Every
	// handler below applies its edit, then `keepEndAfterStart` moves the edge the
	// user did NOT touch if the edit left the end at or before the start. The
	// times are hidden and ignored while All day is on, so they are left alone.
	const applySchedule = (
		schedule: FormSchedule,
		movedEdge: 'start' | 'end'
	) => {
		const ordered = isAllDay
			? schedule
			: keepEndAfterStart(schedule, movedEdge, lengthMinutes)
		setStartDate(ordered.startDate)
		setStartTime(ordered.startTime)
		setEndDate(ordered.endDate)
		setEndTime(ordered.endTime)
		setIsScheduleEdited(true)
	}

	const current: FormSchedule = { startDate, startTime, endDate, endTime }

	const handleStartDateChange = (date: Date | undefined) => {
		if (!date) return
		const endDay = dayjs(date).isAfter(dayjs(endDate)) ? date : endDate
		applySchedule({ ...current, startDate: date, endDate: endDay }, 'start')
	}

	const handleEndDateChange = (date: Date | undefined) => {
		if (!date) return
		const startDay = dayjs(date).isBefore(dayjs(startDate)) ? date : startDate
		applySchedule({ ...current, endDate: date, startDate: startDay }, 'end')
	}

	/**
	 * The End Date input means different things in the two modes: a boundary for a
	 * timed event, the last day COVERED for an all-day one. Switching to all-day
	 * therefore has to reinterpret it, and a midnight end covers through the
	 * previous day, which is 23:59 in the end time that unticking brings back.
	 * Without this step back, clicking a month cell (whose range ends at the next
	 * midnight) and ticking All day saved a two-day event for a single day (#248).
	 * A timed event's other times are not touched, so unticking restores them.
	 */
	const handleAllDayChange = (checked: boolean) => {
		setIsAllDay(checked)
		setIsScheduleEdited(true)
		if (!(checked && endTime === '00:00')) {
			return
		}
		// Only when the end sits on a LATER day. A same-day midnight end means a
		// zero-length event, and stepping that back would put the end before the
		// start, saving another zero-length event where a one-day one was asked for.
		const endsOnALaterDay = dayjs(endDate).isAfter(dayjs(startDate), 'day')
		if (!endsOnALaterDay) {
			return
		}
		// `startOf('day')` re-anchors after `subtract` (see `lastCoveredDay`).
		setEndDate(dayjs(endDate).subtract(1, 'day').startOf('day').toDate())
		setEndTime(END_OF_DAY)
	}

	// An existing event whose schedule was not edited keeps the start, end and
	// all-day flag it came with. The form can only show them as days and times
	// in the calendar's zone, and building them back from that rewrote a UTC
	// all-day event (midnight to midnight) as a longer one in another zone.
	// A new event is always built, which also drops the seconds of "now".
	const buildScheduleFields = () => {
		if (isExistingEvent && !isScheduleEdited) {
			return { start, end, allDay: initialAllDay }
		}
		return {
			start: buildDateTime(startDate, startTime, isAllDay),
			end: buildEndDateTime(endDate, endTime, isAllDay),
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
}

// The all-day checkbox, the date pickers, and the time pickers a timed event needs.
const ScheduleFields = ({ schedule, businessHours }: ScheduleFieldsProps) => {
	const { t, timeFormat } = useSmartCalendarContext((context) => ({
		t: context.t,
		timeFormat: context.timeFormat,
	}))
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
		disabledDateMatcher = (date) => !isBusinessDay(dayjs(date), businessHours)
	}

	const startConstraints = getTimeConstraints(startDate, businessHours)
	const endConstraints = getTimeConstraints(endDate, businessHours)

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
					onCheckedChange={(checked) => handleAllDayChange(checked === true)}
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

// The selected event's fields, or the new-event defaults.
const withNewEventDefaults = (
	selectedEvent: CalendarEvent | null | undefined
) => {
	const {
		start = dayjs(),
		end = dayjs().add(1, 'hour'),
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

// Which resource the event lands on, and whether the user still has to pick one.
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

	// A cross-resource event is a member of every room in `resourceIds`, and the
	// form shows none of them as its one room, so saving leaves them as they are
	// rather than adding a `resourceId` (src/features/calendar/utils/event-pipeline.ts).
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

	const { t, getEventManager, hasResourceAxis } = useSmartCalendarContext(
		(context) => ({
			t: context.t,
			getEventManager: context.getEventManager,
			hasResourceAxis: context.hasResourceAxis,
		})
	)
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
	} = withNewEventDefaults(selectedEvent)

	const {
		selectedResourceId,
		setSelectedResourceId,
		effectiveResourceId,
		resourceFields,
		showResourceSelector,
		isResourceMissing,
	} = useEventResource({ resourceId, resourceIds, hasResourceAxis })

	const effectiveBusinessHours = useEffectiveBusinessHours(effectiveResourceId)

	// Whether a plugin owns this event (gates the scoped edit/delete flow)
	const eventIsOwned = Boolean(selectedEvent && getEventManager(selectedEvent))

	const schedule = useEventSchedule({
		start,
		end,
		initialAllDay,
		isExistingEvent: Boolean(selectedEventId),
	})
	const { buildScheduleFields } = schedule

	// Color state
	const [selectedColor, setSelectedColor] = useState(
		resolveInitialColor(initialBackgroundColor, initialColor)
	)
	// Existing events keep their original color (including legacy Tailwind
	// class-pairs) untouched unless the user actually picks a new one.
	const [colorPicked, setColorPicked] = useState(false)
	const hadInitialColor = Boolean(initialColor || initialBackgroundColor)

	const handleColorChange = (color: string) => {
		setSelectedColor(color)
		setColorPicked(true)
	}

	// Initialize form values from selected event or defaults
	const [formValues, setFormValues] = useState({
		title: initialTitle,
		description: initialDescription,
		location: initialLocation,
	})

	// Generic draft of plugin-contributed fields (e.g. recurrence's rrule).
	// Plugins push their fields through the event-form slot's `onChange`.
	const [pluginUpdates, setPluginUpdates] = useState<Partial<CalendarEvent>>({})

	// The event as the plugin editors see it: the selected event plus any
	// in-progress plugin fields, so their inputs stay controlled.
	const draftEvent = { ...selectedEvent, ...pluginUpdates } as CalendarEvent
	const mergePluginUpdates = (updates: Partial<CalendarEvent>) =>
		setPluginUpdates((prev) => ({ ...prev, ...updates }))

	// Update form values when input changes
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

		// Only write the new hex model when the user picked a color. Otherwise an
		// existing event keeps its original color (legacy class-pair included) so
		// editing other fields never rewrites its appearance.
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
			id: selectedEventId || dayjs().format('YYYYMMDDHHmmss'),
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
							businessHours={effectiveBusinessHours}
							schedule={schedule}
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
					isExistingEvent={Boolean(selectedEventId)}
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
