import { useState } from 'react'
import type { CalendarEvent, WeekDays } from '@/components/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'
import type {
	CellClickInfo,
	RenderCurrentTimeIndicatorProps,
} from '@/features/calendar/types'
import { IlamyResourceCalendar } from '@/features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar'
import type { Resource } from '@/features/resource-calendar/types'
import type dayjs from '@/lib/configs/dayjs-config'
import dummyEvents from '@/lib/seed'
import { cn } from '@/lib/utils'
import type { CalendarView, TimeFormat } from '@/types'
import { DemoCalendarSettings } from './demo-calendar-settings'

// Import all dayjs locales alphabetically
// locale.json file: [{"key":"af","name":"Afrikaans"},{"key":"am","name":"Amharic"},{"key":"ar-dz","name":"Arabic (Algeria)"},{"key":"ar-iq","name":" Arabic (Iraq)"},{"key":"ar-kw","name":"Arabic (Kuwait)"},{"key":"ar-ly","name":"Arabic (Lybia)"},{"key":"ar-ma","name":"Arabic (Morocco)"},{"key":"ar-sa","name":"Arabic (Saudi Arabia)"},{"key":"ar-tn","name":" Arabic (Tunisia)"},{"key":"ar","name":"Arabic"},{"key":"az","name":"Azerbaijani"},{"key":"be","name":"Belarusian"},{"key":"bg","name":"Bulgarian"},{"key":"bi","name":"Bislama"},{"key":"bm","name":"Bambara"},{"key":"bn-bd","name":"Bengali (Bangladesh)"},{"key":"bn","name":"Bengali"},{"key":"bo","name":"Tibetan"},{"key":"br","name":"Breton"},{"key":"bs","name":"Bosnian"},{"key":"ca","name":"Catalan"},{"key":"cs","name":"Czech"},{"key":"cv","name":"Chuvash"},{"key":"cy","name":"Welsh"},{"key":"de-at","name":"German (Austria)"},{"key":"da","name":"Danish"},{"key":"de-ch","name":"German (Switzerland)"},{"key":"de","name":"German"},{"key":"dv","name":"Maldivian"},{"key":"el","name":"Greek"},{"key":"en-au","name":"English (Australia)"},{"key":"en-ca","name":"English (Canada)"},{"key":"en-gb","name":"English (United Kingdom)"},{"key":"en-ie","name":"English (Ireland)"},{"key":"en-il","name":"English (Israel)"},{"key":"en-in","name":"English (India)"},{"key":"en-nz","name":"English (New Zealand)"},{"key":"en-sg","name":"English (Singapore)"},{"key":"en-tt","name":"English (Trinidad & Tobago)"},{"key":"eo","name":"Esperanto"},{"key":"en","name":"English"},{"key":"es-do","name":"Spanish (Dominican Republic)"},{"key":"es-mx","name":"Spanish (Mexico)"},{"key":"es-pr","name":"Spanish (Puerto Rico)"},{"key":"es-us","name":"Spanish (United States)"},{"key":"et","name":"Estonian"},{"key":"es","name":"Spanish"},{"key":"eu","name":"Basque"},{"key":"fa","name":"Persian"},{"key":"fo","name":"Faroese"},{"key":"fi","name":"Finnish"},{"key":"fr-ca","name":"French (Canada)"},{"key":"fr-ch","name":"French (Switzerland)"},{"key":"fr","name":"French"},{"key":"fy","name":"Frisian"},{"key":"ga","name":"Irish or Irish Gaelic"},{"key":"gd","name":"Scottish Gaelic"},{"key":"gom-latn","name":"Konkani Latin script"},{"key":"gl","name":"Galician"},{"key":"gu","name":"Gujarati"},{"key":"he","name":"Hebrew"},{"key":"hi","name":"Hindi"},{"key":"hr","name":"Croatian"},{"key":"hu","name":"Hungarian"},{"key":"ht","name":"Haitian Creole (Haiti)"},{"key":"hy-am","name":"Armenian"},{"key":"id","name":"Indonesian"},{"key":"is","name":"Icelandic"},{"key":"it-ch","name":"Italian (Switzerland)"},{"key":"it","name":"Italian"},{"key":"ja","name":"Japanese"},{"key":"jv","name":"Javanese"},{"key":"ka","name":"Georgian"},{"key":"kk","name":"Kazakh"},{"key":"km","name":"Cambodian"},{"key":"kn","name":"Kannada"},{"key":"ko","name":"Korean"},{"key":"ku","name":"Kurdish"},{"key":"ky","name":"Kyrgyz"},{"key":"lb","name":"Luxembourgish"},{"key":"lo","name":"Lao"},{"key":"lt","name":"Lithuanian"},{"key":"lv","name":"Latvian"},{"key":"me","name":"Montenegrin"},{"key":"mi","name":"Maori"},{"key":"mk","name":"Macedonian"},{"key":"ml","name":"Malayalam"},{"key":"mn","name":"Mongolian"},{"key":"mr","name":"Marathi"},{"key":"ms-my","name":"Malay"},{"key":"ms","name":"Malay"},{"key":"mt","name":"Maltese (Malta)"},{"key":"my","name":"Burmese"},{"key":"nb","name":"Norwegian Bokmål"},{"key":"ne","name":"Nepalese"},{"key":"nl-be","name":"Dutch (Belgium)"},{"key":"nl","name":"Dutch"},{"key":"pl","name":"Polish"},{"key":"pt-br","name":"Portuguese (Brazil)"},{"key":"pt","name":"Portuguese"},{"key":"rn","name":"Kirundi"},{"key":"ro","name":"Romanian"},{"key":"ru","name":"Russian"},{"key":"rw","name":"Kinyarwanda (Rwanda)"},{"key":"sd","name":"Sindhi"},{"key":"se","name":"Northern Sami"},{"key":"si","name":"Sinhalese"},{"key":"sk","name":"Slovak"},{"key":"sl","name":"Slovenian"},{"key":"sq","name":"Albanian"},{"key":"sr-cyrl","name":"Serbian Cyrillic"},{"key":"ss","name":"siSwati"},{"key":"sv-fi","name":"Finland Swedish"},{"key":"sr","name":"Serbian"},{"key":"sv","name":"Swedish"},{"key":"sw","name":"Swahili"},{"key":"ta","name":"Tamil"},{"key":"te","name":"Telugu"},{"key":"tet","name":"Tetun Dili (East Timor)"},{"key":"tg","name":"Tajik"},{"key":"th","name":"Thai"},{"key":"tk","name":"Turkmen"},{"key":"tl-ph","name":"Tagalog (Philippines)"},{"key":"tlh","name":"Klingon"},{"key":"tr","name":"Turkish"},{"key":"tzl","name":"Talossan"},{"key":"tzm-latn","name":"Central Atlas Tamazight Latin"},{"key":"tzm","name":"Central Atlas Tamazight"},{"key":"ug-cn","name":"Uyghur (China)"},{"key":"uk","name":"Ukrainian"},{"key":"ur","name":"Urdu"},{"key":"uz-latn","name":"Uzbek Latin"},{"key":"uz","name":"Uzbek"},{"key":"vi","name":"Vietnamese"},{"key":"x-pseudo","name":"Pseudo"},{"key":"yo","name":"Yoruba Nigeria"},{"key":"zh-cn","name":"Chinese (China)"},{"key":"zh-hk","name":"Chinese (Hong Kong)"},{"key":"zh-tw","name":"Chinese (Taiwan)"},{"key":"zh","name":"Chinese"},{"key":"oc-lnc","name":"Occitan, lengadocian dialecte"},{"key":"nn","name":"Nynorsk"},{"key":"pa-in","name":"Punjabi (India)"}]
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
		'regular'
	)

	// Calendar configuration state
	const [firstDayOfWeek, setFirstDayOfWeek] = useState<WeekDays>('sunday')
	const [initialView, setInitialView] = useState<CalendarView>('month')
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
	const [hideNonBusinessHours, setHideNonBusinessHours] = useState(true)
	const [businessStartTime, setBusinessStartTime] = useState(9)
	const [businessEndTime, setBusinessEndTime] = useState(17)

	const businessHours = [
		{
			daysOfWeek: [
				'monday',
				'tuesday',
				'wednesday',
				'thursday',
				'friday',
			] as WeekDays[],
			startTime: businessStartTime,
			endTime: businessEndTime,
		},
	]

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
	const [useCustomTimeIndicator, setUseCustomTimeIndicator] = useState(false)
	const [hiddenHeaderButtons, setHiddenHeaderButtons] = useState({
		export: false,
		newEvent: false,
		viewControls: false,
	})
	// Resource calendar settings
	const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>(
		'horizontal'
	)

	const calendarKey = `${locale}-${initialView}-${initialDate?.toISOString() || 'today'}-${timeFormat}-${useCustomTimeIndicator}`

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

	// Custom current time indicator renderer
	const renderCurrentTimeIndicator = ({
		currentTime,
		progress,
		resource,
		view,
	}: RenderCurrentTimeIndicatorProps) => {
		// In resource day view (view === 'day' with resources), ONLY show the badge for the first resource
		// to avoid cluttering the horizontal line with multiple identical time badges.
		const isPrimaryResource = !resource || resource.id === 'room-a'
		const showBadge = view === 'day' ? isPrimaryResource : true

		return (
			<div
				className="absolute left-0 right-0 z-50 pointer-events-none h-0.5 flex"
				style={{ top: `${progress}%` }}
			>
				{showBadge && (
					<div className="absolute left-0 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-r-md font-medium shadow-sm whitespace-nowrap z-10">
						{currentTime.format('h:mm A')} {view} {resource?.id}
					</div>
				)}
				{/* Red line extends across all columns */}
				<div className="flex-1 bg-red-500" />
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
						businessEndTime={businessEndTime}
						businessStartTime={businessStartTime}
						calendarHeight={calendarHeight}
						calendarType={calendarType}
						dayMaxEvents={dayMaxEvents}
						disableCellClick={disableCellClick}
						disableDragAndDrop={disableDragAndDrop}
						disableEventClick={disableEventClick}
						firstDayOfWeek={firstDayOfWeek}
						hiddenHeaderButtons={hiddenHeaderButtons}
						hideNonBusinessHours={hideNonBusinessHours}
						initialDate={initialDate}
						initialView={initialView}
						isResourceCalendar={calendarType === 'resource'}
						locale={locale}
						orientation={orientation}
						setBusinessEndTime={setBusinessEndTime}
						setBusinessStartTime={setBusinessStartTime}
						setCalendarHeight={setCalendarHeight}
						setCalendarType={setCalendarType}
						setDayMaxEvents={setDayMaxEvents}
						setDisableCellClick={setDisableCellClick}
						setDisableDragAndDrop={setDisableDragAndDrop}
						setDisableEventClick={setDisableEventClick}
						setFirstDayOfWeek={setFirstDayOfWeek}
						setHiddenHeaderButtons={setHiddenHeaderButtons}
						setHideNonBusinessHours={setHideNonBusinessHours}
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
						setUseCustomTimeIndicator={setUseCustomTimeIndicator}
						stickyViewHeader={stickyViewHeader}
						timeFormat={timeFormat}
						// Resource calendar specific props
						timezone={timezone}
						useCustomClasses={useCustomClasses}
						useCustomEventRenderer={useCustomEventRenderer}
						useCustomOnDateClick={useCustomOnDateClick}
						useCustomOnEventClick={useCustomOnEventClick}
						useCustomTimeIndicator={useCustomTimeIndicator}
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
									businessHours={businessHours}
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
									hiddenHeaderButtons={hiddenHeaderButtons}
									hideNonBusinessHours={hideNonBusinessHours}
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
									renderCurrentTimeIndicator={
										useCustomTimeIndicator
											? renderCurrentTimeIndicator
											: undefined
									}
									renderEvent={useCustomEventRenderer ? renderEvent : undefined}
									stickyViewHeader={stickyViewHeader}
									timeFormat={timeFormat}
									timezone={timezone}
								/>
							) : (
								<IlamyResourceCalendar
									businessHours={businessHours}
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
									hiddenHeaderButtons={hiddenHeaderButtons}
									hideNonBusinessHours={hideNonBusinessHours}
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
									renderCurrentTimeIndicator={
										useCustomTimeIndicator
											? renderCurrentTimeIndicator
											: undefined
									}
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
