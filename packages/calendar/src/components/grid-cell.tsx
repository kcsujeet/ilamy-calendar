import type { CalendarEvent } from '@ilamy/types'
import { DayLabel } from '@ilamy/ui/components/day-label'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import React, { memo, useMemo } from 'react'
import { useEffectiveBusinessHours } from '@/features/calendar/hooks/use-effective-business-hours'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { isBusinessHour } from '@/features/calendar/utils/business-hours'
import { filterEventsForResource } from '@/lib/events/pipeline'
import { isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import type { SelectedDayEvents } from './all-events-dialog'
import { AllEventDialog } from './all-events-dialog'
import { DroppableCell } from './droppable-cell'

interface GridProps {
	day: Dayjs
	hour?: number // Optional hour for hour-based grids
	minute?: number // Optional minute for more granular time slots
	dayMaxEvents?: number
	className?: string // Optional className for custom styling
	resourceId?: string | number // Optional resource ID for resource-specific day cells
	gridType?: 'day' | 'hour' // Future use for different grid types
	shouldRenderEvents?: boolean // Flag to determine if events should be rendered
	allDay?: boolean // Flag to indicate if this is an all-day cell
	showDayNumber?: boolean // Flag to show or hide the day number
	children?: React.ReactNode
	'data-testid'?: string
	precomputedEvents?: CalendarEvent[]
}

const NoMemoGridCell: React.FC<GridProps> = ({
	day,
	hour,
	minute,
	className = '',
	resourceId,
	gridType = 'day',
	shouldRenderEvents = true,
	allDay = false,
	precomputedEvents,
	'data-testid': dataTestId,
	showDayNumber = false,
	children,
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
		t,
		eventSpacing,
		eventHeight,
	} = useSmartCalendarContext()
	const effectiveBusinessHours = useEffectiveBusinessHours(resourceId)

	const todayEvents = useMemo(() => {
		if (!shouldRenderEvents) {
			return []
		}

		// Use pre-computed events from the row level when available
		if (precomputedEvents) {
			return precomputedEvents
		}

		let todayEvents = getEventsForDateRange(
			day.startOf(gridType),
			day.endOf(gridType)
		)

		if (allDay) {
			todayEvents = todayEvents.filter((e) => e.allDay)
		}

		if (resourceId) {
			return filterEventsForResource(todayEvents, resourceId)
		}

		return todayEvents
	}, [
		precomputedEvents,
		day,
		resourceId,
		getEventsForDateRange,
		gridType,
		shouldRenderEvents,
		allDay,
	])

	// Handler for showing all events in a dialog
	const showAllEvents = (day: Dayjs, events: CalendarEvent[]) => {
		allEventsDialogRef.current?.setSelectedDayEvents({
			day,
			events,
		})
		allEventsDialogRef.current?.open()
	}

	const isCurrentMonth = day.month() === currentDate.month()

	const hiddenEventsCount = todayEvents.length - dayMaxEvents
	const hasHiddenEvents = hiddenEventsCount > 0

	const isBusiness = isBusinessHour({
		date: day,
		hour: gridType === 'hour' ? day.hour() : undefined,
		businessHours: effectiveBusinessHours,
	})

	const testId =
		gridType === 'hour'
			? keys.cell.day(day, day.format('HH'), day.format('mm'))
			: keys.cell.day(day)
	const droppableId = keys.droppable.dayCell(day, { allDay, resourceId })

	return (
		<>
			<DroppableCell
				allDay={allDay}
				className={cn(
					'cursor-pointer overflow-clip p-1 hover:bg-accent min-h-[60px] relative border-r border-b min-w-0',
					className
				)}
				data-testid={dataTestId || testId}
				date={day}
				disabled={!isBusiness || !isCurrentMonth}
				hour={hour}
				id={droppableId}
				minute={minute}
				resourceId={resourceId}
				type="day-cell"
			>
				<div
					className="flex flex-col h-full w-full"
					data-testid="grid-cell-content"
					style={{ gap: `${eventSpacing}px` }}
				>
					{showDayNumber && (
						<DayLabel
							data-testid={keys.dayNumber(day)}
							dayNumber={day.format('D')}
							today={isToday(day)}
						/>
					)}

					{shouldRenderEvents && (
						<>
							{/* Render placeholders for events that occur today so that the cell height is according to dayMaxEvents. */}
							{todayEvents.slice(0, dayMaxEvents).map((event, rowIndex) => (
								<div
									className="w-full shrink-0"
									data-testid={event?.title}
									key={keys.listKey('empty', rowIndex, event.id)}
									style={{ height: `${eventHeight}px` }}
								/>
							))}

							{/* Show more events button with accurate count */}
							{hasHiddenEvents && (
								// biome-ignore lint/a11y/useSemanticElements: Using div as button
								<div
									className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] whitespace-nowrap sm:text-xs shrink-0 mt-1"
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
									tabIndex={0}
								>
									+{hiddenEventsCount} {t('more')}
								</div>
							)}
						</>
					)}
					{children}
				</div>
			</DroppableCell>

			{/* Dialog for showing all events */}
			<AllEventDialog ref={allEventsDialogRef} />
		</>
	)
}

export const GridCell = memo(NoMemoGridCell) as typeof NoMemoGridCell
