import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DemoUsageProps {
	firstDayOfWeek: string
	currentView: string
	useCustomEventRenderer: boolean
	locale: string
	timezone: string
}

export function DemoUsage({
	firstDayOfWeek,
	useCustomEventRenderer,
	locale,
	timezone,
}: DemoUsageProps) {
	return (
		<Card className="border border-white/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-lg overflow-clip">
			<CardHeader className="border-b border-white/10 dark:border-white/5 p-4">
				<CardTitle className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
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

  const handleDateClick = (date) => {
    console.log('Date clicked:', date);
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
      ${useCustomEventRenderer ? 'renderEvent={customRenderFunction}' : ''}
    />
  );
}`}
						</pre>
					</TabsContent>
					<TabsContent className="relative" value="tsx">
						<pre className="p-4 rounded-md bg-white/30 dark:bg-black/40 overflow-x-auto text-xs border border-white/20 dark:border-white/5">
							{`import { IlamyCalendar, CalendarEvent } from '@ilamy/calendar';

function MyCalendar() {
  const handleEventClick = (event: CalendarEvent) => {
    console.log('Event clicked:', event);
  };

  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date);
  };

  const handleViewChange = (view: CalendarView) => {
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
      ${useCustomEventRenderer ? 'renderEvent={customRenderFunction}' : ''}
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
}`}
						</pre>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	)
}
