import React, { memo, useMemo } from 'react'
import { DayNumber } from '@/components/day-number'
import type { CalendarEvent } from '@/components/types'
import { isBusinessHour } from '@/features/calendar/utils/business-hours'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import type { SelectedDayEvents } from './all-events-dialog'
import { AllEventDialog } from './all-events-dialog'
import { DroppableCell } from './droppable-cell'

interface GridProps {
	day: dayjs.Dayjs
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
		getEventsForResource,
		businessHours,
		currentLocale,
	} = useSmartCalendarContext((state) => ({
		dayMaxEvents: state.dayMaxEvents,
		getEventsForDateRange: state.getEventsForDateRange,
		currentDate: state.currentDate,
		firstDayOfWeek: state.firstDayOfWeek,
		t: state.t,
		getEventsForResource: state.getEventsForResource,
		businessHours: state.businessHours,
		currentLocale: state.currentLocale,
	}))

	const todayEvents = useMemo(() => {
		if (!shouldRenderEvents) {
			return []
		}

		let todayEvents = getEventsForDateRange(
			day.startOf(gridType),
			day.endOf(gridType)
		)

		if (allDay) {
			todayEvents = todayEvents.filter((e) => e.allDay)
		}

		if (resourceId) {
			const resourceEvents = getEventsForResource(resourceId) ?? []

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

	// Handler for showing all events in a dialog
	const showAllEvents = (day: dayjs.Dayjs, events: CalendarEvent[]) => {
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
		businessHours,
	})

	const hourStr = day.format('HH')
	const mm = day.format('mm')
	const dateTestIdBase =
		gridType === 'hour'
			? `day-cell-${day.format('YYYY-MM-DD')}-${hourStr}-${mm}`
			: `day-cell-${day.format('YYYY-MM-DD')}`

	return (
		<>
			<DroppableCell
				allDay={allDay}
				className={cn(
					'cursor-pointer overflow-clip p-1 hover:bg-accent min-h-[60px] relative border-r last:border-r-0 border-b',
					className
				)}
				data-testid={dataTestId || dateTestIdBase}
				date={day}
				disabled={!isBusiness || !isCurrentMonth}
				hour={hour}
				id={`day-cell-${day.toISOString()}${resourceId ? `-resource-${resourceId}` : ''}`}
				minute={minute}
				resourceId={resourceId}
				type="day-cell"
			>
				<div className="flex flex-col gap-1 h-full w-full">
					{showDayNumber && <DayNumber date={day} locale={currentLocale} />}

					{shouldRenderEvents && (
						<>
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
