import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components'

interface DemoUsageProps {
	firstDayOfWeek: string
	currentView: string
	useCustomEventRenderer: boolean
	locale: string
	timezone: string
	enableBusinessHours: boolean
	businessHoursDays: string[]
	businessHoursStart: number
	businessHoursEnd: number
	useCustomEventForm: boolean
}

export function DemoUsage({
	firstDayOfWeek,
	useCustomEventRenderer,
	locale,
	timezone,
	enableBusinessHours,
	businessHoursDays,
	businessHoursStart,
	businessHoursEnd,
	useCustomEventForm,
}: DemoUsageProps) {
	return (
		<Card className="border border-white/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-lg overflow-clip">
			<CardHeader className="border-b border-white/10 dark:border-white/5 p-4">
				<CardTitle className="bg-clip-text text-transparent bg-primary dark:from-blue-400 dark:to-indigo-400">
					Usage
				</CardTitle>
				<CardDescription>How to implement this calendar</CardDescription>
			</CardHeader>
			<CardContent className="p-6">
				<Tabs defaultValue="jsx">
					<TabsList className="mb-2 backdrop-blur-sm">
						<TabsTrigger value="jsx">JSX</TabsTrigger>
						<TabsTrigger value="tsx">TSX</TabsTrigger>
					</TabsList>
					<TabsContent className="relative" value="jsx">
						<pre className="p-4 rounded-md bg-white/30 dark:bg-black/40 overflow-x-auto text-xs border border-white/20 dark:border-white/5">
							{`import { IlamyCalendar } from '@ilamy/calendar';

function MyCalendar() {
  const handleEventClick = (event) => {
    console.log('Event clicked:', event);
  };

  const handleDateClick = (info) => {
    console.log('Date clicked:', info.start, info.end);
    // info contains: { start, end, resourceId? }
  };

  const handleViewChange = (view) => {
    console.log('View changed:', view);
  };

  return (
    <IlamyCalendar
      firstDayOfWeek="${firstDayOfWeek}"
      events={myEvents}
      locale="${locale}"
      timezone="${timezone}"
      onEventClick={handleEventClick}
      onCellClick={handleDateClick}
      onViewChange={handleViewChange}
      ${useCustomEventRenderer ? 'renderEvent={customRenderFunction}' : ''}${
				enableBusinessHours
					? `
      businessHours={{
        daysOfWeek: [${businessHoursDays.map((d) => `'${d}'`).join(', ')}],
        startTime: ${businessHoursStart},
        endTime: ${businessHoursEnd},
      }}`
					: ''
			}${
				useCustomEventForm
					? `
      renderEventForm={(props) => <MyCustomForm {...props} />}`
					: ''
			}
    />
  );
}`}
						</pre>
					</TabsContent>
					<TabsContent className="relative" value="tsx">
						<pre className="p-4 rounded-md bg-white/30 dark:bg-black/40 overflow-x-auto text-xs border border-white/20 dark:border-white/5">
							{`import { IlamyCalendar, CalendarEvent, CellInfo } from '@ilamy/calendar';

function MyCalendar() {
  const handleEventClick = (event: CalendarEvent) => {
    console.log('Event clicked:', event);
  };

  const handleDateClick = (info: CellInfo) => {
    console.log('Date clicked:', info.start, info.end);
    // info contains: { start: Dayjs, end: Dayjs, resource?: Resource, allDay?: boolean }
  };

  const handleViewChange = (view: 'month' | 'week' | 'day' | 'year') => {
    console.log('View changed:', view);
  };

  return (
    <IlamyCalendar
      firstDayOfWeek="${firstDayOfWeek}"
      events={myEvents}
      locale="${locale}"
      timezone="${timezone}"
      onEventClick={handleEventClick}
      onCellClick={handleDateClick}
      onViewChange={handleViewChange}
      ${useCustomEventRenderer ? 'renderEvent={customRenderFunction}' : ''}${
				enableBusinessHours
					? `
      businessHours={{
        daysOfWeek: [${businessHoursDays.map((d) => `'${d}'`).join(', ')}],
        startTime: ${businessHoursStart},
        endTime: ${businessHoursEnd},
      }}`
					: ''
			}${
				useCustomEventForm
					? `
      renderEventForm={(props) => <MyCustomForm {...props} />}`
					: ''
			}
    />
  );
}

${
	useCustomEventRenderer
		? `
// Custom render function example
const customRenderFunction = (event: CalendarEvent) => {
  return (
    <div className="custom-event">
      {event.title}
    </div>
  );
};`
		: ''
}${
	useCustomEventForm
		? `
// Custom event form component example
const MyCustomForm = (props: EventFormProps) => {
  return (
    <dialog open={props.open}>
      <form>
        <input type="text" defaultValue={props.selectedEvent?.title} />
        <button onClick={props.onClose}>Close</button>
      </form>
    </dialog>
  );
};`
		: ''
}`}
						</pre>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	)
}
