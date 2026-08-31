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
	/**
	 * Duration of a minute-level cell, in minutes. Only meaningful when
	 * `minute` is set; ignored for hour cells (always 60) and day cells
	 * (always the full day). Only the vertical grid renders minute-level
	 * cells, so this is inert on the horizontal one.
	 */
	slotDurationMinutes: number
	resourceId?: string | number
	allDay?: boolean
	children?: React.ReactNode
	className?: string
	style?: React.CSSProperties
	'data-testid'?: string
	disabled?: boolean
}

/**
 * The time span a cell represents, chosen by how precisely the caller located
 * the cell rather than by which view is rendering: a `slotDurationMinutes`-wide
 * slot when `minute` is given, a one-hour slot when only `hour` is, and the
 * whole day when neither is.
 *
 * Only the vertical grid passes `minute`, and `slotDuration` only reaches that
 * engine (`view-renderer.tsx`). Resource calendars default to the horizontal
 * engine, so they report one-hour cells whatever `slotDuration` is set to;
 * `orientation="vertical"` is what makes it apply (#255).
 */
function getCellRange(
	date: Dayjs,
	hour: number | undefined,
	minute: number | undefined,
	slotDurationMinutes: number
): { start: Dayjs; end: Dayjs } {
	const start = date.hour(hour ?? 0).minute(minute ?? 0)

	if (hour !== undefined && minute !== undefined) {
		return { start, end: start.add(slotDurationMinutes, 'minute') }
	}
	if (hour !== undefined) {
		return { start, end: start.hour(hour + 1).minute(0) }
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
	slotDurationMinutes,
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
		data: { type, start, resourceId, allDay, disabled: cellDisabled },
		disabled: disableDragAndDrop,
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
