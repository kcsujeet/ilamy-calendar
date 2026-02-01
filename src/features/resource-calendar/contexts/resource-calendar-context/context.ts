import { createContext } from 'react'
import type { CalendarEvent } from '@/components/types'
import type { CalendarContextType } from '@/features/calendar/contexts/calendar-context/context'
import type { CellClickInfo } from '@/features/calendar/types'
import type { Resource } from '@/features/resource-calendar/types'

export interface ResourceCalendarContextType extends CalendarContextType {
	// Resource-specific state
	resources: Resource[]
	visibleResources: Set<string | number>

	// Resource utilities
	getEventsForResource: (resourceId: string | number) => CalendarEvent[]
	getEventsForResources: (resourceIds: (string | number)[]) => CalendarEvent[]
	getResourceById: (resourceId: string | number) => Resource | undefined
	getVisibleResources: () => Resource[]

	// Cross-resource event utilities
	isEventCrossResource: (event: CalendarEvent) => boolean
	getEventResourceIds: (event: CalendarEvent) => (string | number)[]

	// Additional properties from calendar context
	onEventClick: (event: CalendarEvent) => void
	onCellClick: (info: CellClickInfo) => void
	renderResource?: (resource: Resource) => React.ReactNode
	orientation: 'horizontal' | 'vertical'
}

// ResourceCalendarContext is kept for internal Provider usage
export const ResourceCalendarContext: React.Context<
	ResourceCalendarContextType | undefined
> = createContext<ResourceCalendarContextType | undefined>(undefined)
