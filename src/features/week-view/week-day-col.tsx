import { cn } from '@/lib/utils'
import dayjs from '@/lib/dayjs-config'
import React from 'react'
import { DayEventsLayer } from '../day-view/components/day-events-layer'
import { DroppableCell } from '../droppable-cell/droppable-cell'

const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) =>
  dayjs().hour(hour).minute(0)
)

interface WeekDayColProps {
  day: dayjs.Dayjs // The specific day this column represents
}

export const WeekDayCol: React.FC<WeekDayColProps> = ({ day }) => {
  return (
    <div
      data-testid={`week-day-col-${day.format('YYYY-MM-DD')}`}
      className="col-span-1 relative grid grid-rows-24 border-r"
    >
      {hours.map((time) => {
        const hour = time.hour()
        const cellDate = day.format('YYYY-MM-DD')

        return (
          <DroppableCell
            key={`${cellDate}-${time.format('HH')}`}
            id={`time-cell-${cellDate}-${time.format('HH')}`}
            type="time-cell"
            date={day}
            hour={hour}
            data-testid={`week-time-cell-${cellDate}-${time.format('HH')}`}
            className={cn(
              'hover:bg-accent relative z-10 h-[60px] cursor-pointer border-b'
            )}
          />
        )
      })}

      {/* Event blocks layer */}
      <DayEventsLayer
        data-testid={`week-day-events-${day.format('YYYY-MM-DD')}`}
        day={day}
      />
    </div>
  )
}
