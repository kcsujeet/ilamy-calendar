import type {
	CalendarEvent,
	CellInfo,
	Dayjs,
	IlamyCalendarProps,
	RenderCurrentTimeIndicatorProps,
	Resource,
	SlotDuration,
	WeekDays,
} from '@ilamy/calendar'
import {
	dayjs,
	IlamyCalendar,
	IlamyResourceCalendar,
	useIlamyCalendarContext,
} from '@ilamy/calendar'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import { useEffect, useState } from 'react'
import { Button, Card, CardContent, CardHeader } from '@/components'
import dummyEvents from '@/lib/seed'
import { getTranslations } from '@/lib/translations'
import { cn } from '@/lib/utils'
import { DemoCalendarSettings } from './demo-calendar-settings'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(timezone)
dayjs.extend(utc)

import 'dayjs/locale/af.js'
import 'dayjs/locale/am.js'
import 'dayjs/locale/ar-dz.js'
import 'dayjs/locale/ar-iq.js'
import 'dayjs/locale/ar-kw.js'
import 'dayjs/locale/ar-ly.js'
import 'dayjs/locale/ar-ma.js'
import 'dayjs/locale/ar-sa.js'
import 'dayjs/locale/ar-tn.js'
import 'dayjs/locale/ar.js'
import 'dayjs/locale/az.js'
import 'dayjs/locale/be.js'
import 'dayjs/locale/bg.js'
import 'dayjs/locale/bi.js'
import 'dayjs/locale/bm.js'
import 'dayjs/locale/bn-bd.js'
import 'dayjs/locale/bn.js'
import 'dayjs/locale/bo.js'
import 'dayjs/locale/br.js'
import 'dayjs/locale/bs.js'
import 'dayjs/locale/ca.js'
import 'dayjs/locale/cs.js'
import 'dayjs/locale/cv.js'
import 'dayjs/locale/cy.js'
import 'dayjs/locale/da.js'
import 'dayjs/locale/de-at.js'
import 'dayjs/locale/de-ch.js'
import 'dayjs/locale/de.js'
import 'dayjs/locale/dv.js'
import 'dayjs/locale/el.js'
import 'dayjs/locale/en-au.js'
import 'dayjs/locale/en-ca.js'
import 'dayjs/locale/en-gb.js'
import 'dayjs/locale/en-ie.js'
import 'dayjs/locale/en-il.js'
import 'dayjs/locale/en-in.js'
import 'dayjs/locale/en-nz.js'
import 'dayjs/locale/en-sg.js'
import 'dayjs/locale/en-tt.js'
import 'dayjs/locale/en.js'
import 'dayjs/locale/eo.js'
import 'dayjs/locale/es-do.js'
import 'dayjs/locale/es-mx.js'
import 'dayjs/locale/es-pr.js'
import 'dayjs/locale/es-us.js'
import 'dayjs/locale/es.js'
import 'dayjs/locale/et.js'
import 'dayjs/locale/eu.js'
import 'dayjs/locale/fa.js'
import 'dayjs/locale/fi.js'
import 'dayjs/locale/fo.js'
import 'dayjs/locale/fr-ca.js'
import 'dayjs/locale/fr-ch.js'
import 'dayjs/locale/fr.js'
import 'dayjs/locale/fy.js'
import 'dayjs/locale/ga.js'
import 'dayjs/locale/gd.js'
import 'dayjs/locale/gl.js'
import 'dayjs/locale/gom-latn.js'
import 'dayjs/locale/gu.js'
import 'dayjs/locale/he.js'
import 'dayjs/locale/hi.js'
import 'dayjs/locale/hr.js'
import 'dayjs/locale/ht.js'
import 'dayjs/locale/hu.js'
import 'dayjs/locale/hy-am.js'
import 'dayjs/locale/id.js'
import 'dayjs/locale/is.js'
import 'dayjs/locale/it-ch.js'
import 'dayjs/locale/it.js'
import 'dayjs/locale/ja.js'
import 'dayjs/locale/jv.js'
import 'dayjs/locale/ka.js'
import 'dayjs/locale/kk.js'
import 'dayjs/locale/km.js'
import 'dayjs/locale/kn.js'
import 'dayjs/locale/ko.js'
import 'dayjs/locale/ku.js'
import 'dayjs/locale/ky.js'
import 'dayjs/locale/lb.js'
import 'dayjs/locale/lo.js'
import 'dayjs/locale/lt.js'
import 'dayjs/locale/lv.js'
import 'dayjs/locale/me.js'
import 'dayjs/locale/mi.js'
import 'dayjs/locale/mk.js'
import 'dayjs/locale/ml.js'
import 'dayjs/locale/mn.js'
import 'dayjs/locale/mr.js'
import 'dayjs/locale/ms-my.js'
import 'dayjs/locale/ms.js'
import 'dayjs/locale/mt.js'
import 'dayjs/locale/my.js'
import 'dayjs/locale/nb.js'
import 'dayjs/locale/ne.js'
import 'dayjs/locale/nl-be.js'
import 'dayjs/locale/nl.js'
import 'dayjs/locale/nn.js'
import 'dayjs/locale/oc-lnc.js'
import 'dayjs/locale/pa-in.js'
import 'dayjs/locale/pl.js'
import 'dayjs/locale/pt-br.js'
import 'dayjs/locale/pt.js'
import 'dayjs/locale/rn.js'
import 'dayjs/locale/ro.js'
import 'dayjs/locale/ru.js'
import 'dayjs/locale/rw.js'
import 'dayjs/locale/sd.js'
import 'dayjs/locale/se.js'
import 'dayjs/locale/si.js'
import 'dayjs/locale/sk.js'
import 'dayjs/locale/sl.js'
import 'dayjs/locale/sq.js'
import 'dayjs/locale/sr-cyrl.js'
import 'dayjs/locale/sr.js'
import 'dayjs/locale/ss.js'
import 'dayjs/locale/sv-fi.js'
import 'dayjs/locale/sv.js'
import 'dayjs/locale/sw.js'
import 'dayjs/locale/ta.js'
import 'dayjs/locale/te.js'
import 'dayjs/locale/tet.js'
import 'dayjs/locale/tg.js'
import 'dayjs/locale/th.js'
import 'dayjs/locale/tk.js'
import 'dayjs/locale/tl-ph.js'
import 'dayjs/locale/tlh.js'
import 'dayjs/locale/tr.js'
import 'dayjs/locale/tzl.js'
import 'dayjs/locale/tzm-latn.js'
import 'dayjs/locale/tzm.js'
import 'dayjs/locale/ug-cn.js'
import 'dayjs/locale/uk.js'
import 'dayjs/locale/ur.js'
import 'dayjs/locale/uz-latn.js'
import 'dayjs/locale/uz.js'
import 'dayjs/locale/vi.js'
import 'dayjs/locale/x-pseudo.js'
import 'dayjs/locale/yo.js'
import 'dayjs/locale/zh-cn.js'
import 'dayjs/locale/zh-hk.js'
import 'dayjs/locale/zh-tw.js'
import 'dayjs/locale/zh.js'

const CustomHeaderContent = ({
	currentDate,
	setView,
}: {
	currentDate: Dayjs
	setView: (view: 'month' | 'week' | 'day' | 'year') => void
}) => {
	return (
		<div className="text-center text-2xl font-semibold p-4 text-amber-500">
			Current Date: {currentDate.format('MMMM YYYY')}
			<div className="flex justify-center space-x-2">
				<Button onClick={() => setView('month')} size="sm">
					Month View
				</Button>
				<Button onClick={() => setView('week')} size="sm">
					Week View
				</Button>
				<Button onClick={() => setView('day')} size="sm">
					Day View
				</Button>
				<Button onClick={() => setView('year')} size="sm">
					Year View
				</Button>
			</div>
			<div className="text-sm mt-2">
				Custom header using useIlamyCalendarContext hook
			</div>
		</div>
	)
}

const CustomCalendarHeader = () => {
	const { currentDate, setView } = useIlamyCalendarContext()
	return <CustomHeaderContent currentDate={currentDate} setView={setView} />
}

// Custom Event Form Component for demonstration
interface EventFormProps {
	open?: boolean
	selectedEvent?: CalendarEvent | null
	onAdd?: (event: CalendarEvent) => void
	onUpdate?: (event: CalendarEvent) => void
	onDelete?: (event: CalendarEvent) => void
	onClose: () => void
}

const CustomEventForm = ({
	open,
	selectedEvent,
	onAdd,
	onUpdate,
	onDelete,
	onClose,
}: EventFormProps) => {
	const [title, setTitle] = useState(selectedEvent?.title || '')

	// Reset title when selectedEvent changes
	useEffect(() => {
		setTitle(selectedEvent?.title || '')
	}, [selectedEvent])

	if (!open) return null

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const eventData: CalendarEvent = {
			id: selectedEvent?.id || `event-${Date.now()}`,
			title: title || 'New Event',
			start: selectedEvent?.start || dayjs(),
			end: selectedEvent?.end || dayjs(),
			...selectedEvent,
		}

		if (selectedEvent?.id && onUpdate) {
			onUpdate({ ...eventData, title })
		} else if (onAdd) {
			onAdd({ ...eventData, title })
		}
		onClose()
	}

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-background border border-border rounded-lg p-6 w-full max-w-md shadow-lg">
				<h3 className="text-lg font-semibold mb-4 text-amber-500">
					Custom Event Form
				</h3>
				<p className="text-xs text-muted-foreground mb-4">
					This is a custom form rendered via renderEventForm prop
				</p>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div>
						<label
							className="block text-sm font-medium mb-1"
							htmlFor="event-form-title"
						>
							Event Title
						</label>
						<input
							className="w-full px-3 py-2 border border-border rounded-md bg-background"
							id="event-form-title"
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Enter event title"
							type="text"
							value={title}
						/>
					</div>
					<div className="flex gap-2 justify-end">
						{selectedEvent?.id && onDelete && (
							<Button
								onClick={() => {
									onDelete(selectedEvent)
									onClose()
								}}
								size="sm"
								type="button"
								variant="destructive"
							>
								Delete
							</Button>
						)}
						<Button onClick={onClose} size="sm" type="button" variant="outline">
							Cancel
						</Button>
						<Button size="sm" type="submit">
							{selectedEvent?.id ? 'Update' : 'Create'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	)
}

// Resource calendar data
const resources = [
	{
		id: 'room-a',
		title: 'Conference Room A',
		color: '#3B82F6',
		backgroundColor: '#EFF6FF',
	},
	{
		id: 'room-b',
		title: 'Conference Room B',
		color: '#EF4444',
		backgroundColor: '#FEF2F2',
	},
	{
		id: 'room-c',
		title: 'Conference Room C',
		color: '#10B981',
		backgroundColor: '#ECFDF5',
	},
	{
		id: 'room-d',
		title: 'Conference Room D',
		color: '#8B5CF6',
		backgroundColor: '#F5F3FF',
	},
]

// Map standard calendar events to resource calendar events by assigning random resources
const mapEventsToResources = (events: IlamyCalendarProps['events']) => {
	return (
		events?.map((event, index) => {
			// Distribute events across resources cyclically
			const resourceIndex = index % resources.length
			const resource = resources[resourceIndex]

			return {
				...event,
				resourceId: resource.id,
			}
		}) || []
	)
}

export function DemoPage() {
	// Calendar configuration state
	const [calendarKey, setCalendarKey] = useState(0)
	const [calendarMode, setCalendarMode] = useState<'standard' | 'resource'>(
		'standard'
	)
	const [firstDayOfWeek, setFirstDayOfWeek] = useState<WeekDays>('sunday')
	const [customEvents, setCustomEvents] =
		useState<IlamyCalendarProps['events']>(dummyEvents)
	const [initialView, setInitialView] = useState<
		'month' | 'week' | 'day' | 'year'
	>('month')
	const [initialDate, setInitialDate] = useState<Dayjs | undefined>(undefined)
	const [useCustomEventRenderer, setUseCustomEventRenderer] = useState(false)
	const [useCustomResourceRenderer, setUseCustomResourceRenderer] =
		useState(false)
	const [useCustomCalendarHeader, setUseCustomCalendarHeader] = useState(false)
	const [locale, setLocale] = useState('en')
	const [timezone, setTimezone] = useState(() => {
		return Intl.DateTimeFormat().resolvedOptions().timeZone
	})
	const [timeFormat, setTimeFormat] = useState<'12-hour' | '24-hour'>('12-hour')
	const [resourceOrientation, setResourceOrientation] = useState<
		'horizontal' | 'vertical'
	>('horizontal')
	const [weekViewGranularity, setWeekViewGranularity] = useState<
		'hourly' | 'daily'
	>('hourly')
	const [stickyViewHeader, setStickyHeader] = useState(true)
	const [hideExportButton, setHideExportButton] = useState(false)

	const [resourceEvents, setResourceEvents] = useState(
		mapEventsToResources(customEvents)
	)

	// Disable functionality state
	const [disableCellClick, setDisableCellClick] = useState(false)
	const [disableEventClick, setDisableEventClick] = useState(false)
	const [disableDragAndDrop, setDisableDragAndDrop] = useState(false)

	// Custom handler state
	const [useCustomOnDateClick, setUseCustomOnDateClick] = useState(false)
	const [useCustomOnEventClick, setUseCustomOnEventClick] = useState(false)
	const [useEventLifecycleCallbacks, setUseEventLifecycleCallbacks] =
		useState(false)

	// UI settings
	const [calendarHeight, setCalendarHeight] = useState('600px')
	const [dayMaxEvents, setDayMaxEvents] = useState(3)
	const [eventSpacing, setEventSpacing] = useState(1)
	const [eventHeight, setEventHeight] = useState(24)

	// Business hours settings
	const [enableBusinessHours, setEnableBusinessHours] = useState(true)
	const [businessHoursDays, setBusinessHoursDays] = useState<WeekDays[]>([
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
	])
	const [businessHoursStart, setBusinessHoursStart] = useState(9)
	const [businessHoursEnd, setBusinessHoursEnd] = useState(17)
	const [hideNonBusinessHours, setHideNonBusinessHours] = useState(false)
	const [useCustomCurrentTimeIndicator, setUseCustomCurrentTimeIndicator] =
		useState(false)

	// Hidden days settings
	const [hiddenDays, setHiddenDays] = useState<WeekDays[]>([])

	// Custom hour renderer
	const [useCustomHourRenderer, setUseCustomHourRenderer] = useState(false)

	// Time grid granularity (v1.7.0)
	const [slotDuration, setSlotDuration] = useState<SlotDuration>(60)

	// Initial scroll time for hour-resolution views (v1.7.0)
	const [scrollTime, setScrollTime] = useState<string | undefined>(undefined)

	// Custom event form settings
	const [useCustomEventForm, setUseCustomEventForm] = useState(false)

	// Sync resource events when standard calendar events change
	useEffect(() => {
		setResourceEvents(mapEventsToResources(customEvents))
	}, [customEvents])

	// Event handlers
	const handleEventClick = (event: CalendarEvent) => {
		alert(`Event clicked: ${event.title}`)
	}

	const handleDateClick = (info: CellInfo) => {
		alert(JSON.stringify(info))
	}

	// New event lifecycle handlers (preview/simulation)
	const handleEventAdd = (event: CalendarEvent) => {
		console.log('Event added:', event)
		setCustomEvents((prev) => [...(prev || []), event])
		alert(`New event created: ${event.title}`)
	}

	const handleEventUpdate = (event: CalendarEvent) => {
		console.log('Event updated:', event)
		setCustomEvents((prev) =>
			(prev || []).map((e) => (e.id === event.id ? event : e))
		)
		alert(`Event updated: ${event.title}`)
	}

	const handleEventDelete = (event: CalendarEvent) => {
		console.log('Event deleted:', event)
		setCustomEvents((prev) => (prev || []).filter((e) => e.id !== event.id))
		alert(`Event deleted: ${event.title}`)
	}

	const handleDateChange = (date: Dayjs) => {
		console.log('Date changed to:', date.format('YYYY-MM-DD'))
		// Could load events for new date range here
	}

	const handleSetLocale = (newLocale: string) => {
		setLocale(newLocale)
		// wait for the uesEffect to complete
		setTimeout(() => {
			// Force re-render to apply locale changes
			setCalendarKey((prev) => prev + 1)
		}, 50)
	}

	// Custom event renderer function — adapts to eventHeight
	const renderEvent = (event: CalendarEvent) => {
		const isCompact = eventHeight <= 24
		const isLarge = eventHeight >= 36

		return (
			<div
				className={cn(
					'border-primary bg-card border border-l-2 px-2 w-full h-full overflow-clip',
					event.color || 'bg-blue-100 text-blue-800'
				)}
			>
				<p
					className={cn(
						'font-semibold truncate leading-tight',
						isLarge ? 'text-xs' : 'text-[10px]'
					)}
				>
					{event.title}
				</p>
				{!isCompact && (
					<p
						className={cn(
							'truncate opacity-80 leading-tight',
							isLarge ? 'text-[10px]' : 'text-[8px]'
						)}
					>
						{event.start.format('h:mm A')} - {event.end.format('h:mm A')}
					</p>
				)}
			</div>
		)
	}

	// Custom resource renderer function
	const renderResource = (resource: Resource) => {
		// Get all events for this resource
		const eventsForResource = resourceEvents.filter(
			(event) =>
				event.resourceId === resource.id ||
				event.resourceIds?.includes(resource.id)
		)

		// Separate recurring and non-recurring events by unique IDs
		const recurringEventIds = new Set<string>()
		const nonRecurringEventIds = new Set<string>()

		eventsForResource.forEach((event) => {
			if (event.rrule) {
				recurringEventIds.add(String(event.id))
			} else {
				nonRecurringEventIds.add(String(event.id))
			}
		})

		const recurringCount = recurringEventIds.size
		const nonRecurringCount = nonRecurringEventIds.size
		const totalCount = recurringCount + nonRecurringCount

		return (
			<div className="flex items-center justify-between p-2 h-full">
				<div className="flex flex-col">
					<span
						className="font-semibold text-sm"
						style={{ color: resource.color }}
					>
						{resource.title}
					</span>
					<span className="text-xs text-muted-foreground">
						{totalCount} {totalCount === 1 ? 'event' : 'events'}
						{recurringCount > 0 && (
							<span className="ml-1">({recurringCount} recurring)</span>
						)}
					</span>
				</div>
				<div
					className="w-2 h-2 rounded-full"
					style={{ backgroundColor: resource.color }}
				/>
			</div>
		)
	}

	// Custom current time indicator renderer.
	// Must branch on `axis`: horizontal resource hour grids (resource day/week
	// horizontal) pass axis === 'horizontal' and expect a vertical line
	// positioned with `left`; vertical day/week grids pass axis === 'vertical'
	// and expect a horizontal line positioned with `top`.
	const renderCurrentTimeIndicator = ({
		currentTime,
		progress,
		resource,
		axis,
	}: RenderCurrentTimeIndicatorProps) => {
		// The indicator renders once per resource row, so only show the badge for
		// the first resource to avoid repeating identical time badges down the
		// column. Non-resource calendars have no `resource`, so the badge still
		// shows there.
		const showBadge = !resource || resource.id === 'room-a'

		if (axis === 'horizontal') {
			return (
				<div
					className="absolute top-0 bottom-0 z-50 pointer-events-none w-0.5 flex flex-col"
					style={{ left: `${progress}%` }}
				>
					{showBadge && (
						<div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-b-md font-medium shadow-sm whitespace-nowrap z-10">
							{currentTime.format('h:mm A')}
						</div>
					)}
					{/* Red line extends across the full row height */}
					<div className="flex-1 bg-red-500" />
				</div>
			)
		}

		return (
			<div
				className="absolute left-0 right-0 z-50 pointer-events-none h-0.5 flex"
				style={{ top: `${progress}%` }}
			>
				{showBadge && (
					<div className="absolute left-0 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-r-md font-medium shadow-sm whitespace-nowrap z-10">
						{currentTime.format('h:mm A')}
					</div>
				)}
				{/* Red line extends across all columns */}
				<div className="flex-1 bg-red-500" />
			</div>
		)
	}

	// Custom hour renderer function
	const renderHour = (date: Dayjs) => {
		return (
			<div className="flex flex-col items-center leading-tight">
				<span className="font-bold text-sm">{date.format('h')}</span>
				<span className="text-[10px] opacity-60 uppercase font-medium">
					{date.format('A')}
				</span>
			</div>
		)
	}

	// Generate a consistent key for both calendars based on all relevant settings
	const calendarRenderKey = `${calendarKey}-${initialView}-${locale}-${timeFormat}-${initialDate?.toISOString() || 'today'}-bh-${enableBusinessHours}-${businessHoursDays.join(',')}-${businessHoursStart}-${businessHoursEnd}-${resourceOrientation}-${weekViewGranularity}`

	return (
		<div className="container mx-auto px-4 py-8 relative">
			<h1 className="text-3xl font-bold mb-2 bg-clip-text">Interactive Demo</h1>
			<p className="text-muted-foreground mb-4">
				Try out the ilamy Calendar component with different configurations
			</p>

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
				{/* Calendar settings sidebar */}
				<div className="lg:col-span-1 space-y-6">
					<DemoCalendarSettings
						businessHoursDays={businessHoursDays}
						businessHoursEnd={businessHoursEnd}
						businessHoursStart={businessHoursStart}
						calendarHeight={calendarHeight}
						calendarMode={calendarMode}
						dayMaxEvents={dayMaxEvents}
						disableCellClick={disableCellClick}
						disableDragAndDrop={disableDragAndDrop}
						disableEventClick={disableEventClick}
						enableBusinessHours={enableBusinessHours}
						eventHeight={eventHeight}
						eventSpacing={eventSpacing}
						firstDayOfWeek={firstDayOfWeek}
						hiddenDays={hiddenDays}
						hideExportButton={hideExportButton}
						hideNonBusinessHours={hideNonBusinessHours}
						initialDate={initialDate}
						initialView={initialView}
						locale={locale}
						resourceOrientation={resourceOrientation}
						scrollTime={scrollTime}
						setBusinessHoursDays={setBusinessHoursDays}
						setBusinessHoursEnd={setBusinessHoursEnd}
						setBusinessHoursStart={setBusinessHoursStart}
						setCalendarHeight={setCalendarHeight}
						setCalendarMode={setCalendarMode}
						setDayMaxEvents={setDayMaxEvents}
						setDisableCellClick={setDisableCellClick}
						setDisableDragAndDrop={setDisableDragAndDrop}
						setDisableEventClick={setDisableEventClick}
						setEnableBusinessHours={setEnableBusinessHours}
						setEventHeight={setEventHeight}
						setEventSpacing={setEventSpacing}
						setFirstDayOfWeek={setFirstDayOfWeek}
						setHiddenDays={setHiddenDays}
						setHideExportButton={setHideExportButton}
						setHideNonBusinessHours={setHideNonBusinessHours}
						setInitialDate={setInitialDate}
						setInitialView={setInitialView}
						setLocale={handleSetLocale}
						setResourceOrientation={setResourceOrientation}
						setScrollTime={setScrollTime}
						setSlotDuration={setSlotDuration}
						setStickyHeader={setStickyHeader}
						setTimeFormat={setTimeFormat}
						setTimezone={setTimezone}
						setUseCustomCalendarHeader={setUseCustomCalendarHeader}
						setUseCustomCurrentTimeIndicator={setUseCustomCurrentTimeIndicator}
						setUseCustomEventForm={setUseCustomEventForm}
						setUseCustomEventRenderer={setUseCustomEventRenderer}
						setUseCustomHourRenderer={setUseCustomHourRenderer}
						setUseCustomOnDateClick={setUseCustomOnDateClick}
						setUseCustomOnEventClick={setUseCustomOnEventClick}
						setUseCustomResourceRenderer={setUseCustomResourceRenderer}
						setUseEventLifecycleCallbacks={setUseEventLifecycleCallbacks}
						setWeekViewGranularity={setWeekViewGranularity}
						slotDuration={slotDuration}
						stickyViewHeader={stickyViewHeader}
						timeFormat={timeFormat}
						timezone={timezone}
						useCustomCalendarHeader={useCustomCalendarHeader}
						useCustomCurrentTimeIndicator={useCustomCurrentTimeIndicator}
						useCustomEventForm={useCustomEventForm}
						useCustomEventRenderer={useCustomEventRenderer}
						useCustomHourRenderer={useCustomHourRenderer}
						useCustomOnDateClick={useCustomOnDateClick}
						useCustomOnEventClick={useCustomOnEventClick}
						useCustomResourceRenderer={useCustomResourceRenderer}
						useEventLifecycleCallbacks={useEventLifecycleCallbacks}
						weekViewGranularity={weekViewGranularity}
					/>
				</div>

				{/* Calendar display */}
				<div className="lg:col-span-3">
					<Card className="p-2">
						<CardHeader className="py-3">
							<div className="flex items-center">
								<div className="flex space-x-1.5">
									<div className="w-3 h-3 rounded-full bg-red-400"></div>
									<div className="w-3 h-3 rounded-full bg-yellow-400"></div>
									<div className="w-3 h-3 rounded-full bg-green-400"></div>
								</div>
								<div className="bg-clip-text mx-auto text-lg font-semibold">
									Calendar Demo
								</div>
							</div>
						</CardHeader>

						<CardContent
							className="p-0 overflow-clip relative z-10"
							style={{ height: calendarHeight }}
						>
							{calendarMode === 'standard' ? (
								<IlamyCalendar
									businessHours={
										enableBusinessHours
											? {
													daysOfWeek: businessHoursDays,
													startTime: businessHoursStart,
													endTime: businessHoursEnd,
												}
											: undefined
									}
									dayMaxEvents={dayMaxEvents}
									disableCellClick={disableCellClick}
									disableDragAndDrop={disableDragAndDrop}
									disableEventClick={disableEventClick}
									eventHeight={eventHeight}
									eventSpacing={eventSpacing}
									events={customEvents}
									firstDayOfWeek={firstDayOfWeek}
									headerComponent={
										useCustomCalendarHeader ? (
											<CustomCalendarHeader />
										) : undefined
									}
									hiddenDays={hiddenDays}
									hideExportButton={hideExportButton}
									hideNonBusinessHours={hideNonBusinessHours}
									initialDate={initialDate}
									initialView={initialView}
									key={calendarRenderKey}
									locale={locale}
									onCellClick={
										useCustomOnDateClick ? handleDateClick : undefined
									}
									onDateChange={
										useEventLifecycleCallbacks ? handleDateChange : undefined
									}
									onEventAdd={
										useEventLifecycleCallbacks ? handleEventAdd : undefined
									}
									onEventClick={
										useCustomOnEventClick ? handleEventClick : undefined
									}
									onEventDelete={
										useEventLifecycleCallbacks ? handleEventDelete : undefined
									}
									onEventUpdate={
										useEventLifecycleCallbacks ? handleEventUpdate : undefined
									}
									renderCurrentTimeIndicator={
										useCustomCurrentTimeIndicator
											? renderCurrentTimeIndicator
											: undefined
									}
									renderEvent={useCustomEventRenderer ? renderEvent : undefined}
									renderEventForm={
										useCustomEventForm
											? (props) => <CustomEventForm {...props} />
											: undefined
									}
									renderHour={useCustomHourRenderer ? renderHour : undefined}
									scrollTime={scrollTime}
									slotDuration={slotDuration}
									stickyViewHeader={stickyViewHeader}
									timeFormat={timeFormat}
									timezone={timezone}
									translations={getTranslations(locale)}
									viewHeaderClassName="top-[56px] bg-background"
								/>
							) : (
								<IlamyResourceCalendar
									businessHours={
										enableBusinessHours
											? {
													daysOfWeek: businessHoursDays,
													startTime: businessHoursStart,
													endTime: businessHoursEnd,
												}
											: undefined
									}
									dayMaxEvents={dayMaxEvents}
									disableCellClick={disableCellClick}
									disableDragAndDrop={disableDragAndDrop}
									disableEventClick={disableEventClick}
									eventHeight={eventHeight}
									eventSpacing={eventSpacing}
									events={resourceEvents}
									firstDayOfWeek={firstDayOfWeek}
									headerComponent={
										useCustomCalendarHeader ? (
											<CustomCalendarHeader />
										) : undefined
									}
									hiddenDays={hiddenDays}
									hideExportButton={hideExportButton}
									hideNonBusinessHours={hideNonBusinessHours}
									initialDate={initialDate}
									initialView={initialView}
									key={`resource-${calendarRenderKey}`}
									locale={locale}
									onCellClick={
										useCustomOnDateClick ? handleDateClick : undefined
									}
									onDateChange={
										useEventLifecycleCallbacks ? handleDateChange : undefined
									}
									onEventAdd={
										useEventLifecycleCallbacks ? handleEventAdd : undefined
									}
									onEventClick={
										useCustomOnEventClick ? handleEventClick : undefined
									}
									onEventDelete={
										useEventLifecycleCallbacks ? handleEventDelete : undefined
									}
									onEventUpdate={
										useEventLifecycleCallbacks ? handleEventUpdate : undefined
									}
									orientation={resourceOrientation}
									renderCurrentTimeIndicator={
										useCustomCurrentTimeIndicator
											? renderCurrentTimeIndicator
											: undefined
									}
									renderEvent={useCustomEventRenderer ? renderEvent : undefined}
									renderEventForm={
										useCustomEventForm
											? (props) => <CustomEventForm {...props} />
											: undefined
									}
									renderHour={useCustomHourRenderer ? renderHour : undefined}
									renderResource={
										useCustomResourceRenderer ? renderResource : undefined
									}
									resources={resources}
									scrollTime={scrollTime}
									slotDuration={slotDuration}
									stickyViewHeader={stickyViewHeader}
									timeFormat={timeFormat}
									timezone={timezone}
									translations={getTranslations(locale)}
									weekViewGranularity={weekViewGranularity}
								/>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
