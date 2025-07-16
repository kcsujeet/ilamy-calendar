import type dayjs from 'dayjs'

export interface CalendarEvent {
  id: string
  title: string
  start: dayjs.Dayjs
  originalStart?: dayjs.Dayjs
  originalEnd?: dayjs.Dayjs
  end: dayjs.Dayjs
  color?: string
  backgroundColor?: string
  description?: string
  location?: string
  height?: number // Height in pixels for rendering
  all_day?: boolean
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number // How often the event repeats (e.g., every 2 weeks)
    endDate?: dayjs.Dayjs // Optional end date for the recurrence
    count?: number // Optional number of occurrences
    daysOfWeek?: number[] // For weekly recurrence (0 = Sunday, 6 = Saturday)
    exceptions?: dayjs.Dayjs[] // Dates to exclude from the recurrence pattern
  }
  isRecurring?: boolean
  parentEventId?: string // For recurring event instances, references the original event
  isException?: boolean // For modified instances of recurring events
}

export interface ProcessedCalendarEvent extends CalendarEvent {
  left: number // Left position in percentage
  width: number // Width in percentage
  top: number // Top position in percentage
  height: number // Height in percentage
}

export type WeekDays =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
