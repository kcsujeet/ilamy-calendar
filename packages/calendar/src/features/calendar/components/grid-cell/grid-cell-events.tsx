import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { keys } from '@/features/calendar/utils/keys'
import type { HorizontalCellLayout } from '@/features/calendar/utils/layout/geometry'
import type { AllEventDialogHandle } from './all-events-dialog'
import { MoreEventsButton } from './more-events-button'

interface GridCellEventsProps {
	allEventsDialogRef: React.RefObject<AllEventDialogHandle | null>
	day: Dayjs
	precomputedLayout: HorizontalCellLayout
}

/**
 * The part of a cell that depends on the events: the placeholders that size
 * the cell to its allocated rows and the "+N more" button.
 *
 * Its own component so that only cells which draw events read the full
 * context. Time-grid slots draw none (their events live in a separate layer),
 * so an event changing re-renders none of them.
 */
export const GridCellEvents: React.FC<GridCellEventsProps> = ({
	allEventsDialogRef,
	day,
	precomputedLayout,
}) => {
	const { t, eventHeight, onMoreEventsClick } = useSmartCalendarContext()
	const { events: cellEvents, rowCount, hiddenCount } = precomputedLayout

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

	const hasHiddenEvents = hiddenCount > 0
	const placeholderRows = Array.from({ length: rowCount }, (_, index) => index)

	return (
		<>
			{/* Reserve the rows used by the events layer above this cell. */}
			{placeholderRows.map((rowIndex) => {
				const placeholderTitle = cellEvents[rowIndex]?.title
				const placeholderKey = keys.listKey('empty', rowIndex)
				const placeholderStyle = { height: `${eventHeight}px` }
				return (
					<div
						className="w-full shrink-0"
						data-testid={placeholderTitle}
						key={placeholderKey}
						style={placeholderStyle}
					/>
				)
			})}

			{hasHiddenEvents && (
				<MoreEventsButton
					hiddenCount={hiddenCount}
					label={t('more')}
					onOpen={showAllEvents}
				/>
			)}
		</>
	)
}
