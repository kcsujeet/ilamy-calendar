import { ScrollArea } from '@/components/ui'
import { useCalendarContext } from '@/contexts/calendar-context/context'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import { Fragment } from 'react'
import { DroppableCell } from '../droppable-cell/droppable-cell'
import { DayAllDayRow } from './day-all-day-row'
import { DayEventsLayer } from './day-events-layer'
import { DayHeader } from './day-header'
import { DayTimeCol } from './day-time-col'

const DayView = () => {
  const { currentDate } = useCalendarContext()

  // Hours to display (all 24 hours of the day)
  const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) => {
    return dayjs().hour(hour).minute(0)
  })

  // For more granular time slots, we'll divide each hour into 15-minute segments
  const timeSegments = [0, 15, 30, 45]

  // Get current day's events - this will refresh automatically when store updates
  // because getEventsForDate is a selector function from the store that runs whenever events change

  const isToday = currentDate.isSame(dayjs(), 'day')
  const cellDate = currentDate.format('YYYY-MM-DD')

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day header */}
      <DayHeader />

      {/* All-day events row */}
      <DayAllDayRow />

      {/* Time grid without scrollbar */}
      <ScrollArea className="relative flex-1 overflow-y-auto">
        {/* Set a fixed height container that matches exactly the total height of all hour blocks */}
        <div
          className="grid grid-cols-8 divide-x border-x"
          style={{ height: `${hours.length * 60}px` }}
        >
          {/* Time labels column */}
          <DayTimeCol className="bg-card sticky left-0 z-10 col-span-2 h-full md:col-span-1" />

          {/* Day column with events */}
          <div className="relative col-span-6 h-full md:col-span-7">
            {/* Background grid for time slots - lowest layer */}
            <div className="absolute inset-0 z-0">
              {hours.map((hour, index) => (
                <div
                  key={`bg-${currentDate.format('YYYY-MM-DD')}-${hour.format(
                    'HH'
                  )}`}
                  className="h-[60px] border-b"
                >
                  {/* 15-minute marker lines */}
                  {timeSegments.slice(1).map((minutes) => (
                    <div
                      key={`bg-${hour.format('HH')}-${minutes}`}
                      className="border-border absolute w-full border-t border-dashed"
                      style={{ top: `${index * 60 + minutes}px` }}
                    ></div>
                  ))}
                </div>
              ))}
            </div>

            {/* Interactive layer for time slots - middle layer with no borders */}
            <div className="pointer-events-auto absolute inset-0 z-20">
              {hours.map((time) => {
                const hour = time.hour()

                return (
                  <Fragment key={`${cellDate}-${time.format('HH')}`}>
                    <DroppableCell
                      id={`time-cell-${cellDate}-${time.format('HH')}-00`}
                      type="time-cell"
                      date={currentDate}
                      hour={hour}
                      minute={0}
                      className={cn(
                        'hover:bg-accent/5 h-[15px] cursor-pointer'
                      )}
                    />
                    <DroppableCell
                      id={`time-cell-${cellDate}-${time.format('HH')}-15`}
                      type="time-cell"
                      date={currentDate}
                      hour={hour}
                      minute={15}
                      className="hover:bg-accent/5 h-[15px] cursor-pointer"
                    />
                    <DroppableCell
                      id={`time-cell-${cellDate}-${time.format('HH')}-30`}
                      type="time-cell"
                      date={currentDate}
                      hour={hour}
                      minute={30}
                      className="hover:bg-accent/5 h-[15px] cursor-pointer"
                    />
                    <DroppableCell
                      id={`time-cell-${cellDate}-${time.format('HH')}-45`}
                      type="time-cell"
                      date={currentDate}
                      hour={hour}
                      minute={45}
                      className="hover:bg-accent/5 h-[15px] cursor-pointer"
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
