import type { Resource, WeekDays } from '@ilamy/calendar'
import type { AgendaWindow } from '@ilamy/calendar/plugins/agenda'
import { Checkbox } from '@ilamy/ui/components/checkbox'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@ilamy/ui/components/select'
import { cn } from '@ilamy/ui/lib/utils'
import { useId } from 'react'
import { useController, useFormContext, useWatch } from 'react-hook-form'
import type {
	PlaygroundSettings,
	ThemeAccent,
	ThemeColorMode,
} from '../types/settings-form'
import { THEME_ACCENTS } from '../utils/demo-themes'
import { FormButtonGroup } from './form/form-button-group'
import { FormCheckbox } from './form/form-checkbox'
import { FormSelect } from './form/form-select'
import { ResourcePicker } from './resource-picker'

const ALL_TIMEZONES = Intl.supportedValuesOf('timeZone')
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

const QUICK_TIMEZONES = [
	{ value: LOCAL_TIMEZONE, label: 'Local' },
	{ value: 'UTC', label: 'UTC' },
	{ value: 'America/New_York', label: 'New York' },
	{ value: 'Europe/London', label: 'London' },
	{ value: 'Asia/Tokyo', label: 'Tokyo' },
]

const WEEK_DAYS: WeekDays[] = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
]

const ORIENTATION_OPTIONS = [
	{ value: 'horizontal', label: 'Horizontal' },
	{ value: 'vertical', label: 'Vertical' },
]

const WEEK_VIEW_GRANULARITY_OPTIONS = [
	{ value: 'hourly', label: 'Hourly' },
	{ value: 'daily', label: 'Daily' },
]

const THEME_MODE_OPTIONS: { value: ThemeColorMode; label: string }[] = [
	{ value: 'auto', label: 'Auto' },
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
]

const WEEKDAY_CHECKBOX_OPTIONS: { value: WeekDays; label: string }[] = [
	{ value: 'monday', label: 'Mon' },
	{ value: 'tuesday', label: 'Tue' },
	{ value: 'wednesday', label: 'Wed' },
	{ value: 'thursday', label: 'Thu' },
	{ value: 'friday', label: 'Fri' },
	{ value: 'saturday', label: 'Sat' },
	{ value: 'sunday', label: 'Sun' },
]

const HOUR_OPTIONS = Array.from({ length: 24 }).map((_, hour) => {
	const pad = hour.toString().padStart(2, '0')
	const period = hour < 12 ? 'AM' : 'PM'
	const twelve = hour % 12 === 0 ? 12 : hour % 12
	return { value: String(hour), label: `${twelve} ${period} (${pad}:00)` }
})

const FIRST_DAY_OF_WEEK_OPTIONS = WEEK_DAYS.map((day) => ({
	value: day,
	label: `${day.at(0)?.toUpperCase()}${day.slice(1)}`,
}))

const BASE_VIEW_OPTIONS = [
	{ value: 'month', label: 'Month' },
	{ value: 'week', label: 'Week' },
	{ value: 'day', label: 'Day' },
]

const AGENDA_WINDOW_OPTIONS = [
	{ value: 'day', label: 'Day' },
	{ value: 'week', label: 'Week' },
	{ value: 'month', label: 'Month' },
	{ value: '3', label: '3d' },
	{ value: '14', label: '14d' },
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
	{ value: '400px', label: '400px' },
	{ value: '600px', label: '600px' },
	{ value: '750px', label: '750px' },
	{ value: '900px', label: '900px' },
]

const DAY_MAX_EVENTS_OPTIONS = [
	{ value: '2', label: '2 events' },
	{ value: '3', label: '3 events' },
	{ value: '4', label: '4 events' },
	{ value: '5', label: '5 events' },
	{ value: '999', label: 'No limit' },
]

const EVENT_HEIGHT_OPTIONS = [
	{ value: '20', label: '20px' },
	{ value: '24', label: '24px' },
	{ value: '36', label: '36px' },
	{ value: '48', label: '48px' },
]

const EVENT_SPACING_OPTIONS = [
	{ value: '0', label: '0px' },
	{ value: '1', label: '1px' },
	{ value: '2', label: '2px' },
	{ value: '4', label: '4px' },
]

const TIME_FORMAT_OPTIONS = [
	{ value: '12-hour', label: '12-hour' },
	{ value: '24-hour', label: '24-hour' },
]

const SLOT_DURATION_OPTIONS = [
	{ value: '60', label: '60 min' },
	{ value: '30', label: '30 min' },
	{ value: '15', label: '15 min' },
]

const SNAP_DURATION_OPTIONS = [
	{ value: '0', label: 'Match slot' },
	{ value: '30', label: '30 min' },
	{ value: '15', label: '15 min' },
]

const WEEK_NUMBER_OPTIONS = [
	{ value: 'default', label: 'Default' },
	{ value: 'show', label: 'Show All' },
	{ value: 'hide', label: 'Hide' },
]

const WEEK_NUMBER_CALCULATION_OPTIONS = [
	{ value: 'local', label: 'Local' },
	{ value: 'ISO', label: 'ISO 8601' },
]

const SLOT_MIN_TIME_OPTIONS = Array.from({ length: 24 }).map((_, hour) => {
	const time = `${String(hour).padStart(2, '0')}:00`
	return { value: time, label: time }
})

const SLOT_MAX_TIME_OPTIONS = Array.from({ length: 24 }).map((_, index) => {
	const time = `${String(index + 1).padStart(2, '0')}:00`
	return { value: time, label: time }
})

const SCROLL_TIME_OPTIONS = [
	{ value: 'none', label: 'None' },
	...Array.from({ length: 24 }).map((_, i) => {
		const hour = i.toString().padStart(2, '0')
		return { value: `${hour}:00:00`, label: `${hour}:00` }
	}),
]

function parseAgendaWindow(value: string): AgendaWindow {
	if (value === 'day' || value === 'week' || value === 'month') {
		return value
	}
	return Number(value)
}

const isSameLocalDay = (a: Date, b: Date): boolean =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate()

function resolveInitialDateOption(initialDate: string | undefined): string {
	if (initialDate === undefined) return 'today'
	const parsed = new Date(initialDate)
	if (Number.isNaN(parsed.getTime())) return 'custom'
	const now = new Date()
	if (isSameLocalDay(parsed, now)) {
		return 'today'
	}
	if (isSameLocalDay(parsed, new Date(now.getFullYear(), now.getMonth(), 1))) {
		return 'start-of-month'
	}
	if (isSameLocalDay(parsed, new Date(now.getFullYear(), 0, 1))) {
		return 'start-of-year'
	}
	const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
	if (
		parsed.getFullYear() === nextMonth.getFullYear() &&
		parsed.getMonth() === nextMonth.getMonth()
	) {
		return 'next-month'
	}
	return 'custom'
}

function optionToInitialDate(option: string): string | undefined {
	const now = new Date()
	if (option === 'start-of-month') {
		return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
	}
	if (option === 'start-of-year') {
		return new Date(now.getFullYear(), 0, 1).toISOString()
	}
	if (option === 'next-month') {
		return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
	}
	return undefined
}

function SectionHeading({ children }: { children: string }) {
	return (
		<h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-2 first:pt-0">
			{children}
		</h3>
	)
}

function InitialDateField() {
	const { control, setValue, getValues } = useFormContext<PlaygroundSettings>()
	const { field } = useController({ name: 'initialDate', control })
	const currentDate: string | undefined = field.value || undefined
	return (
		<label className="block text-sm text-left font-medium mb-1">
			<span>Initial Date</span>
			<Select
				onValueChange={(option) => {
					field.onChange(optionToInitialDate(option))
					setValue('initialDateRevision', getValues('initialDateRevision') + 1)
				}}
				value={resolveInitialDateOption(currentDate)}
			>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select initial date" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="today">Today</SelectItem>
					<SelectItem value="start-of-month">Month Start</SelectItem>
					<SelectItem value="start-of-year">Year Start</SelectItem>
					<SelectItem value="next-month">Next Month</SelectItem>
					<SelectItem disabled value="custom">
						Custom Date
					</SelectItem>
				</SelectContent>
			</Select>
		</label>
	)
}

function WeekdayMultiSelectField({
	name,
	label,
}: {
	name: 'businessHoursDays' | 'hiddenDays'
	label: string
}) {
	const { control } = useFormContext<PlaygroundSettings>()
	const { field } = useController({ name, control })
	const idPrefix = useId()
	const selected: WeekDays[] = field.value ?? []

	const toggleDay = (day: WeekDays, checked: boolean) => {
		const next = checked
			? [...selected, day]
			: selected.filter((d) => d !== day)
		field.onChange(next)
	}

	return (
		<div className="text-sm text-left font-medium">
			<span>{label}</span>
			<div className="grid grid-cols-4 gap-x-2 gap-y-2 mt-1.5">
				{WEEKDAY_CHECKBOX_OPTIONS.map(({ value: day, label: short }) => (
					<div className="flex items-center space-x-1.5" key={day}>
						<Checkbox
							checked={selected.includes(day)}
							id={`${idPrefix}-${day}`}
							onCheckedChange={(checked) => toggleDay(day, checked === true)}
						/>
						<label
							className="text-xs font-normal leading-none cursor-pointer"
							htmlFor={`${idPrefix}-${day}`}
						>
							{short}
						</label>
					</div>
				))}
			</div>
		</div>
	)
}

interface GeneralPanelProps {
	resources: Resource[]
	selectedResourceIds: Set<string | number>
	onToggleResource: (id: string | number) => void
}

export function GeneralPanel({
	resources,
	selectedResourceIds,
	onToggleResource,
}: GeneralPanelProps) {
	const { control, setValue } = useFormContext<PlaygroundSettings>()
	const calendarType = useWatch({ control, name: 'calendarType' })
	const currentTz = useWatch({ control, name: 'timezone' })
	const enableYearPlugin = useWatch({ control, name: 'enableYearPlugin' })
	const enableAgendaPlugin = useWatch({ control, name: 'enableAgendaPlugin' })
	const isResource = calendarType === 'resource'
	const isMultiZone = calendarType === 'multi-zone'

	const viewOptions = isResource
		? BASE_VIEW_OPTIONS
		: [
				...BASE_VIEW_OPTIONS,
				...(enableYearPlugin ? [{ value: 'year', label: 'Year' }] : []),
				...(enableAgendaPlugin ? [{ value: 'agenda', label: 'Agenda' }] : []),
			]

	return (
		<>
			<SectionHeading>View &amp; Layout</SectionHeading>
			{isResource && (
				<div className="space-y-3 border-l-2 border-primary/20 pl-3">
					<FormButtonGroup
						label="Resource Orientation"
						name="orientation"
						options={ORIENTATION_OPTIONS}
					/>
					<FormButtonGroup
						label="Week Granularity"
						name="weekViewGranularity"
						options={WEEK_VIEW_GRANULARITY_OPTIONS}
					/>
					<ResourcePicker
						onToggleResource={onToggleResource}
						resources={resources}
						selectedResourceIds={selectedResourceIds}
					/>
				</div>
			)}

			<div className="grid grid-cols-2 gap-3">
				<FormSelect
					label="Initial View"
					name="initialView"
					options={viewOptions}
				/>
				<FormSelect
					label="Week Starts"
					name="firstDayOfWeek"
					options={FIRST_DAY_OF_WEEK_OPTIONS}
				/>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<InitialDateField />
				<FormSelect
					label="Height"
					name="calendarHeight"
					options={CALENDAR_HEIGHT_OPTIONS}
				/>
			</div>

			<SectionHeading>Locale &amp; Timezone (Temporal + Intl)</SectionHeading>
			<div className="grid grid-cols-2 gap-3">
				<FormSelect label="Locale" name="locale" options={LOCALE_OPTIONS} />
				<FormSelect
					label="Time Format"
					name="timeFormat"
					options={TIME_FORMAT_OPTIONS}
				/>
			</div>

			<div className="space-y-1.5">
				<div className="flex flex-wrap gap-1">
					{QUICK_TIMEZONES.map((tz) => (
						<button
							className={cn(
								'rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer',
								currentTz === tz.value
									? 'bg-primary text-primary-foreground border-primary'
									: 'bg-background text-muted-foreground hover:text-foreground hover:bg-accent'
							)}
							key={tz.label}
							onClick={() => setValue('timezone', tz.value)}
							type="button"
						>
							{tz.label}
						</button>
					))}
				</div>
				<FormSelect
					label={isMultiZone ? 'Left Calendar Timezone' : 'Timezone'}
					name="timezone"
					options={TIMEZONE_OPTIONS}
				/>
			</div>

			{isMultiZone && (
				<FormSelect
					label="Right Calendar Timezone"
					name="secondaryTimezone"
					options={TIMEZONE_OPTIONS}
				/>
			)}
		</>
	)
}

export function ThemePanel() {
	const { control, setValue } = useFormContext<PlaygroundSettings>()
	const themePreset = useWatch({ control, name: 'themePreset' })
	const themeAccent = useWatch({ control, name: 'themeAccent' })
	const isResource = useWatch({ control, name: 'calendarType' }) === 'resource'
	const supportsPalette = themePreset === 'mui' || themePreset === 'stylex'

	return (
		<>
			<SectionHeading>Theme Customization</SectionHeading>
			{themePreset === 'tailwind' && (
				<p className="text-xs text-muted-foreground leading-relaxed">
					Tailwind / Shadcn tokens are active. Switch themes in the preview bar
					to customize MUI, StyleX, or Unstyled options.
				</p>
			)}

			{themePreset !== 'tailwind' && (
				<FormButtonGroup
					label="Color Mode"
					name="themeMode"
					options={THEME_MODE_OPTIONS}
				/>
			)}

			{supportsPalette && (
				<div className="space-y-1.5">
					<span className="block text-sm font-medium">Accent Token</span>
					<div className="grid grid-cols-4 gap-1.5">
						{(Object.keys(THEME_ACCENTS) as ThemeAccent[]).map((key) => {
							const item = THEME_ACCENTS[key]
							const isSelected = themeAccent === key
							return (
								<button
									aria-pressed={isSelected}
									className={cn(
										'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium cursor-pointer transition-all',
										isSelected
											? 'border-primary ring-2 ring-primary/25 bg-accent/60'
											: 'border-border hover:bg-accent/40'
									)}
									key={key}
									onClick={() => setValue('themeAccent', key)}
									type="button"
								>
									<span
										className="size-3 rounded-full shrink-0"
										style={{ backgroundColor: item.swatch }}
									/>
									{item.label}
								</button>
							)
						})}
					</div>
				</div>
			)}

			{themePreset === 'unstyled' && (
				<div className="rounded-lg border bg-muted/40 p-3 space-y-2">
					<FormCheckbox
						label="Apply custom slotProps theme"
						name="useCustomSlotProps"
					/>
					<p className="text-xs text-muted-foreground leading-relaxed">
						Uncheck to inspect bare structural geometry with zero visual utility
						classes.
					</p>
				</div>
			)}

			<SectionHeading>Custom Render Props</SectionHeading>
			<div className="space-y-2.5">
				<FormCheckbox
					label="Custom event renderer (renderEvent)"
					name="useCustomEventRenderer"
				/>
				{isResource && (
					<FormCheckbox
						label="Custom resource renderer (renderResource)"
						name="useCustomResourceRenderer"
					/>
				)}
				<FormCheckbox
					label="Custom header (headerComponent)"
					name="useCustomCalendarHeader"
				/>
				<FormCheckbox
					label="Custom event form (renderEventForm)"
					name="useCustomEventForm"
				/>
				<FormCheckbox
					label="Custom now indicator"
					name="useCustomCurrentTimeIndicator"
				/>
				<FormCheckbox
					label="Custom hour labels (renderHour)"
					name="useCustomHourRenderer"
				/>
				<FormCheckbox
					label="Custom disabled cell classes"
					name="useCustomClasses"
				/>
			</div>
		</>
	)
}

export function PluginsPanel() {
	const { control } = useFormContext<PlaygroundSettings>()
	const calendarType = useWatch({ control, name: 'calendarType' })
	const enableAgendaPlugin = useWatch({ control, name: 'enableAgendaPlugin' })
	const enableIcalPlugin = useWatch({ control, name: 'enableIcalPlugin' })

	return (
		<>
			<SectionHeading>Opt-In Plugins (v4.0)</SectionHeading>
			<div className="space-y-2.5">
				<FormCheckbox
					label="Recurrence plugin (RFC 5545 RRULE)"
					name="enableRecurrencePlugin"
				/>
				<FormCheckbox
					label="Drag-to-create plugin"
					name="enableDragToCreatePlugin"
				/>
				<FormCheckbox
					label="Year view plugin (@ilamy/calendar/plugins/year)"
					name="enableYearPlugin"
				/>
				<FormCheckbox
					label="iCal export plugin (VTIMEZONE + TZID)"
					name="enableIcalPlugin"
				/>
				{enableIcalPlugin && (
					<div className="border-l-2 pl-3 ml-1">
						<FormCheckbox
							label="Hide toolbar export button"
							name="hideExportButton"
						/>
					</div>
				)}
				<FormCheckbox label="Agenda view plugin" name="enableAgendaPlugin" />
				{enableAgendaPlugin && calendarType !== 'resource' && (
					<div className="border-l-2 pl-3 ml-1">
						<FormButtonGroup
							label="Agenda Window"
							name="agendaWindow"
							options={AGENDA_WINDOW_OPTIONS}
							parse={parseAgendaWindow}
						/>
					</div>
				)}
			</div>

			<SectionHeading>Editing &amp; Interaction</SectionHeading>
			<div className="space-y-2.5">
				<FormCheckbox
					label="Read-only events (editable=false)"
					name="disableDragAndDrop"
				/>
				<FormCheckbox
					label="Resize from start edge"
					name="eventResizableFromStart"
				/>
				<FormCheckbox label="Disable cell clicks" name="disableCellClick" />
				<FormCheckbox label="Disable event clicks" name="disableEventClick" />
			</div>

			<SectionHeading>Display &amp; Grid Density</SectionHeading>
			<div className="space-y-2.5">
				<FormCheckbox label="Show current time line" name="nowIndicator" />
				<FormCheckbox label="Show event times" name="showEventTimes" />
				<FormCheckbox label="Show event end times" name="showEventEnd" />
				<FormCheckbox label="Show all-day row" name="allDaySlot" />
				<FormCheckbox label="Scroll to now" name="scrollToNow" />
				<FormCheckbox label="Sticky view header" name="stickyViewHeader" />
			</div>

			<div className="grid grid-cols-2 gap-3 pt-1">
				<FormSelect
					label="Slot Duration"
					name="slotDuration"
					options={SLOT_DURATION_OPTIONS}
					parse={Number}
				/>
				<FormSelect
					label="Snap Duration"
					name="snapDuration"
					options={SNAP_DURATION_OPTIONS}
					parse={Number}
				/>
				<FormSelect
					label="Max Events/Day"
					name="dayMaxEvents"
					options={DAY_MAX_EVENTS_OPTIONS}
					parse={Number}
				/>
				<FormSelect
					label="Bar Height"
					name="eventHeight"
					options={EVENT_HEIGHT_OPTIONS}
					parse={Number}
				/>
				<FormSelect
					label="Bar Spacing"
					name="eventSpacing"
					options={EVENT_SPACING_OPTIONS}
					parse={Number}
				/>
				<FormSelect
					label="Scroll Time"
					name="scrollTime"
					options={SCROLL_TIME_OPTIONS}
				/>
			</div>

			<FormButtonGroup
				label="Week Numbers"
				name="weekNumbers"
				options={WEEK_NUMBER_OPTIONS}
			/>
			<FormButtonGroup
				label="Week Calculation"
				name="weekNumberCalculation"
				options={WEEK_NUMBER_CALCULATION_OPTIONS}
			/>
		</>
	)
}

export function SchedulePanel() {
	const { control } = useFormContext<PlaygroundSettings>()
	const businessHoursEnabled = useWatch({
		control,
		name: 'enableBusinessHours',
	})

	return (
		<>
			<SectionHeading>Business Hours &amp; Constraints (v4.0)</SectionHeading>
			<p className="text-xs text-muted-foreground leading-relaxed">
				In v4.0, business hours shade closed cells without blocking drops or
				clicks. Opt in to enforcement via constraints below.
			</p>
			<FormCheckbox label="Enable business hours" name="enableBusinessHours" />
			{businessHoursEnabled && (
				<div className="border-l-2 border-primary/25 pl-3 ml-1 space-y-3">
					<WeekdayMultiSelectField
						label="Working Days"
						name="businessHoursDays"
					/>
					<div className="grid grid-cols-2 gap-2">
						<FormSelect
							label="Start"
							name="businessHoursStart"
							options={HOUR_OPTIONS}
							parse={Number}
						/>
						<FormSelect
							label="End"
							name="businessHoursEnd"
							options={HOUR_OPTIONS}
							parse={Number}
						/>
					</div>
					<FormCheckbox
						label="Hide non-business hours"
						name="hideNonBusinessHours"
					/>
					<FormCheckbox
						label="Constrain drops/resizes to business hours"
						name="constrainEventsToBusinessHours"
					/>
					<FormCheckbox
						label="Constrain selection/creation to business hours"
						name="constrainSelectToBusinessHours"
					/>
				</div>
			)}

			<SectionHeading>Visible Hours &amp; Hidden Days</SectionHeading>
			<div className="grid grid-cols-2 gap-2">
				<FormSelect
					label="slotMinTime"
					name="slotMinTime"
					options={SLOT_MIN_TIME_OPTIONS}
				/>
				<FormSelect
					label="slotMaxTime"
					name="slotMaxTime"
					options={SLOT_MAX_TIME_OPTIONS}
				/>
			</div>
			<FormCheckbox label="Show weekends" name="weekends" />
			<WeekdayMultiSelectField label="Hidden Days" name="hiddenDays" />

			<SectionHeading>Callback Demos</SectionHeading>
			<div className="space-y-2.5">
				<FormCheckbox
					label="Live event state (add/update/delete)"
					name="useEventLifecycleCallbacks"
				/>
				<FormCheckbox
					label="Alert on cell click (onCellClick)"
					name="useCustomOnDateClick"
				/>
				<FormCheckbox
					label="Alert on event click (onEventClick)"
					name="useCustomOnEventClick"
				/>
				<FormCheckbox
					label="Alert on +N more click"
					name="useCustomOnMoreEventsClick"
				/>
			</div>
		</>
	)
}
