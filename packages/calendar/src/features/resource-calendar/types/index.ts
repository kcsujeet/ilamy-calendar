import type { Resource } from '@ilamy/types'
import type {
	IlamyCalendarPropEvent,
	IlamyCalendarProps,
} from '@/features/calendar/types'

/**
 * Public-facing resource calendar event interface with flexible date types.
 * Similar to IlamyCalendarPropEvent but with resource assignment fields.
 * Dates can be provided as Dayjs, Date, or string and will be normalized internally.
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
	 * Where the resource axis goes (only applies when `resources` is set):
	 * - "horizontal": resources are rows, dates flow across (default)
	 * - "vertical": resources are columns, time flows down
	 * Distinct from a view's `layout`, which is the engine used when the
	 * calendar has no resources. See docs/custom-views.md.
	 */
	orientation?: 'horizontal' | 'vertical'
	/**
	 * Granularity of time slots in the week view.
	 * - "hourly": Time slots are 1 hour (default)
	 * - "daily": Time slots are 1 day
	 */
	weekViewGranularity?: 'hourly' | 'daily'
}

export type { Resource } from '@ilamy/types'
