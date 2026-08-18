import { useDroppable } from '@dnd-kit/core'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { CellInfo } from '@/features/calendar/types'
import { DISABLED_CELL_CLASSNAME } from '@/lib/constants'

interface DroppableCellProps {
	id: string
	type: 'day-cell' | 'time-cell'
	date: Dayjs
	hour?: number
	minute?: number
	slotDurationMinutes?: number
	timeAxis?: 'vertical' | 'horizontal'
	laneId?: string
	resourceId?: string | number
	allDay?: boolean
	children?: React.ReactNode
	className?: string
	style?: React.CSSProperties
	'data-testid'?: string
	disabled?: boolean
}

/**
 * The time span a cell represents. Granularity follows the view: a 15-minute
 * slot (day), a one-hour slot (week), or the whole day (month).
 */
function getCellRange(
	date: Dayjs,
	hour?: number,
	minute?: number,
	slotDurationMinutes = 60
): { start: Dayjs; end: Dayjs } {
	const start = date.hour(hour ?? 0).minute(minute ?? 0)

	if (hour !== undefined) {
		return { start, end: start.add(slotDurationMinutes, 'minute') }
	}
	// The next midnight, not 23:59: `end` is exclusive, which is what the slot
	// and hour branches above already report (#248).
	return { start, end: start.add(1, 'day').startOf('day') }
}

export function DroppableCell({
	id,
	type,
	date,
	hour,
	minute,
	slotDurationMinutes = 60,
	timeAxis,
	laneId,
	resourceId,
	allDay,
	children,
	className,
	style,
	'data-testid': dataTestId,
	disabled = false,
}: DroppableCellProps) {
	const {
		onCellClick,
		isCellDisabled,
		getCellClassName,
		getResourceById,
		disableDragAndDrop,
		disableCellClick,
		classesOverride,
		view,
	} = useSmartCalendarContext()

	const { start, end } = getCellRange(date, hour, minute, slotDurationMinutes)
	// `getResourceById` is only present on resource calendars; regular calendars resolve to undefined.
	const resource = getResourceById?.(resourceId)
	const cellInfo: CellInfo = { start, end, resource, allDay }

	// Disabled by business hours (`disabled` prop) or the consumer's predicate.
	const cellDisabled = disabled || Boolean(isCellDisabled?.(cellInfo))
	const clickBlocked = disableCellClick || cellDisabled

	const { isOver, setNodeRef } = useDroppable({
		id,
		data: {
			type,
			date,
			hour,
			minute,
			resourceId,
			allDay,
		},
		disabled: disableDragAndDrop || cellDisabled,
	})

	const handleCellClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (clickBlocked) {
			return
		}
		onCellClick(cellInfo)
	}

	const showDropHighlight = isOver && !disableDragAndDrop && !cellDisabled
	const disabledClass = classesOverride?.disabledCell || DISABLED_CELL_CLASSNAME
	const customClassName = getCellClassName?.(cellInfo)

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: The cell is interactive for event creation
		// biome-ignore lint/a11y/useKeyWithClickEvents: Key events are handled by parent components
		<div
			className={cn(
				'droppable-cell',
				className,
				customClassName,
				showDropHighlight && 'bg-accent',
				clickBlocked ? 'cursor-default' : 'cursor-pointer',
				cellDisabled && disabledClass
			)}
			data-all-day={allDay ? 'true' : undefined}
			data-disabled={cellDisabled.toString()}
			data-dnd-axis={timeAxis}
			data-dnd-lane={laneId}
			data-end={end.toISOString()}
			data-resource-id={resourceId}
			data-start={start.toISOString()}
			data-testid={dataTestId}
			data-view={view}
			onClick={handleCellClick}
			ref={setNodeRef}
			style={style}
		>
			{children}
		</div>
	)
}
