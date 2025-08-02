import type { CalendarEvent } from '@/components'
import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import dayjs from '@/lib/dayjs-config'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateMockEvents({ count = 5 } = {}) {
  const events: CalendarEvent[] = []
  for (let i = 0; i < count; i++) {
    events.push({
      id: i.toString(),
      title: `Mock Event ${i + 1}`,
      start: dayjs().startOf('week').add(i, 'day').startOf('day'),
      end: dayjs().startOf('week').add(i, 'day').endOf('day'),
      color: 'bg-gray-100 text-gray-800',
    })
  }
  return events
}

export function safeDate(date: dayjs.Dayjs | Date | string): dayjs.Dayjs {
  if (dayjs.isDayjs(date)) {
    return date
  }

  const parsedDate = dayjs(date)
  return parsedDate.isValid() ? parsedDate : dayjs()
}
