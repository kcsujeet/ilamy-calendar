// oxlint-disable no-negated-condition
import type dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { useDroppable } from '@dnd-kit/core'
import React from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'

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
  const { onCellClick, disableDragAndDrop, disableCellClick } =
    useSmartCalendarContext((state) => ({
      onCellClick: state.onCellClick,
      disableDragAndDrop: state.disableDragAndDrop,
      disableCellClick: state.disableCellClick,
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

    onCellClick({ start, end, resourceId })
  }

  return (
    // oxlint-disable-next-line click-events-have-key-events
    <div
      ref={setNodeRef}
      data-testid={dataTestId}
      className={cn(
        className,
        isOver && !disableDragAndDrop && !disabled && 'bg-accent',
        disableCellClick || disabled ? 'cursor-default' : 'cursor-pointer',
        disabled && 'bg-secondary text-muted-foreground pointer-events-none'
      )}
      onClick={handleCellClick}
      style={style}
    >
      {children}
    </div>
  )
}
