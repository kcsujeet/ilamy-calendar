import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { useCalendarContext } from '@/contexts/calendar-context/context'
import type dayjs from '@/lib/configs/dayjs-config'

interface DroppableCellProps {
  id: string
  type: 'day-cell' | 'time-cell'
  date: dayjs.Dayjs
  hour?: number
  minute?: number
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  'data-testid'?: string
}

export function DroppableCell({
  id,
  type,
  date,
  hour,
  minute,
  children,
  className,
  style,
  'data-testid': dataTestId,
}: DroppableCellProps) {
  const { onCellClick, disableDragAndDrop, disableCellClick } =
    useCalendarContext()
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type,
      date,
      hour,
      minute,
    },
    disabled: disableDragAndDrop,
  })

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disableCellClick) {
      return
    }

    const startDate = date.hour(hour ?? 0).minute(minute ?? 0)
    let endDate = startDate.clone()
    if (hour !== undefined && minute !== undefined) {
      endDate = endDate.hour(hour).minute(minute + 15) // day view time slots are 15 minutes
    } else if (hour !== undefined) {
      endDate = endDate.hour(hour + 1).minute(0) // week view time slots are 1 hour
    } else {
      endDate = endDate.hour(23).minute(59) // month view full day
    }

    onCellClick(startDate, endDate)
  }

  return (
    <div
      ref={setNodeRef}
      data-testid={dataTestId}
      className={cn(
        className,
        isOver && !disableDragAndDrop && 'bg-accent',
        disableCellClick ? 'cursor-default' : 'cursor-pointer'
      )}
      onClick={handleCellClick}
      style={style}
    >
      {children}
    </div>
  )
}
