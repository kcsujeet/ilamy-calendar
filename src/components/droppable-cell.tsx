import { useDroppable } from '@dnd-kit/core'
import type React from 'react'
import type { CellInfo } from '@/features/calendar/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { DISABLED_CELL_CLASSNAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface DroppableCellProps {
	id: string
	type: 'day-cell' | 'time-cell'
	date: Dayjs
	hour?: number
	minute?: number
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
	minute?: number
): { start: Dayjs; end: Dayjs } {
	const start = date.hour(hour ?? 0).minute(minute ?? 0)

	if (hour !== undefined && minute !== undefined) {
		return { start, end: start.minute(minute + 15) }
	}
	if (hour !== undefined) {
		return { start, end: start.hour(hour + 1).minute(0) }
	}
	return { start, end: start.hour(23).minute(59) }
}

export function DroppableCell({
	id,
	type,
	date,
	hour,
	minute,
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
		getResourceById,
		disableDragAndDrop,
		disableCellClick,
		classesOverride,
		view,
	} = useSmartCalendarContext()

	const { start, end } = getCellRange(date, hour, minute)
	// `getResourceById` is only present on resource calendars; regular calendars resolve to undefined.
	const resource = getResourceById?.(resourceId)
	const cellInfo: CellInfo = { start, end, resource, allDay }

	// Disabled by business hours (`disabled` prop) or the consumer's predicate.
	const cellDisabled = disabled || Boolean(isCellDisabled?.(cellInfo))
	const clickBlocked = disableCellClick || cellDisabled

	const { isOver, setNodeRef } = useDroppable({
		id,
		data: { type, date, hour, minute, resourceId, allDay },
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

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: The cell is interactive for event creation
		// biome-ignore lint/a11y/useKeyWithClickEvents: Key events are handled by parent components
		<div
			className={cn(
				'droppable-cell',
				className,
				showDropHighlight && 'bg-accent',
				clickBlocked ? 'cursor-default' : 'cursor-pointer',
				cellDisabled && disabledClass
			)}
			data-disabled={cellDisabled.toString()}
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
