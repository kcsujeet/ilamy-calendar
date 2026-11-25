import {
	type BusinessHours,
	type CellInfo,
	isSelectionAllowed,
} from '../../../index'
import type { DomCalendarOptions } from '../types/renderer.types'

export const resolveEffectiveBusinessHours = (
	options: DomCalendarOptions,
	resource?: { businessHours?: BusinessHours | BusinessHours[] }
): BusinessHours | BusinessHours[] | undefined =>
	resource?.businessHours ?? options.businessHours

export const canCommitSelection = (
	cellInfo: CellInfo,
	options: DomCalendarOptions,
	timezone: string
): boolean => {
	if (options.disableCellClick) return false
	if (options.isCellDisabled?.(cellInfo)) return false
	return isSelectionAllowed(
		cellInfo,
		{
			businessHours: options.businessHours,
			selectConstraint: options.selectConstraint,
		},
		timezone
	)
}
