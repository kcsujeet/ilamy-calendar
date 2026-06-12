import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import { EventFormDialog } from '@/components/event-form/event-form-dialog'
import { Header } from '@/components/header'
import { ViewRenderer } from '@/features/calendar/components/views'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { ResourceDayView } from '@/features/resource-calendar/components/day-view'
import { ResourceMonthView } from '@/features/resource-calendar/components/month-view'
import { ResourceWeekView } from '@/features/resource-calendar/components/week-view'

export const ResourceCalendarBody: React.FC = () => {
	const { view, getViews } = useSmartCalendarContext((c) => ({
		view: c.view,
		getViews: c.getViews,
	}))

	// Phase 4 deletes this fork map: until the resource axis is composed by the
	// core specs, the resource-calendar feature's own day/week/month win here.
	const resourceForkViews: Record<string, React.ReactNode> = {
		month: <ResourceMonthView key="month" />,
		week: <ResourceWeekView key="week" />,
		day: <ResourceDayView key="day" />,
	}
	const spec = getViews().find((v) => v.name === view)
	const activeView =
		resourceForkViews[view] ??
		(spec ? <ViewRenderer key={view} view={spec} /> : null)

	return (
		<div
			className="flex flex-col w-full h-full"
			data-testid="ilamy-resource-calendar"
		>
			<Header className="p-1" />

			{/* Calendar Body with AnimatedSection for view transitions */}
			<CalendarDndContext>
				<AnimatedSection
					className="w-full h-[calc(100%-3.5rem)] @container/calendar-body"
					direction="horizontal"
					transitionKey={view}
				>
					<div className="border h-full w-full" data-testid="calendar-body">
						{activeView}
					</div>
				</AnimatedSection>
			</CalendarDndContext>

			{/* Event Form Dialog */}
			<EventFormDialog />
		</div>
	)
}
