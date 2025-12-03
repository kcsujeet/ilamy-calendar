'use client'

import type { IlamyCalendarProps } from '@ilamy/calendar'
import { IlamyCalendar } from '@ilamy/calendar'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// Configure dayjs with required plugins
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

const sampleEvents: IlamyCalendarProps['events'] = [
  {
    id: '1',
    title: 'Team Meeting',
    start: dayjs().hour(10).minute(0).second(0),
    end: dayjs().hour(11).minute(0).second(0),
    color: '#3b82f6',
  },
  {
    id: '2',
    title: 'Lunch Break',
    start: dayjs().hour(12).minute(0).second(0),
    end: dayjs().hour(13).minute(0).second(0),
    color: '#10b981',
  },
  {
    id: '3',
    title: 'Project Review',
    start: dayjs().add(1, 'day').hour(14).minute(0).second(0),
    end: dayjs().add(1, 'day').hour(15).minute(30).second(0),
    color: '#8b5cf6',
  },
]

export default function Calendar() {
  return (
    <div className="w-full">
      <IlamyCalendar events={sampleEvents} firstDayOfWeek="sunday" dayMaxEvents={3} />
    </div>
  )
}
