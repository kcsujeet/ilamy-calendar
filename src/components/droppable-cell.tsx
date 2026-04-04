// oxlint-disable no-negated-condition

import type React from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { DISABLED_CELL_CLASSNAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface DroppableCellProps {
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

export function DroppableCell({
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
		disableDragAndDrop,
		disableCellClick,
		classesOverride,
		view,
	} = useSmartCalendarContext()

	const isDropDisabled = disableDragAndDrop || disabled

	const handleCellClick = (e: React.MouseEvent) => {
		e.stopPropagation()

		if (disableCellClick || disabled) {
			return
		}

		const start = date.hour(hour ?? 0).minute(minute ?? 0)
		let end = start.clone()
		if (hour !== undefined && minute !== undefined) {
			end = end.hour(hour).minute(minute + 15)
		} else if (hour !== undefined) {
			end = end.hour(hour + 1).minute(0)
		} else {
			end = end.hour(23).minute(59)
		}

		onCellClick({ start, end, resourceId, allDay })
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: The cell is interactive for event creation
		// biome-ignore lint/a11y/useKeyWithClickEvents: Key events are handled by parent components
		<div
			className={cn(
				'droppable-cell',
				className,
				disableCellClick || disabled ? 'cursor-default' : 'cursor-pointer',
				disabled && (classesOverride?.disabledCell || DISABLED_CELL_CLASSNAME)
			)}
			data-allday={allDay ? 'true' : undefined}
			data-cell-type={type}
			data-date={date.toISOString()}
			data-disabled={disabled.toString()}
			data-drop-disabled={isDropDisabled ? 'true' : undefined}
			data-droppable-cell=""
			data-hour={hour}
			data-minute={minute}
			data-resource-id={resourceId}
			data-testid={dataTestId}
			data-view={view}
			onClick={handleCellClick}
			style={style}
		>
			{children}
		</div>
	)
}
