import type { BusinessHours } from '@ilamy/types'
import { useMemo } from 'react'
import { useCalendarCellContext } from '@/features/calendar/hooks/use-calendar-cell-context'

/**
 * Returns the resource-specific business hours when available, otherwise
 * falls back to the calendar-wide `businessHours`. Shared by components
 * that need per-resource working-hours semantics (grid cells, event form).
 */
export const useEffectiveBusinessHours = (
	resourceId: string | number | undefined
): BusinessHours | BusinessHours[] | undefined => {
	// The cell context, since every grid cell calls this: the full context
	// would re-render all of them whenever any event changed.
	const { businessHours, getResourceById } = useCalendarCellContext()

	return useMemo(() => {
		if (resourceId != null) {
			const resource = getResourceById(resourceId)
			if (resource?.businessHours) {
				return resource.businessHours
			}
		}
		return businessHours
	}, [resourceId, getResourceById, businessHours])
}
