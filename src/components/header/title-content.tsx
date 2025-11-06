import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import dayjs from '@/lib/configs/dayjs-config'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getWeekDays } from '@/lib/utils/date-utils'

// Animation variants for number transitions
const animationVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

const TitleContent = () => {
  const { currentDate, view, setCurrentDate, t, firstDayOfWeek } =
    useSmartCalendarContext((context) => ({
      currentDate: context.currentDate,
      view: context.view,
      setCurrentDate: context.setCurrentDate,
      t: context.t,
      firstDayOfWeek: context.firstDayOfWeek,
    }))

  // Create months array using translations
  const months = useMemo(
    () => [
      t('january'),
      t('february'),
      t('march'),
      t('april'),
      t('may'),
      t('june'),
      t('july'),
      t('august'),
      t('september'),
      t('october'),
      t('november'),
      t('december'),
    ],
    [t]
  )

  // State for mobile menu and popovers
  const [monthPopoverOpen, setMonthPopoverOpen] = useState(false)
  const [yearPopoverOpen, setYearPopoverOpen] = useState(false)
  const [weekPopoverOpen, setWeekPopoverOpen] = useState(false)
  const [dayPopoverOpen, setDayPopoverOpen] = useState(false)

  const currentYear = currentDate.year()
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
  const weekDays = getWeekDays(currentDate, firstDayOfWeek)
  const startOfWeek = weekDays[0]
  const endOfWeek = weekDays[6]

  // Handle month and year selection
  const handleMonthChange = (month: number) => {
    const newDate = currentDate.month(month)
    setCurrentDate(newDate)
    setMonthPopoverOpen(false)
  }

  const handleYearChange = (year: number) => {
    const newDate = currentDate.year(year)
    setCurrentDate(newDate)
    setYearPopoverOpen(false)
  }

  const popoverConfigs = [
    {
      id: 'month-popover',
      open: monthPopoverOpen,
      setOpen: setMonthPopoverOpen,
      hidden: view === 'year',
      title: currentDate.format('MMMM'),
      content: (
        <>
          {months.map((month, index) => (
            <Button
              key={month}
              variant="ghost"
              className={cn(
                'justify-start font-normal',
                currentDate.month() === index && 'bg-primary/10'
              )}
              onClick={() => handleMonthChange(index)}
            >
              {month}
            </Button>
          ))}
        </>
      ),
    },
    {
      id: 'year-popover',
      open: yearPopoverOpen,
      setOpen: setYearPopoverOpen,
      title: currentDate.format('YYYY'),
      content: (
        <>
          {years.map((year) => (
            <Button
              key={year}
              variant="ghost"
              className={cn(
                'justify-start font-normal',
                currentDate.year() === year && 'bg-primary/10'
              )}
              onClick={() => handleYearChange(year)}
            >
              {year}
            </Button>
          ))}
        </>
      ),
    },
    {
      id: 'week-popover',
      open: weekPopoverOpen,
      setOpen: setWeekPopoverOpen,
      hidden: view !== 'week',
      title: `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D')}`,
      content: (
        <>
          {/* Show 7 weeks (3 past, current, 3 future) */}
          {Array.from({ length: 7 }, (_, i) => {
            const weekDate = currentDate.subtract(3, 'week').add(i, 'week')
            const weekDays = getWeekDays(weekDate, firstDayOfWeek)
            const startOfWeek = weekDays[0]
            const endOfWeek = weekDays[6]
            const isCurrentWeek = weekDate.isSame(currentDate, 'week')

            return (
              <Button
                key={startOfWeek.format('YYYY-MM-DD')}
                variant="ghost"
                className={cn(
                  'justify-start font-normal',
                  isCurrentWeek && 'bg-primary/10'
                )}
                onClick={() => {
                  setCurrentDate(startOfWeek)
                  setWeekPopoverOpen(false)
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <span>{`${startOfWeek.format(
                    'MMM D'
                  )} - ${endOfWeek.format('D')}`}</span>
                  {startOfWeek.month() !== endOfWeek.month() && (
                    <span className="ml-0.5 text-xs opacity-70">
                      {`${startOfWeek.format('MMM')}-${endOfWeek.format(
                        'MMM'
                      )}`}
                    </span>
                  )}
                </div>
              </Button>
            )
          })}
        </>
      ),
    },
    {
      id: 'day-popover',
      open: dayPopoverOpen,
      setOpen: setDayPopoverOpen,
      hidden: view !== 'day',
      title: currentDate.format('dddd, D'),
      content: (
        <>
          {/* Show all days of the current month */}
          {(() => {
            // Get first day of month and last day of month
            const firstDayOfMonth = currentDate.startOf('month')
            const daysInMonth = currentDate.daysInMonth()

            // Generate array of days in the month
            return Array.from({ length: daysInMonth }, (_, i) => {
              const dayDate = firstDayOfMonth.date(i + 1) // i + 1 because days start at 1
              const isCurrentDay = dayDate.isSame(currentDate, 'day')
              const isToday = dayDate.isSame(dayjs(), 'day')

              return (
                <Button
                  key={dayDate.format('YYYY-MM-DD')}
                  variant="ghost"
                  className={cn(
                    'justify-start font-normal',
                    isCurrentDay && 'bg-primary/10'
                  )}
                  onClick={() => {
                    setCurrentDate(dayDate)
                    setDayPopoverOpen(false)
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <span>{dayDate.format('dddd, MMM D')}</span>
                    {isToday && (
                      <span className="bg-primary text-primary-foreground rounded-sm px-1! text-xs">
                        {t('today')}
                      </span>
                    )}
                  </div>
                </Button>
              )
            })
          })()}
        </>
      ),
    },
  ]

  return popoverConfigs.map((config) => {
    if (config.hidden) {
      return null
    }

    return (
      <Popover key={config.id} open={config.open} onOpenChange={config.setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-1 px-1! font-semibold"
            data-testid="calendar-month-button"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={`${config.id}-${currentDate.month()}`}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={animationVariants}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                data-testid="calendar-month-display"
              >
                {config.title}
              </motion.span>
            </AnimatePresence>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-0">
          <div className="flex max-h-60 flex-col overflow-auto">
            {config.content}
          </div>
        </PopoverContent>
      </Popover>
    )
  })
}

export default TitleContent
