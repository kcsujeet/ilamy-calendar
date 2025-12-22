// oxlint-disable no-negated-condition

import { useDroppable } from '@dnd-kit/core'
import type React from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { DISABLED_CELL_CLASSNAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface DroppableCellProps {
	id: string
	type: 'day-cell' | 'time-cell'
	date: dayjs.Dayjs
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
	const { onCellClick, disableDragAndDrop, disableCellClick, classesOverride } =
		useSmartCalendarContext((state) => ({
			onCellClick: state.onCellClick,
			disableDragAndDrop: state.disableDragAndDrop,
			disableCellClick: state.disableCellClick,
			classesOverride: state.classesOverride,
		}))

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
		disabled: disableDragAndDrop || disabled,
	})

	const handleCellClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		console.log('DroppableCell clicked:', {
			disableCellClick,
			disabled,
			date: date.toISOString(),
			hour,
			minute,
			resourceId,
		})

		if (disableCellClick || disabled) {
			return
		}

		const start = date.hour(hour ?? 0).minute(minute ?? 0)
		let end = start.clone()
		if (hour !== undefined && minute !== undefined) {
			end = end.hour(hour).minute(minute + 15) // day view time slots are 15 minutes
		} else if (hour !== undefined) {
			end = end.hour(hour + 1).minute(0) // week view time slots are 1 hour
		} else {
			end = end.hour(23).minute(59) // month view full day
		}

		onCellClick({ start, end, resourceId, allDay })
	}

	return (
		// oxlint-disable-next-line click-events-have-key-events
		<div
			className={cn(
				'droppable-cell',
				className,
				isOver && !disableDragAndDrop && !disabled && 'bg-accent',
				disableCellClick || disabled ? 'cursor-default' : 'cursor-pointer',
				disabled && (classesOverride?.disabledCell || DISABLED_CELL_CLASSNAME)
			)}
			data-testid={dataTestId}
			onClick={handleCellClick}
			ref={setNodeRef}
			style={style}
		>
			{children}
		</div>
	)
}
