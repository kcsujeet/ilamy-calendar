import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import dayjs from '@/lib/configs/dayjs-config'
import { getWeekDays } from '@/lib/utils/date-utils'
import React from 'react'
import { WeekDayCol } from './week-day-col'

const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) =>
  dayjs().hour(hour).minute(0)
)

export const WeekTimeGrid: React.FC = () => {
  const { currentDate, firstDayOfWeek, currentLocale } = useCalendarContext()

  const weekDays = getWeekDays(currentDate, firstDayOfWeek)

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
        className="z-10 col-span-1 w-16 grid grid-rows-24 border-x"
      >
        {hours.map((time) => (
          <div
            key={time.format('HH:mm')}
            data-testid={`week-time-hour-${time.format('HH')}`}
            className="h-[60px] border-b text-right"
          >
            <span className="text-muted-foreground px-1 text-right text-[10px] sm:text-xs">
              {Intl.DateTimeFormat(currentLocale, {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              }).format(time.toDate())}
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
          className="pointer-events-none absolute z-40"
          style={{
            top: `${(dayjs().hour() + dayjs().minute() / 60) * 60}px`,
            left: `calc(var(--spacing) * 16 + ${todayIndex} * (100% - var(--spacing) * 16) / 7)`,
            width: `calc((100% - var(--spacing) * 16) / 7)`,
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
