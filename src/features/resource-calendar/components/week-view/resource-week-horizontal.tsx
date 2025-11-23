import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import React, { useMemo } from 'react'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { getWeekDays } from '@/lib/utils/date-utils'
import { AnimatePresence, motion } from 'motion/react'

export const ResourceWeekHorizontal: React.FC = () => {
  const {
    currentDate,
    firstDayOfWeek,
    t,
    stickyViewHeader,
    viewHeaderClassName,
    currentLocale,
    is24Hour,
  } = useResourceCalendarContext()

  // Generate week days
  const weekDays = useMemo(
    () => getWeekDays(currentDate, firstDayOfWeek),
    [currentDate, firstDayOfWeek]
  )

  // Generate time columns (hourly slots)
  const weekHours = useMemo(() => {
    return weekDays.flatMap((day) =>
      Array.from({ length: 24 }, (_, hour) => day.hour(hour).minute(0))
    )
  }, [weekDays])

  return (
    <div className="flex h-full flex-col border">
      <ResourceEventGrid days={weekHours} gridType="hour">
        <div
          className={cn(
            'flex h-24 w-fit',
            stickyViewHeader && 'sticky top-0 z-21 bg-background', // Z-index above the left sticky resource column
            viewHeaderClassName
          )}
        >
          <div className="w-40 border-b border-r flex-shrink-0 flex justify-center items-center sticky top-0 left-0 bg-background z-20">
            <div className="text-sm">{t('resources')}</div>
          </div>

          <div className="flex-1 border-b border-r flex flex-col">
            {/* Day header row */}
            <div className="flex h-12 border-b">
              {weekDays.map((day, index) => {
                const isToday = day.isSame(dayjs(), 'day')
                const key = `resource-week-header-${day.toISOString()}-day`

                return (
                  <AnimatePresence key={`${key}-presence`} mode="wait">
                    <motion.div
                      key={`${key}-motion`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{
                        duration: 0.25,
                        ease: 'easeInOut',
                        delay: index * 0.05,
                      }}
                      className={cn(
                        'flex-shrink-0 border-r flex items-center text-center font-medium w-[calc(24*var(--spacing)*20)]',
                        isToday && 'bg-blue-50 text-blue-600'
                      )}
                    >
                      <div className="sticky left-1/2">
                        <div className="text-sm">{day.format('ddd')}</div>
                        <div className="text-xs text-muted-foreground">
                          {day.format('M/D')}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )
              })}
            </div>

            {/* Time header row */}
            <div className="flex h-12 border-b">
              {weekHours.map((col, index) => {
                const isNowHour = col.isSame(dayjs(), 'hour')
                const key = `resource-week-header-${col.toISOString()}-hour`

                return (
                  <AnimatePresence key={`${key}-presence`} mode="wait">
                    <motion.div
                      key={`${key}-motion`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{
                        duration: 0.25,
                        ease: 'easeInOut',
                        delay: index * 0.05,
                      }}
                      className={cn(
                        'w-20 border-r flex items-center justify-center text-xs flex-shrink-0',
                        isNowHour && 'bg-blue-50 text-blue-600 font-medium'
                      )}
                    >
                      {Intl.DateTimeFormat(currentLocale, {
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: !is24Hour,
                      }).format(col.toDate())}
                    </motion.div>
                  </AnimatePresence>
                )
              })}
            </div>
          </div>
        </div>
      </ResourceEventGrid>
    </div>
  )
}
