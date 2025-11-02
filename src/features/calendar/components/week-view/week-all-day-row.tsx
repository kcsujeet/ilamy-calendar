import { DroppableCell } from '@/components/droppable-cell'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { getWeekDays } from '@/lib/utils/date-utils'
import React from 'react'
import { WeekEventsLayer } from '../month-view/week-events-layer'

export const WeekAllDayRow: React.FC = () => {
  const { currentDate, firstDayOfWeek, t } = useCalendarContext()

  const weekDays = getWeekDays(currentDate, firstDayOfWeek)

  return (
    <div
      className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] grid-rows-1 relative"
      data-testid="week-all-day-row"
    >
      {/* Left label for all-day events */}
      <div className="w-16 flex shrink-0 items-center justify-end border-x border-b px-1 min-h-16">
        <span className="text-muted-foreground text-[10px] whitespace-nowrap sm:text-xs">
          {t('allDay')}
        </span>
      </div>

      {/* Droppable cells for each day */}
      {weekDays.map((day) => (
        <DroppableCell
          key={`all-day-${day.format('YYYY-MM-DD')}`}
          id={`all-day-cell-${day.format('YYYY-MM-DD')}`}
          type="day-cell"
          date={day}
          className="hover:bg-accent h-full flex-1 cursor-pointer border-r border-b"
        />
      ))}

      {/* All-day event blocks */}
      <div className="absolute inset-0 z-10 col-span-7 col-start-2">
        <WeekEventsLayer days={weekDays} dayNumberHeight={0} allDay />
      </div>
    </div>
  )
}
