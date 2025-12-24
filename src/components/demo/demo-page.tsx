import { useState } from 'react'
import type { CalendarEvent, WeekDays } from '@/components/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'
import type { CellClickInfo } from '@/features/calendar/types'
import { IlamyResourceCalendar } from '@/features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar'
import type { Resource } from '@/features/resource-calendar/types'
import type dayjs from '@/lib/configs/dayjs-config'
import dummyEvents from '@/lib/seed'
import { cn } from '@/lib/utils'
import type { CalendarView, TimeFormat } from '@/types'
import { DemoCalendarSettings } from './demo-calendar-settings'

// Event handlers moved outside component to avoid recreation
const handleEventClick = (event: CalendarEvent) => {
	alert(`Event clicked: ${event.title}`)
}

const handleDateClick = (info: CellClickInfo) => {
	alert(JSON.stringify(info))
}

const handleEventAdd = (event: CalendarEvent) => {
	alert(`Event added: ${event.title}`)
}

const handleEventUpdate = (event: CalendarEvent) => {
	alert(`Event updated: ${event.title}`)
}

const handleEventDelete = (event: CalendarEvent) => {
	alert(`Event deleted: ${event.title}`)
}

const handleDateChange = (date: dayjs.Dayjs) => {
	// Date navigation - could trigger other state updates in real apps
	void date
}

// Demo resources
const demoResources: Resource[] = [
	{
		id: 'room-a',
		title: 'Conference Room A',
		color: '#1e40af',
		backgroundColor: '#dbeafe',
		position: 1,
	},
	{
		id: 'room-b',
		title: 'Conference Room B',
		color: '#059669',
		backgroundColor: '#d1fae5',
		position: 2,
	},
	{
		id: 'room-c',
		title: 'Meeting Room C',
		color: '#7c2d12',
		backgroundColor: '#fed7aa',
		position: 3,
	},
	{
		id: 'equipment-1',
		title: 'Projector #1',
		color: '#7c3aed',
		backgroundColor: '#ede9fe',
		position: 4,
	},
	{
		id: 'equipment-2',
		title: 'Laptop Cart',
		color: '#b45309',
		backgroundColor: '#fef3c7',
		position: 5,
	},
	{
		id: 'vehicle-1',
		title: 'Company Van',
		color: '#d97706',
		backgroundColor: '#ffedd5',
		position: 6,
	},
]

// Convert regular events to resource events
const createResourceEvents = (): CalendarEvent[] => {
	const resourceIds = demoResources.map((r) => r.id)

	return dummyEvents.map((event, index) => {
		const resourceEvent: CalendarEvent = { ...event }

		// Assign events to resources
		if (index % 4 === 0) {
			// Cross-resource event
			resourceEvent.resourceIds = [resourceIds[0], resourceIds[1]]
		} else {
			// Single resource event
			resourceEvent.resourceId = resourceIds[index % resourceIds.length]
		}

		return resourceEvent
	})
}

// Resource event handlers
const handleResourceEventClick = (event: CalendarEvent) => {
	const resources = event.resourceIds
		? event.resourceIds.join(', ')
		: event.resourceId
	alert(`Resource Event clicked: ${event.title} (Resources: ${resources})`)
}

export function DemoPage() {
	// Calendar type state
	const [calendarType, setCalendarType] = useState<'regular' | 'resource'>(
		'resource'
	)

	// Calendar configuration state
	const [firstDayOfWeek, setFirstDayOfWeek] = useState<WeekDays>('sunday')
	const [initialView, setInitialView] = useState<CalendarView>('week')
	const [initialDate, setInitialDate] = useState<dayjs.Dayjs | undefined>(
		undefined
	)
	const [customEvents] = useState<CalendarEvent[]>(dummyEvents)
	const [resourceEvents] = useState<CalendarEvent[]>(createResourceEvents())
	const [useCustomEventRenderer, setUseCustomEventRenderer] = useState(false)
	const [locale, setLocale] = useState('en')
	const [timezone, setTimezone] = useState(() => {
		return Intl.DateTimeFormat().resolvedOptions().timeZone
	})
	const [stickyViewHeader, setStickyHeader] = useState(true)

	// Disable functionality state
	const [disableCellClick, setDisableCellClick] = useState(false)
	const [disableEventClick, setDisableEventClick] = useState(false)
	const [disableDragAndDrop, setDisableDragAndDrop] = useState(false)

	// Custom handler state
	const [useCustomOnDateClick, setUseCustomOnDateClick] = useState(false)
	const [useCustomOnEventClick, setUseCustomOnEventClick] = useState(false)

	// UI settings
	const [calendarHeight, setCalendarHeight] = useState('600px')
	const [dayMaxEvents, setDayMaxEvents] = useState(3)
	const [timeFormat, setTimeFormat] = useState<TimeFormat>('12-hour')
	const [useCustomClasses, setUseCustomClasses] = useState(false)

	// Resource calendar settings
	const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>(
		'horizontal'
	)

	const calendarKey = `${locale}-${initialView}-${initialDate?.toISOString() || 'today'}-${timeFormat}`

	// Custom event renderer function
	const renderEvent = (event: CalendarEvent) => {
		const backgroundColor = event.backgroundColor || 'bg-blue-500'
		const color = event.color || 'text-blue-800'
		return (
			<div
				className={cn(
					'border-primary border-1 border-l-2 px-2 truncate w-full h-full',
					backgroundColor,
					color
				)}
				style={{ backgroundColor, color }}
			>
				{event.title}
			</div>
		)
	}

	return (
		<div
			className="container mx-auto px-4 py-8 relative"
			data-testid="demo-page"
		>
			{/* Decorative background elements */}
			<div className="fixed top-20 right-20 -z-10 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse-slow"></div>
			<div className="fixed bottom-20 left-10 -z-10 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-3xl animate-pulse"></div>

			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-500">
					Interactive Demo
				</h1>
				<p className="text-muted-foreground">
					Try out the ilamy Calendar components with different configurations
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
				{/* Calendar settings sidebar */}
				<div className="lg:col-span-1 space-y-6">
					<DemoCalendarSettings
						calendarHeight={calendarHeight}
						calendarType={calendarType}
						dayMaxEvents={dayMaxEvents}
						disableCellClick={disableCellClick}
						disableDragAndDrop={disableDragAndDrop}
						disableEventClick={disableEventClick}
						firstDayOfWeek={firstDayOfWeek}
						initialDate={initialDate}
						initialView={initialView}
						isResourceCalendar={calendarType === 'resource'}
						locale={locale}
						orientation={orientation}
						setCalendarHeight={setCalendarHeight}
						setCalendarType={setCalendarType}
						setDayMaxEvents={setDayMaxEvents}
						setDisableCellClick={setDisableCellClick}
						setDisableDragAndDrop={setDisableDragAndDrop}
						setDisableEventClick={setDisableEventClick}
						setFirstDayOfWeek={setFirstDayOfWeek}
						setInitialDate={setInitialDate}
						setInitialView={setInitialView}
						setLocale={setLocale}
						setOrientation={setOrientation}
						setStickyHeader={setStickyHeader}
						setTimeFormat={setTimeFormat}
						setTimezone={setTimezone}
						setUseCustomClasses={setUseCustomClasses}
						setUseCustomEventRenderer={setUseCustomEventRenderer}
						setUseCustomOnDateClick={setUseCustomOnDateClick}
						setUseCustomOnEventClick={setUseCustomOnEventClick}
						stickyViewHeader={stickyViewHeader}
						timeFormat={timeFormat}
						timezone={timezone}
						useCustomClasses={useCustomClasses}
						// Resource calendar specific props
						useCustomEventRenderer={useCustomEventRenderer}
						useCustomOnDateClick={useCustomOnDateClick}
						useCustomOnEventClick={useCustomOnEventClick}
					/>

					{/* Resource info card */}
					{calendarType === 'resource' && (
						<Card className="p-4">
							<h3 className="font-semibold mb-3">Demo Resources</h3>
							<div className="space-y-2 text-sm">
								{demoResources.map((resource) => (
									<div className="flex items-center gap-2" key={resource.id}>
										<div
											className="w-3 h-3 rounded"
											style={{ backgroundColor: resource.color }}
										/>
										<span>{resource.title}</span>
									</div>
								))}
							</div>
							<div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
								Events are automatically assigned to resources. Some events span
								multiple resources.
							</div>
						</Card>
					)}
				</div>

				{/* Calendar display */}
				<div className="lg:col-span-3">
					<Card className="border backdrop-blur-md shadow-lg overflow-clip relative p-2 bg-background">
						<CardHeader>
							<div className="py-3 flex items-center">
								<div className="flex space-x-1.5">
									<div className="w-3 h-3 rounded-full bg-red-400"></div>
									<div className="w-3 h-3 rounded-full bg-yellow-400"></div>
									<div className="w-3 h-3 rounded-full bg-green-400"></div>
								</div>
								<div className="mx-auto text-sm font-medium">Calendar Demo</div>
							</div>
						</CardHeader>

						<CardContent
							className="p-0 overflow-clip relative z-10"
							style={{ height: calendarHeight }}
						>
							{calendarType === 'regular' ? (
								<IlamyCalendar
									businessHours={[
										{
											daysOfWeek: ['tuesday', 'friday'],
											startTime: 9,
											endTime: 17,
										},
									]}
									classesOverride={
										useCustomClasses
											? {
													disabledCell:
														'bg-red-50 dark:bg-red-950 text-red-400 dark:text-red-600 pointer-events-none opacity-50',
												}
											: undefined
									}
									dayMaxEvents={dayMaxEvents}
									disableCellClick={disableCellClick}
									disableDragAndDrop={disableDragAndDrop}
									disableEventClick={disableEventClick}
									events={customEvents}
									firstDayOfWeek={firstDayOfWeek}
									initialDate={initialDate}
									initialView={initialView}
									key={calendarKey}
									locale={locale}
									onCellClick={
										useCustomOnDateClick ? handleDateClick : undefined
									}
									onDateChange={handleDateChange}
									onEventAdd={handleEventAdd}
									onEventClick={
										useCustomOnEventClick ? handleEventClick : undefined
									}
									onEventDelete={handleEventDelete}
									onEventUpdate={handleEventUpdate}
									renderEvent={useCustomEventRenderer ? renderEvent : undefined}
									stickyViewHeader={stickyViewHeader}
									timeFormat={timeFormat}
									timezone={timezone}
								/>
							) : (
								<IlamyResourceCalendar
									businessHours={{
										daysOfWeek: [
											// 'monday',
											'tuesday',
											// 'wednesday',
											// 'thursday',
											'friday',
										],
										startTime: 9,
										endTime: 17,
									}}
									classesOverride={
										useCustomClasses
											? {
													disabledCell:
														'bg-red-50 dark:bg-red-950 text-red-400 dark:text-red-600 pointer-events-none opacity-50',
												}
											: undefined
									}
									dayMaxEvents={dayMaxEvents}
									disableCellClick={disableCellClick}
									disableDragAndDrop={disableDragAndDrop} // No year view for resource calendar
									disableEventClick={disableEventClick}
									events={resourceEvents}
									firstDayOfWeek={firstDayOfWeek}
									initialDate={initialDate}
									initialView={initialView === 'year' ? 'month' : initialView}
									key={`resource-${calendarKey}-${orientation}`}
									locale={locale}
									onCellClick={
										useCustomOnDateClick ? handleDateClick : undefined
									}
									onDateChange={handleDateChange}
									onEventAdd={handleEventAdd}
									onEventClick={
										useCustomOnEventClick ? handleResourceEventClick : undefined
									}
									onEventDelete={handleEventDelete}
									onEventUpdate={handleEventUpdate}
									orientation={orientation}
									renderEvent={useCustomEventRenderer ? renderEvent : undefined}
									resources={demoResources}
									stickyViewHeader={stickyViewHeader}
									timeFormat={timeFormat}
									timezone={timezone}
								/>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
