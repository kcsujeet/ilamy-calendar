import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import dayjs from '@/lib/configs/dayjs-config'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getWeekDays } from '@/lib/utils/date-utils'

const MONTH_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const

const animation = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

const TitleContent = () => {
  const { currentDate, view, setCurrentDate, t, firstDayOfWeek } =
    useSmartCalendarContext((ctx) => ({
      currentDate: ctx.currentDate,
      view: ctx.view,
      setCurrentDate: ctx.setCurrentDate,
      t: ctx.t,
      firstDayOfWeek: ctx.firstDayOfWeek,
    }))

  const [openPopover, setOpenPopover] = useState<string | null>(null)

  const months = useMemo(() => MONTH_KEYS.map((key) => t(key)), [t])
  const currentYear = currentDate.year()
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
  const weekDays = getWeekDays(currentDate, firstDayOfWeek)

  const selectDate = (date: dayjs.Dayjs) => {
    setCurrentDate(date)
    setOpenPopover(null)
  }

  const renderMonthContent = () => (
    <>
      {months.map((month, index) => (
        <Button
          key={month}
          variant="ghost"
          className={cn(
            'justify-start font-normal',
            currentDate.month() === index && 'bg-primary/10'
          )}
          onClick={() => selectDate(currentDate.month(index))}
        >
          {month}
        </Button>
      ))}
    </>
  )

  const renderYearContent = () => (
    <>
      {years.map((year) => (
        <Button
          key={year}
          variant="ghost"
          className={cn(
            'justify-start font-normal',
            currentDate.year() === year && 'bg-primary/10'
          )}
          onClick={() => selectDate(currentDate.year(year))}
        >
          {year}
        </Button>
      ))}
    </>
  )

  const renderWeekContent = () => (
    <>
      {Array.from({ length: 7 }, (_, i) => {
        const weekDate = currentDate.subtract(3, 'week').add(i, 'week')
        const days = getWeekDays(weekDate, firstDayOfWeek)
        const start = days[0]
        const end = days[6]
        const isCurrentWeek = weekDate.isSame(currentDate, 'week')
        const crossesMonth = start.month() !== end.month()

        return (
          <Button
            key={start.format('YYYY-MM-DD')}
            variant="ghost"
            className={cn(
              'justify-start font-normal',
              isCurrentWeek && 'bg-primary/10'
            )}
            onClick={() => selectDate(start)}
          >
            <div className="flex w-full items-center justify-between">
              <span>{`${start.format('MMM D')} - ${end.format('D')}`}</span>
              {crossesMonth && (
                <span className="ml-0.5 text-xs opacity-70">{`${start.format('MMM')}-${end.format('MMM')}`}</span>
              )}
            </div>
          </Button>
        )
      })}
    </>
  )

  const renderDayContent = () => {
    const firstDay = currentDate.startOf('month')
    const daysInMonth = currentDate.daysInMonth()

    return (
      <>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = firstDay.date(i + 1)
          const isCurrentDay = day.isSame(currentDate, 'day')
          const isToday = day.isSame(dayjs(), 'day')

          return (
            <Button
              key={day.format('YYYY-MM-DD')}
              variant="ghost"
              className={cn(
                'justify-start font-normal',
                isCurrentDay && 'bg-primary/10'
              )}
              onClick={() => selectDate(day)}
            >
              <div className="flex w-full items-center justify-between">
                <span>{day.format('dddd, MMM D')}</span>
                {isToday && (
                  <span className="bg-primary text-primary-foreground rounded-sm px-1! text-xs">
                    {t('today')}
                  </span>
                )}
              </div>
            </Button>
          )
        })}
      </>
    )
  }

  const popovers = [
    {
      id: 'month',
      hidden: view === 'year',
      title: currentDate.format('MMMM'),
      render: renderMonthContent,
    },
    {
      id: 'year',
      hidden: false,
      title: currentDate.format('YYYY'),
      render: renderYearContent,
    },
    {
      id: 'week',
      hidden: view !== 'week',
      title: `${weekDays[0].format('MMM D')} - ${weekDays[6].format('MMM D')}`,
      render: renderWeekContent,
    },
    {
      id: 'day',
      hidden: view !== 'day',
      title: currentDate.format('dddd, D'),
      render: renderDayContent,
    },
  ]

  return popovers
    .filter((p) => !p.hidden)
    .map((popover) => (
      <Popover
        key={popover.id}
        open={openPopover === popover.id}
        onOpenChange={(open) => setOpenPopover(open ? popover.id : null)}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-1 px-1! font-semibold"
            data-testid="calendar-month-button"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={`${popover.id}-${currentDate.format('YYYY-MM-DD')}`}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={animation}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                data-testid="calendar-month-display"
              >
                {popover.title}
              </motion.span>
            </AnimatePresence>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-0">
          <div className="flex max-h-60 flex-col overflow-auto">
            {popover.render()}
          </div>
        </PopoverContent>
      </Popover>
    ))
}

export default TitleContent
