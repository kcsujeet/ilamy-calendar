import type { SlotDuration, WeekDays } from '@ilamy/calendar'
import { type Dayjs, dayjs } from '@ilamy/calendar'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const ALL_WEEKDAYS = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday',
] as const

function TimezoneCombobox({
	value,
	onChange,
}: {
	value: string
	onChange: (value: string) => void
}) {
	const timezones = useMemo(() => Intl.supportedValuesOf('timeZone'), [])

	return (
		<Combobox
			items={timezones}
			onValueChange={(val) => {
				if (val) onChange(val)
			}}
			value={value}
		>
			<ComboboxInput className="w-full" placeholder="Search timezone..." />
			<ComboboxContent>
				<ComboboxEmpty>No timezone found.</ComboboxEmpty>
				<ComboboxList>
					{(item) => (
						<ComboboxItem key={item} value={item}>
							{item}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	)
}

function WeekdayCheckboxGroup({
	idPrefix,
	selectedDays,
	onChange,
}: {
	idPrefix: string
	selectedDays: WeekDays[]
	onChange: (days: WeekDays[]) => void
}) {
	return (
		<div className="grid grid-cols-2 gap-2">
			{ALL_WEEKDAYS.map((day) => (
				<div className="flex items-center space-x-1.5" key={day}>
					<Checkbox
						checked={selectedDays.includes(day)}
						id={`${idPrefix}-${day}`}
						onCheckedChange={(checked) => {
							onChange(
								checked
									? [...selectedDays, day]
									: selectedDays.filter((d) => d !== day)
							)
						}}
					/>
					<label
						className="text-xs cursor-pointer capitalize"
						htmlFor={`${idPrefix}-${day}`}
					>
						{day.slice(0, 3)}
					</label>
				</div>
			))}
		</div>
	)
}

interface DemoCalendarSettingsProps {
	calendarMode: 'standard' | 'resource'
	setCalendarMode: (value: 'standard' | 'resource') => void
	firstDayOfWeek: WeekDays
	setFirstDayOfWeek: (value: WeekDays) => void
	initialView: 'month' | 'week' | 'day' | 'year'
	setInitialView: (value: 'month' | 'week' | 'day' | 'year') => void
	initialDate: Dayjs | undefined
	setInitialDate: (value: Dayjs | undefined) => void
	useCustomEventRenderer: boolean
	setUseCustomEventRenderer: (value: boolean) => void
	useCustomResourceRenderer?: boolean
	setUseCustomResourceRenderer?: (value: boolean) => void
	resourceOrientation?: 'horizontal' | 'vertical'
	setResourceOrientation?: (value: 'horizontal' | 'vertical') => void
	weekViewGranularity?: 'hourly' | 'daily'
	setWeekViewGranularity?: (value: 'hourly' | 'daily') => void
	locale: string
	setLocale: (value: string) => void
	timezone: string
	setTimezone: (value: string) => void
	timeFormat: '12-hour' | '24-hour'
	setTimeFormat: (value: '12-hour' | '24-hour') => void
	disableCellClick: boolean
	setDisableCellClick: (value: boolean) => void
	disableEventClick: boolean
	setDisableEventClick: (value: boolean) => void
	disableDragAndDrop: boolean
	setDisableDragAndDrop: (value: boolean) => void
	useCustomOnDateClick: boolean
	setUseCustomOnDateClick: (value: boolean) => void
	useCustomOnEventClick: boolean
	setUseCustomOnEventClick: (value: boolean) => void
	useEventLifecycleCallbacks: boolean
	setUseEventLifecycleCallbacks: (value: boolean) => void
	calendarHeight: string
	setCalendarHeight: (value: string) => void
	dayMaxEvents: number
	setDayMaxEvents: (value: number) => void
	eventSpacing: number
	setEventSpacing: (value: number) => void
	eventHeight: number
	setEventHeight: (value: number) => void
	stickyViewHeader?: boolean
	setStickyHeader?: (value: boolean) => void
	hideExportButton?: boolean
	setHideExportButton?: (value: boolean) => void
	useCustomCalendarHeader?: boolean
	setUseCustomCalendarHeader?: (value: boolean) => void
	enableBusinessHours: boolean
	setEnableBusinessHours: (value: boolean) => void
	businessHoursDays: WeekDays[]
	setBusinessHoursDays: (value: WeekDays[]) => void
	businessHoursStart: number
	setBusinessHoursStart: (value: number) => void
	businessHoursEnd: number
	setBusinessHoursEnd: (value: number) => void
	useCustomEventForm: boolean
	setUseCustomEventForm: (value: boolean) => void
	hideNonBusinessHours: boolean
	setHideNonBusinessHours: (value: boolean) => void
	hiddenDays: WeekDays[]
	setHiddenDays: (value: WeekDays[]) => void
	useCustomCurrentTimeIndicator: boolean
	setUseCustomCurrentTimeIndicator: (value: boolean) => void
	useCustomHourRenderer: boolean
	setUseCustomHourRenderer: (value: boolean) => void
	slotDuration: SlotDuration
	setSlotDuration: (value: SlotDuration) => void
	scrollTime: string | undefined
	setScrollTime: (value: string | undefined) => void
	onSimulateNewFeatures?: () => void
}

export function DemoCalendarSettings({
	calendarMode,
	setCalendarMode,
	firstDayOfWeek,
	setFirstDayOfWeek,
	initialView,
	setInitialView,
	initialDate,
	setInitialDate,
	useCustomEventRenderer,
	setUseCustomEventRenderer,
	useCustomResourceRenderer,
	setUseCustomResourceRenderer,
	resourceOrientation,
	setResourceOrientation,
	weekViewGranularity,
	setWeekViewGranularity,
	locale,
	setLocale,
	timezone,
	setTimezone,
	timeFormat,
	setTimeFormat,
	disableCellClick,
	setDisableCellClick,
	disableEventClick,
	setDisableEventClick,
	disableDragAndDrop,
	setDisableDragAndDrop,
	useCustomOnDateClick,
	setUseCustomOnDateClick,
	useCustomOnEventClick,
	setUseCustomOnEventClick,
	useEventLifecycleCallbacks,
	setUseEventLifecycleCallbacks,
	calendarHeight,
	setCalendarHeight,
	dayMaxEvents,
	setDayMaxEvents,
	eventSpacing,
	setEventSpacing,
	eventHeight,
	setEventHeight,
	stickyViewHeader,
	setStickyHeader,
	hideExportButton,
	setHideExportButton,
	useCustomCalendarHeader,
	setUseCustomCalendarHeader,
	enableBusinessHours,
	setEnableBusinessHours,
	businessHoursDays,
	setBusinessHoursDays,
	businessHoursStart,
	setBusinessHoursStart,
	businessHoursEnd,
	setBusinessHoursEnd,
	useCustomEventForm,
	setUseCustomEventForm,
	hideNonBusinessHours,
	setHideNonBusinessHours,
	hiddenDays,
	setHiddenDays,
	useCustomCurrentTimeIndicator,
	setUseCustomCurrentTimeIndicator,
	useCustomHourRenderer,
	setUseCustomHourRenderer,
	slotDuration,
	setSlotDuration,
	scrollTime,
	setScrollTime,
	onSimulateNewFeatures,
}: DemoCalendarSettingsProps) {
	return (
		<Card>
			<CardHeader className="border-b border-white/10 dark:border-white/5 p-4 pb-0">
				<CardTitle className="bg-clip-text">Calendar Settings</CardTitle>
				<CardDescription>Customize the calendar display</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 p-4">
				<div>
					<span className="block text-sm text-left font-medium mb-2">
						Calendar Mode
					</span>
					<ToggleGroup
						className="justify-start"
						onValueChange={(value) => {
							if (value) setCalendarMode(value as 'standard' | 'resource')
						}}
						type="single"
						value={calendarMode}
					>
						<ToggleGroupItem
							aria-label="Standard Calendar"
							className="flex-1"
							value="standard"
						>
							Standard
						</ToggleGroupItem>
						<ToggleGroupItem
							aria-label="Resource Calendar"
							className="flex-1"
							value="resource"
						>
							Resource
						</ToggleGroupItem>
					</ToggleGroup>
				</div>

				{calendarMode === 'resource' && (
					<div>
						<span className="block text-sm text-left font-medium mb-2">
							Resource Orientation
						</span>
						<ToggleGroup
							className="justify-start"
							onValueChange={(value) => {
								if (value)
									setResourceOrientation?.(value as 'horizontal' | 'vertical')
							}}
							type="single"
							value={resourceOrientation}
						>
							<ToggleGroupItem
								aria-label="Horizontal Orientation"
								className="flex-1"
								value="horizontal"
							>
								Horizontal
							</ToggleGroupItem>
							<ToggleGroupItem
								aria-label="Vertical Orientation"
								className="flex-1"
								value="vertical"
							>
								Vertical
							</ToggleGroupItem>
						</ToggleGroup>
					</div>
				)}

				{calendarMode === 'resource' && (
					<div>
						<span className="block text-sm text-left font-medium mb-2">
							Week View Granularity
						</span>
						<ToggleGroup
							className="justify-start"
							onValueChange={(value) => {
								if (value) setWeekViewGranularity?.(value as 'hourly' | 'daily')
							}}
							type="single"
							value={weekViewGranularity}
						>
							<ToggleGroupItem
								aria-label="Hourly granularity"
								className="flex-1"
								value="hourly"
							>
								Hourly
							</ToggleGroupItem>
							<ToggleGroupItem
								aria-label="Daily granularity"
								className="flex-1"
								value="daily"
							>
								Daily
							</ToggleGroupItem>
						</ToggleGroup>
						<p className="text-xs text-muted-foreground mt-1.5">
							{weekViewGranularity === 'hourly'
								? 'Hourly time slots per day (default).'
								: 'One row per day, no time slots — good for high-level schedules.'}
						</p>
					</div>
				)}

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						First Day of Week
					</span>
					<Select
						onValueChange={(value) => setFirstDayOfWeek(value as WeekDays)}
						value={firstDayOfWeek}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select first day of week" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="sunday">Sunday</SelectItem>
							<SelectItem value="monday">Monday</SelectItem>
							<SelectItem value="tuesday">Tuesday</SelectItem>
							<SelectItem value="wednesday">Wednesday</SelectItem>
							<SelectItem value="thursday">Thursday</SelectItem>
							<SelectItem value="friday">Friday</SelectItem>
							<SelectItem value="saturday">Saturday</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						Initial View
					</span>
					<Select
						onValueChange={(value) =>
							setInitialView(value as 'month' | 'week' | 'day' | 'year')
						}
						value={initialView}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select initial view" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="month">Month View</SelectItem>
							<SelectItem value="week">Week View</SelectItem>
							<SelectItem value="day">Day View</SelectItem>
							<SelectItem value="year">Year View</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						Initial Date
					</span>
					<div className="flex gap-2">
						<DatePicker
							className="flex-1"
							closeOnSelect
							date={initialDate?.toDate()}
							label="Today (Default)"
							setDate={(date) => setInitialDate(date ? dayjs(date) : undefined)}
						/>
						{initialDate && (
							<Button
								className="px-3"
								onClick={() => setInitialDate(undefined)}
								size="sm"
								variant="outline"
							>
								Reset
							</Button>
						)}
					</div>
				</div>

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						Locale
					</span>
					<Select onValueChange={setLocale} value={locale}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select locale" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="en">English</SelectItem>
							<SelectItem value="es">Español</SelectItem>
							<SelectItem value="fr">Français</SelectItem>
							<SelectItem value="de">Deutsch</SelectItem>
							<SelectItem value="cs">Čeština</SelectItem>
							<SelectItem value="it">Italiano</SelectItem>
							<SelectItem value="pt">Português</SelectItem>
							<SelectItem value="ru">Русский</SelectItem>
							<SelectItem value="zh">中文</SelectItem>
							<SelectItem value="ja">日本語</SelectItem>
							<SelectItem value="ko">한국어</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						Time Format
					</span>
					<Select onValueChange={setTimeFormat} value={timeFormat}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select time format" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="12-hour">12-hour (1:00 PM)</SelectItem>
							<SelectItem value="24-hour">24-hour (13:00)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						Slot Duration
					</span>
					<Select
						onValueChange={(value) =>
							setSlotDuration(parseInt(value, 10) as SlotDuration)
						}
						value={slotDuration.toString()}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select slot duration" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="60">60 min (hour only, default)</SelectItem>
							<SelectItem value="30">30 min (half-hour)</SelectItem>
							<SelectItem value="15">15 min (quarter-hour)</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground mt-1.5">
						Time-grid granularity in day, week, and resource hour views.
					</p>
				</div>

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						Initial Scroll Time
					</span>
					<Select
						onValueChange={(value) =>
							setScrollTime(value === 'none' ? undefined : value)
						}
						value={scrollTime ?? 'none'}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select scroll time" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">None (no auto-scroll)</SelectItem>
							<SelectItem value="06:00">06:00</SelectItem>
							<SelectItem value="08:00">08:00 (typical workday)</SelectItem>
							<SelectItem value="09:00">09:00</SelectItem>
							<SelectItem value="12:00">12:00</SelectItem>
							<SelectItem value="14:00">14:00</SelectItem>
							<SelectItem value="18:00">18:00</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground mt-1.5">
						Requires a fixed calendar height. No effect on month / year views.
					</p>
				</div>

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						Timezone
					</span>
					<TimezoneCombobox onChange={setTimezone} value={timezone} />
				</div>

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						Calendar Height
					</span>
					<Select onValueChange={setCalendarHeight} value={calendarHeight}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select height" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="auto">Auto</SelectItem>
							<SelectItem value="300px">Extra Small (300px)</SelectItem>
							<SelectItem value="400px">Small (400px)</SelectItem>
							<SelectItem value="600px">Medium (600px)</SelectItem>
							<SelectItem value="800px">Large (800px)</SelectItem>
							<SelectItem value="1000px">Extra Large (1000px)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						Max Events Per Day
					</span>
					<Select
						onValueChange={(value) => setDayMaxEvents(parseInt(value, 10))}
						value={dayMaxEvents?.toString()}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select max events" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="1">1 event</SelectItem>
							<SelectItem value="2">2 events</SelectItem>
							<SelectItem value="3">3 events</SelectItem>
							<SelectItem value="4">4 events</SelectItem>
							<SelectItem value="5">5 events</SelectItem>
							<SelectItem value="999">No limit</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						Event Spacing (px)
					</span>
					<Select
						onValueChange={(value) => setEventSpacing(parseInt(value, 10))}
						value={eventSpacing?.toString()}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select event spacing" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="1">Default (1px)</SelectItem>
							<SelectItem value="0">None (0px)</SelectItem>
							<SelectItem value="2">Normal (2px)</SelectItem>
							<SelectItem value="4">Comfortable (4px)</SelectItem>
							<SelectItem value="6">Spacious (6px)</SelectItem>
							<SelectItem value="8">Extra (8px)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div>
					<span className="block text-sm text-left font-medium mb-1">
						Event Bar Height
					</span>
					<Select
						onValueChange={(value) => setEventHeight(parseInt(value, 10))}
						value={eventHeight.toString()}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select event height" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="20">20px (compact)</SelectItem>
							<SelectItem value="24">24px (default)</SelectItem>
							<SelectItem value="36">36px</SelectItem>
							<SelectItem value="48">48px (two lines)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-3">
					<div className="flex items-center space-x-2">
						<Checkbox
							checked={enableBusinessHours}
							id="enableBusinessHours"
							onCheckedChange={() =>
								setEnableBusinessHours(!enableBusinessHours)
							}
						/>
						<label
							className="text-sm font-medium leading-none cursor-pointer"
							htmlFor="enableBusinessHours"
						>
							Enable business hours
						</label>
					</div>

					{enableBusinessHours && (
						<div className="space-y-3 pl-6 border-l-2 border-border">
							<div>
								<span className="block text-xs font-medium mb-2">
									Days of Week
								</span>
								<WeekdayCheckboxGroup
									idPrefix="day"
									onChange={setBusinessHoursDays}
									selectedDays={businessHoursDays}
								/>
							</div>

							<div>
								<span className="block text-xs font-medium mb-1">
									Start Time
								</span>
								<Select
									onValueChange={(value) => {
										const newStart = parseInt(value, 10)
										setBusinessHoursStart(newStart)
										// If new start time is > end time, update end time to be start + 1
										if (newStart > businessHoursEnd) {
											setBusinessHoursEnd(Math.min(newStart + 1, 24))
										}
									}}
									value={businessHoursStart.toString()}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select start time" />
									</SelectTrigger>
									<SelectContent>
										{Array.from({ length: 24 }, (_, i) => i).map((hour) => (
											<SelectItem key={hour} value={hour.toString()}>
												{hour === 0
													? '12 AM'
													: hour < 12
														? `${hour} AM`
														: hour === 12
															? '12 PM'
															: `${hour - 12} PM`}{' '}
												({hour.toString().padStart(2, '0')}:00)
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<span className="block text-xs font-medium mb-1">End Time</span>
								<Select
									onValueChange={(value) => {
										const newEnd = parseInt(value, 10)
										setBusinessHoursEnd(newEnd)
										// If new end time is < start time, update start time to be end - 1
										if (newEnd < businessHoursStart) {
											setBusinessHoursStart(Math.max(newEnd - 1, 0))
										}
									}}
									value={businessHoursEnd.toString()}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select end time" />
									</SelectTrigger>
									<SelectContent>
										{Array.from({ length: 24 }, (_, i) => i).map((hour) => (
											<SelectItem key={hour} value={hour.toString()}>
												{hour === 0
													? '12 AM'
													: hour < 12
														? `${hour} AM`
														: hour === 12
															? '12 PM'
															: `${hour - 12} PM`}{' '}
												({hour.toString().padStart(2, '0')}:00)
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="flex items-center space-x-2 pt-2">
								<Checkbox
									checked={hideNonBusinessHours}
									id="hideNonBusinessHours"
									onCheckedChange={() =>
										setHideNonBusinessHours(!hideNonBusinessHours)
									}
								/>
								<label
									className="text-xs font-medium leading-none cursor-pointer"
									htmlFor="hideNonBusinessHours"
								>
									Hide non-business hours
								</label>
							</div>
						</div>
					)}
				</div>

				<div className="space-y-3">
					<span className="block text-sm text-left font-medium">
						Hidden Days (Week View)
					</span>
					<WeekdayCheckboxGroup
						idPrefix="hidden-day"
						onChange={setHiddenDays}
						selectedDays={hiddenDays}
					/>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={stickyViewHeader}
						id="stickyViewHeader"
						onCheckedChange={() => setStickyHeader?.(!stickyViewHeader)}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer ml-2"
						htmlFor="stickyViewHeader"
					>
						Enable sticky header
					</label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={hideExportButton}
						id="hideExportButton"
						onCheckedChange={() => setHideExportButton?.(!hideExportButton)}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer ml-2"
						htmlFor="hideExportButton"
					>
						Hide export button
					</label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={useCustomEventRenderer}
						id="customRenderer"
						onCheckedChange={() =>
							setUseCustomEventRenderer(!useCustomEventRenderer)
						}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="customRenderer"
					>
						Use custom event renderer
					</label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={useCustomCurrentTimeIndicator}
						id="customCurrentTimeIndicator"
						onCheckedChange={() =>
							setUseCustomCurrentTimeIndicator(!useCustomCurrentTimeIndicator)
						}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="customCurrentTimeIndicator"
					>
						Use custom current time indicator
					</label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={useCustomHourRenderer}
						id="customHourRenderer"
						onCheckedChange={() =>
							setUseCustomHourRenderer(!useCustomHourRenderer)
						}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="customHourRenderer"
					>
						Use custom hour renderer
					</label>
				</div>

				{calendarMode === 'resource' && (
					<div className="flex items-center space-x-2">
						<Checkbox
							checked={useCustomResourceRenderer}
							id="customResourceRenderer"
							onCheckedChange={() =>
								setUseCustomResourceRenderer?.(!useCustomResourceRenderer)
							}
						/>
						<label
							className="text-sm font-medium leading-none cursor-pointer"
							htmlFor="customResourceRenderer"
						>
							Use custom resource renderer
						</label>
					</div>
				)}

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={useCustomCalendarHeader}
						id="useCustomCalendarHeader"
						onCheckedChange={() =>
							setUseCustomCalendarHeader?.(!useCustomCalendarHeader)
						}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="useCustomCalendarHeader"
					>
						Use custom calendar header
					</label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={useCustomEventForm}
						id="useCustomEventForm"
						onCheckedChange={() => setUseCustomEventForm(!useCustomEventForm)}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="useCustomEventForm"
					>
						Use custom event form
					</label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={useEventLifecycleCallbacks}
						id="useEventLifecycleCallbacks"
						onCheckedChange={() =>
							setUseEventLifecycleCallbacks(!useEventLifecycleCallbacks)
						}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="useEventLifecycleCallbacks"
					>
						Use event lifecycle callbacks
					</label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={useCustomOnDateClick}
						id="useCustomOnDateClick"
						onCheckedChange={() =>
							setUseCustomOnDateClick(!useCustomOnDateClick)
						}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="useCustomOnDateClick"
					>
						Use custom onCellClick handler
					</label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={useCustomOnEventClick}
						id="useCustomOnEventClick"
						onCheckedChange={() =>
							setUseCustomOnEventClick(!useCustomOnEventClick)
						}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="useCustomOnEventClick"
					>
						Use custom onEventClick handler
					</label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={disableCellClick}
						id="disableCellClick"
						onCheckedChange={() => setDisableCellClick(!disableCellClick)}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="disableCellClick"
					>
						Disable cell clicks
					</label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={disableEventClick}
						id="disableEventClick"
						onCheckedChange={() => setDisableEventClick(!disableEventClick)}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="disableEventClick"
					>
						Disable event clicks
					</label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={disableDragAndDrop}
						id="disableDragAndDrop"
						onCheckedChange={() => setDisableDragAndDrop(!disableDragAndDrop)}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="disableDragAndDrop"
					>
						Disable drag & drop
					</label>
				</div>

				{onSimulateNewFeatures && (
					<div className="pt-4 border-t border-border">
						<Button
							className="w-full"
							onClick={onSimulateNewFeatures}
							variant="outline"
						>
							🎉 Test New Features
						</Button>
						<p className="text-xs text-muted-foreground mt-2 text-center">
							Simulate the upcoming initialView and lifecycle callbacks
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
