import type { HorizontalCellLayout } from '@ilamy/core'
import { toOffsetIso, type ZonedDate } from '@ilamy/utils/temporal'
import type React from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { keys } from '@/features/calendar/utils/keys'
import type { AllEventDialogHandle } from './all-events-dialog'
import { MoreEventsButton } from './more-events-button'

interface GridCellEventsProps {
	allEventsDialogRef: React.RefObject<AllEventDialogHandle | null>
	day: ZonedDate
	precomputedLayout: HorizontalCellLayout
}

export const GridCellEvents: React.FC<GridCellEventsProps> = ({
	allEventsDialogRef,
	day,
	precomputedLayout,
}) => {
	const { t, eventHeight, onMoreEventsClick } = useSmartCalendarContext()
	const { events: cellEvents, rowCount, hiddenCount } = precomputedLayout

	const showAllEvents = () => {
		if (onMoreEventsClick) {
			onMoreEventsClick(toOffsetIso(day), cellEvents)
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
			{placeholderRows.map((rowIndex) => {
				const placeholderTitle = cellEvents.at(rowIndex)?.title
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
