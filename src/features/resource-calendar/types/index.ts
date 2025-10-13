import type { CalendarEvent } from '@/components/types'
import type { IlamyCalendarProps } from '@/features/calendar/types'

export interface IlamyResourceCalendarProps extends IlamyCalendarProps {
  /** Array of events to display */
  events?: ResourceCalendarEvent[]
  /** Array of resources */
  resources?: Resource[]
  /** Custom render function for resources */
  renderResource?: (resource: Resource) => React.ReactNode
}

/**
 * Resource interface representing a calendar resource (person, room, equipment, etc.)
 */
export interface Resource {
  /** Unique identifier for the resource */
  id: string | number
  /** Display title of the resource */
  title: string
  /**
   * Color for the resource (supports CSS color values, hex, rgb, hsl, or CSS class names)
   * @example "#3b82f6", "blue-500", "rgb(59, 130, 246)"
   */
  color?: string
  /**
   * Background color for the resource (supports CSS color values, hex, rgb, hsl, or CSS class names)
   * @example "#dbeafe", "blue-100", "rgba(59, 130, 246, 0.1)"
   */
  backgroundColor?: string
  /** Optional position for resource display */
  position?: number
}

/**
 * Resource calendar event interface extending CalendarEvent with resource assignment
 */
export interface ResourceCalendarEvent extends CalendarEvent {
  /** Single resource assignment */
  resourceId?: string | number
  /** Multiple resource assignment (cross-resource events) */
  resourceIds?: (string | number)[]
}
