import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import React from 'react'
import { DayEventsLayer } from '../day-view/day-events-layer'
import { DroppableCell } from '../droppable-cell/droppable-cell'

const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) =>
  dayjs().hour(hour).minute(0)
)

interface WeekDayColProps {
  day: dayjs.Dayjs // The specific day this column represents
}

export const WeekDayCol: React.FC<WeekDayColProps> = ({ day }) => {
  return (
    <div className="col-span-1 relative grid grid-rows-24 border-r">
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
            minute={0}
            className={cn(
              'hover:bg-accent/10 relative z-20 h-[60px] cursor-pointer border-b'
            )}
          />
        )
      })}

      {/* Event blocks layer */}
      <DayEventsLayer day={day} />
    </div>
  )
}
