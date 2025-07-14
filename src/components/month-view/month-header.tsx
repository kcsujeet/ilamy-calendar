import { AnimatePresence, motion } from 'motion/react'
import React, { useMemo } from 'react'
import { useCalendarContext } from '../../contexts/calendar-context/context'
import dayjs from 'dayjs'

export const MonthHeader: React.FC = () => {
  const { firstDayOfWeek, currentLocale } = useCalendarContext()

  // Reorder week days based on firstDayOfWeek
  const weekDays = useMemo(() => {
    const days = dayjs.weekdays().map((day) => day.toLowerCase())
    const shortDays = dayjs.weekdaysShort().map((day) => day.toLowerCase())

    // Rotate the array based on firstDayOfWeek
    for (let i = 0; i < firstDayOfWeek; i++) {
      const dayToMove = days.shift()
      const shortDayToMove = shortDays.shift()
      if (dayToMove) days.push(dayToMove)
      if (shortDayToMove) shortDays.push(shortDayToMove)
    }

    return { days, shortDays }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstDayOfWeek, currentLocale])

  return (
    <div
      className="bg-card sticky top-0 z-10 grid grid-cols-7 border-b"
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
            <span className="hidden text-sm sm:inline">{weekDay}</span>
            <span className="text-xs sm:hidden">
              {weekDays.shortDays[index]}
            </span>
          </motion.div>
        </AnimatePresence>
      ))}
    </div>
  )
}
