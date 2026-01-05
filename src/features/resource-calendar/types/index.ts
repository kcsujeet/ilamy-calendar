import type {
	HiddenHeaderButtons,
	IlamyCalendarPropEvent,
	IlamyCalendarProps,
} from '@/features/calendar/types'

/**
 * Public-facing resource calendar event interface with flexible date types.
 * Similar to IlamyCalendarPropEvent but with resource assignment fields.
 * Dates can be provided as dayjs.Dayjs, Date, or string and will be normalized internally.
 *
 * @interface IlamyResourceCalendarPropEvent
 * @extends {IlamyCalendarPropEvent}
 */
export interface IlamyResourceCalendarPropEvent extends IlamyCalendarPropEvent {
	/** Single resource assignment */
	resourceId?: string | number
	/** Multiple resource assignment (cross-resource events) */
	resourceIds?: (string | number)[]
}

export interface IlamyResourceCalendarProps
	extends Omit<IlamyCalendarProps, 'events'> {
	/** Array of events to display */
	events?: IlamyResourceCalendarPropEvent[]
	/** Array of resources */
	resources?: Resource[]
	/** Custom render function for resources */
	renderResource?: (resource: Resource) => React.ReactNode
	/**
	 * Orientation of the resource view.
	 * - "horizontal": Resources are rows, time is columns (default)
	 * - "vertical": Resources are columns, time is rows
	 */
	orientation?: 'horizontal' | 'vertical'
	/**
	 * Configuration for hiding header buttons in the calendar.
	 * Allows users to selectively hide export, new event, and view control buttons.
	 */
	hiddenHeaderButtons?: HiddenHeaderButtons
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
