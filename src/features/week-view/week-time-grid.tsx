import { useCalendarContext } from '@/contexts/calendar-context/context'
import dayjs from 'dayjs'
import React from 'react'
import { WeekDayCol } from './week-day-col'

const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) =>
  dayjs().hour(hour).minute(0)
)

export const WeekTimeGrid: React.FC = () => {
  const { currentDate, firstDayOfWeek } = useCalendarContext()

  // Get start and end of current week based on firstDayOfWeek setting
  const startOfWeek = currentDate.startOf('week').day(firstDayOfWeek)
  // If current date is before the start of week, move back one week
  const adjustedStartOfWeek = currentDate.isBefore(startOfWeek)
    ? startOfWeek.subtract(1, 'week')
    : startOfWeek

  // Create an array of days for the current week
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    weekDays.push(adjustedStartOfWeek.add(i, 'day'))
  }

  // Separate all-day events from regular events (including multi-day events)

  // Find if current day is in the displayed week
  const todayIndex = weekDays.findIndex((day) => day.isSame(dayjs(), 'day'))
  const isCurrentWeek = todayIndex !== -1

  return (
    <div
      data-testid="week-time-grid"
      className="relative h-full grid grid-cols-[auto_repeat(7,1fr)] grid-rows-[repeat(24,minmax(60px, 1fr))]"
    >
      {/* Time labels column - fixed */}
      <div
        data-testid="week-time-labels"
        className="z-10 col-span-1 w-14 grid grid-rows-24 border-x"
      >
        {hours.map((time) => (
          <div
            key={time.format('HH:mm')}
            data-testid={`week-time-hour-${time.format('HH')}`}
            className="h-[60px] border-b text-right"
          >
            <span className="text-muted-foreground pr-2 text-right text-[10px] sm:text-xs">
              {time.format('h A')}
            </span>
          </div>
        ))}
      </div>

      {/* Day columns with time slots */}
      {weekDays.map((day) => (
        <WeekDayCol key={day.format('YYYY-MM-DD')} day={day} />
      ))}

      {/* Current time indicator */}
      {isCurrentWeek && (
        <div
          data-testid="week-current-time-indicator"
          className="pointer-events-none absolute z-20"
          style={{
            top: `${(dayjs().hour() + dayjs().minute() / 60) * 60}px`,
            left: `${todayIndex * (100 / 7)}%`,
            width: `${100 / 7}%`,
          }}
        >
          <div className="w-full border-t border-red-500">
            <div className="-mt-1 ml-1 h-2 w-2 rounded-full bg-red-500"></div>
          </div>
        </div>
      )}
    </div>
  )
}
