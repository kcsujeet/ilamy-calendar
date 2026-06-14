import { type Dayjs, dayjs, type WeekDays } from '@ilamy/calendar'
import type { AgendaWindow } from '@ilamy/calendar/plugins/agenda'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@ilamy/ui/components/card'
import { Checkbox } from '@ilamy/ui/components/checkbox'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@ilamy/ui/components/select'
import { useController, useFormContext, useWatch } from 'react-hook-form'
import { FormCheckbox } from './form/form-checkbox'
import { FormInput } from './form/form-input'
import { FormSelect } from './form/form-select'
import { ModeToggle } from './mode-toggle'

const ALL_TIMEZONES = Intl.supportedValuesOf('timeZone')

const WEEK_DAYS: WeekDays[] = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
]

const CALENDAR_TYPE_OPTIONS = [
	{ value: 'regular', label: 'Regular' },
	{ value: 'resource', label: 'Resource' },
]

const ORIENTATION_OPTIONS = [
	{ value: 'horizontal', label: 'Horizontal' },
	{ value: 'vertical', label: 'Vertical' },
]

const WEEK_VIEW_GRANULARITY_OPTIONS = [
	{ value: 'hourly', label: 'Hourly' },
	{ value: 'daily', label: 'Daily' },
]

const FIRST_DAY_OF_WEEK_OPTIONS = WEEK_DAYS.map((day) => ({
	value: day,
	label: `${day.at(0)?.toUpperCase()}${day.slice(1)}`,
}))

const BASE_VIEW_OPTIONS = [
	{ value: 'month', label: 'Month' },
	{ value: 'week', label: 'Week' },
	{ value: 'day', label: 'Day' },
]

const REGULAR_VIEW_OPTIONS = [
	...BASE_VIEW_OPTIONS,
	{ value: 'year', label: 'Year' },
	{ value: 'agenda', label: 'Agenda' },
]

const AGENDA_WINDOW_OPTIONS = [
	{ value: 'day', label: 'Day' },
	{ value: 'week', label: 'Week' },
	{ value: 'month', label: 'Month' },
	{ value: '3', label: 'Next 3 days' },
	{ value: '14', label: 'Next 14 days' },
]

const LOCALE_OPTIONS = [
	{ value: 'en', label: 'English' },
	{ value: 'cs', label: 'Čeština' },
	{ value: 'es', label: 'Español' },
	{ value: 'fr', label: 'Français' },
	{ value: 'de', label: 'Deutsch' },
	{ value: 'it', label: 'Italiano' },
	{ value: 'pt', label: 'Português' },
	{ value: 'ru', label: 'Русский' },
	{ value: 'zh', label: '中文' },
	{ value: 'ja', label: '日本語' },
	{ value: 'ko', label: '한국어' },
]

const TIMEZONE_OPTIONS = ALL_TIMEZONES.map((tz) => ({ value: tz, label: tz }))

const CALENDAR_HEIGHT_OPTIONS = [
	{ value: 'auto', label: 'Auto' },
	{ value: '300px', label: 'Extra Small (300px)' },
	{ value: '400px', label: 'Small (400px)' },
	{ value: '600px', label: 'Medium (600px)' },
	{ value: '800px', label: 'Large (800px)' },
	{ value: '1000px', label: 'Extra Large (1000px)' },
]

const DAY_MAX_EVENTS_OPTIONS = [
	{ value: '1', label: '1 event' },
	{ value: '2', label: '2 events' },
	{ value: '3', label: '3 events' },
	{ value: '4', label: '4 events' },
	{ value: '5', label: '5 events' },
	{ value: '999', label: 'No limit' },
]

const EVENT_HEIGHT_OPTIONS = [
	{ value: '20', label: '20px (compact)' },
	{ value: '24', label: '24px (default)' },
	{ value: '36', label: '36px' },
	{ value: '48', label: '48px (two lines)' },
]

const TIME_FORMAT_OPTIONS = [
	{ value: '12-hour', label: '12-hour (1:00 PM)' },
	{ value: '24-hour', label: '24-hour (13:00)' },
]

const SLOT_DURATION_OPTIONS = [
	{ value: '60', label: '60 min (hour only, default)' },
	{ value: '30', label: '30 min (half-hour)' },
	{ value: '15', label: '15 min (quarter-hour)' },
]

const SCROLL_TIME_OPTIONS = [
	{ value: 'none', label: 'None (no auto-scroll)' },
	...Array.from({ length: 24 }).map((_, i) => {
		const hour = i.toString().padStart(2, '0')
		return { value: `${hour}:00:00`, label: `${hour}:00` }
	}),
]

// The agenda window is a Select of strings; named periods pass through, numeric
// options ('3' / '14') parse to a rolling N-day window.
function parseAgendaWindow(value: string): AgendaWindow {
	if (value === 'day' || value === 'week' || value === 'month') {
		return value
	}
	return Number(value)
}

// The Initial Date control is a Select of presets, but the stored value is an
// ISO string (the calendar also writes the navigated date back into it).
function resolveInitialDateOption(initialDate: Dayjs | undefined): string {
	if (initialDate === undefined) {
		return 'today'
	}
	if (initialDate.isSame(dayjs().startOf('month'), 'day')) {
		return 'start-of-month'
	}
	if (initialDate.isSame(dayjs().startOf('year'), 'day')) {
		return 'start-of-year'
	}
	if (initialDate.isSame(dayjs().add(1, 'month'), 'month')) {
		return 'next-month'
	}
	return 'custom'
}

function optionToInitialDate(option: string): Dayjs | undefined {
	if (option === 'start-of-month') {
		return dayjs().startOf('month')
	}
	if (option === 'start-of-year') {
		return dayjs().startOf('year')
	}
	if (option === 'next-month') {
		return dayjs().add(1, 'month').startOf('month')
	}
	return undefined
}

// Initial Date and Hidden Days don't map cleanly onto FormSelect/FormCheckbox
// (an ISO string behind a preset Select, and an array toggled by many
// checkboxes), so they bind to the form directly with useController.
function InitialDateField() {
	const { control } = useFormContext()
	const { field } = useController({ name: 'initialDate', control })
	const currentDate: Dayjs | undefined = field.value
		? dayjs(field.value)
		: undefined
	return (
		<label className="block text-sm text-left font-medium mb-1">
			<span>Initial Date</span>
			<Select
				onValueChange={(option) =>
					field.onChange(optionToInitialDate(option)?.toISOString())
				}
				value={resolveInitialDateOption(currentDate)}
			>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select initial date" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="today">Today (Default)</SelectItem>
					<SelectItem value="start-of-month">Start of Month</SelectItem>
					<SelectItem value="start-of-year">Start of Year</SelectItem>
					<SelectItem value="next-month">Next Month</SelectItem>
				</SelectContent>
			</Select>
		</label>
	)
}

function HiddenDaysField() {
	const { control } = useFormContext()
	const { field } = useController({ name: 'hiddenDays', control })
	const hiddenDays: WeekDays[] = field.value ?? []
	const toggleDay = (day: WeekDays, checked: boolean) => {
		const next = checked
			? [...hiddenDays, day]
			: hiddenDays.filter((d) => d !== day)
		field.onChange(next)
	}
	return (
		<label className="block text-sm text-left font-medium mb-1">
			<span>Hidden Days (Week View)</span>
			<div className="space-y-1">
				{WEEK_DAYS.map((day) => (
					<div className="flex items-center space-x-2" key={day}>
						<Checkbox
							checked={hiddenDays.includes(day)}
							id={`hidden-day-${day}`}
							onCheckedChange={(checked) => toggleDay(day, checked === true)}
						/>
						<label
							className="text-sm leading-none cursor-pointer capitalize"
							htmlFor={`hidden-day-${day}`}
						>
							{day}
						</label>
					</div>
				))}
			</div>
		</label>
	)
}

export function CalendarSettings() {
	const { control } = useFormContext()
	const isResourceCalendar =
		useWatch({ control, name: 'calendarType' }) === 'resource'

	return (
		<Card className="border bg-background backdrop-blur-md shadow-lg overflow-clip gap-0">
			<CardHeader className="border-b border-white/10 dark:border-white/5 p-4">
				<CardTitle className="bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
					Calendar Settings
				</CardTitle>
				<CardDescription>Customize the calendar display</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 p-6">
				<div>
					<ModeToggle />
				</div>

				<FormSelect
					label="Calendar Type"
					name="calendarType"
					options={CALENDAR_TYPE_OPTIONS}
				/>

				{isResourceCalendar && (
					<FormSelect
						label="Orientation"
						name="orientation"
						options={ORIENTATION_OPTIONS}
					/>
				)}
				{isResourceCalendar && (
					<FormSelect
						label="Week View Granularity"
						name="weekViewGranularity"
						options={WEEK_VIEW_GRANULARITY_OPTIONS}
					/>
				)}

				<FormSelect
					label="First Day of Week"
					name="firstDayOfWeek"
					options={FIRST_DAY_OF_WEEK_OPTIONS}
				/>

				<FormSelect
					label="Initial View"
					name="initialView"
					options={
						isResourceCalendar ? BASE_VIEW_OPTIONS : REGULAR_VIEW_OPTIONS
					}
				/>

				{!isResourceCalendar && (
					<FormSelect
						label="Agenda Window"
						name="agendaWindow"
						options={AGENDA_WINDOW_OPTIONS}
						parse={parseAgendaWindow}
					/>
				)}

				<InitialDateField />

				<FormSelect label="Locale" name="locale" options={LOCALE_OPTIONS} />

				<FormSelect
					label="Timezone"
					name="timezone"
					options={TIMEZONE_OPTIONS}
				/>

				<FormSelect
					label="Calendar Height"
					name="calendarHeight"
					options={CALENDAR_HEIGHT_OPTIONS}
				/>

				<FormSelect
					label="Max Events Per Day"
					name="dayMaxEvents"
					options={DAY_MAX_EVENTS_OPTIONS}
					parse={Number}
				/>

				<FormSelect
					label="Event Bar Height"
					name="eventHeight"
					options={EVENT_HEIGHT_OPTIONS}
					parse={Number}
				/>

				<FormSelect
					label="Time Format"
					name="timeFormat"
					options={TIME_FORMAT_OPTIONS}
				/>

				<FormSelect
					label="Slot Duration"
					name="slotDuration"
					options={SLOT_DURATION_OPTIONS}
					parse={Number}
				/>

				<FormCheckbox label="Enable sticky header" name="stickyViewHeader" />
				<FormCheckbox
					label="Hide non-business hours"
					name="hideNonBusinessHours"
				/>

				<div className="grid grid-cols-2 gap-4">
					<FormInput
						label="Business Start"
						max={23}
						min={0}
						name="businessStartTime"
						parse={Number}
						type="number"
					/>
					<FormInput
						label="Business End"
						max={23}
						min={0}
						name="businessEndTime"
						parse={Number}
						type="number"
					/>
				</div>

				<FormSelect
					label="Initial Scroll Time"
					name="scrollTime"
					options={SCROLL_TIME_OPTIONS}
				/>

				<HiddenDaysField />

				<FormCheckbox
					label="Use custom event renderer"
					name="useCustomEventRenderer"
				/>
				<FormCheckbox
					label="Use custom time indicator"
					name="useCustomTimeIndicator"
				/>
				<FormCheckbox
					label="Use custom hour renderer"
					name="useCustomHourRenderer"
				/>
				<FormCheckbox
					label="Use custom onCellClick handler"
					name="useCustomOnDateClick"
				/>
				<FormCheckbox
					label="Use custom onEventClick handler"
					name="useCustomOnEventClick"
				/>
				<FormCheckbox label="Disable cell clicks" name="disableCellClick" />
				<FormCheckbox label="Disable event clicks" name="disableEventClick" />
				<FormCheckbox label="Disable drag & drop" name="disableDragAndDrop" />
				<FormCheckbox
					label="Use custom disabled cell styles"
					name="useCustomClasses"
				/>
			</CardContent>
		</Card>
	)
}
