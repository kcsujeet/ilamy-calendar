import type { CalendarEvent } from '@/components'
import dayjs from '@/lib/configs/dayjs-config'
import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { getWeekDays } from './date-utils'

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

/**
 * Normalizes optional date input (dayjs, Date, or string) to a dayjs object.
 * Returns undefined if the input is undefined, allowing for optional date handling.
 * This is particularly useful for props like initialDate where undefined means "use default behavior".
 *
 * @param date - Optional date input in various formats
 * @returns Normalized dayjs object or undefined
 */
export function normalizeInitialDate(
  date: dayjs.Dayjs | Date | string | undefined
): dayjs.Dayjs | undefined {
  if (date === undefined) {
    return undefined
  }

  if (dayjs.isDayjs(date)) {
    return date
  }

  return dayjs(date)
}

export const omitKeys = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

/**
 * Normalizes calendar events from public-facing format to internal format.
 * Converts flexible date types (dayjs, Date, string) to strict dayjs objects.
 *
 * @param events - Array of calendar events with flexible date types
 * @returns Normalized array of calendar events with dayjs dates
 *
 * @example
 * // Regular calendar events
 * const events = normalizeEvents<IlamyCalendarPropEvent, CalendarEvent>(propEvents)
 *
 * // Resource calendar events
 * const resourceEvents = normalizeEvents<IlamyResourceCalendarPropEvent, ResourceCalendarEvent>(propEvents)
 */
export function normalizeEvents<
  TInput extends {
    start: dayjs.Dayjs | Date | string
    end: dayjs.Dayjs | Date | string
  },
  TOutput,
>(events: TInput[] | undefined): TOutput[] {
  if (!events || !events.length) {
    return []
  }

  return events.map((event) => {
    return {
      ...event,
      start: dayjs.isDayjs(event.start) ? event.start : dayjs(event.start),
      end: dayjs.isDayjs(event.end) ? event.end : dayjs(event.end),
    } as TOutput
  })
}
