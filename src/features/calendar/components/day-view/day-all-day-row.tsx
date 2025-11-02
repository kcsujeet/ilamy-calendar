import { DroppableCell } from '@/components/droppable-cell'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { WeekEventsLayer } from '../month-view/week-events-layer'

export const DayAllDayRow = () => {
  const { currentDate, t } = useCalendarContext()

  return (
    <div
      data-testid="day-all-day-row"
      className="grid grid-cols-8 border-b border-x"
    >
      {/* Left label for all-day events */}
      <div className="col-span-2 flex shrink-0 items-center justify-end border-r pr-2 md:col-span-1">
        <span className="text-muted-foreground text-[10px] whitespace-nowrap sm:text-xs">
          {t('allDay')}
        </span>
      </div>

      {/* All-day events container with dynamic height */}
      <div className="relative col-span-6 md:col-span-7 ">
        <DroppableCell
          id={`all-day-${currentDate.format('YYYY-MM-DD')}`}
          type="day-cell"
          date={currentDate}
          className="hover:bg-accent w-full cursor-pointer min-h-10 flex flex-col relative"
        >
          <div className="absolute inset-0 z-10 pr-2">
            <WeekEventsLayer days={[currentDate]} dayNumberHeight={0} allDay />
          </div>
        </DroppableCell>
      </div>
    </div>
  )
}
