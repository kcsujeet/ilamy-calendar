import { cn } from '@/lib/utils'
import dayjs from '@/lib/configs/dayjs-config'
import React from 'react'
import { DayEventsLayer } from '../day-view/day-events-layer'
import { DroppableCell } from '@/components/droppable-cell'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { isBusinessHour } from '@/features/calendar/utils/business-hours'

const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) =>
  dayjs().hour(hour).minute(0)
)

interface WeekDayColProps {
  day: dayjs.Dayjs // The specific day this column represents
}

export const WeekDayCol: React.FC<WeekDayColProps> = ({ day }) => {
  const { businessHours } = useCalendarContext()

  return (
    <div
      data-testid={`week-day-col-${day.format('YYYY-MM-DD')}`}
      className="col-span-1 relative grid grid-rows-24 border-r"
    >
      {hours.map((time) => {
        const hour = time.hour()
        const hourStr = time.format('HH')
        const dateStr = day.format('YYYY-MM-DD')
        const isBusiness = isBusinessHour({
          date: day,
          hour,
          minute: 0,
          businessHours,
        })

        return (
          <DroppableCell
            key={`${dateStr}-${hourStr}`}
            id={`week-time-cell-${dateStr}-${hourStr}`}
            type="time-cell"
            date={day}
            hour={hour}
            disabled={!isBusiness}
            data-testid={`week-time-cell-${dateStr}-${hourStr}`}
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
