import { ScrollArea } from '@/components/ui'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { cn } from '@/lib/utils'
import dayjs from '@/lib/configs/dayjs-config'
import { Fragment } from 'react'
import { DroppableCell } from '@/components/droppable-cell'
import { DayAllDayRow } from './day-all-day-row'
import { DayEventsLayer } from './day-events-layer'
import { DayHeader } from './day-header'
import { DayTimeCol } from './day-time-col'

// For more granular time slots, we'll divide each hour into 15-minute segments
const timeSegments = [0, 15, 30, 45]

// Hours to display (all 24 hours of the day)
const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) => {
  return dayjs().hour(hour).minute(0)
})

const DayView = () => {
  const { currentDate } = useCalendarContext()

  const isToday = currentDate.isSame(dayjs(), 'day')
  const dateStr = currentDate.format('YYYY-MM-DD')

  return (
    <div data-testid="day-view" className="flex h-full flex-col">
      {/* Day header */}
      <DayHeader className="h-[3rem]" />

      {/* Time grid without scrollbar */}
      <ScrollArea
        data-testid="day-scroll-area"
        className="relative overflow-y-auto h-[calc(100%-3rem)]"
      >
        {/* All-day events row */}
        <DayAllDayRow />

        {/* Set a fixed height container that matches exactly the total height of all hour blocks */}
        <div
          data-testid="day-time-grid"
          className="grid grid-cols-8 divide-x border-x"
          style={{ height: `${hours.length * 60}px` }}
        >
          {/* Time labels column */}
          <DayTimeCol className="col-span-2 h-full md:col-span-1" />

          {/* Day column with events */}
          <div
            data-testid="day-events-column"
            className="relative col-span-6 h-full md:col-span-7"
          >
            {/* Background grid for time slots - lowest layer */}
            <div
              data-testid="day-background-grid"
              className="absolute inset-0 z-0"
            >
              {hours.map((hour, index) => {
                const hourStr = hour.format('HH')
                const dateStr = currentDate.format('YYYY-MM-DD')

                return (
                  <div
                    key={`bg-${dateStr}-${hourStr}`}
                    className="h-[60px] border-b"
                    data-testid={`day-bg-hour-${hourStr}`}
                  >
                    {/* 15-minute marker lines */}
                    {timeSegments.slice(1).map((minutes) => (
                      <div
                        key={`bg-${hourStr}-${minutes}`}
                        data-testid={`day-bg-hour-${hourStr}-${minutes}`}
                        className="border-border absolute w-full border-t border-dashed"
                        style={{ top: `${index * 60 + minutes}px` }}
                      ></div>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* Interactive layer for time slots - middle layer with no borders */}
            <div
              data-testid="day-interactive-layer"
              className="pointer-events-auto absolute inset-0 z-10"
            >
              {hours.map((time) => {
                const hour = time.hour()
                const hourStr = time.format('HH')

                return (
                  <Fragment key={`${dateStr}-${hourStr}`}>
                    <DroppableCell
                      id={`day-time-cell-${dateStr}-${hourStr}-00`}
                      data-testid={`day-time-cell-${hourStr}-00`}
                      type="time-cell"
                      date={currentDate}
                      hour={hour}
                      minute={0}
                      className={cn('hover:bg-accent h-[15px] cursor-pointer')}
                    />
                    <DroppableCell
                      id={`day-time-cell-${dateStr}-${hourStr}-15`}
                      data-testid={`day-time-cell-${hourStr}-15`}
                      type="time-cell"
                      date={currentDate}
                      hour={hour}
                      minute={15}
                      className="hover:bg-accent h-[15px] cursor-pointer"
                    />
                    <DroppableCell
                      id={`day-time-cell-${dateStr}-${hourStr}-30`}
                      data-testid={`day-time-cell-${hourStr}-30`}
                      type="time-cell"
                      date={currentDate}
                      hour={hour}
                      minute={30}
                      className="hover:bg-accent h-[15px] cursor-pointer"
                    />
                    <DroppableCell
                      id={`day-time-cell-${dateStr}-${hourStr}-45`}
                      data-testid={`day-time-cell-${hourStr}-45`}
                      type="time-cell"
                      date={currentDate}
                      hour={hour}
                      minute={45}
                      className="hover:bg-accent h-[15px] cursor-pointer"
                    />
                  </Fragment>
                )
              })}
            </div>

            {/* Events layer - middle-top layer */}
            <DayEventsLayer day={currentDate} />

            {/* Current time indicator - top layer */}
            {isToday && (
              <div
                data-testid="day-current-time-indicator"
                className="absolute right-0 left-0 z-40 border-t border-red-500"
                style={{
                  top: `${(dayjs().hour() + dayjs().minute() / 60) * 60}px`,
                }}
              >
                <div className="-mt-1 -ml-1 h-2 w-2 rounded-full bg-red-500"></div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

export default DayView
