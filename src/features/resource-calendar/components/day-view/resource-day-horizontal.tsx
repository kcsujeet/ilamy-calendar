import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import React, { useMemo } from 'react'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'motion/react'

export const ResourceDayHorizontal: React.FC = () => {
  const { currentDate, t, stickyViewHeader, viewHeaderClassName } =
    useResourceCalendarContext()

  // Generate time columns (hourly slots)
  const dayHours = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) =>
      currentDate.hour(hour).minute(0)
    )
  }, [currentDate])

  return (
    <div className="flex h-full flex-col">
      <ResourceEventGrid days={dayHours} gridType="hour">
        <div
          className={cn(
            'flex h-12 w-fit',
            stickyViewHeader && 'sticky top-0 z-21 bg-background', // Z-index above the left sticky resource column
            viewHeaderClassName
          )}
        >
          <div className="w-40 border-b border-r flex-shrink-0 flex justify-center items-center sticky top-0 left-0 bg-background z-20">
            <div className="text-sm">{t('resources')}</div>
          </div>

          <div className="flex-1 border-b border-r flex flex-col">
            {/* Time header row */}
            <div className="flex h-12 border-b">
              {dayHours.map((col, index) => {
                const isNowHour = col.isSame(dayjs(), 'hour')
                const key = `resource-day-header-${col.toISOString()}`

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
                      {col.format('ha')}
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
