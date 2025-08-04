import { useCalendarContext } from '@/contexts/calendar-context/context'
import { cn } from '@/lib/utils'
import dayjs from '@/lib/dayjs-config'
import { AnimatePresence, motion } from 'motion/react'
import React from 'react'

interface WeekHeaderProps {
  className?: string
}

export const WeekHeader: React.FC<WeekHeaderProps> = ({ className }) => {
  const {
    currentDate,
    selectDate,
    openEventForm,
    firstDayOfWeek,
    stickyViewHeader,
    viewHeaderClassName,
  } = useCalendarContext()

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

  return (
    // css grid header with lef corner cell shorter than the rest
    <div
      className={cn(
        'grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] grid-rows-1',
        stickyViewHeader && 'sticky top-0 z-100',
        viewHeaderClassName,
        className
      )}
      data-testid="week-header"
    >
      {/* Corner cell with week number */}
      <div className="col-span-1 w-14 shrink-0 items-center justify-center border-x border-b p-2">
        <div className="flex flex-col items-center justify-center">
          <span className="text-muted-foreground text-xs">Week</span>
          <span className="font-medium">{currentDate.week()}</span>
        </div>
      </div>

      {/* Day header cells */}
      {weekDays.map((day, index) => {
        const isToday = day.isSame(dayjs(), 'day')

        return (
          <AnimatePresence key={day.format('YYYY-MM-DD')} mode="wait">
            <motion.div
              key={day.format('YYYY-MM-DD')}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{
                duration: 0.25,
                ease: 'easeInOut',
                delay: index * 0.05,
              }}
              className={cn(
                'hover:bg-accent flex-1 cursor-pointer p-1 text-center sm:p-2 border-r border-b',
                isToday && 'bg-primary/10 font-bold'
              )}
              onClick={() => {
                selectDate(day)
                openEventForm(day)
              }}
              data-testid={`week-day-header-${day.format('dddd').toLowerCase()}`}
            >
              <div className="text-xs sm:text-sm">{day.format('ddd')}</div>
              <div
                className={cn(
                  'mx-auto mt-1 flex h-5 w-5 items-center justify-center rounded-full text-xs sm:h-7 sm:w-7 sm:text-sm',
                  isToday && 'bg-primary text-primary-foreground'
                )}
              >
                {day.date()}
              </div>
            </motion.div>
          </AnimatePresence>
        )
      })}
    </div>
  )
}
