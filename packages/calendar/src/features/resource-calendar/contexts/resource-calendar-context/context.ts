import { createContext } from 'react'
import type { CalendarEvent } from '@/components/types'
import type { CalendarContextType } from '@/features/calendar/contexts/calendar-context/context'
import type { CellInfo } from '@/features/calendar/types'
import type { Resource } from '@/features/resource-calendar/types'

export interface ResourceCalendarContextType extends CalendarContextType {
	// Resource-specific state
	resources: Resource[]

	// Resource utilities
	getEventsForResource: (resourceId: string | number) => CalendarEvent[]
	getEventsForResources: (resourceIds: (string | number)[]) => CalendarEvent[]
	getResourceById: (
		resourceId: string | number | undefined
	) => Resource | undefined

	// Cross-resource event utilities
	isEventCrossResource: (event: CalendarEvent) => boolean
	getEventResourceIds: (event: CalendarEvent) => (string | number)[]

	// Additional properties from calendar context
	onEventClick: (event: CalendarEvent) => void
	onCellClick: (info: CellInfo) => void
	renderResource?: (resource: Resource) => React.ReactNode
	orientation: 'horizontal' | 'vertical'
	weekViewGranularity: 'hourly' | 'daily'
}

// ResourceCalendarContext is kept for internal Provider usage
export const ResourceCalendarContext: React.Context<
	ResourceCalendarContextType | undefined
> = createContext<ResourceCalendarContextType | undefined>(undefined)
