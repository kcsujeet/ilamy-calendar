import React, { memo, useMemo } from 'react'
import type { CalendarEvent } from '@/components/types'
import { isBusinessHour } from '@/features/calendar/utils/business-hours'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import type { SelectedDayEvents } from './all-events-dialog'
import { AllEventDialog } from './all-events-dialog'
import { DroppableCell } from './droppable-cell'

interface GridProps {
	index: number // Index of the day in the week (0-6)
	day: dayjs.Dayjs
	hour?: number // Optional hour for hour-based grids
	minute?: number // Optional minute for more granular time slots
	dayMaxEvents?: number
	className?: string // Optional className for custom styling
	resourceId?: string | number // Optional resource ID for resource-specific day cells
	gridType?: 'day' | 'hour' // Future use for different grid types
	shouldRenderEvents?: boolean // Flag to determine if events should be rendered
	allDay?: boolean // Flag to indicate if this is an all-day cell
	'data-testid'?: string
}

const NoMemoGridCell: React.FC<GridProps> = ({
	index,
	day,
	hour,
	minute,
	className = '',
	resourceId,
	gridType = 'day',
	shouldRenderEvents = true,
	allDay = false,
	'data-testid': dataTestId,
}) => {
	const allEventsDialogRef = React.useRef<{
		open: () => void
		close: () => void
		setSelectedDayEvents: (dayEvents: SelectedDayEvents) => void
	}>(null)
	const {
		dayMaxEvents = 0,
		getEventsForDateRange,
		currentDate,
		firstDayOfWeek,
		t,
		getEventsForResource,
		businessHours,
	} = useSmartCalendarContext((state) => ({
		dayMaxEvents: state.dayMaxEvents,
		getEventsForDateRange: state.getEventsForDateRange,
		currentDate: state.currentDate,
		firstDayOfWeek: state.firstDayOfWeek,
		t: state.t,
		getEventsForResource: state.getEventsForResource,
		businessHours: state.businessHours,
	}))

	const todayEvents = useMemo(() => {
		if (!shouldRenderEvents) {
			return []
		}

		const resourceEvents = resourceId ? getEventsForResource(resourceId) : []
		let todayEvents = getEventsForDateRange(
			day.startOf(gridType),
			day.endOf(gridType)
		)

		if (allDay) {
			todayEvents = todayEvents.filter((e) => e.allDay)
		}

		if (resourceEvents.length) {
			return todayEvents.filter((event) =>
				resourceEvents.some((re) => String(re.id) === String(event.id))
			)
		}

		return todayEvents
	}, [
		day,
		resourceId,
		getEventsForDateRange,
		getEventsForResource,
		gridType,
		shouldRenderEvents,
		allDay,
	])

	// Get start date for the current month view based on firstDayOfWeek
	const firstDayOfMonth = currentDate.startOf('month')

	// Calculate the first day of the calendar grid correctly
	// Find the first day of week (e.g. Sunday or Monday) that comes before or on the first day of the month
	let adjustedFirstDayOfCalendar = firstDayOfMonth.clone()
	while (adjustedFirstDayOfCalendar.day() !== firstDayOfWeek) {
		adjustedFirstDayOfCalendar = adjustedFirstDayOfCalendar.subtract(1, 'day')
	}

	// Handler for showing all events in a dialog
	const showAllEvents = (day: dayjs.Dayjs, events: CalendarEvent[]) => {
		allEventsDialogRef.current?.setSelectedDayEvents({
			day,
			events,
		})
		allEventsDialogRef.current?.open()
	}

	const isCurrentMonth = day.month() === currentDate.month()
	const isLastColumn = index === 6 // Saturday is the last column in a week

	const hiddenEventsCount = todayEvents.length - dayMaxEvents
	const hasHiddenEvents = hiddenEventsCount > 0

	const isBusiness = isBusinessHour({
		date: day,
		hour: gridType === 'hour' ? day.hour() : undefined,
		businessHours,
	})

	return (
		<>
			<DroppableCell
				allDay={allDay}
				className={cn(
					'cursor-pointer overflow-clip p-1 hover:bg-accent min-h-[60px] relative',
					isLastColumn && 'border-r-0',
					className
				)}
				data-testid={dataTestId || `day-cell-${day.toISOString()}`}
				date={day}
				disabled={!isBusiness || !isCurrentMonth}
				hour={hour}
				id={`day-cell-${day.toISOString()}${resourceId ? `-resource-${resourceId}` : ''}`}
				minute={minute}
				resourceId={resourceId}
				type="day-cell"
			>
				{shouldRenderEvents && (
					<>
						{/* Single-day events container positioned below multi-day events */}
						<div className="flex flex-col gap-1">
							{/* Render placeholders for events that occur today so that the cell height is according to dayMaxEvents. */}
							{todayEvents.slice(0, dayMaxEvents).map((event, rowIndex) => (
								<div
									className="h-5 w-full"
									data-testid={event?.title}
									key={`empty-${rowIndex}-${event.id}`}
								/>
							))}

							{/* Show more events button with accurate count */}
							{hasHiddenEvents && (
								<div
									className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] whitespace-nowrap sm:text-xs mt-1"
									onClick={(e) => {
										e.stopPropagation()

										showAllEvents(day, todayEvents)
									}}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault()
											e.stopPropagation()
											showAllEvents(day, todayEvents)
										}
									}}
									role="button"
									// oxlint-disable-next-line prefer-tag-over-role
									tabIndex={0}
								>
									+{hiddenEventsCount} {t('more')}
								</div>
							)}
						</div>
					</>
				)}
			</DroppableCell>

			{/* Dialog for showing all events */}
			<AllEventDialog ref={allEventsDialogRef} />
		</>
	)
}

export const GridCell = memo(NoMemoGridCell) as typeof NoMemoGridCell
