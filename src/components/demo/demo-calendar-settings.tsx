import type { WeekDays } from '@/components/types'
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import dayjs from '@/lib/configs/dayjs-config'
import type { CalendarView, TimeFormat } from '@/types'
import { ModeToggle } from './mode-toggle'

interface DemoCalendarSettingsProps {
	// Calendar type
	calendarType: 'regular' | 'resource'
	setCalendarType: (value: 'regular' | 'resource') => void
	firstDayOfWeek: WeekDays
	setFirstDayOfWeek: (value: WeekDays) => void
	initialView: CalendarView
	setInitialView: (value: CalendarView) => void
	initialDate: dayjs.Dayjs | undefined
	setInitialDate: (value: dayjs.Dayjs | undefined) => void
	useCustomEventRenderer: boolean
	setUseCustomEventRenderer: (value: boolean) => void
	locale: string
	setLocale: (value: string) => void
	timezone: string
	setTimezone: (value: string) => void
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
	calendarHeight: string
	setCalendarHeight: (value: string) => void
	dayMaxEvents: number
	setDayMaxEvents: (value: number) => void
	stickyViewHeader?: boolean
	setStickyHeader?: (value: boolean) => void
	timeFormat: TimeFormat
	setTimeFormat: (value: TimeFormat) => void
	useCustomClasses: boolean
	setUseCustomClasses: (value: boolean) => void
	useCustomTimeIndicator: boolean
	setUseCustomTimeIndicator: (value: boolean) => void
	// Resource calendar specific props
	isResourceCalendar?: boolean
	orientation?: 'horizontal' | 'vertical'
	setOrientation?: (value: 'horizontal' | 'vertical') => void
}

export function DemoCalendarSettings({
	calendarType,
	setCalendarType,
	firstDayOfWeek,
	setFirstDayOfWeek,
	initialView,
	setInitialView,
	initialDate,
	setInitialDate,
	useCustomEventRenderer,
	setUseCustomEventRenderer,
	locale,
	setLocale,
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
	calendarHeight,
	setCalendarHeight,
	dayMaxEvents,
	setDayMaxEvents,
	stickyViewHeader,
	setStickyHeader,
	timeFormat,
	setTimeFormat,
	useCustomClasses,
	setUseCustomClasses,
	useCustomTimeIndicator,
	setUseCustomTimeIndicator,
	// Resource calendar props
	isResourceCalendar,
	orientation,
	setOrientation,
}: DemoCalendarSettingsProps) {
	return (
		<Card className="border bg-background backdrop-blur-md shadow-lg overflow-clip gap-0">
			<CardHeader className="border-b border-white/10 dark:border-white/5 p-4">
				<CardTitle className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
					Calendar Settings
				</CardTitle>
				<CardDescription>Customize the calendar display</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 p-6">
				<div>
					<ModeToggle />
				</div>
				<div>
					<label className="block text-sm text-left font-medium mb-1">
						Calendar Type
					</label>
					<div className="flex gap-1">
						<Button
							className={
								calendarType === 'regular'
									? 'bg-primary/80 text-primary-foreground'
									: ''
							}
							onClick={() => {
								setCalendarType('regular')
							}}
							variant="secondary"
						>
							Regular
						</Button>
						<Button
							className={
								calendarType === 'resource'
									? 'bg-primary/80 text-primary-foreground'
									: ''
							}
							onClick={() => {
								setCalendarType('resource')
							}}
							variant="secondary"
						>
							Resource
						</Button>
					</div>
				</div>

				{isResourceCalendar && (
					<div>
						<label className="block text-sm text-left font-medium mb-1">
							Orientation
						</label>
						<div className="flex gap-1">
							<Button
								className={
									orientation === 'horizontal'
										? 'bg-primary/80 text-primary-foreground'
										: ''
								}
								onClick={() => setOrientation?.('horizontal')}
								variant="secondary"
							>
								Horizontal
							</Button>
							<Button
								className={
									orientation === 'vertical'
										? 'bg-primary/80 text-primary-foreground'
										: ''
								}
								onClick={() => setOrientation?.('vertical')}
								variant="secondary"
							>
								Vertical
							</Button>
						</div>
					</div>
				)}
				<div>
					<label className="block text-sm text-left font-medium mb-1">
						First Day of Week
					</label>
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
					<label className="block text-sm text-left font-medium mb-1">
						Initial View
					</label>
					<Select
						onValueChange={(value) => setInitialView(value as CalendarView)}
						value={initialView}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select initial view" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="month">Month</SelectItem>
							<SelectItem value="week">Week</SelectItem>
							<SelectItem value="day">Day</SelectItem>
							{!isResourceCalendar && (
								<SelectItem value="year">Year</SelectItem>
							)}
						</SelectContent>
					</Select>
				</div>

				<div>
					<label className="block text-sm text-left font-medium mb-1">
						Initial Date
					</label>
					<Select
						onValueChange={(value) => {
							if (value === 'today') {
								setInitialDate(undefined)
							} else if (value === 'start-of-month') {
								setInitialDate(dayjs().startOf('month'))
							} else if (value === 'start-of-year') {
								setInitialDate(dayjs().startOf('year'))
							} else if (value === 'next-month') {
								setInitialDate(dayjs().add(1, 'month').startOf('month'))
							}
						}}
						value={
							initialDate === undefined
								? 'today'
								: initialDate.isSame(dayjs().startOf('month'), 'day')
									? 'start-of-month'
									: initialDate.isSame(dayjs().startOf('year'), 'day')
										? 'start-of-year'
										: initialDate.isSame(dayjs().add(1, 'month'), 'month')
											? 'next-month'
											: 'custom'
						}
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
				</div>

				<div>
					<label className="block text-sm text-left font-medium mb-1">
						Locale
					</label>
					<Select onValueChange={setLocale} value={locale}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select locale" />
						</SelectTrigger>
						<SelectContent>
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
						</SelectContent>
					</Select>
				</div>

				{/* <div>
          <label className="block text-sm text-left font-medium mb-1">Timezone</label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {Intl.supportedValuesOf('timeZone').map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}

				<div>
					<label className="block text-sm text-left font-medium mb-1">
						Calendar Height
					</label>
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
					<label className="block text-sm text-left font-medium mb-1">
						Max Events Per Day
					</label>
					<Select
						onValueChange={(value) =>
							setDayMaxEvents(Number.parseInt(value, 10))
						}
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
					<label className="block text-sm text-left font-medium mb-1">
						Time Format
					</label>
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
						checked={useCustomTimeIndicator}
						id="customTimeIndicator"
						onCheckedChange={() =>
							setUseCustomTimeIndicator(!useCustomTimeIndicator)
						}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="customTimeIndicator"
					>
						Use custom time indicator
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

				<div className="flex items-center space-x-2">
					<Checkbox
						checked={useCustomClasses}
						id="useCustomClasses"
						onCheckedChange={() => setUseCustomClasses(!useCustomClasses)}
					/>
					<label
						className="text-sm font-medium leading-none cursor-pointer"
						htmlFor="useCustomClasses"
					>
						Use custom disabled cell styles
					</label>
				</div>
			</CardContent>
		</Card>
	)
}
