import type React from 'react'
import { HorizontalGrid } from '@/components/horizontal-grid/horizontal-grid'
import type { HorizontalGridRowProps } from '@/components/horizontal-grid/horizontal-grid-row'
import { ResourceCell } from '@/components/resource-cell'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'

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
	classes?: { header?: string; body?: string; scroll?: string }
}

export const ResourceEventGrid: React.FC<ResourceEventGridProps> = ({
	days,
	gridType = 'day',
	children,
	classes,
}) => {
	const { getVisibleResources, renderResource } = useResourceCalendarContext()

	const visibleResources = getVisibleResources()

	const firstCol = {
		id: 'resource-col',
		day: days[0] || dayjs(),
		className:
			'shrink-0 w-40 min-w-40 max-w-40 sticky left-0 bg-background z-20 h-full',
		gridType: gridType,
		renderCell: (row: HorizontalGridRowProps) => {
			return (
				<ResourceCell
					className="h-full"
					data-testid={`horizontal-row-label-${row.resource.id}`}
					resource={row.resource}
				>
					{renderResource ? (
						renderResource(row.resource)
					) : (
						<div className="wrap-break-word text-sm">{row.resource.title}</div>
					)}
				</ResourceCell>
			)
		},
	}

	const columns = days.map((day) => ({
		id: `col-${day.toISOString()}`,
		day,
		gridType,
	}))

	const rows = visibleResources.map((resource) => ({
		id: resource.id,
		title: resource.title,
		resource: resource,
		columns: [firstCol, ...columns],
	}))

	return (
		<HorizontalGrid classes={classes} gridType={gridType} rows={rows}>
			{children}
		</HorizontalGrid>
	)
}
