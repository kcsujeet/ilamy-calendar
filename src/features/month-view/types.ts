import type { CalendarEvent } from '@/components'
import type dayjs from 'dayjs'

// Interface for the selected day events state
export interface SelectedDayEvents {
  day: dayjs.Dayjs
  events: CalendarEvent[]
}

export interface MonthViewProps {
  dayMaxEvents?: number
}

// Simple interface for tracking multi-day events
export interface MultiDayEventPosition {
  event: CalendarEvent
  rowIndex: number // Week row (0-5)
  colStart: number // Start column (0-6)
  colEnd: number // End column (0-6)
  rowPosition: number // Vertical position within row
  elementId: string // Unique identifier for this segment
}

// Interface for date-based event maps
export interface EventMap {
  [dateKey: string]: CalendarEvent[]
}
