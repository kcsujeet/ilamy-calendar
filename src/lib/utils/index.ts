import dayjs from '@/lib/configs/dayjs-config'
import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { getWeekDays, getMonthWeeks } from './date-utils'

export function safeDate(
  date: dayjs.Dayjs | Date | string | undefined
): dayjs.Dayjs | undefined {
  if (date === undefined) {
    return undefined
  }
  if (dayjs.isDayjs(date)) {
    return date
  }
  const parsedDate = dayjs(date)
  return parsedDate.isValid() ? parsedDate : undefined
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
 * const resourceEvents = normalizeEvents<IlamyResourceCalendarPropEvent, CalendarEvent>(propEvents)
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
