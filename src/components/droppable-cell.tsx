// oxlint-disable no-negated-condition
import type dayjs from '@/lib/dayjs-config'
import { cn } from '@/lib/utils'
import { useDroppable } from '@dnd-kit/core'
import React from 'react'
import { useSmartCalendarContext } from '@/lib/hooks/use-smart-calendar-context'

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
  const { onCellClick } = useSmartCalendarContext((state) => ({
    onCellClick: state.onCellClick,
  }))
  const { setNodeRef } = useDroppable({
    id,
    data: {
      type,
      date,
      hour,
      minute,
    },
  })

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation()

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
    // oxlint-disable-next-line click-events-have-key-events
    <div
      ref={setNodeRef}
      data-testid={dataTestId}
      className={cn(className)}
      onClick={handleCellClick}
      style={style}
    >
      {children}
    </div>
  )
}
