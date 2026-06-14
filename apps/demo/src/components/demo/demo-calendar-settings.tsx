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

export function DemoCalendarSettings() {
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

				<FormSelect label="Calendar Type" name="calendarType">
					<SelectItem value="regular">Regular</SelectItem>
					<SelectItem value="resource">Resource</SelectItem>
				</FormSelect>

				{isResourceCalendar && (
					<FormSelect label="Orientation" name="orientation">
						<SelectItem value="horizontal">Horizontal</SelectItem>
						<SelectItem value="vertical">Vertical</SelectItem>
					</FormSelect>
				)}
				{isResourceCalendar && (
					<FormSelect label="Week View Granularity" name="weekViewGranularity">
						<SelectItem value="hourly">Hourly</SelectItem>
						<SelectItem value="daily">Daily</SelectItem>
					</FormSelect>
				)}

				<FormSelect label="First Day of Week" name="firstDayOfWeek">
					<SelectItem value="sunday">Sunday</SelectItem>
					<SelectItem value="monday">Monday</SelectItem>
					<SelectItem value="tuesday">Tuesday</SelectItem>
					<SelectItem value="wednesday">Wednesday</SelectItem>
					<SelectItem value="thursday">Thursday</SelectItem>
					<SelectItem value="friday">Friday</SelectItem>
					<SelectItem value="saturday">Saturday</SelectItem>
				</FormSelect>

				<FormSelect label="Initial View" name="initialView">
					<SelectItem value="month">Month</SelectItem>
					<SelectItem value="week">Week</SelectItem>
					<SelectItem value="day">Day</SelectItem>
					{!isResourceCalendar && <SelectItem value="year">Year</SelectItem>}
					{!isResourceCalendar && (
						<SelectItem value="agenda">Agenda</SelectItem>
					)}
				</FormSelect>

				{!isResourceCalendar && (
					<FormSelect
						label="Agenda Window"
						name="agendaWindow"
						parse={parseAgendaWindow}
					>
						<SelectItem value="day">Day</SelectItem>
						<SelectItem value="week">Week</SelectItem>
						<SelectItem value="month">Month</SelectItem>
						<SelectItem value="3">Next 3 days</SelectItem>
						<SelectItem value="14">Next 14 days</SelectItem>
					</FormSelect>
				)}

				<InitialDateField />

				<FormSelect label="Locale" name="locale">
					<SelectItem value="en">English</SelectItem>
					<SelectItem value="cs">Čeština</SelectItem>
					<SelectItem value="es">Español</SelectItem>
					<SelectItem value="fr">Français</SelectItem>
					<SelectItem value="de">Deutsch</SelectItem>
					<SelectItem value="it">Italiano</SelectItem>
					<SelectItem value="pt">Português</SelectItem>
					<SelectItem value="ru">Русский</SelectItem>
					<SelectItem value="zh">中文</SelectItem>
					<SelectItem value="ja">日本語</SelectItem>
					<SelectItem value="ko">한국어</SelectItem>
				</FormSelect>

				<FormSelect label="Timezone" name="timezone">
					{ALL_TIMEZONES.map((tz) => (
						<SelectItem key={tz} value={tz}>
							{tz}
						</SelectItem>
					))}
				</FormSelect>

				<FormSelect label="Calendar Height" name="calendarHeight">
					<SelectItem value="auto">Auto</SelectItem>
					<SelectItem value="300px">Extra Small (300px)</SelectItem>
					<SelectItem value="400px">Small (400px)</SelectItem>
					<SelectItem value="600px">Medium (600px)</SelectItem>
					<SelectItem value="800px">Large (800px)</SelectItem>
					<SelectItem value="1000px">Extra Large (1000px)</SelectItem>
				</FormSelect>

				<FormSelect
					label="Max Events Per Day"
					name="dayMaxEvents"
					parse={Number}
				>
					<SelectItem value="1">1 event</SelectItem>
					<SelectItem value="2">2 events</SelectItem>
					<SelectItem value="3">3 events</SelectItem>
					<SelectItem value="4">4 events</SelectItem>
					<SelectItem value="5">5 events</SelectItem>
					<SelectItem value="999">No limit</SelectItem>
				</FormSelect>

				<FormSelect label="Event Bar Height" name="eventHeight" parse={Number}>
					<SelectItem value="20">20px (compact)</SelectItem>
					<SelectItem value="24">24px (default)</SelectItem>
					<SelectItem value="36">36px</SelectItem>
					<SelectItem value="48">48px (two lines)</SelectItem>
				</FormSelect>

				<FormSelect label="Time Format" name="timeFormat">
					<SelectItem value="12-hour">12-hour (1:00 PM)</SelectItem>
					<SelectItem value="24-hour">24-hour (13:00)</SelectItem>
				</FormSelect>

				<FormSelect label="Slot Duration" name="slotDuration" parse={Number}>
					<SelectItem value="60">60 min (hour only, default)</SelectItem>
					<SelectItem value="30">30 min (half-hour)</SelectItem>
					<SelectItem value="15">15 min (quarter-hour)</SelectItem>
				</FormSelect>

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

				<FormSelect label="Initial Scroll Time" name="scrollTime">
					<SelectItem value="none">None (no auto-scroll)</SelectItem>
					{Array.from({ length: 24 }).map((_, i) => {
						const hour = i.toString().padStart(2, '0')
						return (
							<SelectItem key={hour} value={`${hour}:00:00`}>
								{hour}:00
							</SelectItem>
						)
					})}
				</FormSelect>

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
