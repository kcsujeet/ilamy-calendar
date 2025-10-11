import { AnimatePresence, motion } from 'motion/react'
import React, { useMemo } from 'react'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'

interface MonthHeaderProps {
  className?: string
}

export const MonthHeader: React.FC<MonthHeaderProps> = ({ className }) => {
  const {
    firstDayOfWeek,
    currentLocale,
    stickyViewHeader,
    viewHeaderClassName,
  } = useCalendarContext()

  // Reorder week days based on firstDayOfWeek
  const weekDays = useMemo(() => {
    const days = dayjs.weekdaysShort().map((day) => day.toLowerCase())

    // Rotate the array based on firstDayOfWeek
    for (let i = 0; i < firstDayOfWeek; i++) {
      const dayToMove = days.shift()
      if (dayToMove) {
        days.push(dayToMove)
      }
    }

    return { days }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstDayOfWeek, currentLocale])

  return (
    <div
      className={cn(
        'grid grid-cols-7 border-b',
        stickyViewHeader && 'sticky top-0 z-20',
        viewHeaderClassName,
        className
      )}
      data-testid="month-header"
    >
      {weekDays.days.map((weekDay, index) => (
        <AnimatePresence key={weekDay} mode="wait">
          <motion.div
            key={weekDay}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              duration: 0.25,
              ease: 'easeInOut',
              delay: index * 0.05,
            }}
            className="py-2 text-center font-medium border-r first:border-l"
            data-testid={`weekday-header-${weekDay}`}
          >
            <span className="text-sm capitalize">{weekDay}</span>
          </motion.div>
        </AnimatePresence>
      ))}
    </div>
  )
}
