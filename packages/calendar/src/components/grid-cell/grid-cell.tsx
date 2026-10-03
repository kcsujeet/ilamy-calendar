import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { memo, useRef } from 'react'
import { keys } from '@/lib/utils/keys'
import { DroppableCell } from '../droppable-cell'
import { AllEventDialog, type AllEventDialogHandle } from './all-events-dialog'
import { GridCellContent } from './grid-cell-content'
import { GridCellEvents } from './grid-cell-events'
import { useIsCellUnavailable } from './use-is-cell-unavailable'

interface GridProps {
	day: Dayjs
	hour?: number // Optional hour for hour-based grids
	minute?: number // Optional minute for more granular time slots
	slotDurationMinutes?: number // Span of an hour-grid slot, for business-hour containment
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
	/** Whether this cell draws the dashed sub-hour divider below itself. */
	isSubDivider?: boolean
}

/**
 * The caller's test id, or the cell's own. The own one is built only when
 * needed: the time grid always passes one, and formatting a key it then
 * discarded was a measurable share of navigating a large time grid.
 */
const getCellTestId = (
	day: Dayjs,
	gridType: 'day' | 'hour',
	callerTestId: string | undefined
) => {
	if (callerTestId) {
		return callerTestId
	}
	if (gridType === 'hour') {
		return keys.cell.day(day, day.format('HH'), day.format('mm'))
	}
	return keys.cell.day(day)
}

const NoMemoGridCell: React.FC<GridProps> = ({
	day,
	hour,
	minute,
	slotDurationMinutes = 60,
	className = '',
	resourceId,
	gridType = 'day',
	shouldRenderEvents = true,
	allDay = false,
	precomputedEvents,
	'data-testid': dataTestId,
	showDayNumber = false,
	isSubDivider = false,
	children,
}) => {
	const allEventsDialogRef = useRef<AllEventDialogHandle>(null)
	const isUnavailable = useIsCellUnavailable({
		day,
		gridType,
		slotDurationMinutes,
		resourceId,
	})
	const testId = getCellTestId(day, gridType, dataTestId)

	return (
		<>
			<DroppableCell
				allDay={allDay}
				className={cn(
					'cursor-pointer overflow-clip p-1 bg-background not-in-data-dragging:hover:bg-accent min-h-[60px] relative min-w-0',
					className
				)}
				data-testid={testId}
				date={day}
				disabled={isUnavailable}
				hour={hour}
				isSubDivider={isSubDivider}
				minute={minute}
				resourceId={resourceId}
				slotDurationMinutes={slotDurationMinutes}
				type="day-cell"
			>
				<GridCellContent day={day} showDayNumber={showDayNumber}>
					{shouldRenderEvents && (
						<GridCellEvents
							allDay={allDay}
							allEventsDialogRef={allEventsDialogRef}
							day={day}
							gridType={gridType}
							precomputedEvents={precomputedEvents}
							resourceId={resourceId}
						/>
					)}
					{children}
				</GridCellContent>
			</DroppableCell>

			{/* Only a cell that draws events can show "+N more", the dialog's one
			    opener. Time-grid slots draw none, and a closed dialog in each of
			    their thousands still cost a quarter to a third of navigating a
			    15-minute resource week (#300). */}
			{shouldRenderEvents && <AllEventDialog ref={allEventsDialogRef} />}
		</>
	)
}

export const GridCell = memo(NoMemoGridCell) as typeof NoMemoGridCell
