import type React from 'react'
import { HorizontalGrid } from '@/components/horizontal-grid/horizontal-grid'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'

interface ResourceEventGridProps {
	/**
	 * Array of days to display in the grid
	 */
	days: dayjs.Dayjs[]
	/** The type of grid to display - 'day' for day view, 'hour' for week view
	 * (affects event positioning logic)
	 */
	gridType?: 'day' | 'hour'
	/**
	 * Children will be rendered as headers above the grid
	 * (e.g., for day names in month view)
	 */
	children?: React.ReactNode
	classes?: { header?: string; cell?: string }
}

export const ResourceEventGrid: React.FC<ResourceEventGridProps> = ({
	days,
	gridType = 'day',
	children,
	classes,
}) => {
	const { getVisibleResources, renderResource } = useResourceCalendarContext()

	const visibleResources = getVisibleResources()

	const rows = visibleResources.map((resource) => ({
		id: resource.id,
		title: resource.title,
		resource: resource,
		renderResource: renderResource,
	}))

	return (
		<HorizontalGrid
			classes={{ header: classes?.header }}
			days={days}
			gridType={gridType}
			rows={rows}
		>
			{children}
		</HorizontalGrid>
	)
}
