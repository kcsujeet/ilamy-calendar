import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { filterEventsForResource } from '@/features/calendar/utils/event-pipeline'
import { keys } from '@/features/calendar/utils/keys'
import type { AllEventDialogHandle } from './all-events-dialog'
import { MoreEventsButton } from './more-events-button'

interface GridCellEventsProps {
	allEventsDialogRef: React.RefObject<AllEventDialogHandle | null>
	day: Dayjs
	gridType: 'day' | 'hour'
	allDay: boolean
	resourceId?: string | number
	precomputedEvents?: CalendarEvent[]
}

/**
 * The part of a cell that depends on the events: the placeholders that size
 * the cell to `dayMaxEvents` and the "+N more" button.
 *
 * Its own component so that only cells which draw events read the full
 * context. Time-grid slots draw none (their events live in a separate layer),
 * so an event changing re-renders none of them.
 */
export const GridCellEvents: React.FC<GridCellEventsProps> = ({
	allEventsDialogRef,
	day,
	gridType,
	allDay,
	resourceId,
	precomputedEvents,
}) => {
	const {
		dayMaxEvents = 0,
		getEventsForDateRange,
		t,
		eventHeight,
		onMoreEventsClick,
	} = useSmartCalendarContext()

	const cellEvents = useMemo(() => {
		// Use pre-computed events from the row level when available
		if (precomputedEvents) {
			return precomputedEvents
		}

		let cellEvents = getEventsForDateRange(
			day.startOf(gridType),
			day.endOf(gridType)
		)

		if (allDay) {
			cellEvents = cellEvents.filter((e) => e.allDay)
		}

		return filterEventsForResource(cellEvents, resourceId)
	}, [
		precomputedEvents,
		day,
		resourceId,
		getEventsForDateRange,
		gridType,
		allDay,
	])

	// Defer to the consumer's callback when provided, otherwise open the
	// built-in "all events" dialog.
	const showAllEvents = () => {
		if (onMoreEventsClick) {
			onMoreEventsClick(day, cellEvents)
			return
		}
		allEventsDialogRef.current?.setSelectedDayEvents({
			day,
			events: cellEvents,
		})
		allEventsDialogRef.current?.open()
	}

	const hiddenEventsCount = cellEvents.length - dayMaxEvents
	const hasHiddenEvents = hiddenEventsCount > 0
	const visibleEvents = cellEvents.slice(0, dayMaxEvents)

	return (
		<>
			{/* Placeholders for the events drawn over this cell, so its height follows dayMaxEvents. */}
			{visibleEvents.map((event, rowIndex) => (
				<div
					className="w-full shrink-0"
					data-testid={event?.title}
					key={keys.listKey('empty', rowIndex, event.id)}
					style={{ height: `${eventHeight}px` }}
				/>
			))}

			{hasHiddenEvents && (
				<MoreEventsButton
					hiddenCount={hiddenEventsCount}
					label={t('more')}
					onOpen={showAllEvents}
				/>
			)}
		</>
	)
}
